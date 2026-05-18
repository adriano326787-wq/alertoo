/**
 * Store de favoritos — gerencia subscription e cache local.
 */

import { create } from 'zustand';
import {
  FavoriteEvent,
  FavoriteEventType,
  subscribeFavorites,
  addFavorite,
  removeFavorite,
} from '../services/favoritesService';
import { getCurrentUserId } from '../services/authService';
import { track } from '../services/analytics';

interface State {
  favorites: FavoriteEvent[];
  favoriteIds: Set<string>; // lookup rápido O(1)
  loading: boolean;
  _unsub: (() => void) | null;

  subscribe: () => () => void;
  toggle: (params: {
    eventId: string;
    eventType: FavoriteEventType;
    title: string;
    emoji: string;
  }) => Promise<boolean>;
  isFavorite: (eventId: string) => boolean;
}

export const useFavoritesStore = create<State>((set, get) => ({
  favorites: [],
  favoriteIds: new Set(),
  loading: true,
  _unsub: null,

  subscribe: () => {
    get()._unsub?.();
    const uid = getCurrentUserId();
    if (!uid || uid === 'anonymous') {
      set({ favorites: [], favoriteIds: new Set(), loading: false, _unsub: null });
      return () => {};
    }
    set({ loading: true });
    const unsub = subscribeFavorites(uid, (favorites) => {
      set({
        favorites,
        favoriteIds: new Set(favorites.map((f) => f.eventId)),
        loading: false,
      });
    });
    set({ _unsub: unsub });
    return () => {
      unsub();
      set({ _unsub: null });
    };
  },

  toggle: async ({ eventId, eventType, title, emoji }) => {
    const uid = getCurrentUserId();
    if (!uid || uid === 'anonymous') return false;

    const wasFavorite = get().favoriteIds.has(eventId);
    // Optimistic update
    const newIds = new Set(get().favoriteIds);
    if (wasFavorite) newIds.delete(eventId);
    else newIds.add(eventId);
    set({ favoriteIds: newIds });

    try {
      if (wasFavorite) {
        await removeFavorite(uid, eventId);
        track('event_unliked', { kind: 'favorite', eventId });
      } else {
        await addFavorite(uid, { eventId, eventType, title, emoji });
        track('event_liked', { kind: 'favorite', eventId });
      }
      return !wasFavorite;
    } catch {
      // Rollback se falhar
      set({ favoriteIds: get().favoriteIds });
      return wasFavorite;
    }
  },

  isFavorite: (eventId) => get().favoriteIds.has(eventId),
}));
