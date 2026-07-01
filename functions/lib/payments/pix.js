"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPixPayment = exports.createPixPayment = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const shared_1 = require("../shared");
const PIX_EXPIRY_MINUTES = 30;
// ─── Criar pagamento PIX via Mercado Pago ─────────────────────────────────────
exports.createPixPayment = (0, https_1.onCall)({ secrets: [shared_1.MP_ACCESS_TOKEN, shared_1.ALERTOO_PIX_KEY_SECRET], region: 'us-central1' }, async (request) => {
    (0, shared_1.checkAppToken)(request, 'createPixPayment');
    const uid = request.auth?.uid;
    (0, shared_1.assertAuth)(uid);
    await (0, shared_1.enforcePaymentCooldown)(uid);
    const packageId = (0, shared_1.sanitizeString)(request.data?.packageId, 20);
    const pkg = shared_1.CREDIT_PACKAGES[packageId];
    if (!pkg)
        throw new https_1.HttpsError('invalid-argument', 'Pacote invalido.');
    const timestamp = Date.now();
    const externalReference = `${uid}|${packageId}|${timestamp}`;
    const expiresAt = new Date(timestamp + PIX_EXPIRY_MINUTES * 60 * 1000);
    const mpResp = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(0, shared_1.readSecret)(shared_1.MP_ACCESS_TOKEN)}`,
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
    await shared_1.db.collection('pending_payments').add({
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
exports.verifyPixPayment = (0, https_1.onCall)({ secrets: [shared_1.MP_ACCESS_TOKEN], region: 'us-central1' }, async (request) => {
    (0, shared_1.checkAppToken)(request, 'verifyPixPayment');
    const uid = request.auth?.uid;
    (0, shared_1.assertAuth)(uid);
    const paymentId = (0, shared_1.sanitizeString)(request.data?.paymentId, 50);
    if (!paymentId)
        throw new https_1.HttpsError('invalid-argument', 'paymentId obrigatorio.');
    if (!/^\d+$/.test(paymentId))
        throw new https_1.HttpsError('invalid-argument', 'paymentId com formato invalido.');
    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${(0, shared_1.readSecret)(shared_1.MP_ACCESS_TOKEN)}` },
    });
    if (!resp.ok)
        return { status: 'pending' };
    const payment = await resp.json();
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
                paymentMethod: 'pix',
                paymentRef,
                createdAt: Date.now(),
            });
        });
        try {
            const pendingSnap = await shared_1.db.collection('pending_payments')
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
//# sourceMappingURL=pix.js.map