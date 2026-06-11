import { create } from 'zustand';
import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { getCurrentUserId } from '../services/authService';
import { awardPoints } from '../services/userService';
import { t, tf } from '../utils/i18n';
import { POINTS } from '../types/user';
import {
  Radar,
  RadarType,
  RADAR_TYPES,
  RADAR_ACTIVATION_CONFIRMATIONS,
  RADAR_REMOVAL_DENIALS,
  RADAR_REVOTE_WINDOW_MS,
  RADAR_STALE_MS,
} from '../types/radar';

const RADARS_COLLECTION = 'radars';
const RATE_LIMIT_MS = 30_000;

interface RadarsState {
  radars: Radar[];
  loading: boolean;
  _subscriberCount: number;
  _unsub: (() => void) | null;
  _lastRadarAt: number | null;

  subscribeToRadars: () => () => void;
  /** Radares visíveis para o usuário: ativos + os pendentes criados por ele */
  getVisibleRadars: () => Radar[];
  addRadar: (params: {
    type: RadarType;
    latitude: number;
    longitude: number;
    speedLimit?: number;
    stateUF?: string;
    cityName?: string;
    countryCode?: string;
  }) => Promise<void>;
  /** "O radar ainda está aí" — renova lastConfirmedAt e pode ativar pending */
  confirmRadar: (id: string) => Promise<void>;
  /** "Não existe mais" — 5 negações removem o radar */
  denyRadar: (id: string) => Promise<void>;
  deleteRadar: (id: string) => Promise<void>;
}

function docToRadar(d: any): Radar | null {
  const data = d.data();
  const expiresAt = data.expiresAt ? (data.expiresAt as Timestamp).toMillis() : null;
  // Radar móvel/blitz expirado some imediatamente do cliente
  if (expiresAt !== null && expiresAt <= Date.now()) return null;
  return {
    id: d.id,
    type: data.type,
    latitude: data.latitude,
    longitude: data.longitude,
    speedLimit: data.speedLimit ?? undefined,
    createdBy: data.createdBy,
    createdAt: (data.createdAt as Timestamp).toMillis(),
    expiresAt,
    confirmations: data.confirmations ?? 0,
    denials: data.denials ?? 0,
    voterStamps: data.voterStamps ?? {},
    lastConfirmedAt: data.lastConfirmedAt
      ? (data.lastConfirmedAt as Timestamp).toMillis()
      : (data.createdAt as Timestamp).toMillis(),
    status: data.status ?? 'active',
    stateUF: data.stateUF ?? undefined,
    cityName: data.cityName ?? undefined,
    countryCode: data.countryCode ?? undefined,
  };
}

export const useRadarsStore = create<RadarsState>((set, get) => ({
  radars: [],
  loading: true,
  _subscriberCount: 0,
  _unsub: null,
  _lastRadarAt: null,

  // ─── Subscription com ref-count (mesmo padrão do eventsStore) ─────────────
  subscribeToRadars: () => {
    const state = get();
    if (state._subscriberCount > 0) {
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

    const q = query(
      collection(db, RADARS_COLLECTION),
      orderBy('lastConfirmedAt', 'desc'),
      limit(500),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const radars: Radar[] = snapshot.docs
        .map(docToRadar)
        .filter((r): r is Radar => r !== null);
      set({ radars, loading: false });
    }, (err) => {
      if (__DEV__) console.error('[RadarsStore] onSnapshot error:', err.code, err.message);
      set({ loading: false });
    });

    set({ _subscriberCount: 1, _unsub: unsub });

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
  },

  getVisibleRadars: () => {
    const uid = getCurrentUserId();
    const now = Date.now();
    return get().radars.filter((r) => {
      if (r.expiresAt !== null && r.expiresAt <= now) return false;
      // Radar fixo "frio" (sem confirmação há 180 dias) some do mapa
      if (r.type === 'fixed' && now - r.lastConfirmedAt > RADAR_STALE_MS) return false;
      if (r.status === 'pending') return r.createdBy === uid;
      return true;
    });
  },

  // ─── Criar radar ──────────────────────────────────────────────────────────
  addRadar: async ({ type, latitude, longitude, speedLimit, stateUF, cityName, countryCode }) => {
    const uid = getCurrentUserId();
    if (!uid || uid === 'anonymous') {
      throw new Error(t('login_required_road'));
    }

    const now = Date.now();
    const { _lastRadarAt } = get();
    if (_lastRadarAt && now - _lastRadarAt < RATE_LIMIT_MS) {
      const remaining = Math.ceil((RATE_LIMIT_MS - (now - _lastRadarAt)) / 1000);
      throw new Error(tf('rate_limit_wait', { remaining }));
    }

    const ttl = RADAR_TYPES[type].ttlHours;
    await addDoc(collection(db, RADARS_COLLECTION), {
      type,
      latitude,
      longitude,
      speedLimit: speedLimit ?? null,
      createdBy: uid,
      createdAt: Timestamp.fromMillis(now),
      expiresAt: ttl !== null ? Timestamp.fromMillis(now + ttl * 3600_000) : null,
      confirmations: 0,
      denials: 0,
      voterStamps: {},
      lastConfirmedAt: Timestamp.fromMillis(now),
      status: 'pending',
      stateUF: stateUF ?? null,
      cityName: cityName ?? null,
      countryCode: countryCode ?? null,
    });

    set({ _lastRadarAt: now });
    awardPoints(uid, POINTS.ROAD_EVENT_CREATED, 'eventsReported').catch(() => {});
  },

  // ─── Confirmar (janela de re-voto de 30 dias; renova lastConfirmedAt) ─────
  confirmRadar: async (id) => {
    const uid = getCurrentUserId();
    if (!uid || uid === 'anonymous') throw new Error(t('login_required_road'));

    const ref = doc(db, RADARS_COLLECTION, id);
    let ownerId: string | null = null;
    let alreadyVoted = false;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      const stamps: Record<string, number> = data.voterStamps ?? {};
      const lastVote = stamps[uid] ?? 0;
      const now = Date.now();
      if (now - lastVote < RADAR_REVOTE_WINDOW_MS) { alreadyVoted = true; return; }

      ownerId = data.createdBy;
      const newConfirmations = (data.confirmations ?? 0) + 1;
      const update: Record<string, any> = {
        confirmations: newConfirmations,
        lastConfirmedAt: Timestamp.fromMillis(now),
        [`voterStamps.${uid}`]: now,
      };
      if (data.status === 'pending' && newConfirmations >= RADAR_ACTIVATION_CONFIRMATIONS) {
        update.status = 'active';
      }
      tx.update(ref, update);
    });

    if (alreadyVoted) throw new Error(t('radar_already_voted'));
    if (ownerId && ownerId !== 'anonymous' && ownerId !== uid) {
      awardPoints(ownerId, POINTS.CONFIRMATION_RECEIVED).catch(() => {});
    }
  },

  // ─── Negar ("não existe mais") — 5 negações deletam ───────────────────────
  denyRadar: async (id) => {
    const uid = getCurrentUserId();
    if (!uid || uid === 'anonymous') throw new Error(t('login_required_road'));

    const ref = doc(db, RADARS_COLLECTION, id);
    let ownerId: string | null = null;
    let alreadyVoted = false;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      const stamps: Record<string, number> = data.voterStamps ?? {};
      const lastVote = stamps[uid] ?? 0;
      const now = Date.now();
      if (now - lastVote < RADAR_REVOTE_WINDOW_MS) { alreadyVoted = true; return; }

      ownerId = data.createdBy;
      const newDenials = (data.denials ?? 0) + 1;
      if (newDenials >= RADAR_REMOVAL_DENIALS) {
        tx.delete(ref);
      } else {
        tx.update(ref, {
          denials: newDenials,
          [`voterStamps.${uid}`]: now,
        });
      }
    });

    if (alreadyVoted) throw new Error(t('radar_already_voted'));
    if (ownerId && ownerId !== 'anonymous' && ownerId !== uid) {
      awardPoints(ownerId, POINTS.DENIAL_RECEIVED).catch(() => {});
    }
  },

  // ─── Excluir (criador ou admin) ───────────────────────────────────────────
  deleteRadar: async (id) => {
    await deleteDoc(doc(db, RADARS_COLLECTION, id));
    set((s) => ({ radars: s.radars.filter((r) => r.id !== id) }));
  },
}));
