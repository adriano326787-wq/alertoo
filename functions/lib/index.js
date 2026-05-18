"use strict";
/**
 * Cloud Functions do Alertoo
 *
 * Mantém credenciais sensíveis (Mercado Pago Access Token) FORA do app cliente.
 * O cliente nunca vê o token — apenas chama estas funções via Firebase callable.
 *
 * Configuração do segredo (rodar uma vez no terminal):
 *   firebase functions:secrets:set MP_ACCESS_TOKEN
 *
 * Deploy:
 *   firebase deploy --only functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMPPayment = exports.createMPPreference = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
// O segredo fica armazenado no Google Secret Manager; nunca aparece no código
const MP_ACCESS_TOKEN = (0, params_1.defineSecret)('MP_ACCESS_TOKEN');
// ─── Pacotes válidos (mesma estrutura do client) ─────────────────────────────
const CREDIT_PACKAGES = {
    pkg_1: { credits: 1, price: 4.90, label: '1 crédito' },
    pkg_5: { credits: 5, price: 19.90, label: '5 créditos' },
    pkg_10: { credits: 10, price: 34.90, label: '10 créditos' },
    pkg_20: { credits: 20, price: 59.90, label: '20 créditos' },
};
// ─── Criar preferência de pagamento ───────────────────────────────────────────
exports.createMPPreference = (0, https_1.onCall)({ secrets: [MP_ACCESS_TOKEN], region: 'us-central1' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Login obrigatório.');
    const packageId = request.data?.packageId;
    const pkg = CREDIT_PACKAGES[packageId];
    if (!pkg)
        throw new https_1.HttpsError('invalid-argument', 'Pacote inválido.');
    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${MP_ACCESS_TOKEN.value()}`,
        },
        body: JSON.stringify({
            items: [{
                    id: packageId,
                    title: pkg.label,
                    description: `${pkg.credits} crédito(s) para promoção no Alertoo`,
                    quantity: 1,
                    currency_id: 'BRL',
                    unit_price: pkg.price,
                }],
            payment_methods: {
                excluded_payment_types: [{ id: 'ticket' }], // sem boleto, mantém PIX + cartão
                installments: 1,
            },
            back_urls: {
                success: 'alertoo://payment/success',
                failure: 'alertoo://payment/failure',
                pending: 'alertoo://payment/pending',
            },
            statement_descriptor: 'ALERTOO',
            external_reference: `${uid}|${packageId}|${Date.now()}`,
        }),
    });
    if (!resp.ok) {
        const txt = await resp.text();
        console.error('MP create preference failed', resp.status, txt);
        throw new https_1.HttpsError('internal', 'Falha ao criar pagamento.');
    }
    const data = await resp.json();
    // Salva pagamento pendente para rastreamento e verificação posterior
    await db.collection('pending_payments').add({
        userId: uid,
        preferenceId: data.id ?? '',
        packageId,
        credits: pkg.credits,
        price: pkg.price,
        status: 'pending',
        createdAt: Date.now(),
    });
    return {
        preferenceId: data.id,
        initPoint: data.init_point,
    };
});
// ─── Verificar pagamento e creditar (idempotente) ─────────────────────────────
exports.verifyMPPayment = (0, https_1.onCall)({ secrets: [MP_ACCESS_TOKEN], region: 'us-central1' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Login obrigatório.');
    const preferenceId = request.data?.preferenceId;
    if (!preferenceId)
        throw new https_1.HttpsError('invalid-argument', 'preferenceId obrigatório.');
    const url = `https://api.mercadopago.com/v1/payments/search?preference_id=${preferenceId}&sort=date_created&criteria=desc`;
    const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN.value()}` },
    });
    if (!resp.ok)
        return { status: 'pending' };
    const data = await resp.json();
    const results = data.results ?? [];
    if (results.length === 0)
        return { status: 'pending' };
    const payment = results[0];
    const mpStatus = payment.status ?? '';
    if (mpStatus === 'approved') {
        // Idempotência: confere se o paymentRef já foi creditado
        const paymentRef = String(payment.id);
        const existing = await db.collection('credit_purchases')
            .where('paymentRef', '==', paymentRef)
            .limit(1)
            .get();
        if (!existing.empty)
            return { status: 'approved' };
        // Verifica external_reference para extrair packageId + uid de quem comprou
        // Formato: "uid|packageId|timestamp"
        const ref = payment.external_reference ?? '';
        const [refUid, refPackageId] = ref.split('|');
        if (refUid !== uid)
            throw new https_1.HttpsError('permission-denied', 'Pagamento não pertence a este usuário.');
        const pkg = CREDIT_PACKAGES[refPackageId];
        if (!pkg)
            throw new https_1.HttpsError('invalid-argument', 'Pacote do pagamento inválido.');
        // Transação atômica: adiciona créditos + registra compra
        await db.runTransaction(async (tx) => {
            const userRef = db.collection('users').doc(uid);
            tx.update(userRef, { promotionCredits: firestore_1.FieldValue.increment(pkg.credits) });
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
        return { status: 'approved', credits: pkg.credits };
    }
    if (['in_process', 'authorized', 'pending'].includes(mpStatus)) {
        return { status: 'pending' };
    }
    return { status: 'rejected' };
});
//# sourceMappingURL=index.js.map