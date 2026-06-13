"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventPage = exports.onUserProfileWritten = exports.dailySecurityReport = exports.monitorPaymentAttempts = exports.monitorEventVolume = exports.notifyOnRoadEvent = exports.registerFcmToken = exports.onEntertainmentEventCreated = exports.onRoadEventCreated = exports.reconcilePendingPayments = exports.cleanupExpiredEvents = exports.createDonationPreference = exports.moderatePhoto = exports.verifyStripePayment = exports.createStripePaymentIntent = exports.awardAdCredit = exports.verifyPixPayment = exports.createPixPayment = exports.verifyMPPayment = exports.createMPPreference = void 0;
const https_1 = require("firebase-functions/v2/https");
const storage_1 = require("firebase-functions/v2/storage");
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const storage_2 = require("firebase-admin/storage");
const messaging_1 = require("firebase-admin/messaging");
const vision_1 = require("@google-cloud/vision");
const stripe_1 = __importDefault(require("stripe"));
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
const visionClient = new vision_1.ImageAnnotatorClient();
// Segredos no Google Secret Manager — nunca expostos no código
const MP_ACCESS_TOKEN = (0, params_1.defineSecret)('MP_ACCESS_TOKEN');
const STRIPE_SECRET_KEY = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
const ALERTOO_PIX_KEY_SECRET = (0, params_1.defineSecret)('ALERTOO_PIX_KEY');
/**
 * Lê um secret removendo BOM (U+FEFF) e espaços em branco.
 *
 * Secrets armazenados via PowerShell `echo "..." | firebase functions:secrets:set`
 * podem conter um BOM no início do valor. O BOM tem código 65279 (> 255), que não
 * é uma ByteString válida para headers HTTP — causa ERR_INVALID_CHAR em fetch()
 * e "connection error" no Stripe SDK.
 */
function readSecret(secret) {
    // Remove BOM (U+FEFF) e whitespace — secrets via PowerShell pipe podem ter BOM
    // que causa ERR_INVALID_CHAR em headers HTTP (65279 > 255 nao e ByteString valido)
    // eslint-disable-next-line no-control-regex
    return secret.value().replace(/﻿/g, '').replace(/^\s+|\s+$/g, '');
}
// ─── Sanitização de string — remove caracteres de controle e limita tamanho ──
function sanitizeString(value, maxLength) {
    if (typeof value !== 'string')
        throw new https_1.HttpsError('invalid-argument', 'Campo de texto invalido.');
    // Remove caracteres de controle (exceto \n e \t) e espaços redundantes
    // eslint-disable-next-line no-control-regex
    const clean = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
    if (clean.length === 0)
        throw new https_1.HttpsError('invalid-argument', 'Campo vazio apos sanitizacao.');
    if (clean.length > maxLength)
        throw new https_1.HttpsError('invalid-argument', `Campo excede ${maxLength} caracteres.`);
    return clean;
}
// ─── Validação de UID Firebase ─────────────────────────────────────────────
function assertAuth(uid) {
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Login obrigatorio.');
}
// ─── Limites de negócio ────────────────────────────────────────────────────
const MAX_DONATION_BRL = 500; // Doação máxima R$500 — evita abuso de estorno
const MAX_FCM_TOKEN_LEN = 300; // Tokens FCM têm ~163 chars; 300 é margem segura
// ─── App Check — verificação de origem ────────────────────────────────────
// Modo AUDIT: loga chamadas sem token mas não rejeita (enquanto o SDK não for
// adicionado ao app). Quando o SDK estiver integrado no Android/iOS, trocar
// enforceAppCheck: true nas funções abaixo para ativar rejeição real.
function checkAppToken(request, fnName) {
    if (!request.app) {
        // Chamada sem App Check token — pode ser bot, scraper ou cliente legado.
        // Loga para monitoramento; quando o app tiver o SDK, mude para ENFORCED.
        console.warn(`[AppCheck][AUDIT] ${fnName} chamado sem token de app válido`, {
            uid: request.auth?.uid ?? 'anonymous',
            timestamp: new Date().toISOString(),
        });
    }
}
// ─── Pacotes válidos (manter em sincronia com src/types/promotion.ts) ─────────
const CREDIT_PACKAGES = {
    pkg_1: { credits: 1, price: 4.99, label: '1 credito' },
    pkg_5: { credits: 5, price: 19.99, label: '5 creditos' },
    pkg_10: { credits: 10, price: 34.99, label: '10 creditos' },
    pkg_20: { credits: 20, price: 59.99, label: '20 creditos' },
};
// ─── Criar preferência de pagamento MP (Cartão via Checkout Pro) ──────────────
exports.createMPPreference = (0, https_1.onCall)({ secrets: [MP_ACCESS_TOKEN], region: 'us-central1' }, async (request) => {
    checkAppToken(request, 'createMPPreference');
    const uid = request.auth?.uid;
    assertAuth(uid);
    const packageId = sanitizeString(request.data?.packageId, 20);
    const pkg = CREDIT_PACKAGES[packageId];
    if (!pkg)
        throw new https_1.HttpsError('invalid-argument', 'Pacote invalido.');
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
        throw new https_1.HttpsError('internal', 'Falha ao criar pagamento.');
    }
    const data = await resp.json();
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
});
// ─── Verificar pagamento MP e creditar (idempotente) ─────────────────────────
exports.verifyMPPayment = (0, https_1.onCall)({ secrets: [MP_ACCESS_TOKEN], region: 'us-central1' }, async (request) => {
    checkAppToken(request, 'verifyMPPayment');
    const uid = request.auth?.uid;
    assertAuth(uid);
    const preferenceId = sanitizeString(request.data?.preferenceId, 100);
    if (!preferenceId)
        throw new https_1.HttpsError('invalid-argument', 'preferenceId obrigatorio.');
    const pendingSnap = await db.collection('pending_payments')
        .where('preferenceId', '==', preferenceId)
        .where('userId', '==', uid)
        .limit(1)
        .get();
    const externalReference = pendingSnap.empty
        ? null
        : pendingSnap.docs[0].data().externalReference ?? null;
    const searchUrl = externalReference
        ? `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(externalReference)}&sort=date_created&criteria=desc`
        : `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&range=date_created&begin_date=NOW-1DAYS&end_date=NOW`;
    const resp = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${readSecret(MP_ACCESS_TOKEN)}` },
    });
    if (!resp.ok)
        return { status: 'pending' };
    const data = await resp.json();
    const results = data.results ?? [];
    const payment = results.find((p) => externalReference
        ? p.external_reference === externalReference
        : p.external_reference?.startsWith(`${uid}|`));
    if (!payment)
        return { status: 'pending' };
    const mpStatus = payment.status ?? '';
    if (mpStatus === 'approved') {
        const paymentRef = String(payment.id);
        const existing = await db.collection('credit_purchases')
            .where('paymentRef', '==', paymentRef)
            .limit(1)
            .get();
        if (!existing.empty)
            return { status: 'approved' };
        const ref = payment.external_reference ?? '';
        const [refUid, refPackageId] = ref.split('|');
        if (refUid !== uid)
            throw new https_1.HttpsError('permission-denied', 'Pagamento nao pertence a este usuario.');
        const pkg = CREDIT_PACKAGES[refPackageId];
        if (!pkg)
            throw new https_1.HttpsError('invalid-argument', 'Pacote do pagamento invalido.');
        await db.runTransaction(async (tx) => {
            const userRef = db.collection('users').doc(uid);
            tx.update(userRef, { promotionCredits: firestore_2.FieldValue.increment(pkg.credits) });
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
        }
        catch { }
        return { status: 'approved', credits: pkg.credits };
    }
    if (['in_process', 'authorized', 'pending'].includes(mpStatus))
        return { status: 'pending' };
    return { status: 'rejected' };
});
// ─── Chave PIX Alertoo ────────────────────────────────────────────────────────
// Lida do Secret Manager em runtime — não hardcoded no código
const PIX_EXPIRY_MINUTES = 30;
// ─── Criar pagamento PIX via Mercado Pago ─────────────────────────────────────
// O QR Code vem da API MP (nao gerado localmente) para ser rastreavel pelo paymentId.
// Quando o usuario paga o QR Code da MP, o payment e marcado "approved" automaticamente.
exports.createPixPayment = (0, https_1.onCall)({ secrets: [MP_ACCESS_TOKEN, ALERTOO_PIX_KEY_SECRET], region: 'us-central1' }, async (request) => {
    checkAppToken(request, 'createPixPayment');
    const uid = request.auth?.uid;
    assertAuth(uid);
    const packageId = sanitizeString(request.data?.packageId, 20);
    const pkg = CREDIT_PACKAGES[packageId];
    if (!pkg)
        throw new https_1.HttpsError('invalid-argument', 'Pacote invalido.');
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
        throw new https_1.HttpsError('internal', 'Falha ao gerar PIX. Tente novamente.');
    }
    const mpData = await mpResp.json();
    const paymentId = String(mpData.id ?? '');
    const pixCode = mpData.point_of_interaction?.transaction_data?.qr_code ?? '';
    const pixQrBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;
    if (!pixCode) {
        console.error('MP PIX: qr_code ausente na resposta', JSON.stringify(mpData));
        throw new https_1.HttpsError('internal', 'QR Code PIX nao retornado pela MP.');
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
        pixQrBase64,
        expiresAt: expiresAt.getTime(),
    };
});
// ─── Verificar status de pagamento PIX ────────────────────────────────────────
exports.verifyPixPayment = (0, https_1.onCall)({ secrets: [MP_ACCESS_TOKEN], region: 'us-central1' }, async (request) => {
    checkAppToken(request, 'verifyPixPayment');
    const uid = request.auth?.uid;
    assertAuth(uid);
    const paymentId = sanitizeString(request.data?.paymentId, 50);
    if (!paymentId)
        throw new https_1.HttpsError('invalid-argument', 'paymentId obrigatorio.');
    // Valida formato: só dígitos (ID numérico do MP)
    if (!/^\d+$/.test(paymentId))
        throw new https_1.HttpsError('invalid-argument', 'paymentId com formato invalido.');
    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${readSecret(MP_ACCESS_TOKEN)}` },
    });
    if (!resp.ok)
        return { status: 'pending' };
    const payment = await resp.json();
    const mpStatus = payment.status ?? '';
    if (mpStatus === 'approved') {
        const paymentRef = String(payment.id);
        const existing = await db.collection('credit_purchases')
            .where('paymentRef', '==', paymentRef)
            .limit(1)
            .get();
        if (!existing.empty)
            return { status: 'approved' };
        const ref = payment.external_reference ?? '';
        const [refUid, refPackageId] = ref.split('|');
        if (refUid !== uid)
            throw new https_1.HttpsError('permission-denied', 'Pagamento nao pertence a este usuario.');
        const pkg = CREDIT_PACKAGES[refPackageId];
        if (!pkg)
            throw new https_1.HttpsError('invalid-argument', 'Pacote do pagamento invalido.');
        await db.runTransaction(async (tx) => {
            const userRef = db.collection('users').doc(uid);
            tx.update(userRef, { promotionCredits: firestore_2.FieldValue.increment(pkg.credits) });
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
        }
        catch { }
        return { status: 'approved', credits: pkg.credits };
    }
    if (['in_process', 'authorized', 'pending'].includes(mpStatus))
        return { status: 'pending' };
    return { status: 'rejected' };
});
// ─── Crédito por anúncio recompensado ─────────────────────────────────────────
const AD_CREDIT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hora
exports.awardAdCredit = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    checkAppToken(request, 'awardAdCredit');
    const uid = request.auth?.uid;
    assertAuth(uid);
    const recentSnap = await db.collection('credit_purchases')
        .where('userId', '==', uid)
        .where('paymentMethod', '==', 'rewarded_ad')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    if (!recentSnap.empty) {
        const lastCreatedAt = recentSnap.docs[0].data().createdAt;
        if (Date.now() - lastCreatedAt < AD_CREDIT_COOLDOWN_MS) {
            throw new https_1.HttpsError('resource-exhausted', 'Aguarde 1 hora entre os anuncios.');
        }
    }
    await db.runTransaction(async (tx) => {
        const userRef = db.collection('users').doc(uid);
        tx.update(userRef, { promotionCredits: firestore_2.FieldValue.increment(1) });
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
    const credits = userSnap.data()?.promotionCredits ?? 0;
    return { credits };
});
// ─── Stripe: Criar PaymentIntent para cartão internacional ───────────────────
exports.createStripePaymentIntent = (0, https_1.onCall)({ secrets: [STRIPE_SECRET_KEY], region: 'us-central1' }, async (request) => {
    checkAppToken(request, 'createStripePaymentIntent');
    const uid = request.auth?.uid;
    assertAuth(uid);
    const packageId = sanitizeString(request.data?.packageId, 20);
    const pkg = CREDIT_PACKAGES[packageId];
    if (!pkg)
        throw new https_1.HttpsError('invalid-argument', 'Pacote invalido.');
    const stripe = new stripe_1.default(readSecret(STRIPE_SECRET_KEY), { apiVersion: '2026-04-22.dahlia' });
    const externalReference = `${uid}|${packageId}|${Date.now()}`;
    const amountCents = Math.round(pkg.price * 100);
    // Cria ou reutiliza Customer Stripe vinculado ao Firebase UID
    let customerId;
    try {
        const existing = await stripe.customers.search({
            query: `metadata['firebaseUid']:'${uid}'`,
            limit: 1,
        });
        customerId = existing.data.length > 0
            ? existing.data[0].id
            : (await stripe.customers.create({ metadata: { firebaseUid: uid } })).id;
    }
    catch {
        // Customer nao critico — pagamento funciona sem ele
    }
    let paymentIntent;
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
    }
    catch (stripeErr) {
        console.error('Stripe PaymentIntent creation failed:', stripeErr?.message ?? stripeErr);
        throw new https_1.HttpsError('internal', stripeErr?.message ?? 'Falha ao criar pagamento Stripe.');
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
});
// ─── Stripe: Verificar e creditar após pagamento ──────────────────────────────
exports.verifyStripePayment = (0, https_1.onCall)({ secrets: [STRIPE_SECRET_KEY], region: 'us-central1' }, async (request) => {
    checkAppToken(request, 'verifyStripePayment');
    const uid = request.auth?.uid;
    assertAuth(uid);
    const paymentIntentId = sanitizeString(request.data?.paymentIntentId, 66);
    if (!paymentIntentId)
        throw new https_1.HttpsError('invalid-argument', 'paymentIntentId obrigatorio.');
    // Formato Stripe: pi_XXXXX
    if (!/^pi_[a-zA-Z0-9_]+$/.test(paymentIntentId))
        throw new https_1.HttpsError('invalid-argument', 'paymentIntentId com formato invalido.');
    const stripe = new stripe_1.default(readSecret(STRIPE_SECRET_KEY), { apiVersion: '2026-04-22.dahlia' });
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.metadata?.firebaseUid !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Pagamento nao pertence a este usuario.');
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
    if (!existing.empty)
        return { status: 'approved', credits: Number(pi.metadata.credits) };
    const pkgId = pi.metadata.packageId;
    const pkg = CREDIT_PACKAGES[pkgId];
    if (!pkg)
        throw new https_1.HttpsError('invalid-argument', 'Pacote invalido.');
    await db.runTransaction(async (tx) => {
        const userRef = db.collection('users').doc(uid);
        tx.update(userRef, { promotionCredits: firestore_2.FieldValue.increment(pkg.credits) });
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
    }
    catch { }
    return { status: 'approved', credits: pkg.credits };
});
// ─── Moderação de foto de promoção (Cloud Storage trigger) ───────────────────
exports.moderatePhoto = (0, storage_1.onObjectFinalized)({ bucket: 'lei-seca---eventos.firebasestorage.app', region: 'us-east1' }, async (event) => {
    const filePath = event.data.name;
    if (!filePath?.startsWith('promotions/'))
        return;
    const bucket = (0, storage_2.getStorage)().bucket(event.data.bucket);
    const file = bucket.file(filePath);
    let imageUri;
    try {
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 5 * 60 * 1000,
        });
        imageUri = url;
    }
    catch {
        return;
    }
    let isSafe = true;
    try {
        const [result] = await visionClient.safeSearchDetection(imageUri);
        const ann = result.safeSearchAnnotation;
        if (!ann)
            return;
        const LIKELY = new Set(['LIKELY', 'VERY_LIKELY']);
        const toStr = (v) => (typeof v === 'string' ? v : String(v ?? ''));
        if (LIKELY.has(toStr(ann.adult)) ||
            LIKELY.has(toStr(ann.violence)) ||
            LIKELY.has(toStr(ann.racy))) {
            isSafe = false;
        }
    }
    catch (e) {
        console.error('Vision API error:', e);
        return;
    }
    if (!isSafe) {
        await file.delete().catch(() => { });
        const parts = filePath.split('/');
        const userId = parts[1];
        const eventId = parts[2]?.split('_')[0];
        if (userId && eventId) {
            await db.collection('entertainment_events').doc(eventId).update({
                promotionPhotoUrl: null,
                promotionPhotoUrls: [],
            }).catch(() => { });
            console.warn(`Photo rejected for event ${eventId} (userId: ${userId})`);
        }
    }
});
// ─── Criar preferência de doação ─────────────────────────────────────────────
exports.createDonationPreference = (0, https_1.onCall)({ secrets: [MP_ACCESS_TOKEN], region: 'us-central1' }, async (request) => {
    checkAppToken(request, 'createDonationPreference');
    const uid = request.auth?.uid;
    assertAuth(uid);
    const amount = request.data?.amount;
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'Valor invalido.');
    }
    if (amount > MAX_DONATION_BRL) {
        throw new https_1.HttpsError('invalid-argument', `Doacao maxima permitida: R$${MAX_DONATION_BRL}.`);
    }
    // Arredonda para 2 casas decimais — evita manipulação de centavos fracionários
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
        throw new https_1.HttpsError('internal', 'Falha ao criar doacao.');
    }
    const data = await resp.json();
    return {
        preferenceId: data.id,
        initPoint: data.init_point ?? '',
    };
});
// ─── Limpeza diária de eventos expirados (#16) ────────────────────────────────
// Remove eventos de entretenimento cuja data de expiração já passou.
// Executa às 3h (América/São_Paulo) para minimizar impacto nos usuários.
exports.cleanupExpiredEvents = (0, scheduler_1.onSchedule)({ schedule: 'every 24 hours', region: 'us-central1', timeZone: 'America/Sao_Paulo' }, async () => {
    // expiresAt é gravado pelo app como Timestamp (Timestamp.fromMillis)
    const now = firestore_2.Timestamp.now();
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
    // Lote 3: radares móveis/blitz expirados (radar fixo tem expiresAt null)
    const expiredRadars = await db.collection('radars')
        .where('expiresAt', '<', now)
        .limit(400)
        .get();
    // Lote 4: radares fixos "frios" — sem confirmação da comunidade há 180 dias
    const staleCutoff = firestore_2.Timestamp.fromMillis(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const staleRadars = await db.collection('radars')
        .where('lastConfirmedAt', '<', staleCutoff)
        .limit(400)
        .get();
    // Dedupe — um radar móvel pode aparecer em ambas as queries de radar
    const toDelete = new Map();
    [...expiredEnt.docs, ...expiredRoad.docs, ...expiredRadars.docs, ...staleRadars.docs]
        .forEach((d) => toDelete.set(d.ref.path, d.ref));
    const batch = db.batch();
    toDelete.forEach((ref) => batch.delete(ref));
    if (toDelete.size > 0) {
        await batch.commit();
    }
    console.log(`[cleanup] ${expiredEnt.size} eventos de entretenimento + ` +
        `${expiredRoad.size} road events expirados + ` +
        `${expiredRadars.size} radares expirados + ${staleRadars.size} radares frios removidos.`);
});
// ─── Reconciliação de pagamentos pendentes ───────────────────────────────────
// Pagamentos podem ficar "pending" para sempre se o usuário fechar o app antes
// de chamar verify*Payment (ex.: aprovou no banco mas o app já tinha sido
// minimizado). Esta rotina credita os pagamentos aprovados que ficaram sem
// crédito, e expira os pendentes muito antigos.
const RECONCILE_MIN_AGE_MS = 10 * 60 * 1000; // não toca em pagamentos com < 10min (verify* pode estar em andamento)
const RECONCILE_EXPIRE_AGE_MS = 24 * 60 * 60 * 1000; // pendentes não aprovados há +24h são marcados 'expired'
async function creditApprovedPayment(pendingDoc, paymentRef, paymentMethod) {
    const data = pendingDoc.data();
    const uid = data.userId;
    const packageId = data.packageId;
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
            tx.update(userRef, { promotionCredits: firestore_2.FieldValue.increment(pkg.credits) });
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
exports.reconcilePendingPayments = (0, scheduler_1.onSchedule)({ schedule: 'every 60 minutes', region: 'us-central1', secrets: [MP_ACCESS_TOKEN, STRIPE_SECRET_KEY] }, async () => {
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
                const stripe = new stripe_1.default(readSecret(STRIPE_SECRET_KEY), { apiVersion: '2026-04-22.dahlia' });
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
                if (!resp.ok)
                    continue;
                const payment = await resp.json();
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
                if (!resp.ok)
                    continue;
                const result = await resp.json();
                const payment = result.results?.[0];
                if (!payment)
                    continue;
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
        }
        catch (err) {
            console.error(`[reconcile] erro ao processar pending_payment ${doc.id}:`, err?.message ?? err);
        }
    }
    console.log(`[reconcile] ${pendingSnap.size} pendentes verificados — ${credited} creditados, ${expired} expirados.`);
});
// ─── Rate limiting server-side: road events (#13) ────────────────────────────
// Ao criar um road event, registra timestamp no documento do usuário.
// Permite auditoria e validação futura via Security Rules.
exports.onRoadEventCreated = (0, firestore_1.onDocumentCreated)({ document: 'events/{eventId}', region: 'us-central1' }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const userId = data.userId;
    if (!userId || userId === 'anonymous')
        return;
    await db.collection('users').doc(userId).update({
        lastRoadEventAt: firestore_2.FieldValue.serverTimestamp(),
    }).catch(() => {
        // Documento pode não existir ainda em contas novas — ignora
    });
});
// ─── Rate limiting server-side: entertainment events (#13) ───────────────────
exports.onEntertainmentEventCreated = (0, firestore_1.onDocumentCreated)({ document: 'entertainment_events/{eventId}', region: 'us-central1' }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const userId = data.userId;
    if (!userId || userId === 'anonymous')
        return;
    await db.collection('users').doc(userId).update({
        lastEntEventAt: firestore_2.FieldValue.serverTimestamp(),
    }).catch(() => { });
});
// ─── Registro de token FCM (#1) ───────────────────────────────────────────────
// O cliente chama esta função para salvar/atualizar seu token de push no Firestore.
// O token é salvo no documento do usuário para uso futuro em notificações remotas.
exports.registerFcmToken = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    checkAppToken(request, 'registerFcmToken');
    const uid = request.auth?.uid;
    assertAuth(uid);
    const token = request.data?.token;
    if (!token || typeof token !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Token invalido.');
    }
    if (token.length > MAX_FCM_TOKEN_LEN) {
        throw new https_1.HttpsError('invalid-argument', 'Token FCM com tamanho invalido.');
    }
    // FCM tokens contêm apenas alfanuméricos, hífens, underscores e dois-pontos
    if (!/^[a-zA-Z0-9\-_:]+$/.test(token)) {
        throw new https_1.HttpsError('invalid-argument', 'Token FCM com caracteres invalidos.');
    }
    await db.collection('users').doc(uid).update({
        fcmTokens: firestore_2.FieldValue.arrayUnion(token),
        fcmUpdatedAt: firestore_2.FieldValue.serverTimestamp(),
    }).catch(async () => {
        // Se o doc não existir, cria com set (merge)
        await db.collection('users').doc(uid).set({
            fcmTokens: [token],
            fcmUpdatedAt: firestore_2.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    return { ok: true };
});
// ─── Envio de notificação FCM para usuários de um estado (#1) ─────────────────
// Notifica até 100 usuários cadastrados no mesmo estado (stateUF) do evento.
// Chamada internamente pelos triggers de criação de evento.
async function notifyStateUsers(params) {
    try {
        const { stateUF, title, body, data, excludeUid } = params;
        // Busca usuários que têm token FCM e filtro no mesmo estado
        const usersSnap = await db.collection('users')
            .where('filterStateUF', '==', stateUF)
            .limit(100)
            .get();
        const tokens = [];
        usersSnap.docs.forEach((d) => {
            if (d.id === excludeUid)
                return;
            const fcmTokens = d.data().fcmTokens;
            if (Array.isArray(fcmTokens))
                tokens.push(...fcmTokens);
        });
        if (tokens.length === 0)
            return;
        // Envia em lotes de 500 (limite do FCM sendEachForMulticast)
        const BATCH = 500;
        for (let i = 0; i < tokens.length; i += BATCH) {
            const chunk = tokens.slice(i, i + BATCH);
            await (0, messaging_1.getMessaging)().sendEachForMulticast({
                tokens: chunk,
                notification: { title, body },
                data,
                android: { priority: 'high', notification: { channelId: 'default' } },
            }).catch((e) => console.error('[FCM] sendEachForMulticast error:', e));
        }
    }
    catch (e) {
        console.error('[FCM] notifyStateUsers error:', e);
    }
}
// ─── Notifica usuários ao criar road event (#1) ──────────────────────────────
exports.notifyOnRoadEvent = (0, firestore_1.onDocumentCreated)({ document: 'events/{eventId}', region: 'us-central1' }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const stateUF = data.stateUF;
    if (!stateUF)
        return;
    await notifyStateUsers({
        stateUF,
        title: `${data.category === 'accident' ? '🚨' : '🚦'} ${data.title ?? 'Novo alerta'}`,
        body: data.cityName ? `${data.cityName} · ${stateUF}` : stateUF,
        data: { eventId: event.params.eventId, eventType: 'road' },
        excludeUid: data.userId,
    });
});
// ═══════════════════════════════════════════════════════════════════════════
// MONITORAMENTO DE SEGURANÇA
// Detecta anomalias e registra alertas no Firestore + loga erros críticos
// para o Cloud Monitoring do GCP (que envia e-mail via canal configurado).
// ═══════════════════════════════════════════════════════════════════════════
// ─── Limites de anomalia ──────────────────────────────────────────────────
const ALERT_EVENTS_PER_HOUR = 20; // Mais de 20 eventos/hora por usuário = suspeito
const ALERT_PAYMENTS_PER_DAY = 10; // Mais de 10 tentativas de pagamento/dia = suspeito
const ALERT_APPCHECK_WARNINGS = 5; // Mais de 5 warnings App Check em 1h = suspeito
// ─── Grava alerta no Firestore e loga como erro (aciona Cloud Monitoring) ─
async function raiseSecurityAlert(params) {
    const alert = {
        ...params,
        createdAt: firestore_2.FieldValue.serverTimestamp(),
        resolved: false,
    };
    // Salva no Firestore para histórico e visualização no painel admin
    await db.collection('security_alerts').add(alert).catch(() => { });
    // Log estruturado — Cloud Monitoring captura console.error() das Functions
    // e pode disparar alertas de e-mail automaticamente (ver configuração abaixo)
    const logFn = params.severity === 'LOW' ? console.warn : console.error;
    logFn(`[SECURITY][${params.severity}] ${params.type}`, JSON.stringify(params.details));
}
// ─── Monitor de volume de eventos por usuário ─────────────────────────────
// Dispara quando um usuário cria muitos eventos em pouco tempo (possível bot/spam)
exports.monitorEventVolume = (0, firestore_1.onDocumentCreated)({ document: 'events/{eventId}', region: 'us-central1' }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const userId = data.userId;
    if (!userId || userId === 'anonymous')
        return;
    const oneHourAgo = firestore_2.Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
    const recentSnap = await db.collection('events')
        .where('userId', '==', userId)
        .where('createdAt', '>', oneHourAgo)
        .count()
        .get();
    const count = recentSnap.data().count;
    if (count > ALERT_EVENTS_PER_HOUR) {
        await raiseSecurityAlert({
            type: 'HIGH_EVENT_VOLUME',
            severity: 'HIGH',
            uid: userId,
            details: { eventsInLastHour: count, threshold: ALERT_EVENTS_PER_HOUR, eventId: event.params.eventId },
        });
    }
});
// ─── Monitor de tentativas de pagamento ──────────────────────────────────
// Detecta usuário com muitas tentativas de pagamento falhas (possível fraude)
exports.monitorPaymentAttempts = (0, firestore_1.onDocumentCreated)({ document: 'pending_payments/{paymentId}', region: 'us-central1' }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const userId = data.userId;
    if (!userId)
        return;
    const oneDayAgo = firestore_2.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const attemptsSnap = await db.collection('pending_payments')
        .where('userId', '==', userId)
        .where('createdAt', '>', oneDayAgo.toMillis())
        .count()
        .get();
    const count = attemptsSnap.data().count;
    if (count > ALERT_PAYMENTS_PER_DAY) {
        await raiseSecurityAlert({
            type: 'HIGH_PAYMENT_ATTEMPTS',
            severity: 'CRITICAL',
            uid: userId,
            details: { attemptsIn24h: count, threshold: ALERT_PAYMENTS_PER_DAY, method: data.paymentMethod },
        });
    }
});
// ─── Relatório diário de segurança ────────────────────────────────────────
// Executa toda manhã às 8h (horário de Brasília) e loga resumo de alertas
// não resolvidos — o log é capturado pelo Cloud Monitoring e pode gerar e-mail.
exports.dailySecurityReport = (0, scheduler_1.onSchedule)({ schedule: '0 8 * * *', region: 'us-central1', timeZone: 'America/Sao_Paulo' }, async () => {
    const yesterday = firestore_2.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    // Alertas não resolvidos nas últimas 24h
    const alertsSnap = await db.collection('security_alerts')
        .where('resolved', '==', false)
        .where('createdAt', '>', yesterday)
        .get();
    const byType = {};
    const bySeverity = {};
    alertsSnap.docs.forEach((doc) => {
        const d = doc.data();
        byType[d.type] = (byType[d.type] ?? 0) + 1;
        bySeverity[d.severity] = (bySeverity[d.severity] ?? 0) + 1;
    });
    const total = alertsSnap.size;
    const hasCritical = (bySeverity['CRITICAL'] ?? 0) > 0;
    // Log estruturado capturado pelo Cloud Monitoring
    if (hasCritical || total > 0) {
        console.error('[SECURITY][DAILY_REPORT] Alertas não resolvidos nas últimas 24h', JSON.stringify({
            total,
            byType,
            bySeverity,
            timestamp: new Date().toISOString(),
        }));
    }
    else {
        console.log('[SECURITY][DAILY_REPORT] Nenhum alerta de segurança nas últimas 24h — OK');
    }
    // Verifica App Check warnings acumulados
    const appCheckSnap = await db.collection('security_alerts')
        .where('type', '==', 'HIGH_APPCHECK_WARNINGS')
        .where('resolved', '==', false)
        .count()
        .get();
    if (appCheckSnap.data().count >= ALERT_APPCHECK_WARNINGS) {
        console.error('[SECURITY][APP_CHECK] Muitos warnings de App Check — considere ativar enforcement', {
            count: appCheckSnap.data().count,
        });
    }
});
// ─── Espelho público do ranking (#leaderboard) ────────────────────────────────
// /users/{uid} contém dados sensíveis (email, telefone) — não pode ser lido
// por outros usuários. O Leaderboard precisa de displayName/photoURL/points
// públicos, então espelhamos esses campos em /leaderboard_public/{uid},
// que tem regra "allow read: if request.auth != null; allow write: if false".
exports.onUserProfileWritten = (0, firestore_1.onDocumentWritten)({ document: 'users/{userId}', region: 'us-central1' }, async (event) => {
    const userId = event.params.userId;
    const after = event.data?.after?.data();
    if (!after) {
        // Usuário deletado — remove do ranking público também
        await db.collection('leaderboard_public').doc(userId).delete().catch(() => { });
        return;
    }
    const before = event.data?.before?.data();
    const fields = ['displayName', 'photoURL', 'points'];
    const changed = !before || fields.some((f) => before[f] !== after[f]);
    if (!changed)
        return;
    await db.collection('leaderboard_public').doc(userId).set({
        displayName: after.displayName ?? 'Usuário',
        photoURL: after.photoURL ?? null,
        points: after.points ?? 0,
    }).catch(() => { });
});
// ─── Página SSR de evento de entretenimento (SEO + deep link) ────────────────
// Atende /evento/{type}/{id}. Para eventos de entretenimento ativos, renderiza
// HTML com meta tags OG/Twitter, JSON-LD (Event) e conteúdo indexável com os
// dados reais do evento — útil para divulgação (compartilhar link no
// WhatsApp/Instagram mostra foto+título do evento) e para SEO. Para eventos
// expirados/inexistentes, cai no fallback de "abrir no app" com noindex.
const EVENT_PAGE_CATEGORY_LABELS = {
    bar: { label: 'Bar', emoji: '🍻' },
    restaurant: { label: 'Restaurante', emoji: '🍽️' },
    party: { label: 'Festa', emoji: '🎉' },
    show: { label: 'Show', emoji: '🎸' },
    festival: { label: 'Festival', emoji: '🎪' },
    club: { label: 'Balada', emoji: '🪩' },
};
function escapeHtmlSSR(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function eventPageFallback(type, id, noindex) {
    const robots = noindex ? '<meta name="robots" content="noindex, nofollow" />' : '';
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Alertoo — Abrindo evento...</title>
  <meta name="description" content="Alertoo — eventos de trânsito e entretenimento em tempo real." />
  ${robots}
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: #fff; border-radius: 20px; padding: 40px 32px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .logo { font-size: 56px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 800; color: #1a1a1a; margin-bottom: 8px; }
    .sub { font-size: 15px; color: #666; line-height: 1.5; margin-bottom: 32px; }
    .btn { display: block; width: 100%; padding: 16px; border-radius: 14px; font-size: 16px; font-weight: 700; text-decoration: none; margin-bottom: 12px; cursor: pointer; border: none; }
    .btn-primary { background: #E53935; color: #fff; }
    .btn-secondary { background: transparent; border: 2px solid #E53935; color: #E53935; }
    .spinner { width: 32px; height: 32px; border: 3px solid #f0f0f0; border-top-color: #E53935; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .status { font-size: 13px; color: #aaa; margin-top: 8px; }
    #open-section { display: none; }
  </style>
</head>
<body>
<div class="card">
  <div class="logo">🚀</div>
  <h1>Alertoo</h1>
  <div id="loading-section">
    <div class="spinner"></div>
    <p class="sub">Abrindo evento no Alertoo...</p>
  </div>
  <div id="open-section">
    <p class="sub">Este evento não está mais disponível, mas você pode ver tudo que está acontecendo agora no mapa do Alertoo.</p>
    <a id="play-btn" href="#" class="btn btn-primary">📲 Baixar Alertoo</a>
    <a href="/eventos" class="btn btn-secondary">Ver mapa ao vivo</a>
    <p class="status" id="status-msg"></p>
  </div>
</div>
<script>
  (function () {
    var type = ${JSON.stringify(type)};
    var id   = ${JSON.stringify(id)};
    var PACKAGE   = 'com.alertoo.app';
    var deepLink  = 'alertoo://evento/' + type + '/' + id;
    var storeLink = 'https://play.google.com/store/apps/details?id=' + PACKAGE
                  + '&referrer=' + encodeURIComponent('evento_' + type + '_' + id);
    document.getElementById('play-btn').href = storeLink;

    function showInstallFallback() {
      document.getElementById('loading-section').style.display = 'none';
      document.getElementById('open-section').style.display = 'block';
    }

    function tryOpenApp() {
      var intentUrl = 'intent://evento/' + type + '/' + id
        + '#Intent;scheme=alertoo;package=' + PACKAGE
        + ';S.browser_fallback_url=' + encodeURIComponent(storeLink)
        + ';end';
      var a = document.createElement('a');
      a.href = intentUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () {
        if (!document.hidden) showInstallFallback();
      }, 2000);
    }

    if (type && id) {
      tryOpenApp();
    } else {
      showInstallFallback();
      document.getElementById('status-msg').textContent = 'Link inválido.';
    }

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) showInstallFallback();
    });
  })();
</script>
<script src="/i18n.js"></script>
</body>
</html>`;
}
function eventPageRender(data, id, pageUrl) {
    const title = String(data.title || 'Evento');
    const description = String(data.description || '').trim();
    const address = String(data.address || '');
    const cityName = String(data.cityName || '');
    const stateUF = String(data.stateUF || '');
    const category = String(data.category || '');
    const meta = EVENT_PAGE_CATEGORY_LABELS[category] || { label: 'Evento', emoji: '🎉' };
    const locationLabel = [address, [cityName, stateUF].filter(Boolean).join(' - ')].filter(Boolean).join(', ');
    const image = data.promotionPhotoUrl || data.photoUrl || 'https://alertoo.com.br/feature-graphic-1024x500.png';
    const latitude = typeof data.latitude === 'number' ? data.latitude : null;
    const longitude = typeof data.longitude === 'number' ? data.longitude : null;
    const pageTitle = `${title}${cityName ? ` em ${cityName}` : ''} — Alertoo`;
    const metaDescription = (description || `${meta.label} em ${cityName || 'sua região'}. Veja no mapa do Alertoo e descubra o que está acontecendo perto de você.`).slice(0, 160);
    const createdAt = typeof data.createdAt === 'number' ? data.createdAt : Date.now();
    const expiresAt = typeof data.expiresAt === 'number' ? data.expiresAt : Date.now();
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: title,
        description: metaDescription,
        startDate: new Date(createdAt).toISOString(),
        endDate: new Date(expiresAt).toISOString(),
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        image: [image],
        url: pageUrl,
        organizer: { '@type': 'Organization', name: 'Alertoo', url: 'https://alertoo.com.br' },
    };
    if (locationLabel || (latitude !== null && longitude !== null)) {
        jsonLd.location = {
            '@type': 'Place',
            name: locationLabel || cityName || title,
            ...(latitude !== null && longitude !== null
                ? { geo: { '@type': 'GeoCoordinates', latitude, longitude } }
                : {}),
        };
    }
    const PACKAGE = 'com.alertoo.app';
    const storeLink = `https://play.google.com/store/apps/details?id=${PACKAGE}&referrer=${encodeURIComponent(`evento_entertainment_${id}`)}`;
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${escapeHtmlSSR(metaDescription)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${pageUrl}" />
  <meta property="og:title" content="${escapeHtmlSSR(pageTitle)}" />
  <meta property="og:description" content="${escapeHtmlSSR(metaDescription)}" />
  <meta property="og:image" content="${escapeHtmlSSR(image)}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Alertoo" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtmlSSR(pageTitle)}" />
  <meta name="twitter:description" content="${escapeHtmlSSR(metaDescription)}" />
  <meta name="twitter:image" content="${escapeHtmlSSR(image)}" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <title>${escapeHtmlSSR(pageTitle)}</title>
  <link rel="icon" href="/icon.png" type="image/png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #0F172A; color: #F1F5F9; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #1E293B; border-radius: 20px; padding: 0; max-width: 440px; width: 100%; overflow: hidden; border: 1px solid rgba(255,255,255,.08); }
    .card img { width: 100%; height: 220px; object-fit: cover; display: block; background: #0F172A; }
    .card-body { padding: 28px 24px; text-align: center; }
    .badge { display: inline-block; background: rgba(255,87,34,.15); color: #FF5722; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; padding: 6px 14px; border-radius: 20px; margin-bottom: 14px; border: 1px solid rgba(255,87,34,.3); }
    h1 { font-size: 22px; font-weight: 800; margin-bottom: 8px; }
    .location { font-size: 14px; color: #94A3B8; margin-bottom: 16px; }
    .desc { font-size: 15px; color: #CBD5E1; line-height: 1.6; margin-bottom: 28px; }
    .btn { display: block; width: 100%; padding: 16px; border-radius: 14px; font-size: 16px; font-weight: 700; text-decoration: none; margin-bottom: 12px; cursor: pointer; border: none; }
    .btn-primary { background: #FF5722; color: #fff; }
    .btn-secondary { background: transparent; border: 2px solid rgba(255,255,255,.15); color: #F1F5F9; }
    .spinner { display: none; width: 28px; height: 28px; border: 3px solid rgba(255,255,255,.1); border-top-color: #FF5722; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    footer { text-align: center; padding: 16px; font-size: 12px; color: #64748B; }
    footer a { color: #94A3B8; }
  </style>
</head>
<body>
<div>
  <div class="card">
    <img src="${escapeHtmlSSR(image)}" alt="${escapeHtmlSSR(title)}" loading="lazy" />
    <div class="card-body">
      <div class="badge">${meta.emoji} ${escapeHtmlSSR(meta.label)}</div>
      <h1>${escapeHtmlSSR(title)}</h1>
      ${locationLabel ? `<p class="location">📍 ${escapeHtmlSSR(locationLabel)}</p>` : ''}
      ${description ? `<p class="desc">${escapeHtmlSSR(description)}</p>` : ''}
      <div class="spinner" id="spinner"></div>
      <a id="deep-btn" class="btn btn-primary" href="alertoo://evento/entertainment/${id}">📍 Ver no app Alertoo</a>
      <a id="play-btn" class="btn btn-secondary" href="${storeLink}" target="_blank" rel="noopener">📲 Baixar Alertoo</a>
    </div>
  </div>
  <footer>
    <a href="/eventos">Ver mapa ao vivo</a> &bull; <a href="/">alertoo.com.br</a>
  </footer>
</div>
<script>
  // Em dispositivos móveis, tenta abrir o app automaticamente via intent.
  (function () {
    var ua = navigator.userAgent || '';
    var isAndroid = /Android/i.test(ua);
    if (!isAndroid) return;
    document.getElementById('spinner').style.display = 'block';
    var intentUrl = 'intent://evento/entertainment/${id}'
      + '#Intent;scheme=alertoo;package=com.alertoo.app'
      + ';S.browser_fallback_url=' + encodeURIComponent('${storeLink}')
      + ';end';
    var a = document.createElement('a');
    a.href = intentUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      document.getElementById('spinner').style.display = 'none';
    }, 1500);
  })();
</script>
<script src="/i18n.js"></script>
</body>
</html>`;
}
exports.eventPage = (0, https_1.onRequest)({ region: 'us-central1', cors: false }, async (req, res) => {
    const parts = req.path.split('/').filter(Boolean); // ['evento','entertainment','abc123']
    const type = parts[1] || '';
    const id = parts[2] || '';
    if (type !== 'entertainment' || !id) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.status(200).send(eventPageFallback(type, id, true));
        return;
    }
    let data;
    try {
        const snap = await db.collection('entertainment_events').doc(id).get();
        if (snap.exists)
            data = snap.data();
    }
    catch (err) {
        console.error('[eventPage] erro ao buscar evento', err);
    }
    const pageUrl = `https://alertoo.com.br/evento/entertainment/${id}`;
    const now = Date.now();
    const expiresAt = data && typeof data.expiresAt === 'number' ? data.expiresAt : 0;
    const isExpired = !data || expiresAt < now;
    if (isExpired || !data) {
        res.set('X-Robots-Tag', 'noindex');
        res.set('Cache-Control', data ? 'public, max-age=60' : 'no-cache, no-store, must-revalidate');
        res.status(data ? 200 : 404).send(eventPageFallback(type, id, true));
        return;
    }
    res.set('Cache-Control', 'public, max-age=120, s-maxage=600');
    res.status(200).send(eventPageRender(data, id, pageUrl));
});
//# sourceMappingURL=index.js.map