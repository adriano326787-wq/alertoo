import { create } from 'zustand';
import {
  collection,
  addDoc,
  setDoc,
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
import { track } from '../services/analytics';
import { t, tf } from '../utils/i18n';
import { trackEventCreated } from '../services/reviewService';

const COLLECTION = 'entertainment_events';
const PAGE_SIZE = 20;
const RATE_LIMIT_MS = 30_000; // 30 segundos entre eventos

// #5 — knownIds em nível de módulo para sobreviver a re-subscribe sem gerar
// notificações duplicadas quando o snapshot reconecta após offline ou refresh.
const _knownEventIds = new Set<string>();

interface EntertainmentState {
  events: EntertainmentEvent[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;          // mensagem de erro para exibir retry na UI
  isFromCache: boolean;          // #34 — offline indicator
  // controle interno
  _lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  _unsub: (() => void) | null;
  _expiryTimer: ReturnType<typeof setInterval> | null; // #2 — stored in state
  _subscriberCount: number;   // #2 — ref-count para evitar fechar assinatura ativa
  _lastEventAt: number | null;
  _lastCommentAt: number | null; // rate limiting de comentários

  subscribe: () => () => void;
  forceRefresh: () => void;   // #2/#4 — reinicia subscription sem afetar ref-count
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
    photoUri?: string;       // URI local — store comprime + sobe
  }) => Promise<void>;
  toggleLike: (eventId: string) => Promise<void>;
  fetchComments: (eventId: string) => Promise<EventComment[]>;
  addComment: (eventId: string, text: string) => Promise<void>;
  /** Incrementa contador de views (#8) */
  incrementViewCount: (eventId: string) => Promise<void>;
  /** Edita campos básicos de um evento (#3) */
  updateEvent: (eventId: string, patch: {
    title?: string;
    description?: string;
    address?: string;
    isRecurring?: boolean;
  }) => Promise<void>;
  /** Alterna presença confirmada ("Vou lá") */
  toggleAttendance: (eventId: string) => Promise<void>;
  /** Envia avaliação 1–5 e recalcula média no Firestore */
  submitRating: (eventId: string, stars: number) => Promise<void>;
}

function docToEvent(d: QueryDocumentSnapshot<DocumentData>): EntertainmentEvent | null {
  const data = d.data();
  // Defensive: campo pode vir null/undefined se houve bug de escrita
  // Fallback de 24 h evita desaparecer imediatamente por expiresAt=0
  const expiresAt = (data.expiresAt as Timestamp)?.toMillis?.() ?? (Date.now() + 24 * 3600 * 1000);
  if (expiresAt <= Date.now()) return null; // expirou desde a última atualização
  return {
    id: d.id,
    category: data.category,
    title: data.title,
    description: data.description ?? undefined,
    address: data.address ?? undefined,
    latitude: data.latitude,
    longitude: data.longitude,
    createdAt: (data.createdAt as Timestamp)?.toMillis?.() ?? Date.now(),
    expiresAt,
    userId: data.userId,
    // Filtra elementos não-string do array de likes para evitar crash em likes.includes(uid)
    likes: Array.isArray(data.likes) ? data.likes.filter((id: unknown) => typeof id === 'string') : [],
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
    promotionPhotoUrls: data.promotionPhotoUrls ?? null,
    promotionPackage: data.promotionPackage ?? null,
    promotionWeeks: data.promotionWeeks ?? null,
    promotionActiveDays: data.promotionActiveDays ?? null,
    photoUrl: data.photoUrl ?? null,
    viewCount: data.viewCount ?? 0,
    isRecurring: data.isRecurring ?? false,
    attendees: Array.isArray(data.attendees) ? data.attendees : [],
    avgRating: data.avgRating ?? null,
    ratingCount: data.ratingCount ?? 0,
  };
}

export const useEntertainmentStore = create<EntertainmentState>((set, get) => ({
  events: [],
  loading: true,
  hasMore: false,
  error: null,
  isFromCache: false,
  _lastDoc: null,
  _unsub: null,
  _expiryTimer: null,
  _subscriberCount: 0,
  _lastEventAt: null,
  _lastCommentAt: null,

  // ─── Assinatura em tempo real com ref-count ───────────────────────────────
  subscribe: () => {
    const state = get();

    // #2 — ref-count: se já há assinatura ativa, só incrementa o contador
    if (state._subscriberCount > 0 && state._unsub) {
      set({ _subscriberCount: state._subscriberCount + 1 });
      return () => {
        set((s: EntertainmentState) => {
          const count = s._subscriberCount - 1;
          if (count <= 0 && s._unsub) {
            if (s._expiryTimer) clearInterval(s._expiryTimer);
            s._unsub();
            return { _subscriberCount: 0, _unsub: null, _expiryTimer: null };
          }
          return { _subscriberCount: count };
        });
      };
    }

    // Primeira assinatura — fecha eventual assinatura órfã e abre nova
    if (state._expiryTimer) clearInterval(state._expiryTimer);
    state._unsub?.();

    const q = query(
      collection(db, COLLECTION),
      where('expiresAt', '>', Timestamp.now()),
      orderBy('expiresAt', 'desc'),
      limit(PAGE_SIZE)
    );

    set({ loading: true, events: [] });
    let isFirstLoad = true;

    const unsub = onSnapshot(q, (snapshot) => {
      const events = snapshot.docs
        .map(docToEvent)
        .filter((e): e is EntertainmentEvent => e !== null);
      const lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
      const fromCache = snapshot.metadata.fromCache;

      if (!isFirstLoad) {
        const { userLat, userLon } = useAppStore.getState();
        if (userLat != null && userLon != null) {
          events.forEach((e) => {
            if (!_knownEventIds.has(e.id)) {
              const meta = ENTERTAINMENT_CATEGORIES[e.category];
              notifyIfNearby({
                eventTitle: e.title, eventEmoji: meta.emoji,
                eventType: 'entertainment', eventId: e.id,
                eventLat: e.latitude, eventLon: e.longitude,
                userLat, userLon,
              }).catch(() => {});
            }
          });
        }
      }

      events.forEach((e) => _knownEventIds.add(e.id));
      isFirstLoad = false;
      set({
        events, loading: false, error: null, isFromCache: fromCache,
        hasMore: snapshot.docs.length === PAGE_SIZE, _lastDoc: lastDoc,
      });
    }, (err) => {
      if (__DEV__) console.error('[EntStore] Erro Firestore:', err.code, err.message);
      set({ loading: false, error: t('error_loading_events') });
    });

    const expiryTimer = setInterval(() => {
      const now = Date.now();
      set((s: EntertainmentState) => {
        const filtered = s.events.filter((e) => e.expiresAt > now);
        return filtered.length === s.events.length ? s : { events: filtered };
      });
    }, 60_000);

    set({ _unsub: unsub, _expiryTimer: expiryTimer, _subscriberCount: 1 });

    return () => {
      set((s: EntertainmentState) => {
        const count = s._subscriberCount - 1;
        if (count <= 0 && s._unsub) {
          if (s._expiryTimer) clearInterval(s._expiryTimer);
          s._unsub();
          return { _subscriberCount: 0, _unsub: null, _expiryTimer: null };
        }
        return { _subscriberCount: count };
      });
    };
  },

  // #2/#4 — Reinicia subscription sem afetar ref-count (usado pelo handleRefresh)
  forceRefresh: () => {
    const s = get();
    if (s._expiryTimer) clearInterval(s._expiryTimer);
    s._unsub?.();
    // Re-abre sem resetar _subscriberCount
    set({ loading: true, events: [], _unsub: null, _expiryTimer: null });
    get().subscribe();
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

    try {
      const snapshot = await getDocs(q);
      const newEvents = snapshot.docs.map(docToEvent).filter((e): e is EntertainmentEvent => e !== null);
      set((s) => {
        // #26 — dedup: ignora eventos que o onSnapshot já trouxe na primeira página
        const existingIds = new Set(s.events.map((e) => e.id));
        const unique = newEvents.filter((e) => !existingIds.has(e.id));
        return {
          events: [...s.events, ...unique],
          hasMore: snapshot.docs.length === PAGE_SIZE,
          _lastDoc: snapshot.docs[snapshot.docs.length - 1] ?? s._lastDoc,
        };
      });
    } catch (err) {
      if (__DEV__) console.error('[EntStore] loadMore erro:', err);
      throw err; // propaga para o handler da UI exibir feedback
    }
  },

  // ─── Criar evento (com rate limiting + upload de foto opcional) ─────────
  addEvent: async ({ category, title, description, address, latitude, longitude, stateUF, cityName, countryCode, photoUri }) => {
    const uid = getCurrentUserId();

    // Bloqueia usuários anônimos (Firestore também bloqueia, mas falha mais cedo aqui)
    if (!uid || uid === 'anonymous') {
      throw new Error(t('login_required_ent')); // #5 Ciclo 8 — i18n
    }

    const now = Date.now();
    const { _lastEventAt } = get();
    if (_lastEventAt && now - _lastEventAt < RATE_LIMIT_MS) {
      const remaining = Math.ceil((RATE_LIMIT_MS - (now - _lastEventAt)) / 1000);
      throw new Error(tf('rate_limit_wait', { remaining })); // #5 Ciclo 8 — i18n
    }

    const ttlHours = ENTERTAINMENT_TTL_HOURS[category] ?? 36;
    const expiresAt = Timestamp.fromMillis(now + ttlHours * 60 * 60 * 1000);

    // Pré-gera o ID do documento para poder fazer upload antes de criar o doc
    const docRef = doc(collection(db, COLLECTION));

    // 1) Se tem foto, faz upload ANTES de criar o documento
    //    Assim o evento já aparece com foto no primeiro snapshot do Firestore
    let resolvedPhotoUrl: string | null = null;
    if (photoUri) {
      try {
        const { uploadEventPhoto } = await import('../services/storageService');
        resolvedPhotoUrl = await uploadEventPhoto(docRef.id, photoUri);
      } catch (e) {
        if (__DEV__) console.warn('[entStore] upload de foto falhou:', e);
      }
    }

    // 2) Cria o documento com a foto já incluída (aparece imediatamente no mapa)
    // #10 — se o setDoc falhar, remove a foto órfã do Storage para não desperdiçar cota
    try { await setDoc(docRef, {
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
      photoUrl: resolvedPhotoUrl,
      isFeatured: false,          // obrigatório pela regra Firestore (create guard)
      promotionTier: null,
      promotionEndDate: null,
      promotionPhotoUrl: null,
    }); } catch (docErr) {
      // #10 — limpa foto órfã no Storage se a criação do documento falhar
      if (resolvedPhotoUrl) {
        try {
          const { deleteObject, ref: storageRef } = await import('firebase/storage');
          const { storage } = await import('../services/firebase');
          await deleteObject(storageRef(storage, `events/${docRef.id}/photo`));
        } catch (_) {}
      }
      throw docErr;
    }

    set({ _lastEventAt: now });

    track('event_created', { type: 'entertainment', category, stateUF, hasPhoto: !!photoUri });

    if (uid !== 'anonymous') {
      awardPoints(uid, POINTS.ENTERTAINMENT_EVENT_CREATED, 'eventsReported').catch(() => {});
      trackEventCreated().catch(() => {});
    }
  },

  // ─── Like (bloqueia auto-like + optimistic update) ───────────────────────
  toggleLike: async (eventId) => {
    const uid = getCurrentUserId();
    const event = get().events.find((e) => e.id === eventId);
    if (!event) return;

    if (event.userId === uid) return;

    const ref = doc(db, COLLECTION, eventId);
    const hasLiked = Array.isArray(event.likes) && event.likes.includes(uid);

    // #7 — Capture the original likes array BEFORE the optimistic update so the
    // rollback closure uses the pre-mutation snapshot, not the already-mutated state.
    const originalLikes = [...(event.likes ?? [])];

    // Optimistic update
    set((s) => ({
      events: s.events.map((e) =>
        e.id === eventId
          ? { ...e, likes: hasLiked ? originalLikes.filter((id) => id !== uid) : [...originalLikes, uid] }
          : e
      ),
    }));

    try {
      await updateDoc(ref, {
        likes: hasLiked ? arrayRemove(uid) : arrayUnion(uid),
      });
    } catch (err) {
      // Revert to original snapshot on error
      set((s) => ({
        events: s.events.map((e) =>
          e.id === eventId ? { ...e, likes: originalLikes } : e
        ),
      }));
      throw err;
    }

    track(hasLiked ? 'event_unliked' : 'event_liked', { eventId, category: event.category });

    if (!hasLiked && event.userId && event.userId !== 'anonymous') {
      awardPoints(event.userId, POINTS.LIKE_RECEIVED).catch(() => {});
    }
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

    // Rate limiting: 30s entre comentários (server-side também limita via Firestore rules)
    const COMMENT_RATE_MS = 30_000;
    const { _lastCommentAt } = get();
    const now = Date.now();
    if (_lastCommentAt && now - _lastCommentAt < COMMENT_RATE_MS) {
      const remaining = Math.ceil((COMMENT_RATE_MS - (now - _lastCommentAt)) / 1000);
      throw new Error(tf('rate_limit_comment', { remaining })); // #5 Ciclo 8 — i18n
    }

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
    set({ _lastCommentAt: now });

    if (uid !== 'anonymous') {
      awardPoints(uid, POINTS.COMMENT_POSTED, 'commentsPosted').catch(() => {});
    }
  },

  // ─── Contador de visualizações (#8) ──────────────────────────────────────
  incrementViewCount: async (eventId) => {
    try {
      await updateDoc(doc(db, COLLECTION, eventId), {
        viewCount: increment(1),
      });
    } catch (_) {
      // Falha silenciosa — não é crítica para o usuário
    }
  },

  // ─── RSVP "Vou lá" ───────────────────────────────────────────────────────
  toggleAttendance: async (eventId) => {
    const uid = getCurrentUserId();
    if (!uid || uid === 'anonymous') return;

    const event = get().events.find((e) => e.id === eventId);
    if (!event) return;

    const isGoing = Array.isArray(event.attendees) && event.attendees.includes(uid);
    const prevAttendees = event.attendees ?? [];
    const newAttendees = isGoing
      ? prevAttendees.filter((id) => id !== uid)
      : [...prevAttendees, uid];

    // Optimistic update
    set((s) => ({
      events: s.events.map((e) =>
        e.id === eventId ? { ...e, attendees: newAttendees } : e
      ),
    }));

    try {
      await updateDoc(doc(db, COLLECTION, eventId), {
        attendees: isGoing ? arrayRemove(uid) : arrayUnion(uid),
      });
      track(isGoing ? 'rsvp_removed' : 'rsvp_added', { eventId });
    } catch {
      // Rollback
      set((s) => ({
        events: s.events.map((e) =>
          e.id === eventId ? { ...e, attendees: prevAttendees } : e
        ),
      }));
    }
  },

  // ─── Avaliação por estrelas ───────────────────────────────────────────────
  submitRating: async (eventId, stars) => {
    const uid = getCurrentUserId();
    if (!uid || uid === 'anonymous') return;
    if (stars < 1 || stars > 5) return;

    // Salva avaliação na subcoleção ratings/{uid}
    const ratingRef = doc(db, COLLECTION, eventId, 'ratings', uid);
    await setDoc(ratingRef, { stars, userId: uid, createdAt: Timestamp.now() }, { merge: true });

    // Recalcula média via transação
    const { runTransaction } = await import('firebase/firestore');
    await runTransaction(db, async (tx) => {
      // Lê todas as avaliações
      const ratingsSnap = await getDocs(collection(db, COLLECTION, eventId, 'ratings'));
      const total = ratingsSnap.docs.reduce((sum, d) => sum + (d.data().stars ?? 0), 0);
      const count = ratingsSnap.docs.length;
      const avg = count > 0 ? Math.round((total / count) * 10) / 10 : 0;
      tx.update(doc(db, COLLECTION, eventId), { avgRating: avg, ratingCount: count });
    });

    // Atualiza cache local
    const event = get().events.find((e) => e.id === eventId);
    if (event) {
      const prevRatings = event.ratingCount ?? 0;
      const prevAvg = event.avgRating ?? 0;
      const newCount = prevRatings + 1;
      const newAvg = Math.round(((prevAvg * prevRatings + stars) / newCount) * 10) / 10;
      set((s) => ({
        events: s.events.map((e) =>
          e.id === eventId ? { ...e, avgRating: newAvg, ratingCount: newCount } : e
        ),
      }));
    }
    track('rating_submitted', { eventId, stars });
  },

  // ─── Editar evento (#3) ───────────────────────────────────────────────────
  updateEvent: async (eventId, patch) => {
    const uid = getCurrentUserId();
    const event = get().events.find((e) => e.id === eventId);
    if (!event) throw new Error('Evento não encontrado.');
    if (event.userId !== uid) throw new Error('Sem permissão para editar este evento.');

    const updateData: Record<string, any> = {};
    if (patch.title !== undefined) updateData.title = patch.title.trim();
    if (patch.description !== undefined) updateData.description = patch.description.trim() || null;
    if (patch.address !== undefined) updateData.address = patch.address.trim() || null;
    if (patch.isRecurring !== undefined) updateData.isRecurring = patch.isRecurring;

    if (Object.keys(updateData).length === 0) return;

    await updateDoc(doc(db, COLLECTION, eventId), updateData);

    // Atualiza cache local imediatamente
    set((s) => ({
      events: s.events.map((e) =>
        e.id === eventId ? { ...e, ...patch } : e
      ),
    }));
  },
}));
