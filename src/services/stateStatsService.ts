import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const CACHE_KEY = 'state_event_counts_cache';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

interface CachedCounts {
  counts: Record<string, number>;
  fetchedAt: number;
}

let memoryCache: CachedCounts | null = null;

/**
 * Retorna a contagem de eventos ativos por UF (pins de "outros estados" no mapa
 * em zoom afastado). Lê o doc agregado stats/eventCountsByState — atualizado
 * por hora por stateEventCountsScheduler — e cacheia em memória + AsyncStorage
 * por 10 minutos para evitar reads repetidos a cada vez que o usuário dá zoom out.
 */
export async function getStateEventCounts(): Promise<Record<string, number>> {
  const now = Date.now();

  if (memoryCache && now - memoryCache.fetchedAt < CACHE_TTL_MS) {
    return memoryCache.counts;
  }

  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: CachedCounts = JSON.parse(cached);
      if (now - parsed.fetchedAt < CACHE_TTL_MS) {
        memoryCache = parsed;
        return parsed.counts;
      }
    }
  } catch (_) {}

  try {
    const snap = await getDoc(doc(db, 'stats', 'eventCountsByState'));
    const counts: Record<string, number> = snap.exists() ? (snap.data().counts ?? {}) : {};
    const entry: CachedCounts = { counts, fetchedAt: now };
    memoryCache = entry;
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry)).catch(() => {});
    return counts;
  } catch (_) {
    return memoryCache?.counts ?? {};
  }
}
