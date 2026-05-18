/**
 * Favorites — eventos salvos pelo usuário.
 *
 * Estrutura no Firestore:
 *   users/{uid}/favorites/{eventId}
 *     - eventId: string
 *     - eventType: 'road' | 'entertainment'
 *     - savedAt: Timestamp
 *     - title: string  (denormalizado pra exibir sem buscar o evento)
 *     - emoji: string
 *
 * Vantagem dessa estrutura: subcollection escala bem e suporta filter/sort
 * sem ler o user document inteiro.
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';

export type FavoriteEventType = 'road' | 'entertainment';

export interface FavoriteEvent {
  eventId: string;
  eventType: FavoriteEventType;
  savedAt: number; // unix ms
  title: string;
  emoji: string;
}

const subColl = (uid: string) => collection(db, 'users', uid, 'favorites');

/** Toggle: se já é favorito, remove; se não, adiciona */
export async function toggleFavorite(
  uid: string,
  fav: Omit<FavoriteEvent, 'savedAt'>
): Promise<boolean /* nowFavorite */> {
  if (uid === 'anonymous' || !uid) return false;
  const ref = doc(db, 'users', uid, 'favorites', fav.eventId);
  // Tenta ler pra decidir se vai criar ou deletar
  try {
    const snapshot = await getDocs(query(subColl(uid)));
    const exists = snapshot.docs.some((d) => d.id === fav.eventId);
    if (exists) {
      await deleteDoc(ref);
      return false;
    }
    await setDoc(ref, {
      ...fav,
      savedAt: Timestamp.now(),
    });
    return true;
  } catch (e) {
    return false;
  }
}

/** Adiciona explicitamente (não toggle) */
export async function addFavorite(
  uid: string,
  fav: Omit<FavoriteEvent, 'savedAt'>
): Promise<void> {
  if (uid === 'anonymous' || !uid) return;
  const ref = doc(db, 'users', uid, 'favorites', fav.eventId);
  await setDoc(ref, { ...fav, savedAt: Timestamp.now() });
}

/** Remove explicitamente */
export async function removeFavorite(uid: string, eventId: string): Promise<void> {
  if (uid === 'anonymous' || !uid) return;
  await deleteDoc(doc(db, 'users', uid, 'favorites', eventId));
}

/**
 * Subscribe em tempo real à lista de favoritos do usuário.
 * Retorna unsubscribe function.
 */
export function subscribeFavorites(
  uid: string,
  callback: (favorites: FavoriteEvent[]) => void
): () => void {
  if (uid === 'anonymous' || !uid) {
    callback([]);
    return () => {};
  }
  const q = query(subColl(uid), orderBy('savedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((d) => {
      const data: any = d.data();
      return {
        eventId: data.eventId ?? d.id,
        eventType: data.eventType,
        savedAt: (data.savedAt as Timestamp)?.toMillis() ?? 0,
        title: data.title ?? '',
        emoji: data.emoji ?? '📍',
      } as FavoriteEvent;
    });
    callback(list);
  }, (err) => {
    console.warn('[favorites] snapshot error:', err.code);
    callback([]);
  });
}
