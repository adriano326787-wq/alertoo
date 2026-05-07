export type EventCategory =
  | 'drunkcheck'
  | 'policeblitz'
  | 'accident'
  | 'roadwork'
  | 'flood'
  | 'closure'
  | 'traffic'
  | 'hazard';

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
}

export interface EventCategoryMeta {
  label: string;
  emoji: string;
  color: string;
  defaultTtlMinutes: number;
}

export const EVENT_CATEGORIES: Record<EventCategory, EventCategoryMeta> = {
  drunkcheck:  { label: 'Lei Seca',           emoji: '🍺', color: '#00897B', defaultTtlMinutes: 60 },
  policeblitz: { label: 'Blitz Policial',     emoji: '👮', color: '#3949AB', defaultTtlMinutes: 60 },
  accident:    { label: 'Acidente',           emoji: '🚗', color: '#E53935', defaultTtlMinutes: 60 },
  roadwork:    { label: 'Obras',              emoji: '🚧', color: '#FB8C00', defaultTtlMinutes: 60 },
  flood:       { label: 'Alagamento',         emoji: '🌊', color: '#1E88E5', defaultTtlMinutes: 60 },
  closure:     { label: 'Interdição',         emoji: '🚫', color: '#8E24AA', defaultTtlMinutes: 60 },
  traffic:     { label: 'Congestionamento',   emoji: '🐢', color: '#F4511E', defaultTtlMinutes: 60 },
  hazard:      { label: 'Perigo na via',      emoji: '⚠️', color: '#FFB300', defaultTtlMinutes: 60 },
};
