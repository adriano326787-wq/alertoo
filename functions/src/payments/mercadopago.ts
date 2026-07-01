import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule as _onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import {
  db,
  MP_ACCESS_TOKEN,
  STRIPE_SECRET_KEY,
  CREDIT_PACKAGES,
  readSecret,
  sanitizeString,
  assertAuth,
  enforcePaymentCooldown,
  checkAppToken,
} from '../shared';

// ─── Criar preferência de pagamento MP (Cartão via Checkout Pro) ──────────────
export const createMPPreference = onCall(
  { secrets: [MP_ACCESS_TOKEN], region: 'us-central1' },
  async (request) => {
    checkAppToken(request, 'createMPPreference');
    const uid = request.auth?.uid;
    assertAuth(uid);
    await enforcePaymentCooldown(uid);

    const packageId = sanitizeString(request.data?.packageId, 20);
    const pkg = CREDIT_PACKAGES[packageId];
    if (!pkg) throw new HttpsError('invalid-argument', 'Pacote invalido.');

    const externalReference = `${uid}|${packageId}|${Date.now()}`;

    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${readSecret(MP_ACCESS_TOKEN)}`,
      },
      body: JSON.stringify({
        items: [{
          id: packageId,
          title: pkg.label,
          description: `${pkg.credits} credito(s) para promocao no Alertoo`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: pkg.price,
        }],
        payment_methods: {
          excluded_payment_types: [{ id: 'ticket' }, { id: 'bank_transfer' }],
          installments: 1,
        },
        back_urls: {
          success: 'alertoo://payment/success',
          failure: 'alertoo://payment/failure',
          pending: 'alertoo://payment/pending',
        },
        auto_return: 'approved',
        statement_descriptor: 'ALERTOO',
        external_reference: externalReference,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('MP create preference failed', resp.status, txt);
      throw new HttpsError('internal', 'Falha ao criar pagamento.');
    }

    const data = await resp.json() as { id?: string; init_point?: string; sandbox_init_point?: string };

    const checkoutUrl = data.init_point ?? '';

    await db.collection('pending_payments').add({
      userId: uid,
      preferenceId: data.id ?? '',
      externalReference,
      packageId,
      credits: pkg.credits,
      price: pkg.price,
      status: 'pending',
      createdAt: Date.now(),
    });

    return {
      preferenceId: data.id,
      initPoint: checkoutUrl,
    };
  },
);

// ─── Verificar pagamento MP e creditar (idempotente) ─────────────────────────
export const verifyMPPayment = onCall(
  { secrets: [MP_ACCESS_TOKEN], region: 'us-central1' },
  async (request) => {
    checkAppToken(request, 'verifyMPPayment');
    const uid = request.auth?.uid;
    assertAuth(uid);

    const preferenceId = sanitizeString(request.data?.preferenceId, 100);
    if (!preferenceId) throw new HttpsError('invalid-argument', 'preferenceId obrigatorio.');

    const pendingSnap = await db.collection('pending_payments')
      .where('preferenceId', '==', preferenceId)
      .where('userId', '==', uid)
      .limit(1)
      .get();

    const externalReference: string | null = pendingSnap.empty
      ? null
      : (pendingSnap.docs[0].data().externalReference as string | undefined) ?? null;

    const searchUrl = externalReference
      ? `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(externalReference)}&sort=date_created&criteria=desc`
      : `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&range=date_created&begin_date=NOW-1DAYS&end_date=NOW`;

    const resp = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${readSecret(MP_ACCESS_TOKEN)}` },
    });
    if (!resp.ok) return { status: 'pending' };

    const data = await resp.json() as { results?: Array<{ id?: string; status?: string; external_reference?: string }> };
    const results = data.results ?? [];

    const payment = results.find((p) =>
      externalReference
        ? p.external_reference === externalReference
        : p.external_reference?.startsWith(`${uid}|`)
    );

    if (!payment) return { status: 'pending' };
    const mpStatus = payment.status ?? '';

    if (mpStatus === 'approved') {
      const paymentRef = String(payment.id);
      const existing = await db.collection('credit_purchases')
        .where('paymentRef', '==', paymentRef)
        .limit(1)
        .get();
      if (!existing.empty) return { status: 'approved' };

      const ref = payment.external_reference ?? '';
      const [refUid, refPackageId] = ref.split('|');
      if (refUid !== uid) throw new HttpsError('permission-denied', 'Pagamento nao pertence a este usuario.');

      const pkg = CREDIT_PACKAGES[refPackageId];
      if (!pkg) throw new HttpsError('invalid-argument', 'Pacote do pagamento invalido.');

      await db.runTransaction(async (tx) => {
        const userRef = db.collection('users').doc(uid);
        tx.update(userRef, { promotionCredits: FieldValue.increment(pkg.credits) });
        const purchaseRef = db.collection('credit_purchases').doc();
        tx.set(purchaseRef, {
          userId: uid,
          packageId: refPackageId,
          credits: pkg.credits,
          price: pkg.price,
          paymentMethod: 'mercadopago',
          paymentRef,
          createdAt: Date.now(),
        });
      });

      try {
        if (!pendingSnap.empty) {
          await pendingSnap.docs[0].ref.update({ status: 'completed', completedAt: Date.now() });
        }
      } catch {}

      return { status: 'approved', credits: pkg.credits };
    }

    if (['in_process', 'authorized', 'pending'].includes(mpStatus)) return { status: 'pending' };
    return { status: 'rejected' };
  },
);

// ─── Criar preferência de doação ─────────────────────────────────────────────
export const createDonationPreference = onCall(
  { secrets: [MP_ACCESS_TOKEN], region: 'us-central1' },
  async (request) => {
    checkAppToken(request, 'createDonationPreference');
    const uid = request.auth?.uid;
    assertAuth(uid);
    await enforcePaymentCooldown(uid);

    const amount = request.data?.amount as number;
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new HttpsError('invalid-argument', 'Valor invalido.');
    }
    const MAX_DONATION_BRL = 500;
    if (amount > MAX_DONATION_BRL) {
      throw new HttpsError('invalid-argument', `Doacao maxima permitida: R$${MAX_DONATION_BRL}.`);
    }
    const safeAmount = Math.round(amount * 100) / 100;

    const externalReference = `donation|${uid}|${Date.now()}`;

    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${readSecret(MP_ACCESS_TOKEN)}`,
      },
      body: JSON.stringify({
        items: [{
          id: 'donation',
          title: 'Doacao Alertoo',
          description: 'Apoie o desenvolvimento do Alertoo',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: safeAmount,
        }],
        back_urls: {
          success: 'alertoo://donation/success',
          failure: 'alertoo://donation/failure',
          pending: 'alertoo://donation/pending',
        },
        auto_return: 'approved',
        statement_descriptor: 'ALERTOO',
        external_reference: externalReference,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('MP create donation preference failed', resp.status, txt);
      throw new HttpsError('internal', 'Falha ao criar doacao.');
    }

    const data = await resp.json() as { id?: string; init_point?: string };
    return {
      preferenceId: data.id,
      initPoint: data.init_point ?? '',
    };
  },
);

// ─── Reconciliação de pagamentos pendentes ───────────────────────────────────
const RECONCILE_MIN_AGE_MS = 10 * 60 * 1000;
const RECONCILE_EXPIRE_AGE_MS = 24 * 60 * 60 * 1000;

async function creditApprovedPayment(
  pendingDoc: FirebaseFirestore.QueryDocumentSnapshot,
  paymentRef: string,
  paymentMethod: string,
): Promise<void> {
  const data = pendingDoc.data();
  const uid = data.userId as string;
  const packageId = data.packageId as string;
  const pkg = CREDIT_PACKAGES[packageId];
  if (!pkg) {
    console.error(`[reconcile] pending_payment ${pendingDoc.id} com packageId invalido: ${packageId}`);
    return;
  }

  const existing = await db.collection('credit_purchases')
    .where('paymentRef', '==', paymentRef)
    .limit(1)
    .get();

  if (existing.empty) {
    await db.runTransaction(async (tx) => {
      const userRef = db.collection('users').doc(uid);
      tx.update(userRef, { promotionCredits: FieldValue.increment(pkg.credits) });
      const purchaseRef = db.collection('credit_purchases').doc();
      tx.set(purchaseRef, {
        userId: uid,
        packageId,
        credits: pkg.credits,
        price: pkg.price,
        paymentMethod,
        paymentRef,
        createdAt: Date.now(),
        reconciledAt: Date.now(),
      });
    });
    console.log(`[reconcile] creditou ${pkg.credits} credito(s) para ${uid} (pendingId=${pendingDoc.id}, ref=${paymentRef})`);
  }

  await pendingDoc.ref.update({ status: 'completed', completedAt: Date.now(), reconciled: true });
}

export const reconcilePendingPayments = _onSchedule(
  { schedule: 'every 60 minutes', region: 'us-central1', secrets: [MP_ACCESS_TOKEN, STRIPE_SECRET_KEY] },
  async () => {
    const cutoff = Date.now() - RECONCILE_MIN_AGE_MS;
    const expireCutoff = Date.now() - RECONCILE_EXPIRE_AGE_MS;

    const pendingSnap = await db.collection('pending_payments')
      .where('status', '==', 'pending')
      .where('createdAt', '<', cutoff)
      .limit(100)
      .get();

    let credited = 0;
    let expired = 0;

    for (const doc of pendingSnap.docs) {
      const data = doc.data();
      const createdAt = Number(data.createdAt ?? 0);
      try {
        if (data.paymentMethod === 'stripe' && data.stripePaymentIntentId) {
          const stripe = new Stripe(readSecret(STRIPE_SECRET_KEY), { apiVersion: '2026-04-22.dahlia' as any });
          const pi = await stripe.paymentIntents.retrieve(data.stripePaymentIntentId);
          if (pi.status === 'succeeded') {
            await creditApprovedPayment(doc, pi.id, 'stripe');
            credited++;
            continue;
          }
          if (['canceled', 'requires_payment_method'].includes(pi.status) && createdAt < expireCutoff) {
            await doc.ref.update({ status: 'expired', expiredAt: Date.now() });
            expired++;
          }
          continue;
        }

        if (data.paymentMethod === 'pix' && data.paymentId) {
          const resp = await fetch(`https://api.mercadopago.com/v1/payments/${data.paymentId}`, {
            headers: { Authorization: `Bearer ${readSecret(MP_ACCESS_TOKEN)}` },
          });
          if (!resp.ok) continue;
          const payment = await resp.json() as { id?: number; status?: string };
          if (payment.status === 'approved') {
            await creditApprovedPayment(doc, String(payment.id), 'pix');
            credited++;
            continue;
          }
          if (!['in_process', 'authorized', 'pending'].includes(payment.status ?? '') && createdAt < expireCutoff) {
            await doc.ref.update({ status: 'expired', expiredAt: Date.now() });
            expired++;
          }
          continue;
        }

        // Cartão via Checkout Pro (createMPPreference) — busca por external_reference
        if (data.externalReference && data.preferenceId) {
          const searchUrl = `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(data.externalReference)}&sort=date_created&criteria=desc`;
          const resp = await fetch(searchUrl, {
            headers: { Authorization: `Bearer ${readSecret(MP_ACCESS_TOKEN)}` },
          });
          if (!resp.ok) continue;
          const result = await resp.json() as { results?: Array<{ id?: string; status?: string }> };
          const payment = result.results?.[0];
          if (!payment) continue;
          if (payment.status === 'approved') {
            await creditApprovedPayment(doc, String(payment.id), 'mercadopago');
            credited++;
            continue;
          }
          if (!['in_process', 'authorized', 'pending'].includes(payment.status ?? '') && createdAt < expireCutoff) {
            await doc.ref.update({ status: 'expired', expiredAt: Date.now() });
            expired++;
          }
        }
      } catch (err: any) {
        console.error(`[reconcile] erro ao processar pending_payment ${doc.id}:`, err?.message ?? err);
      }
    }

    console.log(`[reconcile] ${pendingSnap.size} pendentes verificados — ${credited} creditados, ${expired} expirados.`);
  },
);
