"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onReportCreated = exports.moderatePhoto = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const storage_1 = require("firebase-functions/v2/storage");
const firestore_2 = require("firebase-admin/firestore");
const storage_2 = require("firebase-admin/storage");
const shared_1 = require("./shared");
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
        const [result] = await shared_1.visionClient.safeSearchDetection(imageUri);
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
            await shared_1.db.collection('entertainment_events').doc(eventId).update({
                promotionPhotoUrl: null,
                promotionPhotoUrls: [],
            }).catch(() => { });
            console.warn(`Photo rejected for event ${eventId} (userId: ${userId})`);
        }
    }
});
// ─── Rate limiting server-side: denúncias (reports) ──────────────────────────
exports.onReportCreated = (0, firestore_1.onDocumentCreated)({ document: 'reports/{reportId}', region: 'us-central1' }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const reporterId = data.reporterId;
    if (!reporterId || reporterId === 'anonymous')
        return;
    await shared_1.db.collection('users').doc(reporterId).update({
        lastReportAt: firestore_2.FieldValue.serverTimestamp(),
    }).catch(() => { });
});
//# sourceMappingURL=moderation.js.map