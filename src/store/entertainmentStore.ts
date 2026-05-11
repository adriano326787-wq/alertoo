import { create } from 'zustand';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
  increment,
  Timestamp,
  getDocs,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { auth } from '../services/firebase';
import { getCurrentUserId } from '../services/authService';
import { awardPoints } from '../services/userService';
import {
  EntertainmentEvent,
  EntertainmentCategory,
  EventComment,
  ENTERTAINMENT_TTL_HOURS,
} from '../types/entertainment';
import { POINTS } from '../types/user';
import { notifyIfNearby } from '../services/notificationService';
import { useAppStore } from './appStore';
import { ENTERTAINMENT_CATEGORIES } from '../types/entertainment';

const COLLECTION = 'entertainment_events';
const PAGE_SIZE = 20;
const RATE_LIMIT_MS = 30_000; // 30 segundos entre eventos

interface EntertainmentState {
  events: EntertainmentEvent[];
  loading: boolean;
  hasMore: boolean;
  // controle interno
  _lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  _unsub: (() => void) | null;
  _lastEventAt: number | null;

  subscribe: () => () => void;
  loadMore: () => Promise<void>;
  addEvent: (params: {
    category: EntertainmentCategory;
    title: string;
    description?: string;
    address?: string;
    latitude: number;
    longitude: number;
    stateUF?: string;
    cityName?: string;
    countryCode?: string;
  }) => Promise<void>;
  toggleLike: (eventId: string) => Promise<void>;
  toggleFeatured: (eventId: string) => Promise<void>;
  fetchComments: (eventId: string) => Promise<EventComment[]>;
  addComment: (eventId: string, text: string) => Promise<void>;
}

function docToEvent(d: QueryDocumentSnapshot<DocumentData>): EntertainmentEvent | null {
  const data = d.data();
  const expiresAt = (data.expiresAt as Timestamp).toMillis();
  if (expiresAt <= Date.now()) return null; // expirou desde a última atualização
  return {
    id: d.id,
    category: data.category,
    title: data.title,
    description: data.description ?? undefined,
    address: data.address ?? undefined,
    latitude: data.latitude,
    longitude: data.longitude,
    createdAt: (data.createdAt as Timestamp).toMillis(),
    expiresAt,
    userId: data.userId,
    likes: data.likes ?? [],
    commentCount: data.commentCount ?? 0,
    stateUF: data.stateUF ?? undefined,
    cityName: data.cityName ?? undefined,
    countryCode: data.countryCode ?? undefined,
    isFeatured: data.isFeatured ?? false,
    promotionTier: data.promotionTier ?? null,
    promotionEndDate: data.promotionEndDate
      ? (data.promotionEndDate as Timestamp).toMillis()
      : null,
    promotionPhotoUrl: data.promotionPhotoUrl ?? null,
  };
}

export const useEntertainmentStore = create<EntertainmentState>((set, get) => ({
  events: [],
  loading: true,
  hasMore: false,
  _lastDoc: null,
  _unsub: null,
  _lastEventAt: null,

  // ─── Assinatura em tempo real (primeira página) ───────────────────────────
  subscribe: () => {
    // Fecha assinatura anterior se existir
    get()._unsub?.();

    const q = query(
      collection(db, COLLECTION),
      where('expiresAt', '>', Timestamp.now()),
      orderBy('expiresAt', 'desc'),
      limit(PAGE_SIZE)
    );

    // Marca loading ANTES de registrar o listener
    // (evita race condition se o snapshot disparar do cache sincronamente)
    set({ loading: true });

    let knownIds = new Set<string>();
    let isFirstLoad = true;

    const unsub = onSnapshot(q, (snapshot) => {
      const events = snapshot.docs
        .map(docToEvent)
        .filter((e): e is EntertainmentEvent => e !== null);
      const lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;

      if (!isFirstLoad) {
        const { userLat, userLon } = useAppStore.getState();
        if (userLat != null && userLon != null) {
          events.forEach((e) => {
            if (!knownIds.has(e.id)) {
              const meta = ENTERTAINMENT_CATEGORIES[e.category];
              notifyIfNearby({
                eventTitle: e.title,
                eventEmoji: meta.emoji,
                eventType: 'entertainment',
                eventLat: e.latitude,
                eventLon: e.longitude,
                userLat,
                userLon,
              }).catch(() => {});
            }
          });
        }
      }

      knownIds = new Set(events.map((e) => e.id));
      isFirstLoad = false;
      set({
        events,
        loading: false,
        hasMore: snapshot.docs.length === PAGE_SIZE,
        _lastDoc: lastDoc,
      });
    }, (error) => {
      console.error('[EntStore] Erro Firestore:', error.code, error.message);
      set({ loading: false });
    });

    // Timer: remove eventos expirados do estado a cada 60 segundos,
    // sem esperar uma modificação no Firestore
    const expiryTimer = setInterval(() => {
      const now = Date.now();
      set((s) => {
        const filtered = s.events.filter((e) => e.expiresAt > now);
        if (filtered.length === s.events.length) return s;
        return { events: filtered };
      });
    }, 60_000);

    set({ _unsub: unsub });
    return () => {
      clearInterval(expiryTimer);
      unsub();
      set({ _unsub: null });
    };
  },

  // ─── Carregar mais eventos (paginação) ────────────────────────────────────
  loadMore: async () => {
    const { _lastDoc, hasMore } = get();
    if (!hasMore || !_lastDoc) return;

    const q = query(
      collection(db, COLLECTION),
      where('expiresAt', '>', Timestamp.now()),
      orderBy('expiresAt', 'desc'),
      startAfter(_lastDoc),
      limit(PAGE_SIZE)
    );

    const snapshot = await getDocs(q);
    const newEvents = snapshot.docs.map(docToEvent).filter((e): e is EntertainmentEvent => e !== null);

    set((s) => ({
      events: [...s.events, ...newEvents],
      hasMore: snapshot.docs.length === PAGE_SIZE,
      _lastDoc: snapshot.docs[snapshot.docs.length - 1] ?? s._lastDoc,
    }));
  },

  // ─── Criar evento (com rate limiting) ────────────────────────────────────
  addEvent: async ({ category, title, description, address, latitude, longitude, stateUF, cityName, countryCode }) => {
    const uid = getCurrentUserId();
    const now = Date.now();

    const { _lastEventAt } = get();
    if (_lastEventAt && now - _lastEventAt < RATE_LIMIT_MS) {
      const remaining = Math.ceil((RATE_LIMIT_MS - (now - _lastEventAt)) / 1000);
      throw new Error(`Aguarde ${remaining}s antes de criar outro evento.`);
    }

    const expiresAt = Timestamp.fromMillis(now + ENTERTAINMENT_TTL_HOURS * 60 * 60 * 1000);

    await addDoc(collection(db, COLLECTION), {
      category,
      title,
      description: description ?? null,
      address: address ?? null,
      latitude,
      longitude,
      createdAt: Timestamp.fromMillis(now),
      expiresAt,
      userId: uid,
      likes: [],
      commentCount: 0,
      stateUF: stateUF ?? null,
      cityName: cityName ?? null,
      countryCode: countryCode ?? null,
      isFeatured: false,
      promotionTier: null,
      promotionEndDate: null,
      promotionPhotoUrl: null,
    });

    set({ _lastEventAt: now });

    if (uid !== 'anonymous') {
      awardPoints(uid, POINTS.ENTERTAINMENT_EVENT_CREATED, 'eventsReported').catch(() => {});
    }
  },

  // ─── Like (bloqueia auto-like) ────────────────────────────────────────────
  toggleLike: async (eventId) => {
    const uid = getCurrentUserId();
    const event = get().events.find((e) => e.id === eventId);
    if (!event) return;

    // Bloqueia curtida no próprio evento
    if (event.userId === uid) return;

    const ref = doc(db, COLLECTION, eventId);
    const hasLiked = event.likes.includes(uid);

    await updateDoc(ref, {
      likes: hasLiked ? arrayRemove(uid) : arrayUnion(uid),
    });

    if (!hasLiked && event.userId && event.userId !== 'anonymous') {
      awardPoints(event.userId, POINTS.LIKE_RECEIVED).catch(() => {});
    }
  },

  // ─── Destaque (somente admin) ─────────────────────────────────────────────
  toggleFeatured: async (eventId) => {
    const event = get().events.find((e) => e.id === eventId);
    if (!event) return;
    const ref = doc(db, COLLECTION, eventId);
    await updateDoc(ref, { isFeatured: !event.isFeatured });
  },

  // ─── Comentários ─────────────────────────────────────────────────────────
  fetchComments: async (eventId) => {
    const snap = await getDocs(
      query(
        collection(db, COLLECTION, eventId, 'comments'),
        orderBy('createdAt', 'asc')
      )
    );
    return snap.docs.map((d) => ({
      id: d.id,
      eventId,
      userId: d.data().userId,
      displayName: d.data().displayName ?? 'Usuário',
      text: d.data().text,
      createdAt: (d.data().createdAt as Timestamp).toMillis(),
    }));
  },

  addComment: async (eventId, text) => {
    const uid = getCurrentUserId();
    const displayName =
      auth.currentUser?.displayName ||
      (auth.currentUser?.isAnonymous ? 'Visitante' : 'Usuário');

    const ref = doc(db, COLLECTION, eventId);
    await addDoc(collection(db, COLLECTION, eventId, 'comments'), {
      userId: uid,
      displayName,
      text,
      createdAt: Timestamp.now(),
    });
    await updateDoc(ref, { commentCount: increment(1) });

    if (uid !== 'anonymous') {
      awardPoints(uid, POINTS.COMMENT_POSTED, 'commentsPosted').catch(() => {});
    }
  },
}));
