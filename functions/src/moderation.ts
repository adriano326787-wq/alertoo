import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { db, visionClient } from './shared';

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

// ─── Rate limiting server-side: denúncias (reports) ──────────────────────────
export const onReportCreated = onDocumentCreated(
  { document: 'reports/{reportId}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const reporterId = data.reporterId as string | undefined;
    if (!reporterId || reporterId === 'anonymous') return;

    await db.collection('users').doc(reporterId).update({
      lastReportAt: FieldValue.serverTimestamp(),
    }).catch(() => {});
  },
);
