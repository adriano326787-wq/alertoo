import { create } from 'zustand';
import { updateLangFromCountry } from '../utils/i18n';

type AuthTab = 'login' | 'register';

interface AppState {
  /** Aba que o AuthScreen deve abrir ao ser montado (vindo do perfil anônimo) */
  pendingAuthTab: AuthTab | null;
  /** Código ISO do país do usuário, detectado via reverseGeocodeAsync */
  userCountryCode: string | null;
  /** Estado/região do usuário detectado via GPS (ex: "SP", "CA", "IDF") */
  userStateUF: string | null;
  /** Incrementado sempre que o idioma muda via GPS — componentes subscrevem para re-renderizar */
  langVersion: number;

  setPendingAuthTab: (tab: AuthTab | null) => void;
  setUserCountryCode: (code: string | null) => void;
  setUserStateUF: (stateUF: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  pendingAuthTab: null,
  userCountryCode: null,
  userStateUF: null,
  langVersion: 0,
  setPendingAuthTab: (tab) => set({ pendingAuthTab: tab }),
  setUserCountryCode: (code) => {
    set({ userCountryCode: code });
    if (code) {
      const changed = updateLangFromCountry(code);
      if (changed) set((s) => ({ langVersion: s.langVersion + 1 }));
    }
  },
  setUserStateUF: (stateUF) => set({ userStateUF: stateUF }),
}));
