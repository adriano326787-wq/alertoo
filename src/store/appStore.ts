import { create } from 'zustand';
import { updateLangFromCountry } from '../utils/i18n';

type AuthTab = 'login' | 'register';

export interface MapFocus {
  lat: number;
  lon: number;
  title?: string;
  emoji?: string;
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

  setPendingAuthTab: (tab: AuthTab | null) => void;
  setUserCountryCode: (code: string | null) => void;
  setUserStateUF: (stateUF: string | null) => void;
  setUserLocation: (lat: number, lon: number) => void;
  focusOnMap: (focus: MapFocus) => void;
  clearMapFocus: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  pendingAuthTab: null,
  userCountryCode: null,
  userStateUF: null,
  langVersion: 0,
  userLat: null,
  userLon: null,
  pendingMapFocus: null,
  setPendingAuthTab: (tab) => set({ pendingAuthTab: tab }),
  setUserCountryCode: (code) => {
    set({ userCountryCode: code });
    if (code) {
      const changed = updateLangFromCountry(code);
      if (changed) set((s) => ({ langVersion: s.langVersion + 1 }));
    }
  },
  setUserStateUF: (stateUF) => set({ userStateUF: stateUF }),
  setUserLocation: (lat, lon) => set({ userLat: lat, userLon: lon }),
  focusOnMap: (focus) => set({ pendingMapFocus: focus }),
  clearMapFocus: () => set({ pendingMapFocus: null }),
}));
