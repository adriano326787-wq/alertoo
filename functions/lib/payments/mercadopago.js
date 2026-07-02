"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcilePendingPayments = exports.createDonationPreference = exports.verifyMPPayment = exports.createMPPreference = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const stripe_1 = __importDefault(require("stripe"));
const shared_1 = require("../shared");
// ─── Criar preferência de pagamento MP (Cartão via Checkout Pro) ──────────────
// Mercado Pago só opera no Brasil — usuários de outros países (AR/CL/CO/PE/UY)
// devem usar Stripe (createStripePaymentIntent).
exports.createMPPreference = (0, https_1.onCall)({ secrets: [shared_1.MP_ACCESS_TOKEN], region: 'us-central1' }, async (request) => {
    (0, shared_1.checkAppToken)(request, 'createMPPreference');
    const uid = request.auth?.uid;
    (0, shared_1.assertAuth)(uid);
    // Checa país ANTES do cooldown — rejeitado por país não deve "gastar"
    // a janela de cooldown e atrapalhar a próxima tentativa via Stripe.
    await (0, shared_1.assertBrazilOnly)(uid, 'mercadopago');
    await (0, shared_1.enforcePaymentCooldown)(uid);
    const packageId = (0, shared_1.sanitizeString)(request.data?.packageId, 20);
    const pkg = shared_1.CREDIT_PACKAGES[packageId];
    if (!pkg)
        throw new https_1.HttpsError('invalid-argument', 'Pacote invalido.');
    const externalReference = `${uid}|${packageId}|${Date.now()}`;
    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(0, shared_1.readSecret)(shared_1.MP_ACCESS_TOKEN)}`,
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
        throw new https_1.HttpsError('internal', 'Falha ao criar pagamento.');
    }
    const data = await resp.json();
    const checkoutUrl = data.init_point ?? '';
    await shared_1.db.collection('pending_payments').add({
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
exports.verifyMPPayment = (0, https_1.onCall)({ secrets: [shared_1.MP_ACCESS_TOKEN], region: 'us-central1' }, async (request) => {
    (0, shared_1.checkAppToken)(request, 'verifyMPPayment');
    const uid = request.auth?.uid;
    (0, shared_1.assertAuth)(uid);
    const preferenceId = (0, shared_1.sanitizeString)(request.data?.preferenceId, 100);
    if (!preferenceId)
        throw new https_1.HttpsError('invalid-argument', 'preferenceId obrigatorio.');
    const pendingSnap = await shared_1.db.collection('pending_payments')
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
        headers: { Authorization: `Bearer ${(0, shared_1.readSecret)(shared_1.MP_ACCESS_TOKEN)}` },
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
        const existing = await shared_1.db.collection('credit_purchases')
            .where('paymentRef', '==', paymentRef)
            .limit(1)
            .get();
        if (!existing.empty)
            return { status: 'approved' };
        const ref = payment.external_reference ?? '';
        const [refUid, refPackageId] = ref.split('|');
        if (refUid !== uid)
            throw new https_1.HttpsError('permission-denied', 'Pagamento nao pertence a este usuario.');
        const pkg = shared_1.CREDIT_PACKAGES[refPackageId];
        if (!pkg)
            throw new https_1.HttpsError('invalid-argument', 'Pacote do pagamento invalido.');
        await shared_1.db.runTransaction(async (tx) => {
            const userRef = shared_1.db.collection('users').doc(uid);
            tx.update(userRef, { promotionCredits: firestore_1.FieldValue.increment(pkg.credits) });
            const purchaseRef = shared_1.db.collection('credit_purchases').doc();
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
// ─── Criar preferência de doação ─────────────────────────────────────────────
// Doações via Mercado Pago também são Brasil-only (não há equivalente Stripe
// pra doação livre ainda — fora do escopo desta fase de expansão).
exports.createDonationPreference = (0, https_1.onCall)({ secrets: [shared_1.MP_ACCESS_TOKEN], region: 'us-central1' }, async (request) => {
    (0, shared_1.checkAppToken)(request, 'createDonationPreference');
    const uid = request.auth?.uid;
    (0, shared_1.assertAuth)(uid);
    await (0, shared_1.assertBrazilOnly)(uid, 'donation');
    await (0, shared_1.enforcePaymentCooldown)(uid);
    const amount = request.data?.amount;
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'Valor invalido.');
    }
    const MAX_DONATION_BRL = 500;
    if (amount > MAX_DONATION_BRL) {
        throw new https_1.HttpsError('invalid-argument', `Doacao maxima permitida: R$${MAX_DONATION_BRL}.`);
    }
    const safeAmount = Math.round(amount * 100) / 100;
    const externalReference = `donation|${uid}|${Date.now()}`;
    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(0, shared_1.readSecret)(shared_1.MP_ACCESS_TOKEN)}`,
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
// ─── Reconciliação de pagamentos pendentes ───────────────────────────────────
const RECONCILE_MIN_AGE_MS = 10 * 60 * 1000;
const RECONCILE_EXPIRE_AGE_MS = 24 * 60 * 60 * 1000;
async function creditApprovedPayment(pendingDoc, paymentRef, paymentMethod) {
    const data = pendingDoc.data();
    const uid = data.userId;
    const packageId = data.packageId;
    const pkg = shared_1.CREDIT_PACKAGES[packageId];
    if (!pkg) {
        console.error(`[reconcile] pending_payment ${pendingDoc.id} com packageId invalido: ${packageId}`);
        return;
    }
    const existing = await shared_1.db.collection('credit_purchases')
        .where('paymentRef', '==', paymentRef)
        .limit(1)
        .get();
    if (existing.empty) {
        await shared_1.db.runTransaction(async (tx) => {
            const userRef = shared_1.db.collection('users').doc(uid);
            tx.update(userRef, { promotionCredits: firestore_1.FieldValue.increment(pkg.credits) });
            const purchaseRef = shared_1.db.collection('credit_purchases').doc();
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
exports.reconcilePendingPayments = (0, scheduler_1.onSchedule)({ schedule: 'every 60 minutes', region: 'us-central1', secrets: [shared_1.MP_ACCESS_TOKEN, shared_1.STRIPE_SECRET_KEY] }, async () => {
    const cutoff = Date.now() - RECONCILE_MIN_AGE_MS;
    const expireCutoff = Date.now() - RECONCILE_EXPIRE_AGE_MS;
    const pendingSnap = await shared_1.db.collection('pending_payments')
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
                const stripe = new stripe_1.default((0, shared_1.readSecret)(shared_1.STRIPE_SECRET_KEY), { apiVersion: '2026-04-22.dahlia' });
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
                    headers: { Authorization: `Bearer ${(0, shared_1.readSecret)(shared_1.MP_ACCESS_TOKEN)}` },
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
                    headers: { Authorization: `Bearer ${(0, shared_1.readSecret)(shared_1.MP_ACCESS_TOKEN)}` },
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
//# sourceMappingURL=mercadopago.js.map