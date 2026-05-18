/**
 * Design tokens — fundação visual do app.
 *
 * Inspirado em Google Maps, Apple Maps, Waze, Uber.
 * Premium · Minimal · Glassmorphism · Sombras suaves
 */

import { Platform } from 'react-native';

// ─── COLOR TOKENS ─────────────────────────────────────────────────────────────

export const palette = {
  // Base
  black: '#000000',
  white: '#FFFFFF',

  // Cinzas refinados
  slate: {
    50:  '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  // Cor da marca
  brand: {
    50:  '#FFF4ED',
    100: '#FFE6D5',
    300: '#FDB68B',
    500: '#FF6B35', // primary
    600: '#EA580C',
    700: '#C2410C',
  },

  // Tier premium (ouro real, mais sofisticado)
  gold: {
    100: '#FEF3C7',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },

  silver: {
    100: '#E2E8F0',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
  },

  bronze: {
    100: '#FED7AA',
    400: '#C2742C',
    500: '#A0571A',
    600: '#7C3F0F',
  },

  // Status
  live:    '#10B981', // verde — ao vivo
  alert:   '#EF4444', // vermelho — alerta
  warning: '#F97316', // laranja — atenção
  info:    '#3B82F6', // azul — informação
} as const;

export type ColorScheme = 'light' | 'dark';

/** Token semântico que muda conforme o tema */
export interface Theme {
  scheme: ColorScheme;
  bg: {
    base:     string; // fundo principal
    surface:  string; // cards, sheets
    glass:    string; // glassmorphism (semi-transparente)
    overlay:  string; // overlay/backdrop
    inverse:  string;
  };
  text: {
    primary:   string;
    secondary: string;
    tertiary:  string;
    inverse:   string;
    onBrand:   string;
  };
  border: {
    subtle:   string;
    default:  string;
    strong:   string;
  };
  brand: {
    primary:  string;
    hover:    string;
    surface:  string; // bg sutil de brand
  };
}

export const lightTheme: Theme = {
  scheme: 'light',
  bg: {
    base:    palette.white,
    surface: palette.white,
    glass:   'rgba(255,255,255,0.85)',
    overlay: 'rgba(15,23,42,0.45)',
    inverse: palette.slate[900],
  },
  text: {
    primary:   palette.slate[900],
    secondary: palette.slate[600],
    tertiary:  palette.slate[400],
    inverse:   palette.white,
    onBrand:   palette.white,
  },
  border: {
    subtle:  palette.slate[100],
    default: palette.slate[200],
    strong:  palette.slate[300],
  },
  brand: {
    primary: palette.brand[500],
    hover:   palette.brand[600],
    surface: palette.brand[50],
  },
};

export const darkTheme: Theme = {
  scheme: 'dark',
  bg: {
    base:    palette.slate[950],
    surface: palette.slate[900],
    glass:   'rgba(15,23,42,0.85)',
    overlay: 'rgba(0,0,0,0.55)',
    inverse: palette.white,
  },
  text: {
    primary:   palette.slate[50],
    secondary: palette.slate[300],
    tertiary:  palette.slate[400],
    inverse:   palette.slate[900],
    onBrand:   palette.white,
  },
  border: {
    subtle:  palette.slate[800],
    default: palette.slate[700],
    strong:  palette.slate[600],
  },
  brand: {
    primary: palette.brand[500],
    hover:   palette.brand[300],
    surface: 'rgba(255,107,53,0.12)',
  },
};

// ─── TYPOGRAPHY ───────────────────────────────────────────────────────────────

export const typography = {
  // Display — títulos grandes
  displayLg: { fontSize: 28, lineHeight: 34, fontWeight: '900' as const, letterSpacing: -0.5 },
  displayMd: { fontSize: 22, lineHeight: 28, fontWeight: '900' as const, letterSpacing: -0.3 },

  // Title
  titleLg: { fontSize: 18, lineHeight: 24, fontWeight: '800' as const, letterSpacing: -0.2 },
  titleMd: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const },
  titleSm: { fontSize: 14, lineHeight: 20, fontWeight: '700' as const },

  // Body
  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
  bodyMd: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  bodySm: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },

  // Label
  labelLg: { fontSize: 13, lineHeight: 16, fontWeight: '700' as const },
  labelMd: { fontSize: 12, lineHeight: 14, fontWeight: '700' as const },
  labelSm: { fontSize: 11, lineHeight: 13, fontWeight: '700' as const, letterSpacing: 0.4 },

  // Caption — texto pequeno
  caption: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const },

  // Overline — texto maiúsculo
  overline: { fontSize: 10, lineHeight: 12, fontWeight: '800' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
} as const;

// ─── RADIUS ───────────────────────────────────────────────────────────────────

export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  full: 9999,
} as const;

// ─── SPACING ──────────────────────────────────────────────────────────────────

export const spacing = {
  0: 0,
  '0.5': 2,
  1: 4,
  '1.5': 6,
  2: 8,
  '2.5': 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// ─── SHADOW ───────────────────────────────────────────────────────────────────

export const shadow = {
  none: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  // sutil — para chips, botões pequenos
  sm: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  // padrão — para cards
  md: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  // destaque — para pins e elementos flutuantes
  lg: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  // premium — para sheets, cards principais
  xl: {
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
  // glow brand — pins premium / promovidos
  glow: (color: string) => ({
    elevation: 12,
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
  }),
} as const;

// ─── MOTION ───────────────────────────────────────────────────────────────────

export const motion = {
  duration: {
    fast: 150,
    base: 250,
    slow: 400,
    slower: 600,
  },
  // bouncy spring
  spring: {
    damping: 18,
    stiffness: 220,
    mass: 1,
  },
  // smooth spring
  smooth: {
    damping: 26,
    stiffness: 180,
    mass: 1,
  },
} as const;

// ─── PIN SIZE TOKENS ──────────────────────────────────────────────────────────
// Tamanhos adaptativos por nível de zoom (distant/medium/close)
// Hierarquia visual: emergency > live > premium > partner > standard

export const pinSize = {
  standard: { distant: 28, medium: 34, close: 42 },
  premium:  { distant: 36, medium: 44, close: 54 },
  alert:    { distant: 34, medium: 42, close: 52 },
  live:     { distant: 32, medium: 38, close: 46 },
  partner:  { distant: 36, medium: 44, close: 52 },
  cluster:  { distant: 38, medium: 48, close: 58 },
} as const;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Hit target mínimo recomendado iOS/Material */
export const MIN_TAP_SIZE = 52;

export function hitPadding(visibleSize: number): number {
  if (visibleSize >= MIN_TAP_SIZE) return 0;
  return Math.ceil((MIN_TAP_SIZE - visibleSize) / 2);
}

/** Platform-aware shadow (web/Android usa só elevation) */
export function platformShadow(s: any) {
  if (Platform.OS === 'android') {
    return { elevation: s.elevation };
  }
  return s;
}
