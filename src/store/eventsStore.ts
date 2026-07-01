import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  increment,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  runTransaction,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { getCurrentUserId } from '../services/authService';
import { awardPoints, recordDailyActivity } from '../services/userService';
import { t, tf } from '../utils/i18n';
import { checkRateLimit, requireAuth } from '../utils/rateLimiter';
import { trackEventCreated } from '../services/reviewService';
import { RoadEvent, EventCategory, EVENT_CATEGORIES, FALLBACK_EVENT_META } from '../types';
import { POINTS } from '../types/user';
import { notifyIfNearby, sendLocalNotification } from '../services/notificationService';
import { loadSavedRoutes, isPointNearRoute } from '../services/savedRoutesService';
import { useAppStore } from './appStore';

const EVENTS_COLLECTION = 'events';
const FILTER_KEY = 'road_events_filter';

// #3 Ciclo 8 — knownIds em nível de módulo (sobrevive a re-subscribe sem gerar notificações duplicadas)
const _knownEventIds = new Set<string>();

const NEARBY_CACHE_KEY = '@road_events_nearby';

interface EventsState {
  events: RoadEvent[];
  loading: boolean;
  isFromCache: boolean;        // #34 — offline indicator
  filterStateUF: string | null;
  filterCityName: string | null;
  /** Eventos persistidos localmente — sobrevivem à troca de subscription */
  nearbyCache: RoadEvent[];
  // controle interno
  _subscriberCount: number;
  _unsub: (() => void) | null;
  _expiryTimer: ReturnType<typeof setInterval> | null; // #1 — stored in state to survive hot-reload
  _lastEventAt: number | null;

  setFilter: (stateUF: string | null, cityName: string | null) => void;
  loadFilter: () => Promise<void>;
  /** Carrega o cache de proximidade do AsyncStorage ao abrir o app */
  loadNearbyCache: () => Promise<void>;
  _subscriptionStateUF: string | null;    // #1 — stateUF da query ativa
  subscribeToEvents: (stateUF?: string | null) => () => void;
  reloadEvents: () => void;               // #4 — força re-subscribe (usado no refresh)
  getFilteredEvents: () => RoadEvent[];
  addEvent: (params: {
    category: EventCategory;
    title: string;
    description?: string;
    latitude: number;
    longitude: number;
    stateUF?: string;
    cityName?: string;
    countryCode?: string;
    speedLimit?: number;
  }) => Promise<void>;
  confirmEvent: (id: string) => Promise<void>;
  denyEvent: (id: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  loading: true,
  isFromCache: false,
  filterStateUF: null,
  filterCityName: null,
  nearbyCache: [],
  _subscriberCount: 0,
  _unsub: null,
  _expiryTimer: null,
  _lastEventAt: null,
  _subscriptionStateUF: null,

  // ─── Filtro com persistência ──────────────────────────────────────────────
  setFilter: (stateUF, cityName) => {
    set({ filterStateUF: stateUF, filterCityName: cityName });
    AsyncStorage.setItem(FILTER_KEY, JSON.stringify({ stateUF, cityName })).catch(() => {});
  },

  loadFilter: async () => {
    try {
      const saved = await AsyncStorage.getItem(FILTER_KEY);
      if (saved) {
        const { stateUF, cityName } = JSON.parse(saved);
        set({ filterStateUF: stateUF ?? null, filterCityName: cityName ?? null });
      }
    } catch (_) {}
  },

  loadNearbyCache: async () => {
    try {
      const raw = await AsyncStorage.getItem(NEARBY_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { events: RoadEvent[]; ts: number };
      const now = Date.now();
      const valid = parsed.events.filter((e) => e.expiresAt > now);
      if (valid.length > 0) set({ nearbyCache: valid });
    } catch {}
  },

  getFilteredEvents: () => {
    const { events, filterStateUF, filterCityName } = get();
    return events.filter((e) => {
      if (!filterStateUF) return true;
      if (e.stateUF !== filterStateUF) return false;
      if (filterCityName && e.cityName !== filterCityName) return false;
      return true;
    });
  },

  // ─── Subscription com ref-count (evita duplicar onSnapshot) ──────────────
  subscribeToEvents: (stateUF = null) => {
    const state = get();

    // #1/#13 — Se já existe assinatura para o mesmo stateUF, apenas ref-count.
    // Importante: se stateUF difere do ativo, ignora ref-count e reabre a query.
    if (state._subscriberCount > 0 && state._subscriptionStateUF === (stateUF ?? null)) {
      set({ _subscriberCount: state._subscriberCount + 1 });
      return () => {
        set((s) => {
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

    // stateUF diferente ou primeira assinatura — fecha a anterior e abre nova
    const prev = get();
    if (prev._expiryTimer) clearInterval(prev._expiryTimer);
    if (prev._unsub) { prev._unsub(); }

    // #X — limpa os eventos do estado anterior imediatamente para não exibir
    // pins "antigos" (de outro stateUF) enquanto o novo snapshot não chega.
    if (prev._subscriptionStateUF !== (stateUF ?? null)) {
      set({ events: [], loading: true });
    }

    // #1 — Filtro geográfico quando stateUF é conhecido; limit(300) como safety net
    // #13 — orderBy garante ordem consistente e viabiliza índice composto no Firestore
    const q = stateUF
      ? query(
          collection(db, EVENTS_COLLECTION),
          where('stateUF', '==', stateUF),
          where('expiresAt', '>', Timestamp.now()),
          orderBy('expiresAt', 'desc'),
          limit(150)
        )
      : query(
          collection(db, EVENTS_COLLECTION),
          where('expiresAt', '>', Timestamp.now()),
          orderBy('expiresAt', 'desc'),
          limit(150)
        );

    function docToEvent(d: any): RoadEvent | null {
      const data = d.data();
      const expiresAt = (data.expiresAt as Timestamp).toMillis();
      if (expiresAt <= Date.now()) return null;
      return {
        id: d.id,
        category: data.category,
        title: data.title,
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
        createdAt: (data.createdAt as Timestamp).toMillis(),
        expiresAt,
        confirmations: data.confirmations ?? 0,
        denials: data.denials ?? 0,
        voters: data.voters ?? [],
        userId: data.userId,
        stateUF: data.stateUF ?? undefined,
        cityName: data.cityName ?? undefined,
        countryCode: data.countryCode ?? undefined,
        speedLimit: data.speedLimit ?? undefined,
      };
    }

    let isFirstLoad = true;

    const unsub = onSnapshot(q, (snapshot) => {
      const events: RoadEvent[] = snapshot.docs
        .map(docToEvent)
        .filter((e): e is RoadEvent => e !== null);


      // #34 — offline indicator from Firestore metadata
      const fromCache = snapshot.metadata.fromCache;

      if (!isFirstLoad) {
        const { userLat, userLon } = useAppStore.getState();

        // Carrega rotas salvas uma vez para os novos eventos deste snapshot
        const newEvents = events.filter((e) => !_knownEventIds.has(e.id));

        if (newEvents.length > 0) {
          // Verifica proximidade com posição do usuário
          if (userLat != null && userLon != null) {
            newEvents.forEach((e) => {
              const meta = EVENT_CATEGORIES[e.category] ?? FALLBACK_EVENT_META;
              notifyIfNearby({
                eventTitle: e.title,
                eventEmoji: meta.emoji,
                eventType: 'road',
                eventId: e.id,
                eventLat: e.latitude,
                eventLon: e.longitude,
                userLat,
                userLon,
              }).catch(() => {});
            });
          }

          // Verifica corredor das rotas salvas
          loadSavedRoutes().then((routes) => {
            const enabledRoutes = routes.filter((r) => r.enabled);
            if (enabledRoutes.length === 0) return;
            newEvents.forEach((e) => {
              const meta = EVENT_CATEGORIES[e.category] ?? FALLBACK_EVENT_META;
              for (const route of enabledRoutes) {
                if (isPointNearRoute(
                  e.latitude, e.longitude,
                  route.originLat, route.originLon,
                  route.destLat, route.destLon,
                )) {
                  sendLocalNotification(
                    `${meta.emoji} ${e.title}`,
                    `Na sua rota "${route.name}"`,
                    { eventType: 'road', eventId: e.id },
                  ).catch(() => {});
                  break; // uma notificação por evento (evita spam se várias rotas batem)
                }
              }
            });
          }).catch(() => {});
        }
      }

      // Sincroniza _knownEventIds com o snapshot atual (remove IDs de eventos expirados)
      // Evita crescimento indefinido do Set em sessões longas
      _knownEventIds.clear();
      events.forEach((e) => _knownEventIds.add(e.id));
      isFirstLoad = false;

      // Persiste cache local quando subscrito a um estado específico (não query global).
      // O merge no MapScreen usa esse cache para manter pins visíveis durante troca de subscription.
      if (stateUF && events.length > 0) {
        AsyncStorage.setItem(NEARBY_CACHE_KEY, JSON.stringify({ events, ts: Date.now() })).catch(() => {});
        set({ events, loading: false, isFromCache: fromCache, nearbyCache: events });
      } else {
        set({ events, loading: false, isFromCache: fromCache });
      }
    }, (err) => {
      // #5 — trata erros de permissão/rede do Firestore em vez de silenciar
      if (__DEV__) console.error('[RoadStore] Firestore onSnapshot error:', err.code, err.message);
      set({ loading: false });
    });

    // #1 — Store timer in Zustand state so it survives hot-reload / re-init
    // #12 — prev timer já foi limpo em linha 121; novo timer criado aqui é o único ativo
    const expiryTimer = setInterval(() => {
      const now = Date.now();
      set((s) => {
        const filtered = s.events.filter((e) => e.expiresAt > now);
        if (filtered.length === s.events.length) return s;
        return { events: filtered };
      });
    }, 60_000);

    set({ _subscriberCount: 1, _unsub: unsub, _expiryTimer: expiryTimer, _subscriptionStateUF: stateUF ?? null });

    return () => {
      set((s) => {
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

  // #4 — Força re-subscribe (usado pelo handleRefresh da RoadEventsScreen)
  reloadEvents: () => {
    const s = get();
    if (s._expiryTimer) clearInterval(s._expiryTimer);
    if (s._unsub) s._unsub();
    set({ _subscriberCount: 0, _unsub: null, _expiryTimer: null, loading: true });
    // Re-subscribe com o mesmo stateUF que estava ativo
    get().subscribeToEvents(s._subscriptionStateUF);
  },

  // ─── Criar evento (com rate limiting) ────────────────────────────────────
  addEvent: async ({ category, title, description, latitude, longitude, stateUF, cityName, countryCode, speedLimit }) => {
    const uid = getCurrentUserId();

    requireAuth(uid, 'login_required_road');
    checkRateLimit(get()._lastEventAt);

    const now = Date.now();

    const meta = EVENT_CATEGORIES[category];
    const expiresAt = now + meta.defaultTtlMinutes * 60 * 1000;

    await addDoc(collection(db, EVENTS_COLLECTION), {
      category,
      title,
      description: description ?? null,
      latitude,
      longitude,
      createdAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(expiresAt),
      confirmations: 0,
      denials: 0,
      voters: [],
      userId: uid,
      stateUF: stateUF ?? null,
      cityName: cityName ?? null,
      countryCode: countryCode ?? null,
      speedLimit: speedLimit ?? null,
    });

    set({ _lastEventAt: now });
    awardPoints(uid, POINTS.ROAD_EVENT_CREATED, 'eventsReported').catch(() => {});
    recordDailyActivity(uid).catch(() => {});
    trackEventCreated().catch(() => {});
  },

  // ─── Confirmar (transação atômica, sem voto duplo) ────────────────────────
  confirmEvent: async (id) => {
    const uid = getCurrentUserId();
    const ref = doc(db, EVENTS_COLLECTION, id);
    let ownerId: string | null = null;
    let alreadyVoted = false;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      const voters: string[] = data.voters ?? [];
      if (voters.includes(uid)) { alreadyVoted = true; return; }
      ownerId = data.userId;
      tx.update(ref, { confirmations: increment(1), voters: arrayUnion(uid) });
    });

    if (!alreadyVoted) recordDailyActivity(uid).catch(() => {});
    if (!alreadyVoted && ownerId && ownerId !== 'anonymous' && ownerId !== uid) {
      awardPoints(ownerId, POINTS.CONFIRMATION_RECEIVED).catch(() => {});
    }
  },

  // ─── Negar (transação atômica, sem voto duplo, deleção confiável) ─────────
  denyEvent: async (id) => {
    const uid = getCurrentUserId();
    const ref = doc(db, EVENTS_COLLECTION, id);
    let ownerId: string | null = null;
    let alreadyVoted = false;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      const voters: string[] = data.voters ?? [];
      if (voters.includes(uid)) { alreadyVoted = true; return; }
      ownerId = data.userId;
      const newDenials = (data.denials ?? 0) + 1;
      if (newDenials >= 10) {
        tx.delete(ref);
      } else {
        tx.update(ref, { denials: newDenials, voters: arrayUnion(uid) });
      }
    });

    if (!alreadyVoted) recordDailyActivity(uid).catch(() => {});
    if (!alreadyVoted && ownerId && ownerId !== 'anonymous' && ownerId !== uid) {
      awardPoints(ownerId, POINTS.DENIAL_RECEIVED).catch(() => {});
    }
  },

  // ─── Excluir evento (somente admin) ─────────────────────────────────────
  deleteEvent: async (id) => {
    await deleteDoc(doc(db, EVENTS_COLLECTION, id));
    // Remove do estado local imediatamente (otimista)
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
    _knownEventIds.delete(id);
  },
}));
