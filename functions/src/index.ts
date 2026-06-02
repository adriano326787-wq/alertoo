/**
 * Cloud Functions do Alertoo
 *
 * Mantém credenciais sensíveis (MP, Stripe) FORA do app cliente.
 * O cliente nunca vê os tokens — apenas chama estas funções via Firebase callable.
 *
 * Secrets (rodar uma vez no terminal — NÃO via pipe para evitar BOM):
 *   firebase functions:secrets:set MP_ACCESS_TOKEN
 *   firebase functions:secrets:set STRIPE_SECRET_KEY
 *
 * Deploy:
 *   firebase deploy --only functions
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getMessaging } from 'firebase-admin/messaging';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import Stripe from 'stripe';

initializeApp();
const db = getFirestore();
const visionClient = new ImageAnnotatorClient();

// Segredos no Google Secret Manager — nunca expostos no código
const MP_ACCESS_TOKEN   = defineSecret('MP_ACCESS_TOKEN');
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const ALERTOO_PIX_KEY_SECRET = defineSecret('ALERTOO_PIX_KEY');

/**
 * Lê um secret removendo BOM (U+FEFF) e espaços em branco.
 *
 * Secrets armazenados via PowerShell `echo "..." | firebase functions:secrets:set`
 * podem conter um BOM no início do valor. O BOM tem código 65279 (> 255), que não
 * é uma ByteString válida para headers HTTP — causa ERR_INVALID_CHAR em fetch()
 * e "connection error" no Stripe SDK.
 */
function readSecret(secret: { value(): string }): string {
  // Remove BOM (U+FEFF) e whitespace — secrets via PowerShell pipe podem ter BOM
  // que causa ERR_INVALID_CHAR em headers HTTP (65279 > 255 nao e ByteString valido)
  // eslint-disable-next-line no-control-regex
  return secret.value().replace(/﻿/g, '').replace(/^\s+|\s+$/g, '');
}

// ─── Pacotes válidos (manter em sincronia com src/types/promotion.ts) ─────────
const CREDIT_PACKAGES: Record<string, { credits: number; price: number; label: string }> = {
  pkg_1:  { credits: 1,  price: 4.99,  label: '1 credito' },
  pkg_5:  { credits: 5,  price: 19.99, label: '5 creditos' },
  pkg_10: { credits: 10, price: 34.99, label: '10 creditos' },
  pkg_20: { credits: 20, price: 59.99, label: '20 creditos' },
};

// ─── Criar preferência de pagamento MP (Cartão via Checkout Pro) ──────────────
export const createMPPreference = onCall(
  { secrets: [MP_ACCESS_TOKEN], region: 'us-central1' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Login obrigatorio.');

    const packageId = request.data?.packageId as string;
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
          // Exclui boleto e PIX — PIX tem fluxo proprio no app
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

    // Sempre usa init_point (URL de producao) — sandbox_init_point so funciona com token sandbox
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
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Login obrigatorio.');

    const preferenceId = request.data?.preferenceId as string;
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

// ─── Chave PIX Alertoo ────────────────────────────────────────────────────────
// Lida do Secret Manager em runtime — não hardcoded no código
const PIX_EXPIRY_MINUTES = 30;

// ─── Criar pagamento PIX via Mercado Pago ─────────────────────────────────────
// O QR Code vem da API MP (nao gerado localmente) para ser rastreavel pelo paymentId.
// Quando o usuario paga o QR Code da MP, o payment e marcado "approved" automaticamente.
export const createPixPayment = onCall(
  { secrets: [MP_ACCESS_TOKEN, ALERTOO_PIX_KEY_SECRET], region: 'us-central1' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Login obrigatorio.');

    const packageId = request.data?.packageId as string;
    const pkg = CREDIT_PACKAGES[packageId];
    if (!pkg) throw new HttpsError('invalid-argument', 'Pacote invalido.');

    const timestamp = Date.now();
    const externalReference = `${uid}|${packageId}|${timestamp}`;
    const expiresAt = new Date(timestamp + PIX_EXPIRY_MINUTES * 60 * 1000);

    const mpResp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${readSecret(MP_ACCESS_TOKEN)}`,
        'X-Idempotency-Key': externalReference,
      },
      body: JSON.stringify({
        transaction_amount: pkg.price,
        payment_method_id: 'pix',
        description: `${pkg.credits} credito(s) Alertoo`,
        external_reference: externalReference,
        date_of_expiration: expiresAt.toISOString(),
        payer: {
          email: request.data?.payerEmail ?? `user_${uid.slice(0, 8)}@alertoo.app`,
          first_name: 'Usuario',
          last_name: 'Alertoo',
        },
      }),
    });

    if (!mpResp.ok) {
      const txt = await mpResp.text();
      console.error('MP PIX creation failed', mpResp.status, txt);
      throw new HttpsError('internal', 'Falha ao gerar PIX. Tente novamente.');
    }

    const mpData = await mpResp.json() as {
      id?: number;
      point_of_interaction?: {
        transaction_data?: {
          qr_code?: string;
          qr_code_base64?: string;
        };
      };
    };

    const paymentId = String(mpData.id ?? '');
    const pixCode = mpData.point_of_interaction?.transaction_data?.qr_code ?? '';

    if (!pixCode) {
      console.error('MP PIX: qr_code ausente na resposta', JSON.stringify(mpData));
      throw new HttpsError('internal', 'QR Code PIX nao retornado pela MP.');
    }

    await db.collection('pending_payments').add({
      userId: uid,
      paymentId,
      externalReference,
      packageId,
      credits: pkg.credits,
      price: pkg.price,
      paymentMethod: 'pix',
      status: 'pending',
      createdAt: timestamp,
      expiresAt: expiresAt.getTime(),
    });

    return {
      paymentId,
      pixCode,
      pixQrBase64: null,
      expiresAt: expiresAt.getTime(),
    };
  },
);

// ─── Verificar status de pagamento PIX ────────────────────────────────────────
export const verifyPixPayment = onCall(
  { secrets: [MP_ACCESS_TOKEN], region: 'us-central1' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Login obrigatorio.');

    const paymentId = request.data?.paymentId as string;
    if (!paymentId) throw new HttpsError('invalid-argument', 'paymentId obrigatorio.');

    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${readSecret(MP_ACCESS_TOKEN)}` },
    });

    if (!resp.ok) return { status: 'pending' };

    const payment = await resp.json() as {
      id?: number;
      status?: string;
      external_reference?: string;
    };

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
          paymentMethod: 'pix',
          paymentRef,
          createdAt: Date.now(),
        });
      });

      try {
        const pendingSnap = await db.collection('pending_payments')
          .where('paymentId', '==', paymentId)
          .limit(1)
          .get();
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

// ─── Crédito por anúncio recompensado ─────────────────────────────────────────
const AD_CREDIT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hora

export const awardAdCredit = onCall(
  { region: 'us-central1' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Login obrigatorio.');

    const recentSnap = await db.collection('credit_purchases')
      .where('userId', '==', uid)
      .where('paymentMethod', '==', 'rewarded_ad')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!recentSnap.empty) {
      const lastCreatedAt = recentSnap.docs[0].data().createdAt as number;
      if (Date.now() - lastCreatedAt < AD_CREDIT_COOLDOWN_MS) {
        throw new HttpsError('resource-exhausted', 'Aguarde 1 hora entre os anuncios.');
      }
    }

    await db.runTransaction(async (tx) => {
      const userRef = db.collection('users').doc(uid);
      tx.update(userRef, { promotionCredits: FieldValue.increment(1) });
      const purchaseRef = db.collection('credit_purchases').doc();
      tx.set(purchaseRef, {
        userId: uid,
        packageId: 'rewarded_ad',
        credits: 1,
        price: 0,
        paymentMethod: 'rewarded_ad',
        paymentRef: `ad_reward_${Date.now()}`,
        createdAt: Date.now(),
      });
    });

    const userSnap = await db.collection('users').doc(uid).get();
    const credits = (userSnap.data()?.promotionCredits as number) ?? 0;
    return { credits };
  },
);

// ─── Stripe: Criar PaymentIntent para cartão internacional ───────────────────
export const createStripePaymentIntent = onCall(
  { secrets: [STRIPE_SECRET_KEY], region: 'us-central1' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Login obrigatorio.');

    const packageId = request.data?.packageId as string;
    const pkg = CREDIT_PACKAGES[packageId];
    if (!pkg) throw new HttpsError('invalid-argument', 'Pacote invalido.');

    const stripe = new Stripe(readSecret(STRIPE_SECRET_KEY), { apiVersion: '2026-04-22.dahlia' as any });

    const externalReference = `${uid}|${packageId}|${Date.now()}`;
    const amountCents = Math.round(pkg.price * 100);

    // Cria ou reutiliza Customer Stripe vinculado ao Firebase UID
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
        currency: 'brl',
        customer: customerId,
        metadata: {
          firebaseUid: uid,
          packageId,
          credits: String(pkg.credits),
          externalReference,
        },
        // allow_redirects: 'never' e obrigatorio para Payment Sheet mobile —
        // evita metodos que requerem redirecionamento (incompativeis com app nativo)
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
      price: pkg.price,
      paymentMethod: 'stripe',
      status: 'pending',
      createdAt: Date.now(),
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: pkg.price,
      currency: 'BRL',
    };
  },
);

// ─── Stripe: Verificar e creditar após pagamento ──────────────────────────────
export const verifyStripePayment = onCall(
  { secrets: [STRIPE_SECRET_KEY], region: 'us-central1' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Login obrigatorio.');

    const paymentIntentId = request.data?.paymentIntentId as string;
    if (!paymentIntentId) throw new HttpsError('invalid-argument', 'paymentIntentId obrigatorio.');

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
        price: pkg.price,
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

// ─── Moderação de foto de promoção (Cloud Storage trigger) ───────────────────
export const moderatePhoto = onObjectFinalized(
  { bucket: 'lei-seca---eventos.firebasestorage.app', region: 'us-east1' },
  async (event) => {
    const filePath = event.data.name;
    if (!filePath?.startsWith('promotions/')) return;

    const bucket = getStorage().bucket(event.data.bucket);
    const file = bucket.file(filePath);

    let imageUri: string;
    try {
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 5 * 60 * 1000,
      });
      imageUri = url;
    } catch {
      return;
    }

    let isSafe = true;
    try {
      const [result] = await visionClient.safeSearchDetection(imageUri);
      const ann = result.safeSearchAnnotation;
      if (!ann) return;

      const LIKELY = new Set(['LIKELY', 'VERY_LIKELY']);
      const toStr = (v: unknown) => (typeof v === 'string' ? v : String(v ?? ''));
      if (
        LIKELY.has(toStr(ann.adult)) ||
        LIKELY.has(toStr(ann.violence)) ||
        LIKELY.has(toStr(ann.racy))
      ) {
        isSafe = false;
      }
    } catch (e) {
      console.error('Vision API error:', e);
      return;
    }

    if (!isSafe) {
      await file.delete().catch(() => {});
      const parts = filePath.split('/');
      const userId = parts[1];
      const eventId = parts[2]?.split('_')[0];
      if (userId && eventId) {
        await db.collection('entertainment_events').doc(eventId).update({
          promotionPhotoUrl: null,
          promotionPhotoUrls: [],
        }).catch(() => {});
        console.warn(`Photo rejected for event ${eventId} (userId: ${userId})`);
      }
    }
  },
);

// ─── Criar preferência de doação ─────────────────────────────────────────────
export const createDonationPreference = onCall(
  { secrets: [MP_ACCESS_TOKEN], region: 'us-central1' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Login obrigatorio.');

    const amount = request.data?.amount as number;
    if (!amount || amount <= 0) throw new HttpsError('invalid-argument', 'Valor invalido.');

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
          unit_price: amount,
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

// ─── Limpeza diária de eventos expirados (#16) ────────────────────────────────
// Remove eventos de entretenimento cuja data de expiração já passou.
// Executa às 3h (América/São_Paulo) para minimizar impacto nos usuários.
export const cleanupExpiredEvents = onSchedule(
  { schedule: 'every 24 hours', region: 'us-central1', timeZone: 'America/Sao_Paulo' },
  async () => {
    const now = Timestamp.now();

    // Lote 1: entertainment_events
    const expiredEnt = await db.collection('entertainment_events')
      .where('expiresAt', '<', now)
      .limit(400)
      .get();

    // Lote 2: events (road) — backup caso o expiryTimer do cliente não tenha removido
    const expiredRoad = await db.collection('events')
      .where('expiresAt', '<', now)
      .limit(400)
      .get();

    const batch = db.batch();
    expiredEnt.docs.forEach((d) => batch.delete(d.ref));
    expiredRoad.docs.forEach((d) => batch.delete(d.ref));

    if (expiredEnt.size + expiredRoad.size > 0) {
      await batch.commit();
    }

    console.log(
      `[cleanup] ${expiredEnt.size} eventos de entretenimento + ` +
      `${expiredRoad.size} road events expirados removidos.`
    );
  },
);

// ─── Rate limiting server-side: road events (#13) ────────────────────────────
// Ao criar um road event, registra timestamp no documento do usuário.
// Permite auditoria e validação futura via Security Rules.
export const onRoadEventCreated = onDocumentCreated(
  { document: 'events/{eventId}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const userId = data.userId as string | undefined;
    if (!userId || userId === 'anonymous') return;

    await db.collection('users').doc(userId).update({
      lastRoadEventAt: FieldValue.serverTimestamp(),
    }).catch(() => {
      // Documento pode não existir ainda em contas novas — ignora
    });
  },
);

// ─── Rate limiting server-side: entertainment events (#13) ───────────────────
export const onEntertainmentEventCreated = onDocumentCreated(
  { document: 'entertainment_events/{eventId}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const userId = data.userId as string | undefined;
    if (!userId || userId === 'anonymous') return;

    await db.collection('users').doc(userId).update({
      lastEntEventAt: FieldValue.serverTimestamp(),
    }).catch(() => {});
  },
);

// ─── Registro de token FCM (#1) ───────────────────────────────────────────────
// O cliente chama esta função para salvar/atualizar seu token de push no Firestore.
// O token é salvo no documento do usuário para uso futuro em notificações remotas.
export const registerFcmToken = onCall(
  { region: 'us-central1' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Login obrigatorio.');

    const token = request.data?.token as string | undefined;
    if (!token || typeof token !== 'string') {
      throw new HttpsError('invalid-argument', 'Token invalido.');
    }

    await db.collection('users').doc(uid).update({
      fcmTokens: FieldValue.arrayUnion(token),
      fcmUpdatedAt: FieldValue.serverTimestamp(),
    }).catch(async () => {
      // Se o doc não existir, cria com set (merge)
      await db.collection('users').doc(uid).set({
        fcmTokens: [token],
        fcmUpdatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return { ok: true };
  },
);

// ─── Envio de notificação FCM para usuários de um estado (#1) ─────────────────
// Notifica até 100 usuários cadastrados no mesmo estado (stateUF) do evento.
// Chamada internamente pelos triggers de criação de evento.
async function notifyStateUsers(params: {
  stateUF: string;
  title: string;
  body: string;
  data: Record<string, string>;
  excludeUid?: string;
}): Promise<void> {
  try {
    const { stateUF, title, body, data, excludeUid } = params;

    // Busca usuários que têm token FCM e filtro no mesmo estado
    const usersSnap = await db.collection('users')
      .where('filterStateUF', '==', stateUF)
      .limit(100)
      .get();

    const tokens: string[] = [];
    usersSnap.docs.forEach((d) => {
      if (d.id === excludeUid) return;
      const fcmTokens = d.data().fcmTokens as string[] | undefined;
      if (Array.isArray(fcmTokens)) tokens.push(...fcmTokens);
    });

    if (tokens.length === 0) return;

    // Envia em lotes de 500 (limite do FCM sendEachForMulticast)
    const BATCH = 500;
    for (let i = 0; i < tokens.length; i += BATCH) {
      const chunk = tokens.slice(i, i + BATCH);
      await getMessaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data,
        android: { priority: 'high', notification: { channelId: 'default' } },
      }).catch((e) => console.error('[FCM] sendEachForMulticast error:', e));
    }
  } catch (e) {
    console.error('[FCM] notifyStateUsers error:', e);
  }
}

// ─── Notifica usuários ao criar road event (#1) ──────────────────────────────
export const notifyOnRoadEvent = onDocumentCreated(
  { document: 'events/{eventId}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const stateUF = data.stateUF as string | undefined;
    if (!stateUF) return;

    await notifyStateUsers({
      stateUF,
      title: `${data.category === 'accident' ? '🚨' : '🚦'} ${data.title ?? 'Novo alerta'}`,
      body: data.cityName ? `${data.cityName} · ${stateUF}` : stateUF,
      data: { eventId: event.params.eventId, eventType: 'road' },
      excludeUid: data.userId,
    });
  },
);
