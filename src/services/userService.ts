import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '../types/user';
import { computeStreakUpdate, localDayKey, StreakState } from '../utils/streakLogic';
import { captureError } from './sentry';

const USERS = 'users';

export async function getOrCreateUserProfile(
  uid: string,
  defaults: Partial<Pick<UserProfile, 'displayName' | 'email' | 'phone' | 'photoURL'>>
): Promise<UserProfile> {
  const ref = doc(db, USERS, uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return docToProfile(snap.id, snap.data());
  }

  // #6 — Use setDoc with merge:true instead of plain setDoc.
  // If two devices call getOrCreateUserProfile concurrently (race condition),
  // the second write will MERGE rather than overwrite, preserving any points/stats
  // that may have been written by the first call in the brief window.
  const newDoc: Record<string, any> = {
    displayName: defaults.displayName ?? 'Usuário',
    email: defaults.email ?? null,
    phone: defaults.phone ?? null,
    photoURL: defaults.photoURL ?? null,
    // These fields use a sentinel so they are only written if the field is absent
    points: 0,
    eventsReported: 0,
    commentsPosted: 0,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, newDoc, { merge: true });
  return { uid, ...newDoc, createdAt: Date.now() } as UserProfile;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USERS, uid));
  if (!snap.exists()) return null;
  return docToProfile(snap.id, snap.data());
}

export async function awardPoints(
  uid: string,
  points: number,
  statField?: 'eventsReported' | 'commentsPosted'
): Promise<void> {
  const update: Record<string, any> = { points: increment(points) };
  if (statField) update[statField] = increment(1);
  await updateDoc(doc(db, USERS, uid), update);
}

/**
 * Registra atividade do dia pra fins de streak (dias consecutivos com pelo
 * menos 1 ação relevante: criar evento, confirmar, comentar). Early-return
 * se já registrou hoje — evita write redundante a cada ação do mesmo dia.
 * Chamar nos mesmos pontos que já chamam awardPoints pelo ator da ação
 * (não pelo dono que recebe pontos por confirmação de terceiros).
 */
export async function recordDailyActivity(uid: string): Promise<void> {
  try {
    const ref = doc(db, USERS, uid);
    const snap = await getDoc(ref);
    const data = snap.data() ?? {};
    const state: StreakState = {
      currentStreak: data.currentStreak ?? 0,
      longestStreak: data.longestStreak ?? 0,
      lastActiveDate: data.lastActiveDate ?? null,
    };
    const today = localDayKey(new Date());
    const result = computeStreakUpdate(state, today);
    if (!result.changed) return;

    await updateDoc(ref, {
      currentStreak: result.currentStreak,
      longestStreak: result.longestStreak,
      lastActiveDate: result.lastActiveDate,
    });
  } catch (e) {
    captureError(e, { where: 'userService.recordDailyActivity' });
  }
}

/**
 * Persiste o countryCode detectado (GPS/geocode) no perfil do usuário — é a
 * única forma do servidor (Cloud Functions) saber o país de alguém, já que
 * hoje esse dado só existe no client (appStore/AsyncStorage). Usado pela
 * Fase 2 (moeda de cobrança) e Fase 3 (idioma de notificação) da expansão
 * internacional. Early-return se não mudou — evita write redundante a cada
 * detecção de localização (a cada abertura de tela, por exemplo).
 */
export async function persistUserCountry(uid: string, countryCode: string): Promise<void> {
  try {
    const ref = doc(db, USERS, uid);
    const snap = await getDoc(ref);
    if (snap.data()?.countryCode === countryCode) return;
    await updateDoc(ref, { countryCode });
  } catch (e) {
    captureError(e, { where: 'userService.persistUserCountry' });
  }
}

function docToProfile(uid: string, d: Record<string, any>): UserProfile {
  return {
    uid,
    displayName: d.displayName ?? 'Usuário',
    email: d.email ?? null,
    phone: d.phone ?? null,
    photoURL: d.photoURL ?? null,
    points: d.points ?? 0,
    eventsReported: d.eventsReported ?? 0,
    commentsPosted: d.commentsPosted ?? 0,
    createdAt: (d.createdAt as Timestamp)?.toMillis() ?? Date.now(),
    promotionCredits: d.promotionCredits ?? 0, // #7 — estava ausente no mapeamento
    onboarding: d.onboarding ?? undefined,
    currentStreak: d.currentStreak ?? 0,
    longestStreak: d.longestStreak ?? 0,
    lastActiveDate: d.lastActiveDate ?? undefined,
    countryCode: d.countryCode ?? undefined,
  };
}
