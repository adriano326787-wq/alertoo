import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import {
  db,
  STRIPE_SECRET_KEY,
  CREDIT_PACKAGES,
  readSecret,
  sanitizeString,
  assertAuth,
  enforcePaymentCooldown,
  checkAppToken,
} from '../shared';
import { resolveCurrencyForCountry } from '../utils/currency';

// ─── Stripe: Criar PaymentIntent para cartão internacional ───────────────────
export const createStripePaymentIntent = onCall(
  { secrets: [STRIPE_SECRET_KEY], region: 'us-central1' },
  async (request) => {
    checkAppToken(request, 'createStripePaymentIntent');
    const uid = request.auth?.uid;
    assertAuth(uid);
    await enforcePaymentCooldown(uid);

    const packageId = sanitizeString(request.data?.packageId, 20);
    const pkg = CREDIT_PACKAGES[packageId];
    if (!pkg) throw new HttpsError('invalid-argument', 'Pacote invalido.');

    // Moeda vem do countryCode salvo no perfil do usuário (servidor), nunca do
    // cliente — evita que alguém manipule o request pra pagar em USD sendo do Brasil.
    const userSnap = await db.collection('users').doc(uid).get();
    const currency = resolveCurrencyForCountry(userSnap.data()?.countryCode);
    const price = currency === 'USD' ? pkg.priceUSD : pkg.price;

    const stripe = new Stripe(readSecret(STRIPE_SECRET_KEY), { apiVersion: '2026-04-22.dahlia' as any });

    const externalReference = `${uid}|${packageId}|${Date.now()}`;
    const amountCents = Math.round(price * 100);

    let customerId: string | undefined;
    try {
      const existing = await stripe.customers.search({
        query: `metadata['firebaseUid']:'${uid}'`,
        limit: 1,
      });
      customerId = existing.data.length > 0
        ? existing.data[0].id
        : (await stripe.customers.create({ metadata: { firebaseUid: uid } })).id;
    } catch {
      // Customer nao critico — pagamento funciona sem ele
    }

    let paymentIntent: Awaited<ReturnType<typeof stripe.paymentIntents.create>>;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: currency.toLowerCase(),
        customer: customerId,
        metadata: {
          firebaseUid: uid,
          packageId,
          credits: String(pkg.credits),
          externalReference,
        },
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        description: `${pkg.label} — Alertoo`,
        statement_descriptor_suffix: 'ALERTOO',
      });
    } catch (stripeErr: any) {
      console.error('Stripe PaymentIntent creation failed:', stripeErr?.message ?? stripeErr);
      throw new HttpsError('internal', stripeErr?.message ?? 'Falha ao criar pagamento Stripe.');
    }

    await db.collection('pending_payments').add({
      userId: uid,
      stripePaymentIntentId: paymentIntent.id,
      externalReference,
      packageId,
      credits: pkg.credits,
      price,
      currency,
      paymentMethod: 'stripe',
      status: 'pending',
      createdAt: Date.now(),
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: price,
      currency,
    };
  },
);

// ─── Stripe: Verificar e creditar após pagamento ──────────────────────────────
export const verifyStripePayment = onCall(
  { secrets: [STRIPE_SECRET_KEY], region: 'us-central1' },
  async (request) => {
    checkAppToken(request, 'verifyStripePayment');
    const uid = request.auth?.uid;
    assertAuth(uid);

    const paymentIntentId = sanitizeString(request.data?.paymentIntentId, 66);
    if (!paymentIntentId) throw new HttpsError('invalid-argument', 'paymentIntentId obrigatorio.');
    if (!/^pi_[a-zA-Z0-9_]+$/.test(paymentIntentId)) throw new HttpsError('invalid-argument', 'paymentIntentId com formato invalido.');

    const stripe = new Stripe(readSecret(STRIPE_SECRET_KEY), { apiVersion: '2026-04-22.dahlia' as any });

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.metadata?.firebaseUid !== uid) {
      throw new HttpsError('permission-denied', 'Pagamento nao pertence a este usuario.');
    }

    if (pi.status !== 'succeeded') {
      if (['requires_payment_method', 'canceled'].includes(pi.status)) {
        return { status: 'rejected' };
      }
      return { status: 'pending' };
    }

    const paymentRef = pi.id;
    const existing = await db.collection('credit_purchases')
      .where('paymentRef', '==', paymentRef)
      .limit(1)
      .get();
    if (!existing.empty) return { status: 'approved', credits: Number(pi.metadata.credits) };

    const pkgId = pi.metadata.packageId;
    const pkg = CREDIT_PACKAGES[pkgId];
    if (!pkg) throw new HttpsError('invalid-argument', 'Pacote invalido.');

    await db.runTransaction(async (tx) => {
      const userRef = db.collection('users').doc(uid);
      tx.update(userRef, { promotionCredits: FieldValue.increment(pkg.credits) });
      const purchaseRef = db.collection('credit_purchases').doc();
      tx.set(purchaseRef, {
        userId: uid,
        packageId: pkgId,
        credits: pkg.credits,
        // Usa o valor/moeda REAIS cobrados pelo Stripe (pi.amount/pi.currency),
        // não re-deriva de CREDIT_PACKAGES — evita divergência se o preço mudar
        // entre a criação e a confirmação do pagamento.
        price: pi.amount / 100,
        currency: pi.currency.toUpperCase(),
        paymentMethod: 'stripe',
        paymentRef,
        createdAt: Date.now(),
      });
    });

    try {
      const pendingSnap = await db.collection('pending_payments')
        .where('stripePaymentIntentId', '==', paymentIntentId)
        .limit(1)
        .get();
      if (!pendingSnap.empty) {
        await pendingSnap.docs[0].ref.update({ status: 'completed', completedAt: Date.now() });
      }
    } catch {}

    return { status: 'approved', credits: pkg.credits };
  },
);
