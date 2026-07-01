import {
  collection,
  doc,
  getDoc,
  getDocs,
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
  CREDIT_PACKAGES,
  PromotionTier,
  PromotionPackageId,
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

export interface CreatePromotionResult extends ActivePromotion {
  /** Saldo de créditos do usuário após o débito (igual ao saldo anterior se admin). */
  newCredits: number;
}

/**
 * Cria/atualiza a promoção de um evento via Cloud Function `createPromotion`.
 *
 * Roda no backend (admin SDK) em uma única transação: debita os créditos,
 * expira qualquer promoção ativa anterior do mesmo evento e atualiza o
 * documento do evento — tudo atomicamente. Isso evita o cenário de "créditos
 * debitados mas promoção não aplicada" (falha de rede entre etapas) e
 * promoções duplicadas com status='active' para o mesmo evento.
 */
export async function createPromotion(params: {
  userId: string;
  eventId: string;
  tier: PromotionTier;
  photoUrl: string | null;         // legacy (primeira foto)
  photoUrls?: string[];            // array completo de fotos
  skipCreditCheck?: boolean;       // usado por admins (créditos infinitos)
  /** Pacote de dias. Null = promoção avulsa (comportamento legado). */
  packageId?: PromotionPackageId | null;
  weeks?: number;                  // 1–8 semanas (ignorado se packageId=null)
  activeDays?: number[];           // dias ativos definitivos (0=Dom … 6=Sáb)
  link?: string | null;            // URL opcional do evento (site, ingressos etc.)
}): Promise<CreatePromotionResult> {
  const {
    eventId, tier, photoUrl, photoUrls,
    packageId = null, weeks = 1, activeDays, link = null,
  } = params;

  const call = httpsCallable<
    {
      eventId: string;
      tier: PromotionTier;
      photoUrl: string | null;
      photoUrls?: string[];
      packageId?: PromotionPackageId | null;
      weeks?: number;
      activeDays?: number[];
      link?: string | null;
    },
    CreatePromotionResult
  >(functions, 'createPromotion');

  const res = await call({
    eventId, tier, photoUrl, photoUrls, packageId, weeks, activeDays, link,
  });
  return res.data;
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
    const endMs = (data.endDate as Timestamp).toMillis();
    return {
      id: d.id,
      eventId: data.eventId,
      userId: data.userId,
      tier: data.tier,
      photoUrl: data.photoUrl ?? null,
      startDate: (data.startDate as Timestamp).toMillis(),
      endDate: endMs,
      status: endMs > Date.now() ? 'active' : 'expired',
      creditsUsed: data.creditsUsed,
      packageId: data.packageId ?? null,
      weeks: data.weeks ?? null,
      activeDays: data.activeDays ?? null,
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
    packageId: data.packageId ?? null,
    weeks: data.weeks ?? null,
    activeDays: data.activeDays ?? null,
  };
}

// ─── Cancelar promoção ────────────────────────────────────────────────────────

export async function cancelPromotion(promotionId: string, eventId: string): Promise<void> {
  await updateDoc(doc(db, PROMOTIONS_COL, promotionId), { status: 'expired' });

  // Ao cancelar, reduz expiresAt para "agora + 2 h" (grace period)
  // para o evento não sumir imediatamente mas também não ficar 30 dias sem promoção.
  const gracePeriod = Timestamp.fromMillis(Date.now() + 2 * 60 * 60 * 1000);
  await updateDoc(doc(db, 'entertainment_events', eventId), {
    isFeatured: false,
    promotionTier: null,
    promotionEndDate: null,
    promotionPhotoUrl: null,
    promotionPhotoUrls: null,
    promotionPackage: null,
    promotionWeeks: null,
    promotionActiveDays: null,
    link: null,
    expiresAt: gracePeriod,
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
 * Gera pagamento PIX via Mercado Pago — retorna QR Code e código copia-e-cola.
 */
export async function createPixPaymentCloud(
  packageId: CreditPackageId,
  payerEmail?: string,
): Promise<{ paymentId: string; pixCode: string; pixQrBase64: string | null; expiresAt: number }> {
  const call = httpsCallable<
    { packageId: string; payerEmail?: string },
    { paymentId: string; pixCode: string; pixQrBase64: string | null; expiresAt: number }
  >(functions, 'createPixPayment');
  const res = await call({ packageId, payerEmail });
  return res.data;
}

/**
 * Verifica status de pagamento PIX por paymentId (polling).
 */
export async function verifyPixPaymentCloud(
  paymentId: string,
): Promise<{ status: 'approved' | 'pending' | 'rejected'; credits?: number }> {
  const call = httpsCallable<
    { paymentId: string },
    { status: 'approved' | 'pending' | 'rejected'; credits?: number }
  >(functions, 'verifyPixPayment');
  const res = await call({ paymentId });
  return res.data;
}

// ─── Stripe — Pagamentos internacionais ──────────────────────────────────────

/**
 * Cria um PaymentIntent Stripe e retorna o clientSecret para o Payment Sheet.
 */
export async function createStripePaymentIntentCloud(
  packageId: CreditPackageId,
): Promise<{ paymentIntentId: string; clientSecret: string; amount: number; currency: string }> {
  const call = httpsCallable<
    { packageId: string },
    { paymentIntentId: string; clientSecret: string; amount: number; currency: string }
  >(functions, 'createStripePaymentIntent');
  const res = await call({ packageId });
  return res.data;
}

/**
 * Verifica um PaymentIntent Stripe e credita automaticamente (idempotente).
 */
export async function verifyStripePaymentCloud(
  paymentIntentId: string,
): Promise<{ status: 'approved' | 'pending' | 'rejected'; credits?: number }> {
  const call = httpsCallable<
    { paymentIntentId: string },
    { status: 'approved' | 'pending' | 'rejected'; credits?: number }
  >(functions, 'verifyStripePayment');
  const res = await call({ paymentIntentId });
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

// ─── Crédito por anúncio recompensado ────────────────────────────────────────

/**
 * Concede 1 crédito ao usuário após assistir um rewarded ad.
 * Delegado à Cloud Function `awardAdCredit` para garantir:
 *   - cooldown server-side de 1 hora (não burlável pelo cliente)
 *   - escrita em 'credit_purchases' via admin SDK (regras de Firestore bloqueiam
 *     o cliente de escrever diretamente nessa coleção)
 */
export async function awardAdCredit(_userId: string): Promise<number> {
  const fn = httpsCallable<Record<string, never>, { credits: number }>(
    functions,
    'awardAdCredit',
  );
  const result = await fn({});
  return result.data.credits;
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
