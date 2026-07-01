import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  db,
  CREDIT_PACKAGES,
  sanitizeString,
  assertAuth,
  checkAppToken,
} from './shared';

// ─── Crédito por anúncio recompensado ─────────────────────────────────────────
const AD_CREDIT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hora

export const awardAdCredit = onCall(
  { region: 'us-central1' },
  async (request) => {
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

// ─── Configuração de promoções (mirror de src/types/promotion.ts) ────────────
const PROMOTION_TIER_CONFIG: Record<string, { creditsRequired: number; durationDays: number; showFeatured: boolean }> = {
  bronze: { creditsRequired: 1, durationDays: 7,  showFeatured: false },
  prata:  { creditsRequired: 2, durationDays: 14, showFeatured: true },
  ouro:   { creditsRequired: 3, durationDays: 30, showFeatured: true },
};

const PROMOTION_PACKAGE_DAYS: Record<string, number[]> = {
  full:     [0, 1, 2, 3, 4, 5, 6],
  weekdays: [1, 2, 3, 4, 5],
  weekend:  [5, 6, 0],
  single:   [],
};

const PROMOTION_PRICING: Record<string, Record<string, number>> = {
  bronze: { full: 2, weekdays: 2, weekend: 1, single: 1 },
  prata:  { full: 4, weekdays: 3, weekend: 2, single: 1 },
  ouro:   { full: 7, weekdays: 5, weekend: 4, single: 2 },
};

function calcPackageCredits(tier: string, packageId: string, weeks: number): number {
  return (PROMOTION_PRICING[tier]?.[packageId] ?? 1) * weeks;
}

async function isAdminUser(email: string | undefined | null): Promise<boolean> {
  if (!email) return false;
  const snap = await db.collection('config').doc('admins').get();
  const emails = (snap.data()?.emails as string[] | undefined) ?? [];
  return emails.includes(email);
}

// ─── Criar promoção de evento ────────────────────────────────────────────────
export const createPromotion = onCall(
  { region: 'us-central1' },
  async (request) => {
    checkAppToken(request, 'createPromotion');
    const uid = request.auth?.uid;
    assertAuth(uid);

    const data = request.data ?? {};
    const eventId = sanitizeString(data.eventId, 128);

    const tier = data.tier;
    if (!['bronze', 'prata', 'ouro'].includes(tier)) {
      throw new HttpsError('invalid-argument', 'Nivel de promocao invalido.');
    }

    const packageId: string | null = data.packageId ?? null;
    if (packageId !== null && !(packageId in PROMOTION_PACKAGE_DAYS)) {
      throw new HttpsError('invalid-argument', 'Pacote invalido.');
    }
    const weeks = packageId ? Math.min(8, Math.max(1, Math.floor(Number(data.weeks) || 1))) : 1;

    const photoUrl: string | null = typeof data.photoUrl === 'string' ? data.photoUrl.slice(0, 500) : null;
    const photoUrls: string[] = Array.isArray(data.photoUrls)
      ? data.photoUrls.filter((u: unknown) => typeof u === 'string').slice(0, 5).map((u: string) => u.slice(0, 500))
      : [];
    const link: string | null = typeof data.link === 'string' && data.link.trim()
      ? data.link.trim().slice(0, 300)
      : null;
    const activeDaysInput: number[] | null = Array.isArray(data.activeDays)
      ? data.activeDays.filter((d: unknown) => typeof d === 'number' && d >= 0 && d <= 6)
      : null;

    const userRef = db.collection('users').doc(uid);
    const eventRef = db.collection('entertainment_events').doc(eventId);

    return db.runTransaction(async (tx) => {
      const [userSnap, eventSnap] = await Promise.all([tx.get(userRef), tx.get(eventRef)]);
      if (!eventSnap.exists) throw new HttpsError('not-found', 'Evento nao encontrado.');

      const eventData = eventSnap.data()!;
      const admin = await isAdminUser(request.auth?.token?.email as string | undefined);
      if (eventData.userId !== uid && !admin) {
        throw new HttpsError('permission-denied', 'Voce nao e o organizador deste evento.');
      }

      const tierConfig = PROMOTION_TIER_CONFIG[tier];
      let creditsRequired: number;
      let durationMs: number;
      let finalActiveDays: number[] | null;

      if (packageId) {
        const defaultDays = PROMOTION_PACKAGE_DAYS[packageId];
        const days = activeDaysInput && activeDaysInput.length > 0 ? activeDaysInput : defaultDays;
        creditsRequired = calcPackageCredits(tier, packageId, weeks);
        durationMs = weeks * 7 * 24 * 60 * 60 * 1000;
        finalActiveDays = days;
      } else {
        creditsRequired = tierConfig.creditsRequired;
        durationMs = tierConfig.durationDays * 24 * 60 * 60 * 1000;
        finalActiveDays = null;
      }

      const currentCredits = (userSnap.data()?.promotionCredits as number) ?? 0;
      if (!admin) {
        if (currentCredits < creditsRequired) {
          throw new HttpsError('failed-precondition', 'Creditos insuficientes para esta promocao.');
        }
        tx.update(userRef, { promotionCredits: FieldValue.increment(-creditsRequired) });
      }

      const activeSnap = await tx.get(
        db.collection('promotions')
          .where('eventId', '==', eventId)
          .where('status', '==', 'active'),
      );
      for (const promoDoc of activeSnap.docs) {
        tx.update(promoDoc.ref, { status: 'expired' });
      }

      const now = Date.now();
      const endDate = now + durationMs;
      const allPhotoUrls = photoUrls.length > 0 ? photoUrls : (photoUrl ? [photoUrl] : []);

      const promoRef = db.collection('promotions').doc();
      tx.set(promoRef, {
        eventId,
        userId: uid,
        tier,
        photoUrl,
        startDate: Timestamp.fromMillis(now),
        endDate: Timestamp.fromMillis(endDate),
        status: 'active',
        creditsUsed: creditsRequired,
        packageId,
        weeks: packageId ? weeks : null,
        activeDays: finalActiveDays,
      });

      tx.update(eventRef, {
        isFeatured: tierConfig.showFeatured,
        promotionTier: tier,
        promotionEndDate: Timestamp.fromMillis(endDate),
        promotionPhotoUrl: allPhotoUrls[0] ?? null,
        promotionPhotoUrls: allPhotoUrls.length > 0 ? allPhotoUrls : null,
        promotionPackage: packageId,
        promotionWeeks: packageId ? weeks : null,
        promotionActiveDays: finalActiveDays,
        link,
        expiresAt: Timestamp.fromMillis(endDate),
      });

      return {
        id: promoRef.id,
        eventId,
        userId: uid,
        tier,
        photoUrl,
        startDate: now,
        endDate,
        status: 'active' as const,
        creditsUsed: creditsRequired,
        packageId,
        weeks: packageId ? weeks : null,
        activeDays: finalActiveDays,
        newCredits: admin ? currentCredits : currentCredits - creditsRequired,
      };
    });
  },
);
