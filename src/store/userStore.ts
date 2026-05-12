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
    const profile = await getOrCreateUserProfile(uid, defaults ?? {});
    const isAdmin = await checkIsAdmin(defaults?.email ?? profile.email);
    set({ profile, isAdmin });
  },

  // Ponto 3 — Assina em tempo real o documento do usuário no Firestore
  subscribeToProfile: (uid: string) => {
    const ref = doc(db, 'users', uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      const { Timestamp } = require('firebase/firestore');
      set({
        profile: {
          uid: snap.id,
          displayName: d.displayName ?? 'Usuário',
          email: d.email ?? null,
          phone: d.phone ?? null,
          photoURL: d.photoURL ?? null,
          points: d.points ?? 0,
          eventsReported: d.eventsReported ?? 0,
          commentsPosted: d.commentsPosted ?? 0,
          createdAt: (d.createdAt as any)?.toMillis?.() ?? Date.now(),
        },
      });
    });
    return unsub;
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
