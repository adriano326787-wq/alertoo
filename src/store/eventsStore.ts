import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  collection,
  addDoc,
  doc,
  increment,
  onSnapshot,
  query,
  where,
  Timestamp,
  deleteDoc,
  runTransaction,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { getCurrentUserId } from '../services/authService';
import { awardPoints } from '../services/userService';
import { RoadEvent, EventCategory, EVENT_CATEGORIES } from '../types';
import { POINTS } from '../types/user';

const EVENTS_COLLECTION = 'events';
const FILTER_KEY = 'road_events_filter';
const RATE_LIMIT_MS = 30_000; // 30 segundos entre eventos

interface EventsState {
  events: RoadEvent[];
  loading: boolean;
  filterStateUF: string | null;
  filterCityName: string | null;
  // controle interno
  _subscriberCount: number;
  _unsub: (() => void) | null;
  _lastEventAt: number | null;

  setFilter: (stateUF: string | null, cityName: string | null) => void;
  loadFilter: () => Promise<void>;
  subscribeToEvents: () => () => void;
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
  }) => Promise<void>;
  confirmEvent: (id: string) => Promise<void>;
  denyEvent: (id: string) => Promise<void>;
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  loading: true,
  filterStateUF: null,
  filterCityName: null,
  _subscriberCount: 0,
  _unsub: null,
  _lastEventAt: null,

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
  subscribeToEvents: () => {
    const state = get();

    if (state._subscriberCount > 0) {
      // Já existe uma assinatura ativa — apenas incrementa o contador
      set({ _subscriberCount: state._subscriberCount + 1 });
      return () => {
        set((s) => {
          const count = s._subscriberCount - 1;
          if (count <= 0 && s._unsub) {
            s._unsub();
            return { _subscriberCount: 0, _unsub: null };
          }
          return { _subscriberCount: count };
        });
      };
    }

    // Primeira assinatura — abre o onSnapshot
    const q = query(
      collection(db, EVENTS_COLLECTION),
      where('expiresAt', '>', Timestamp.now())
    );

    // Converte doc Firestore → RoadEvent, já filtrando expirados no cliente
    // (o onSnapshot não reavalia o filtro de tempo automaticamente)
    function docToEvent(d: any): RoadEvent | null {
      const data = d.data();
      const expiresAt = (data.expiresAt as Timestamp).toMillis();
      if (expiresAt <= Date.now()) return null; // expirou desde a última atualização
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
      };
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const events: RoadEvent[] = snapshot.docs
        .map(docToEvent)
        .filter((e): e is RoadEvent => e !== null);
      set({ events, loading: false });
    });

    // Timer: remove eventos expirados do estado a cada 60 segundos,
    // sem esperar uma modificação no Firestore
    const expiryTimer = setInterval(() => {
      const now = Date.now();
      set((s) => {
        const filtered = s.events.filter((e) => e.expiresAt > now);
        if (filtered.length === s.events.length) return s; // nada mudou
        return { events: filtered };
      });
    }, 60_000);

    set({ _subscriberCount: 1, _unsub: unsub });

    return () => {
      set((s) => {
        const count = s._subscriberCount - 1;
        if (count <= 0 && s._unsub) {
          clearInterval(expiryTimer);
          s._unsub();
          return { _subscriberCount: 0, _unsub: null };
        }
        return { _subscriberCount: count };
      });
    };
  },

  // ─── Criar evento (com rate limiting) ────────────────────────────────────
  addEvent: async ({ category, title, description, latitude, longitude, stateUF, cityName, countryCode }) => {
    const uid = getCurrentUserId();
    const now = Date.now();

    const { _lastEventAt } = get();
    if (_lastEventAt && now - _lastEventAt < RATE_LIMIT_MS) {
      const remaining = Math.ceil((RATE_LIMIT_MS - (now - _lastEventAt)) / 1000);
      throw new Error(`Aguarde ${remaining}s antes de criar outro evento.`);
    }

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
    });

    set({ _lastEventAt: now });

    if (uid !== 'anonymous') {
      awardPoints(uid, POINTS.ROAD_EVENT_CREATED, 'eventsReported').catch(() => {});
    }
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
        // Deleta atomicamente dentro da transação
        tx.delete(ref);
      } else {
        tx.update(ref, { denials: newDenials, voters: arrayUnion(uid) });
      }
    });

    if (!alreadyVoted && ownerId && ownerId !== 'anonymous') {
      awardPoints(ownerId, POINTS.DENIAL_RECEIVED).catch(() => {});
    }
  },
}));
