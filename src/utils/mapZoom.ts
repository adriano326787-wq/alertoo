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
 * distant : zoom < 11  → visão de cidade/estado inteiro
 * medium  : zoom 11-13 → bairro / alguns quarteirões
 * close   : zoom >= 14 → rua / detalhe
 */
export function getZoomTier(latitudeDelta: number): ZoomTier {
  const zoom = deltaToZoom(latitudeDelta);
  if (zoom < 11) return 'distant';
  if (zoom < 14) return 'medium';
  return 'close';
}

// ─── Pontuação de relevância dos eventos de estrada ───────────────────────────

function roadScore(event: RoadEvent): number {
  const confirms = event.confirmCount ?? 0;
  const denies = event.denyCount ?? 0;
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

  const featuredBonus = event.isFeatured ? 40 : 0;
  const likeBonus = (event.likes?.length ?? 0) * 5;
  const commentBonus = (event.commentCount ?? 0) * 3;

  return (isPromotedActive ? tierWeight : 0) + featuredBonus + likeBonus + commentBonus;
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
    // Apenas eventos com pelo menos 1 confirmação líquida
    return active
      .filter((e) => (e.confirmCount ?? 0) - (e.denyCount ?? 0) >= 1)
      .sort((a, b) => roadScore(b) - roadScore(a))
      .slice(0, 80);
  }

  // distant — apenas os mais confirmados (top 20)
  return active
    .filter((e) => (e.confirmCount ?? 0) - (e.denyCount ?? 0) >= 3)
    .sort((a, b) => roadScore(b) - roadScore(a))
    .slice(0, 20);
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
    // Patrocinados (qualquer tier) + destaque + populares (≥3 likes)
    return events
      .filter((e) =>
        isActivePromotion(e) ||
        e.isFeatured ||
        (e.likes?.length ?? 0) >= 3
      )
      .sort((a, b) => entScore(b) - entScore(a))
      .slice(0, 60);
  }

  // distant — apenas ouro + destaque admin
  return events
    .filter((e) =>
      (isActivePromotion(e) && e.promotionTier === 'ouro') ||
      e.isFeatured
    )
    .sort((a, b) => entScore(b) - entScore(a))
    .slice(0, 15);
}

// ─── Labels de UI ─────────────────────────────────────────────────────────────

export const ZOOM_TIER_LABEL: Record<ZoomTier, { icon: string; text: string; color: string }> = {
  distant: { icon: '🌍', text: 'Visão geral', color: '#6366F1' },
  medium:  { icon: '🏙️', text: 'Bairro',      color: '#0EA5E9' },
  close:   { icon: '📍', text: 'Rua',          color: '#22C55E' },
};
