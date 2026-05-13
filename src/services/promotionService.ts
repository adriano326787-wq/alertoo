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
import { db, storage } from './firebase';
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
  photoUrl: string | null;
  skipCreditCheck?: boolean; // usado por admins (créditos infinitos)
}): Promise<ActivePromotion> {
  const { userId, eventId, tier, photoUrl, skipCreditCheck = false } = params;
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
    promotionPhotoUrl: photoUrl ?? null,
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

// ─── Pagamentos pendentes ─────────────────────────────────────────────────────

const PENDING_PAYMENTS_COL = 'pending_payments';

export async function savePendingPayment(params: {
  userId: string;
  preferenceId: string;
  packageId: CreditPackageId;
  credits: number;
  price: number;
}): Promise<string> {
  const ref = await addDoc(collection(db, PENDING_PAYMENTS_COL), {
    ...params,
    status: 'pending',
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function verifyMPPayment(
  userId: string,
  preferenceId: string,
  packageId: CreditPackageId,
  credits: number,
  price: number,
  accessToken: string,
): Promise<'approved' | 'pending' | 'rejected'> {
  const url = `https://api.mercadopago.com/v1/payments/search?preference_id=${preferenceId}&sort=date_created&criteria=desc&range=date_created&begin_date=NOW-7DAYS&end_date=NOW`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) return 'pending';

  const data = await resp.json();
  const results: any[] = data.results ?? [];
  if (results.length === 0) return 'pending';

  const payment = results[0];
  const mpStatus: string = payment.status ?? '';

  if (mpStatus === 'approved') {
    // Credita apenas se ainda não foi creditado (idempotência por paymentRef)
    const paymentRef = String(payment.id);
    const q = query(
      collection(db, PURCHASES_COL),
      where('paymentRef', '==', paymentRef),
    );
    const existing = await getDocs(q);
    if (existing.empty) {
      await addCredits(userId, credits, packageId, 'mercadopago', paymentRef, price);
    }
    return 'approved';
  }

  if (['in_process', 'authorized', 'pending'].includes(mpStatus)) return 'pending';
  return 'rejected';
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
