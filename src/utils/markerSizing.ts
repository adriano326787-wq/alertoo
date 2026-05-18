/**
 * Sizing centralizado para markers do mapa por zoom tier.
 *
 * Aplica os princípios da skill `map-marker-ux`:
 * - §3 densidade: pins menores quando o mapa está mais afastado
 * - §7 touch target ≥52×52 (hit area invisível wrapper)
 * - §10 zoom-adaptive sizing: tamanhos distintos por tier
 *
 * Hierarquia: promovido > confirmado > normal, dentro do mesmo zoom.
 */

import { ZoomTier } from './mapZoom';

export const MIN_HIT_SIZE = 52; // §7 touch target mínimo

// ─── Pins NORMAIS (road events + entertainment não-promovido) ─────────────────
// Pin retangular 4:3 (mesma família visual dos promovidos, mas SEM borda colorida).
// `_SIZE` continua exportado por compatibilidade — é a LARGURA do retângulo.
// Altura é calculada como SIZE * 0.75 (4:3).
export const NORMAL_PIN_SIZE: Record<ZoomTier, number> = {
  distant: 36,
  medium:  44,
  close:   54,
};
export const NORMAL_PIN_RATIO = 0.75; // 4:3 (altura = largura × 0.75)

// ─── Pins PROMOVIDOS ──────────────────────────────────────────────────────────
// Todos os modos usam CARD RETANGULAR 4:3 (aspect ratio mais comum para fotos).
// Brand consistency (promo-marketing §6) + foto sempre visível (§1).
//
// Tamanhos por zoom — escalam preservando 4:3:

// Mini (zoom distant): card 56×42 — pequeno mas reconhecível
export const PROMO_MINI_W = 56;
export const PROMO_MINI_H = 42;

// Label (zoom medium): card 92×69 + label balão com nome abaixo
export const PROMO_LABEL_W = 92;
export const PROMO_LABEL_H = 69;

// Close (zoom close): card grande 170×190 = foto 120 + footer rico 70
//   footer com categoria + nome + cidade (informações completas)
export const PROMO_CARD_WIDTH    = 170;
export const PROMO_CARD_PHOTO_H  = 120;
export const PROMO_CARD_FOOTER_H = 70;
export const PROMO_CARD_MAX_W    = 170;

/**
 * Garante touch target mínimo via wrapper invisible.
 * Retorna o padding necessário para que (size + padding*2) >= MIN_HIT_SIZE.
 */
export function hitPadding(visibleSize: number): number {
  if (visibleSize >= MIN_HIT_SIZE) return 0;
  return Math.ceil((MIN_HIT_SIZE - visibleSize) / 2);
}
