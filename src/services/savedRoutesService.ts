/**
 * savedRoutesService — persistência de rotas e endereços salvos.
 *
 * Estratégia de sincronização:
 *   1. Firestore (`users/{uid}`) como fonte de verdade → sincroniza entre Android e iOS.
 *   2. AsyncStorage como cache offline → leitura imediata sem esperar Firestore.
 *   3. Migração automática: se o Firestore estiver vazio mas o AsyncStorage tiver dados
 *      (usuário vindo do Android), migra os dados para a nuvem automaticamente.
 *   4. Usuários anônimos continuam usando apenas AsyncStorage (sem UID persistente).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentUserId } from './authService';

// ─── Chaves legadas (AsyncStorage) ────────────────────────────────────────────
export const SAVED_ROUTES_KEY   = '@alertoo:saved_routes_v1';
export const SAVED_ADDRESSES_KEY = '@alertoo:saved_addresses_v1';
export const CORRIDOR_KM = 1.0;

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface SavedRoute {
  id: string;
  name: string;
  originLat: number;
  originLon: number;
  destLat: number;
  destLon: number;
  enabled: boolean;
}

export interface SavedAddress {
  id: string;
  name: string;   // "Casa", "Trabalho", etc.
  lat: number;
  lon: number;
  label: string;  // endereço legível
}

// ─── Helpers Firestore ────────────────────────────────────────────────────────
function userRef(uid: string) {
  return doc(db, 'users', uid);
}

function isLoggedIn(): string | null {
  const uid = getCurrentUserId();
  return uid && uid !== 'anonymous' ? uid : null;
}

// ─── Rotas salvas ─────────────────────────────────────────────────────────────

export async function loadSavedRoutes(): Promise<SavedRoute[]> {
  const uid = isLoggedIn();

  if (!uid) {
    // Anônimo — usa apenas AsyncStorage
    try {
      const raw = await AsyncStorage.getItem(SAVED_ROUTES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  try {
    const snap = await getDoc(userRef(uid));
    const cloudRoutes: SavedRoute[] | undefined = snap.data()?.savedRoutes;

    if (cloudRoutes && cloudRoutes.length > 0) {
      // Atualiza cache local
      AsyncStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(cloudRoutes)).catch(() => {});
      return cloudRoutes;
    }

    // Firestore vazio → verifica migração do AsyncStorage (dados do Android)
    const raw = await AsyncStorage.getItem(SAVED_ROUTES_KEY);
    if (raw) {
      const localRoutes: SavedRoute[] = JSON.parse(raw);
      if (localRoutes.length > 0) {
        // Migra para Firestore silenciosamente
        await setDoc(userRef(uid), { savedRoutes: localRoutes }, { merge: true });
        if (__DEV__) console.log('[savedRoutesService] Migradas', localRoutes.length, 'rotas para Firestore.');
        return localRoutes;
      }
    }

    return [];
  } catch {
    // Offline fallback — usa cache local
    try {
      const raw = await AsyncStorage.getItem(SAVED_ROUTES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
}

export async function saveSavedRoutes(routes: SavedRoute[]): Promise<void> {
  // Persiste localmente primeiro (resposta imediata na UI)
  await AsyncStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(routes)).catch(() => {});

  const uid = isLoggedIn();
  if (!uid) return;

  // Sincroniza com Firestore (merge para não sobrescrever outros campos do doc)
  await setDoc(userRef(uid), { savedRoutes: routes }, { merge: true });
}

// ─── Endereços salvos ─────────────────────────────────────────────────────────

export async function loadSavedAddresses(): Promise<SavedAddress[]> {
  const uid = isLoggedIn();

  if (!uid) {
    try {
      const raw = await AsyncStorage.getItem(SAVED_ADDRESSES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  try {
    const snap = await getDoc(userRef(uid));
    const cloudAddresses: SavedAddress[] | undefined = snap.data()?.savedAddresses;

    if (cloudAddresses && cloudAddresses.length > 0) {
      AsyncStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(cloudAddresses)).catch(() => {});
      return cloudAddresses;
    }

    // Firestore vazio → verifica migração do AsyncStorage (dados do Android)
    const raw = await AsyncStorage.getItem(SAVED_ADDRESSES_KEY);
    if (raw) {
      const localAddresses: SavedAddress[] = JSON.parse(raw);
      if (localAddresses.length > 0) {
        await setDoc(userRef(uid), { savedAddresses: localAddresses }, { merge: true });
        if (__DEV__) console.log('[savedRoutesService] Migrados', localAddresses.length, 'endereços para Firestore.');
        return localAddresses;
      }
    }

    return [];
  } catch {
    try {
      const raw = await AsyncStorage.getItem(SAVED_ADDRESSES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
}

export async function saveSavedAddresses(addresses: SavedAddress[]): Promise<void> {
  await AsyncStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(addresses)).catch(() => {});

  const uid = isLoggedIn();
  if (!uid) return;

  await setDoc(userRef(uid), { savedAddresses: addresses }, { merge: true });
}

// ─── Cálculo geométrico ───────────────────────────────────────────────────────

/**
 * Verifica se um ponto (pLat,pLon) está dentro de `thresholdKm` km do
 * segmento definido por (aLat,aLon)→(bLat,bLon).
 */
export function isPointNearRoute(
  pLat: number, pLon: number,
  aLat: number, aLon: number,
  bLat: number, bLon: number,
  thresholdKm: number = CORRIDOR_KM,
): boolean {
  const latToKm = 111;
  const midLat = (aLat + bLat + pLat) / 3;
  const lonToKm = 111 * Math.cos((midLat * Math.PI) / 180);

  const ax = aLon * lonToKm, ay = aLat * latToKm;
  const bx = bLon * lonToKm, by = bLat * latToKm;
  const px = pLon * lonToKm, py = pLat * latToKm;

  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay) <= thresholdKm;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const nearX = ax + t * dx, nearY = ay + t * dy;
  return Math.hypot(px - nearX, py - nearY) <= thresholdKm;
}
