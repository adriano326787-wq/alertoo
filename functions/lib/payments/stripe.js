"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyStripePayment = exports.createStripePaymentIntent = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const stripe_1 = __importDefault(require("stripe"));
const shared_1 = require("../shared");
const currency_1 = require("../utils/currency");
// ─── Stripe: Criar PaymentIntent para cartão internacional ───────────────────
exports.createStripePaymentIntent = (0, https_1.onCall)({ secrets: [shared_1.STRIPE_SECRET_KEY], region: 'us-central1' }, async (request) => {
    (0, shared_1.checkAppToken)(request, 'createStripePaymentIntent');
    const uid = request.auth?.uid;
    (0, shared_1.assertAuth)(uid);
    await (0, shared_1.enforcePaymentCooldown)(uid);
    const packageId = (0, shared_1.sanitizeString)(request.data?.packageId, 20);
    const pkg = shared_1.CREDIT_PACKAGES[packageId];
    if (!pkg)
        throw new https_1.HttpsError('invalid-argument', 'Pacote invalido.');
    // Moeda vem do countryCode salvo no perfil do usuário (servidor), nunca do
    // cliente — evita que alguém manipule o request pra pagar em USD sendo do Brasil.
    const userSnap = await shared_1.db.collection('users').doc(uid).get();
    const currency = (0, currency_1.resolveCurrencyForCountry)(userSnap.data()?.countryCode);
    const price = currency === 'USD' ? pkg.priceUSD : pkg.price;
    const stripe = new stripe_1.default((0, shared_1.readSecret)(shared_1.STRIPE_SECRET_KEY), { apiVersion: '2026-04-22.dahlia' });
    const externalReference = `${uid}|${packageId}|${Date.now()}`;
    const amountCents = Math.round(price * 100);
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
    }
    catch (stripeErr) {
        console.error('Stripe PaymentIntent creation failed:', stripeErr?.message ?? stripeErr);
        throw new https_1.HttpsError('internal', stripeErr?.message ?? 'Falha ao criar pagamento Stripe.');
    }
    await shared_1.db.collection('pending_payments').add({
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
});
// ─── Stripe: Verificar e creditar após pagamento ──────────────────────────────
exports.verifyStripePayment = (0, https_1.onCall)({ secrets: [shared_1.STRIPE_SECRET_KEY], region: 'us-central1' }, async (request) => {
    (0, shared_1.checkAppToken)(request, 'verifyStripePayment');
    const uid = request.auth?.uid;
    (0, shared_1.assertAuth)(uid);
    const paymentIntentId = (0, shared_1.sanitizeString)(request.data?.paymentIntentId, 66);
    if (!paymentIntentId)
        throw new https_1.HttpsError('invalid-argument', 'paymentIntentId obrigatorio.');
    if (!/^pi_[a-zA-Z0-9_]+$/.test(paymentIntentId))
        throw new https_1.HttpsError('invalid-argument', 'paymentIntentId com formato invalido.');
    const stripe = new stripe_1.default((0, shared_1.readSecret)(shared_1.STRIPE_SECRET_KEY), { apiVersion: '2026-04-22.dahlia' });
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
    const existing = await shared_1.db.collection('credit_purchases')
        .where('paymentRef', '==', paymentRef)
        .limit(1)
        .get();
    if (!existing.empty)
        return { status: 'approved', credits: Number(pi.metadata.credits) };
    const pkgId = pi.metadata.packageId;
    const pkg = shared_1.CREDIT_PACKAGES[pkgId];
    if (!pkg)
        throw new https_1.HttpsError('invalid-argument', 'Pacote invalido.');
    await shared_1.db.runTransaction(async (tx) => {
        const userRef = shared_1.db.collection('users').doc(uid);
        tx.update(userRef, { promotionCredits: firestore_1.FieldValue.increment(pkg.credits) });
        const purchaseRef = shared_1.db.collection('credit_purchases').doc();
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
        const pendingSnap = await shared_1.db.collection('pending_payments')
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
//# sourceMappingURL=stripe.js.map