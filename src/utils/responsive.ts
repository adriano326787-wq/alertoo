/**
 * Sistema de layout responsivo do Alertoo.
 * Escala tamanhos com base no tamanho real da tela do dispositivo.
 *
 * Referência de design: tela de 390px de largura (iPhone 14 / Pixel 7).
 */

import { Dimensions, PixelRatio } from 'react-native';

const BASE_WIDTH  = 390;
const BASE_HEIGHT = 844;

const { width: W, height: H } = Dimensions.get('window');

/** Escala horizontal (fonte, padding, margem) */
export const rw = (px: number) => Math.round((px / BASE_WIDTH) * W);

/** Escala vertical (alturas, espaçamentos verticais) */
export const rh = (px: number) => Math.round((px / BASE_HEIGHT) * H);

/** Escala de fonte — evita fontes minúsculas em telas pequenas */
export const rf = (px: number) => {
  const scale = Math.min(W / BASE_WIDTH, H / BASE_HEIGHT);
  return Math.round(PixelRatio.roundToNearestPixel(px * scale));
};

/** Largura da tela */
export const SW = W;

/** Altura da tela */
export const SH = H;

/** true em telas pequenas (< 360px) */
export const isSmall = W < 360;

/** true em tablets (> 600px) */
export const isTablet = W >= 600;
