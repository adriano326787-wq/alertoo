import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encode as geohashEncode } from 'ngeohash';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { updateLangFromCountry } from '../utils/i18n';
import { DeepLinkEventType, MPPaymentReturn } from '../utils/deepLinks';
import { EventCategory } from '../types';

const LOCATION_KEY = 'app_last_location';

// Precisão 5 (~4,9km de lado) — usada para buscar usuários próximos
// via células de geohash vizinhas (3x3) na notificação de lei seca.
const GEOHASH_PRECISION = 5;

// Evita gravações excessivas no Firestore: só persiste a localização
// quando a célula de geohash (precisão 5) mudar.
let lastSavedGeohash5: string | null = null;

// #28 — Restaura posição persistida para dar posição inicial correta no cold start
export async function restorePersistedLocation(): Promise<{ lat: number; lon: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

type AuthTab = 'login' | 'register';

export interface MapFocus {
  lat: number;
  lon: number;
  title?: string;
  emoji?: string;
}

export interface PendingDeepLink {
  type: DeepLinkEventType;
  id: string;
}

interface AppState {
  pendingAuthTab: AuthTab | null;
  userCountryCode: string | null;
  userStateUF: string | null;
  langVersion: number;
  /** Última localização conhecida do usuário (para notificações de proximidade) */
  userLat: number | null;
  userLon: number | null;
  /** Evento para o qual o mapa deve navegar */
  pendingMapFocus: MapFocus | null;
  /** Deep link recebido, aguardando a tela do mapa abrir o evento */
  pendingDeepLink: PendingDeepLink | null;
  /** Retorno do checkout Mercado Pago via alertoo://payment/{status} */
  mpPaymentReturn: MPPaymentReturn | null;
  /** Categoria pré-selecionada para abrir o AddEventModal (lembrete de blitz/lei seca) */
  pendingAddCategory: EventCategory | null;
  /**
   * UF sendo "explorada" via pin de "outros estados" no mapa (zoom afastado).
   * Quando definido, sobrepõe userStateUF nas assinaturas e filtros das telas
   * de Eventos de Estrada e Entretenimento, sem alterar a localização real do usuário.
   */
  exploreStateUF: string | null;

  setPendingAuthTab: (tab: AuthTab | null) => void;
  setUserCountryCode: (code: string | null) => void;
  setUserStateUF: (stateUF: string | null) => void;
  setUserLocation: (lat: number, lon: number) => void;
  bumpLangVersion: () => void;
  focusOnMap: (focus: MapFocus) => void;
  clearMapFocus: () => void;
  setPendingDeepLink: (link: PendingDeepLink | null) => void;
  setMPPaymentReturn: (result: MPPaymentReturn | null) => void;
  setPendingAddCategory: (category: EventCategory | null) => void;
  setExploreStateUF: (stateUF: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  pendingAuthTab: null,
  userCountryCode: null,
  userStateUF: null,
  langVersion: 0,
  userLat: null,
  userLon: null,
  pendingMapFocus: null,
  pendingDeepLink: null,
  mpPaymentReturn: null,
  pendingAddCategory: null,
  exploreStateUF: null,
  setPendingAuthTab: (tab) => set({ pendingAuthTab: tab }),
  setUserCountryCode: (code) => {
    set({ userCountryCode: code });
    if (code) {
      const changed = updateLangFromCountry(code);
      if (changed) set((s) => ({ langVersion: s.langVersion + 1 }));
    }
  },
  setUserStateUF: (stateUF) => set({ userStateUF: stateUF }),
  setUserLocation: (lat, lon) => {
    // #34 — reject NaN / Infinity coordinates that can come from bad GPS readings
    if (!isFinite(lat) || !isFinite(lon)) return;
    set({ userLat: lat, userLon: lon });
    // #28 — persiste para dar posição inicial correta no próximo cold start
    AsyncStorage.setItem(LOCATION_KEY, JSON.stringify({ lat, lon })).catch(() => {});

    // Persiste geohash/lat/lon no perfil para a notificação de "Lei Seca por perto"
    // (Cloud Function busca usuários por célula de geohash). Só grava quando a
    // célula muda, para limitar o volume de writes no Firestore.
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const geohash5 = geohashEncode(lat, lon, GEOHASH_PRECISION);
    if (geohash5 === lastSavedGeohash5) return;
    lastSavedGeohash5 = geohash5;
    setDoc(doc(db, 'users', uid), {
      geohash5,
      lastLat: lat,
      lastLon: lon,
      lastLocationUpdatedAt: serverTimestamp(),
    }, { merge: true }).catch(() => {});
  },
  bumpLangVersion: () => set((s) => ({ langVersion: s.langVersion + 1 })),
  focusOnMap: (focus) => set({ pendingMapFocus: focus }),
  clearMapFocus: () => set({ pendingMapFocus: null }),
  setPendingDeepLink: (link) => set({ pendingDeepLink: link }),
  setMPPaymentReturn: (result) => set({ mpPaymentReturn: result }),
  setPendingAddCategory: (category) => set({ pendingAddCategory: category }),
  setExploreStateUF: (stateUF) => set({ exploreStateUF: stateUF }),
}));
