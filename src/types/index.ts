export type EventCategory =
  | 'drunkcheck'
  | 'policeblitz'
  | 'accident'
  | 'roadwork'
  | 'flood'
  | 'closure'
  | 'traffic'
  | 'hazard'
  | 'radar';

export interface RoadEvent {
  id: string;
  category: EventCategory;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  createdAt: number; // unix ms
  expiresAt: number; // unix ms
  confirmations: number;
  denials: number;
  voters: string[];   // UIDs que já confirmaram ou negaram (evita voto duplo)
  userId: string;
  stateUF?: string;     // ex: 'SP' (Brasil) ou nome da região em outros países
  cityName?: string;    // ex: 'São Paulo'
  countryCode?: string; // ex: 'BR', 'US', 'PT'
  speedLimit?: number;  // km/h — usado em eventos da categoria 'radar'
}

export interface EventCategoryMeta {
  label: string;
  emoji: string;
  color: string;
  defaultTtlMinutes: number;
}

export const EVENT_CATEGORIES: Record<EventCategory, EventCategoryMeta> = {
  // Eventos que se resolvem rapidamente
  traffic:     { label: 'Congestionamento',   emoji: '🐢', color: '#F4511E', defaultTtlMinutes: 30  },
  hazard:      { label: 'Perigo na via',      emoji: '⚠️', color: '#FFB300', defaultTtlMinutes: 45  },
  accident:    { label: 'Acidente',           emoji: '🚗', color: '#E53935', defaultTtlMinutes: 90  },
  // Eventos de duração média (blitz, fiscalizações)
  policeblitz: { label: 'Blitz Policial',     emoji: '👮', color: '#3949AB', defaultTtlMinutes: 180 },
  drunkcheck:  { label: 'Lei Seca',           emoji: '🍺', color: '#00897B', defaultTtlMinutes: 240 },
  // Eventos de longa duração (condições climáticas, infraestrutura)
  flood:       { label: 'Alagamento',         emoji: '🌊', color: '#1E88E5', defaultTtlMinutes: 300 },
  closure:     { label: 'Interdição',         emoji: '🚫', color: '#8E24AA', defaultTtlMinutes: 720 },
  roadwork:    { label: 'Obras',              emoji: '🚧', color: '#FB8C00', defaultTtlMinutes: 4320 }, // 72 h
  // Radar / fiscalização eletrônica de velocidade
  radar:       { label: 'Radar',              emoji: '📷', color: '#00ACC1', defaultTtlMinutes: 180 },
};
