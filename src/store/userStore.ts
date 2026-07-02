import { create } from 'zustand';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { UserProfile } from '../types/user';
import { getOrCreateUserProfile } from '../services/userService';
import { checkIsAdmin, clearAdminCache } from '../services/adminService';

interface UserState {
  profile: UserProfile | null;
  isAdmin: boolean;
  loadProfile: (
    uid: string,
    defaults?: Partial<Pick<UserProfile, 'displayName' | 'email' | 'phone' | 'photoURL'>>
  ) => Promise<void>;
  subscribeToProfile: (uid: string) => () => void;
  clearProfile: () => void;
  updateDisplayName: (name: string) => void;
  updatePhotoURL: (url: string) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  isAdmin: false,

  loadProfile: async (uid, defaults) => {
    try {
      const profile = await getOrCreateUserProfile(uid, defaults ?? {});
      // email pode ser null se conta Google não expõe e-mail — passamos null de forma segura
      const emailToCheck = defaults?.email ?? profile.email ?? null;
      const isAdmin = await checkIsAdmin(emailToCheck);
      set({ profile, isAdmin });
    } catch (err) {
      if (__DEV__) console.error('[userStore] loadProfile failed:', err);
      // Não propaga — app continua funcional sem perfil (usuário verá estado vazio)
    }
  },

  // Ponto 3 — Assina em tempo real o documento do usuário no Firestore
  subscribeToProfile: (uid: string) => {
    const ref = doc(db, 'users', uid);
    // #17 — track whether this specific snapshot callback is still current.
    // Prevents a stale async checkIsAdmin from overwriting state after sign-out.
    let cancelled = false;
    // #5 — track last checked email to skip redundant checkIsAdmin calls
    let lastCheckedEmail: string | null | undefined = undefined;

    const unsub = onSnapshot(ref, async (snap) => {
      if (!snap.exists() || cancelled) return;
      const d = snap.data();
      const profile: UserProfile = {
        uid: snap.id,
        displayName: d.displayName ?? 'Usuário',
        email: d.email ?? null,
        phone: d.phone ?? null,
        photoURL: d.photoURL ?? null,
        points: d.points ?? 0,
        eventsReported: d.eventsReported ?? 0,
        commentsPosted: d.commentsPosted ?? 0,
        createdAt: (d.createdAt as any)?.toMillis?.() ?? Date.now(),
        promotionCredits: d.promotionCredits ?? 0,
        notifPrefs: d.notifPrefs ?? undefined,
        onboarding: d.onboarding ?? undefined,
        currentStreak: d.currentStreak ?? 0,
        longestStreak: d.longestStreak ?? 0,
        lastActiveDate: d.lastActiveDate ?? undefined,
        countryCode: d.countryCode ?? undefined,
      };
      const currentEmail = d.email ?? null;
      if (lastCheckedEmail !== currentEmail) {
        // #5 — only call checkIsAdmin when email actually changed (or on first snapshot)
        lastCheckedEmail = currentEmail;
        const isAdmin = await checkIsAdmin(currentEmail);
        if (!cancelled) set({ profile, isAdmin });
      } else {
        // email unchanged — skip async admin check, just update profile fields
        if (!cancelled) set({ profile });
      }
    });

    return () => {
      cancelled = true; // #17 — prevent stale async writes after unsubscribe
      unsub();
    };
  },

  clearProfile: () => { clearAdminCache(); set({ profile: null, isAdmin: false }); },

  // Ponto 5 — Atualiza nome localmente após edição
  updateDisplayName: (name: string) => {
    const current = get().profile;
    if (current) set({ profile: { ...current, displayName: name } });
  },

  updatePhotoURL: (url: string) => {
    const current = get().profile;
    if (current) set({ profile: { ...current, photoURL: url } });
  },
}));
