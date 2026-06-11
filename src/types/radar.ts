/**
 * Radares — base colaborativa de fiscalização eletrônica.
 *
 * Diferente dos eventos de estrada (temporários, TTL fixo), radares fixos são
 * infraestrutura: não expiram por tempo, expiram por FALTA DE CONFIANÇA.
 *
 * Ciclo de vida:
 *   pending → (2 confirmações de usuários distintos) → active
 *   active  → confirmações recorrentes renovam lastConfirmedAt
 *   active  → 5 negações ("não existe mais") → deletado
 *   active  → sem confirmação por 180 dias → removido pela limpeza diária
 *
 * Tipos:
 *   fixed  — radar fixo: sem TTL
 *   mobile — radar móvel: TTL 12 h
 *   blitz  — ponto de fiscalização temporário: TTL 6 h
 *
 * Votos têm janela de renovação (30 dias): o mesmo usuário pode confirmar o
 * mesmo radar de novo após 30 dias — essencial para manter radares fixos
 * vivos (um array `voters` permanente impediria renovações).
 */

export type RadarType = 'fixed' | 'mobile' | 'blitz';
export type RadarStatus = 'pending' | 'active';

export interface Radar {
  id: string;
  type: RadarType;
  latitude: number;
  longitude: number;
  speedLimit?: number;       // km/h
  createdBy: string;
  createdAt: number;         // unix ms
  expiresAt: number | null;  // unix ms — null para radar fixo
  confirmations: number;
  denials: number;
  /** uid → timestamp (ms) do último voto; janela de re-voto: 30 dias */
  voterStamps: Record<string, number>;
  lastConfirmedAt: number;   // unix ms — renovado a cada confirmação
  status: RadarStatus;
  stateUF?: string;
  cityName?: string;
  countryCode?: string;
}

export interface RadarTypeMeta {
  emoji: string;
  color: string;
  /** TTL em horas; null = não expira (radar fixo) */
  ttlHours: number | null;
}

export const RADAR_TYPES: Record<RadarType, RadarTypeMeta> = {
  fixed:  { emoji: '📷', color: '#00ACC1', ttlHours: null },
  mobile: { emoji: '📸', color: '#7E57C2', ttlHours: 12 },
  blitz:  { emoji: '🚓', color: '#3949AB', ttlHours: 6 },
};

/** Confirmações necessárias para um radar pending virar active */
export const RADAR_ACTIVATION_CONFIRMATIONS = 2;

/** Negações que removem o radar */
export const RADAR_REMOVAL_DENIALS = 5;

/** Janela em que o mesmo usuário não pode votar de novo no mesmo radar */
export const RADAR_REVOTE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

/** Radar fixo sem confirmação há mais que isso é removido pela limpeza diária */
export const RADAR_STALE_MS = 180 * 24 * 60 * 60 * 1000; // 180 dias
