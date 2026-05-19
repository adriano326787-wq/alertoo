import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  increment,
  runTransaction,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, storage } from './firebase';

// Cloud Functions — endpoints seguros que mantêm o MP_ACCESS_TOKEN no backend
const functions = getFunctions(undefined, 'us-central1');
import {
  ActivePromotion,
  CreditPackage,
  CreditPackageId,
  CreditPurchase,
  CREDIT_PACKAGES,
  PROMOTION_TIERS,
  PromotionTier,
} from '../types/promotion';

const USERS_COL      = 'users';
const PROMOTIONS_COL = 'promotions';
const PURCHASES_COL  = 'credit_purchases';

// ─── Créditos do usuário ─────────────────────────────────────────────────────

export async function getUserCredits(userId: string): Promise<number> {
  const snap = await getDoc(doc(db, USERS_COL, userId));
  return (snap.data()?.promotionCredits as number) ?? 0;
}

export async function addCredits(
  userId: string,
  credits: number,
  packageId: CreditPackageId,
  paymentMethod: 'mercadopago' | 'google_pay',
  paymentRef: string,
  price: number,
): Promise<void> {
  // Registra compra + adiciona créditos atomicamente
  await runTransaction(db, async (tx) => {
    const userRef = doc(db, USERS_COL, userId);
    tx.update(userRef, { promotionCredits: increment(credits) });

    const purchaseRef = doc(collection(db, PURCHASES_COL));
    tx.set(purchaseRef, {
      userId,
      packageId,
      credits,
      price,
      paymentMethod,
      paymentRef,
      createdAt: Date.now(),
    });
  });
}

// ─── Upload de foto para Firebase Storage ────────────────────────────────────

export function uploadPromotionPhoto(
  userId: string,
  eventId: string,
  uri: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const path = `promotions/${userId}/${eventId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, blob);

      task.on(
        'state_changed',
        (snap) => {
          const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
          onProgress?.(Math.round(pct));
        },
        reject,
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        },
      );
    } catch (err) {
      reject(err);
    }
  });
}

export async function deletePromotionPhoto(photoUrl: string): Promise<void> {
  try {
    const storageRef = ref(storage, photoUrl);
    await deleteObject(storageRef);
  } catch {
    // ignora erro se arquivo não existe
  }
}

// ─── Criar promoção ───────────────────────────────────────────────────────────

export async function createPromotion(params: {
  userId: string;
  eventId: string;
  tier: PromotionTier;
  photoUrl: string | null;       // legacy (primeira foto)
  photoUrls?: string[];          // array completo de fotos
  skipCreditCheck?: boolean;     // usado por admins (créditos infinitos)
}): Promise<ActivePromotion> {
  const { userId, eventId, tier, photoUrl, photoUrls, skipCreditCheck = false } = params;
  const allPhotoUrls = photoUrls && photoUrls.length > 0 ? photoUrls : (photoUrl ? [photoUrl] : []);
  const config = PROMOTION_TIERS[tier];

  // Verifica e debita créditos (admins pulam essa etapa)
  if (!skipCreditCheck) {
    await runTransaction(db, async (tx) => {
      const userRef = doc(db, USERS_COL, userId);
      const userSnap = await tx.get(userRef);
      const currentCredits = (userSnap.data()?.promotionCredits as number) ?? 0;

      if (currentCredits < config.creditsRequired) {
        throw new Error('Créditos insuficientes para esta promoção.');
      }

      tx.update(userRef, {
        promotionCredits: increment(-config.creditsRequired),
      });
    });
  }

  const now = Date.now();
  const endDate = now + config.durationDays * 24 * 60 * 60 * 1000;

  const docRef = await addDoc(collection(db, PROMOTIONS_COL), {
    eventId,
    userId,
    tier,
    photoUrl: photoUrl ?? null,
    startDate: Timestamp.fromMillis(now),
    endDate: Timestamp.fromMillis(endDate),
    status: 'active',
    creditsUsed: config.creditsRequired,
  });

  // Atualiza o documento do evento com os dados da promoção
  await updateDoc(doc(db, 'entertainment_events', eventId), {
    isFeatured: config.showFeatured,
    promotionTier: tier,
    promotionEndDate: Timestamp.fromMillis(endDate),
    promotionPhotoUrl: allPhotoUrls[0] ?? null,       // primeira foto (legacy)
    promotionPhotoUrls: allPhotoUrls.length > 0 ? allPhotoUrls : null,
  });

  return {
    id: docRef.id,
    eventId,
    userId,
    tier,
    photoUrl,
    startDate: now,
    endDate,
    status: 'active',
    creditsUsed: config.creditsRequired,
  };
}

// ─── Buscar promoções do usuário ──────────────────────────────────────────────

export async function getUserPromotions(userId: string): Promise<ActivePromotion[]> {
  const q = query(
    collection(db, PROMOTIONS_COL),
    where('userId', '==', userId),
    orderBy('startDate', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      eventId: data.eventId,
      userId: data.userId,
      tier: data.tier,
      photoUrl: data.photoUrl ?? null,
      startDate: (data.startDate as Timestamp).toMillis(),
      endDate: (data.endDate as Timestamp).toMillis(),
      status: data.endDate.toMillis() > Date.now() ? 'active' : 'expired',
      creditsUsed: data.creditsUsed,
    } as ActivePromotion;
  });
}

// ─── Verificar promoção ativa de um evento ────────────────────────────────────

export async function getEventActivePromotion(
  eventId: string,
): Promise<ActivePromotion | null> {
  const q = query(
    collection(db, PROMOTIONS_COL),
    where('eventId', '==', eventId),
    where('status', '==', 'active'),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const d = snap.docs[0];
  const data = d.data();
  const endDate = (data.endDate as Timestamp).toMillis();
  if (endDate <= Date.now()) return null;

  return {
    id: d.id,
    eventId: data.eventId,
    userId: data.userId,
    tier: data.tier,
    photoUrl: data.photoUrl ?? null,
    startDate: (data.startDate as Timestamp).toMillis(),
    endDate,
    status: 'active',
    creditsUsed: data.creditsUsed,
  };
}

// ─── Cancelar promoção ────────────────────────────────────────────────────────

export async function cancelPromotion(promotionId: string, eventId: string): Promise<void> {
  await updateDoc(doc(db, PROMOTIONS_COL, promotionId), { status: 'expired' });
  await updateDoc(doc(db, 'entertainment_events', eventId), {
    isFeatured: false,
    promotionTier: null,
    promotionEndDate: null,
    promotionPhotoUrl: null,
  });
}

// ─── Pagamento via Cloud Function (seguro — token MP fica no backend) ────────

/**
 * Cria uma preferência de pagamento via Cloud Function.
 * O MP_ACCESS_TOKEN nunca chega ao app cliente.
 */
export async function createMPPreferenceCloud(
  packageId: CreditPackageId,
): Promise<{ preferenceId: string; initPoint: string }> {
  const call = httpsCallable<{ packageId: string }, { preferenceId: string; initPoint: string }>(
    functions,
    'createMPPreference',
  );
  const res = await call({ packageId });
  return res.data;
}

/**
 * Verifica status de pagamento e credita (idempotente) via Cloud Function.
 */
export async function verifyMPPaymentCloud(
  preferenceId: string,
): Promise<'approved' | 'pending' | 'rejected'> {
  const call = httpsCallable<{ preferenceId: string }, { status: 'approved' | 'pending' | 'rejected' }>(
    functions,
    'verifyMPPayment',
  );
  const res = await call({ preferenceId });
  return res.data.status;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getPackageById(id: CreditPackageId): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}

export function formatCredits(n: number): string {
  return n === 1 ? '1 crédito' : `${n} créditos`;
}

export function daysRemaining(endDate: number): number {
  return Math.max(0, Math.ceil((endDate - Date.now()) / (1000 * 60 * 60 * 24)));
}
