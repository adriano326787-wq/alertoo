import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateLangFromCountry } from '../utils/i18n';
import { DeepLinkEventType, MPPaymentReturn } from '../utils/deepLinks';

const LOCATION_KEY = 'app_last_location';

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

  setPendingAuthTab: (tab: AuthTab | null) => void;
  setUserCountryCode: (code: string | null) => void;
  setUserStateUF: (stateUF: string | null) => void;
  setUserLocation: (lat: number, lon: number) => void;
  bumpLangVersion: () => void;
  focusOnMap: (focus: MapFocus) => void;
  clearMapFocus: () => void;
  setPendingDeepLink: (link: PendingDeepLink | null) => void;
  setMPPaymentReturn: (result: MPPaymentReturn | null) => void;
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
  },
  bumpLangVersion: () => set((s) => ({ langVersion: s.langVersion + 1 })),
  focusOnMap: (focus) => set({ pendingMapFocus: focus }),
  clearMapFocus: () => set({ pendingMapFocus: null }),
  setPendingDeepLink: (link) => set({ pendingDeepLink: link }),
  setMPPaymentReturn: (result) => set({ mpPaymentReturn: result }),
}));
