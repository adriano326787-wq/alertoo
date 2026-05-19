/**
 * Sistema de zoom inteligente do mapa
 *
 * Converte latitudeDelta (react-native-maps) em nível de zoom (0-20)
 * e define quais pins devem ser exibidos em cada tier.
 */

import { RoadEvent } from '../types';
import { EntertainmentEvent } from '../types/entertainment';

// ─── Tiers de zoom ────────────────────────────────────────────────────────────

export type ZoomTier = 'distant' | 'medium' | 'close';

/**
 * Converte latitudeDelta em número de zoom (escala Google Maps 0-20).
 * latitudeDelta grande = zoom afastado (número pequeno).
 */
export function deltaToZoom(latitudeDelta: number): number {
  return Math.round(Math.log2(360 / latitudeDelta));
}

/**
 * Classifica o zoom atual em um dos três tiers.
 *
 * distant : zoom < 12  → visão de cidade/estado inteiro
 * medium  : zoom 12-14 → bairro / alguns quarteirões
 * close   : zoom >= 15 → rua / detalhe
 */
export function getZoomTier(latitudeDelta: number): ZoomTier {
  const zoom = deltaToZoom(latitudeDelta);
  if (zoom < 12) return 'distant';
  if (zoom < 15) return 'medium';
  return 'close';
}

// ─── Pontuação de relevância dos eventos de estrada ───────────────────────────

function roadScore(event: RoadEvent): number {
  const confirms = event.confirmations ?? 0;
  const denies = event.denials ?? 0;
  const net = confirms - denies;
  const age = (Date.now() - event.createdAt) / 60000; // minutos
  // Decai 1 ponto a cada 30 min; mínimo 0
  return Math.max(0, net * 10 - age / 30);
}

// ─── Pontuação de relevância dos eventos de entretenimento ────────────────────

function entScore(event: EntertainmentEvent): number {
  const tierWeight =
    event.promotionTier === 'ouro' ? 100 :
    event.promotionTier === 'prata' ? 60 :
    event.promotionTier === 'bronze' ? 30 : 0;

  const isPromotedActive =
    event.promotionTier &&
    event.promotionEndDate &&
    event.promotionEndDate > Date.now();

  const likeBonus = (event.likes?.length ?? 0) * 5;
  const commentBonus = (event.commentCount ?? 0) * 3;

  return (isPromotedActive ? tierWeight : 0) + likeBonus + commentBonus;
}

// ─── Filtros por tier ─────────────────────────────────────────────────────────

/**
 * Filtra e ordena eventos de estrada de acordo com o zoom atual.
 */
export function filterRoadEvents(events: RoadEvent[], tier: ZoomTier): RoadEvent[] {
  const now = Date.now();
  const active = events.filter((e) => !e.expiresAt || e.expiresAt > now);

  if (tier === 'close') {
    // Mostra tudo — ordenado por relevância
    return [...active].sort((a, b) => roadScore(b) - roadScore(a));
  }

  if (tier === 'medium') {
    // Mostra todos os eventos ativos ordenados por relevância
    return [...active].sort((a, b) => roadScore(b) - roadScore(a)).slice(0, 120);
  }

  // distant — 1+ confirmação líquida OU criado nas últimas 2h
  const twoHours = 2 * 60 * 60 * 1000;
  return active
    .filter((e) =>
      (e.confirmations ?? 0) - (e.denials ?? 0) >= 1 ||
      Date.now() - e.createdAt < twoHours
    )
    .sort((a, b) => roadScore(b) - roadScore(a))
    .slice(0, 60);
}

/**
 * Filtra e ordena eventos de entretenimento de acordo com o zoom atual.
 */
export function filterEntEvents(events: EntertainmentEvent[], tier: ZoomTier): EntertainmentEvent[] {
  const now = Date.now();

  const isActivePromotion = (e: EntertainmentEvent) =>
    !!(e.promotionTier && e.promotionEndDate && e.promotionEndDate > now);

  if (tier === 'close') {
    // Mostra tudo — ordenado por score
    return [...events].sort((a, b) => entScore(b) - entScore(a));
  }

  if (tier === 'medium') {
    // Mostra todos os eventos — ordenados por score
    return [...events].sort((a, b) => entScore(b) - entScore(a)).slice(0, 120);
  }

  // distant — qualquer promovido OU ≥2 likes OU criado nas últimas 6h
  const sixHours = 6 * 60 * 60 * 1000;
  return events
    .filter((e) =>
      isActivePromotion(e) ||
      (e.likes?.length ?? 0) >= 2 ||
      Date.now() - e.createdAt < sixHours
    )
    .sort((a, b) => entScore(b) - entScore(a))
    .slice(0, 60);
}

// ─── Labels de UI ─────────────────────────────────────────────────────────────

export const ZOOM_TIER_LABEL: Record<ZoomTier, { icon: string; text: string; color: string }> = {
  distant: { icon: '🌍', text: 'Visão geral', color: '#6366F1' },
  medium:  { icon: '🏙️', text: 'Bairro',      color: '#0EA5E9' },
  close:   { icon: '📍', text: 'Rua',          color: '#22C55E' },
};
