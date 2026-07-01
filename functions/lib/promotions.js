"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPromotion = exports.awardAdCredit = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const shared_1 = require("./shared");
// ─── Crédito por anúncio recompensado ─────────────────────────────────────────
const AD_CREDIT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hora
exports.awardAdCredit = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    (0, shared_1.checkAppToken)(request, 'awardAdCredit');
    const uid = request.auth?.uid;
    (0, shared_1.assertAuth)(uid);
    const recentSnap = await shared_1.db.collection('credit_purchases')
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
    await shared_1.db.runTransaction(async (tx) => {
        const userRef = shared_1.db.collection('users').doc(uid);
        tx.update(userRef, { promotionCredits: firestore_1.FieldValue.increment(1) });
        const purchaseRef = shared_1.db.collection('credit_purchases').doc();
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
    const userSnap = await shared_1.db.collection('users').doc(uid).get();
    const credits = userSnap.data()?.promotionCredits ?? 0;
    return { credits };
});
// ─── Configuração de promoções (mirror de src/types/promotion.ts) ────────────
const PROMOTION_TIER_CONFIG = {
    bronze: { creditsRequired: 1, durationDays: 7, showFeatured: false },
    prata: { creditsRequired: 2, durationDays: 14, showFeatured: true },
    ouro: { creditsRequired: 3, durationDays: 30, showFeatured: true },
};
const PROMOTION_PACKAGE_DAYS = {
    full: [0, 1, 2, 3, 4, 5, 6],
    weekdays: [1, 2, 3, 4, 5],
    weekend: [5, 6, 0],
    single: [],
};
const PROMOTION_PRICING = {
    bronze: { full: 2, weekdays: 2, weekend: 1, single: 1 },
    prata: { full: 4, weekdays: 3, weekend: 2, single: 1 },
    ouro: { full: 7, weekdays: 5, weekend: 4, single: 2 },
};
function calcPackageCredits(tier, packageId, weeks) {
    return (PROMOTION_PRICING[tier]?.[packageId] ?? 1) * weeks;
}
async function isAdminUser(email) {
    if (!email)
        return false;
    const snap = await shared_1.db.collection('config').doc('admins').get();
    const emails = snap.data()?.emails ?? [];
    return emails.includes(email);
}
// ─── Criar promoção de evento ────────────────────────────────────────────────
exports.createPromotion = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    (0, shared_1.checkAppToken)(request, 'createPromotion');
    const uid = request.auth?.uid;
    (0, shared_1.assertAuth)(uid);
    const data = request.data ?? {};
    const eventId = (0, shared_1.sanitizeString)(data.eventId, 128);
    const tier = data.tier;
    if (!['bronze', 'prata', 'ouro'].includes(tier)) {
        throw new https_1.HttpsError('invalid-argument', 'Nivel de promocao invalido.');
    }
    const packageId = data.packageId ?? null;
    if (packageId !== null && !(packageId in PROMOTION_PACKAGE_DAYS)) {
        throw new https_1.HttpsError('invalid-argument', 'Pacote invalido.');
    }
    const weeks = packageId ? Math.min(8, Math.max(1, Math.floor(Number(data.weeks) || 1))) : 1;
    const photoUrl = typeof data.photoUrl === 'string' ? data.photoUrl.slice(0, 500) : null;
    const photoUrls = Array.isArray(data.photoUrls)
        ? data.photoUrls.filter((u) => typeof u === 'string').slice(0, 5).map((u) => u.slice(0, 500))
        : [];
    const link = typeof data.link === 'string' && data.link.trim()
        ? data.link.trim().slice(0, 300)
        : null;
    const activeDaysInput = Array.isArray(data.activeDays)
        ? data.activeDays.filter((d) => typeof d === 'number' && d >= 0 && d <= 6)
        : null;
    const userRef = shared_1.db.collection('users').doc(uid);
    const eventRef = shared_1.db.collection('entertainment_events').doc(eventId);
    return shared_1.db.runTransaction(async (tx) => {
        const [userSnap, eventSnap] = await Promise.all([tx.get(userRef), tx.get(eventRef)]);
        if (!eventSnap.exists)
            throw new https_1.HttpsError('not-found', 'Evento nao encontrado.');
        const eventData = eventSnap.data();
        const admin = await isAdminUser(request.auth?.token?.email);
        if (eventData.userId !== uid && !admin) {
            throw new https_1.HttpsError('permission-denied', 'Voce nao e o organizador deste evento.');
        }
        const tierConfig = PROMOTION_TIER_CONFIG[tier];
        let creditsRequired;
        let durationMs;
        let finalActiveDays;
        if (packageId) {
            const defaultDays = PROMOTION_PACKAGE_DAYS[packageId];
            const days = activeDaysInput && activeDaysInput.length > 0 ? activeDaysInput : defaultDays;
            creditsRequired = calcPackageCredits(tier, packageId, weeks);
            durationMs = weeks * 7 * 24 * 60 * 60 * 1000;
            finalActiveDays = days;
        }
        else {
            creditsRequired = tierConfig.creditsRequired;
            durationMs = tierConfig.durationDays * 24 * 60 * 60 * 1000;
            finalActiveDays = null;
        }
        const currentCredits = userSnap.data()?.promotionCredits ?? 0;
        if (!admin) {
            if (currentCredits < creditsRequired) {
                throw new https_1.HttpsError('failed-precondition', 'Creditos insuficientes para esta promocao.');
            }
            tx.update(userRef, { promotionCredits: firestore_1.FieldValue.increment(-creditsRequired) });
        }
        const activeSnap = await tx.get(shared_1.db.collection('promotions')
            .where('eventId', '==', eventId)
            .where('status', '==', 'active'));
        for (const promoDoc of activeSnap.docs) {
            tx.update(promoDoc.ref, { status: 'expired' });
        }
        const now = Date.now();
        const endDate = now + durationMs;
        const allPhotoUrls = photoUrls.length > 0 ? photoUrls : (photoUrl ? [photoUrl] : []);
        const promoRef = shared_1.db.collection('promotions').doc();
        tx.set(promoRef, {
            eventId,
            userId: uid,
            tier,
            photoUrl,
            startDate: firestore_1.Timestamp.fromMillis(now),
            endDate: firestore_1.Timestamp.fromMillis(endDate),
            status: 'active',
            creditsUsed: creditsRequired,
            packageId,
            weeks: packageId ? weeks : null,
            activeDays: finalActiveDays,
        });
        tx.update(eventRef, {
            isFeatured: tierConfig.showFeatured,
            promotionTier: tier,
            promotionEndDate: firestore_1.Timestamp.fromMillis(endDate),
            promotionPhotoUrl: allPhotoUrls[0] ?? null,
            promotionPhotoUrls: allPhotoUrls.length > 0 ? allPhotoUrls : null,
            promotionPackage: packageId,
            promotionWeeks: packageId ? weeks : null,
            promotionActiveDays: finalActiveDays,
            link,
            expiresAt: firestore_1.Timestamp.fromMillis(endDate),
        });
        return {
            id: promoRef.id,
            eventId,
            userId: uid,
            tier,
            photoUrl,
            startDate: now,
            endDate,
            status: 'active',
            creditsUsed: creditsRequired,
            packageId,
            weeks: packageId ? weeks : null,
            activeDays: finalActiveDays,
            newCredits: admin ? currentCredits : currentCredits - creditsRequired,
        };
    });
});
//# sourceMappingURL=promotions.js.map