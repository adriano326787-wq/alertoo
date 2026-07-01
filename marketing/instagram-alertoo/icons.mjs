export const BG_DARK = '#0F172A';
export const CARD = '#1E293B';
export const TEAL = '#00897B';
export const TEAL_LIGHT = '#4DB6AC';
export const TEXT = '#F1F5F9';
export const SUBTEXT = '#94A3B8';
export const WHITE = '#FFFFFF';
export const DARK = '#0B1220';

// --- Vector icon library (centered at 0,0, ~200x200 box) ---
export const ICONS = {
  car: (a) => `
    <rect x="-70" y="-10" width="140" height="45" rx="14" fill="${a}"/>
    <path d="M -45 -10 L -25 -38 L 35 -38 L 55 -10 Z" fill="${WHITE}" opacity="0.9"/>
    <circle cx="-38" cy="38" r="16" fill="${DARK}"/>
    <circle cx="-38" cy="38" r="7" fill="${WHITE}"/>
    <circle cx="38" cy="38" r="16" fill="${DARK}"/>
    <circle cx="38" cy="38" r="7" fill="${WHITE}"/>
  `,
  beer: (a) => `
    <rect x="-35" y="-45" width="70" height="95" rx="10" fill="${a}"/>
    <rect x="-35" y="-45" width="70" height="20" fill="${WHITE}" opacity="0.85"/>
    <path d="M 35 -25 q 30 0 30 22 q 0 22 -30 18 Z" fill="${a}"/>
    <path d="M 35 -19 q 18 0 18 16 q 0 16 -18 13 Z" fill="${BG_DARK}"/>
    <rect x="-30" y="-10" width="60" height="6" fill="${WHITE}" opacity="0.4"/>
    <rect x="-30" y="8" width="60" height="6" fill="${WHITE}" opacity="0.4"/>
  `,
  cheer: (a) => `
    <circle cx="-30" cy="0" r="26" fill="${a}"/>
    <circle cx="30" cy="0" r="26" fill="${TEAL_LIGHT}"/>
    <path d="M -42 -8 L -30 -28 L -18 -8 Z" fill="${WHITE}"/>
    <path d="M 18 -8 L 30 -28 L 42 -8 Z" fill="${WHITE}"/>
  `,
  rain: (a) => `
    <ellipse cx="0" cy="-10" rx="55" ry="30" fill="${a}"/>
    <ellipse cx="-30" cy="-22" rx="28" ry="20" fill="${a}"/>
    <ellipse cx="30" cy="-22" rx="28" ry="20" fill="${a}"/>
    <path d="M -25 30 q -6 14 0 24" stroke="${TEAL_LIGHT}" stroke-width="8" stroke-linecap="round" fill="none"/>
    <path d="M 0 35 q -6 14 0 24" stroke="${TEAL_LIGHT}" stroke-width="8" stroke-linecap="round" fill="none"/>
    <path d="M 25 30 q -6 14 0 24" stroke="${TEAL_LIGHT}" stroke-width="8" stroke-linecap="round" fill="none"/>
  `,
  camera: (a) => `
    <rect x="-60" y="-25" width="120" height="80" rx="12" fill="${a}"/>
    <rect x="-20" y="-45" width="40" height="22" rx="6" fill="${a}"/>
    <circle cx="0" cy="16" r="28" fill="${BG_DARK}"/>
    <circle cx="0" cy="16" r="16" fill="${TEAL_LIGHT}"/>
    <circle cx="38" cy="-8" r="6" fill="${WHITE}"/>
  `,
  clock: (a) => `
    <circle cx="0" cy="0" r="65" fill="${a}"/>
    <circle cx="0" cy="0" r="56" fill="${BG_DARK}"/>
    <line x1="0" y1="0" x2="0" y2="-32" stroke="${WHITE}" stroke-width="7" stroke-linecap="round"/>
    <line x1="0" y1="0" x2="24" y2="10" stroke="${WHITE}" stroke-width="7" stroke-linecap="round"/>
    <circle cx="0" cy="0" r="6" fill="${TEAL_LIGHT}"/>
  `,
  warn: (a) => `
    <path d="M 0 -60 L 58 50 L -58 50 Z" fill="${a}"/>
    <rect x="-7" y="-22" width="14" height="40" rx="4" fill="${WHITE}"/>
    <circle cx="0" cy="32" r="8" fill="${WHITE}"/>
  `,
  phone: (a) => `
    <rect x="-38" y="-65" width="76" height="130" rx="16" fill="${a}"/>
    <rect x="-28" y="-50" width="56" height="92" rx="4" fill="${BG_DARK}"/>
    <circle cx="0" cy="52" r="6" fill="${WHITE}"/>
    <path d="M -10 -20 L 16 0 L -10 20 Z" fill="${TEAL_LIGHT}"/>
  `,
  party: (a) => `
    <path d="M -10 50 L 30 -50" stroke="${a}" stroke-width="14" stroke-linecap="round"/>
    <circle cx="-40" cy="-10" r="8" fill="${TEAL_LIGHT}"/>
    <circle cx="40" cy="10" r="10" fill="${a}"/>
    <circle cx="10" cy="-45" r="7" fill="${WHITE}"/>
    <circle cx="-25" cy="35" r="6" fill="${WHITE}"/>
    <circle cx="45" cy="-30" r="6" fill="${TEAL_LIGHT}"/>
  `,
  support: (a) => `
    <circle cx="0" cy="0" r="65" fill="${a}"/>
    <path d="M -22 0 L -6 20 L 26 -18" stroke="${WHITE}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  `,
  forbidden: (a) => `
    <circle cx="0" cy="0" r="62" fill="none" stroke="${a}" stroke-width="14"/>
    <line x1="-40" y1="40" x2="40" y2="-40" stroke="${a}" stroke-width="14" stroke-linecap="round"/>
  `,
  map: (a) => `
    <rect x="-65" y="-50" width="130" height="100" rx="8" fill="${a}"/>
    <path d="M -50 -35 L -50 35" stroke="${BG_DARK}" stroke-width="3" stroke-dasharray="6 6"/>
    <path d="M -20 -50 L 5 40" stroke="${BG_DARK}" stroke-width="3" stroke-dasharray="6 6"/>
    <path d="M -40 0 Q 0 -30 40 10" stroke="${WHITE}" stroke-width="5" fill="none" stroke-dasharray="2 8" stroke-linecap="round"/>
    <path d="M 30 -5 q 0 -18 -14 -18 q -14 0 -14 18 q 0 14 14 26 q 14 -12 14 -26 Z" fill="${TEAL_LIGHT}"/>
  `,
  road: (a) => `
    <path d="M -20 60 L -45 -60 L 45 -60 L 20 60 Z" fill="${a}"/>
    <rect x="-6" y="-40" width="12" height="20" fill="${WHITE}"/>
    <rect x="-4" y="0" width="8" height="20" fill="${WHITE}"/>
    <rect x="-2" y="40" width="4" height="16" fill="${WHITE}"/>
  `,
  fuel: (a) => `
    <rect x="-40" y="-50" width="60" height="100" rx="8" fill="${a}"/>
    <rect x="-28" y="-38" width="36" height="30" rx="4" fill="${BG_DARK}"/>
    <path d="M 20 -20 L 40 -34 L 40 30 q 0 14 -14 14 L 20 44" stroke="${TEAL_LIGHT}" stroke-width="8" fill="none" stroke-linecap="round"/>
  `,
  taxi: (a) => `
    <rect x="-70" y="-8" width="140" height="42" rx="12" fill="${a}"/>
    <path d="M -45 -8 L -25 -34 L 35 -34 L 55 -8 Z" fill="${WHITE}" opacity="0.9"/>
    <rect x="-18" y="-46" width="36" height="14" rx="3" fill="${TEAL_LIGHT}"/>
    <circle cx="-38" cy="36" r="15" fill="${DARK}"/>
    <circle cx="38" cy="36" r="15" fill="${DARK}"/>
  `,
  family: (a) => `
    <circle cx="-35" cy="-25" r="16" fill="${a}"/>
    <path d="M -55 35 q 0 -30 20 -30 q 20 0 20 30 Z" fill="${a}"/>
    <circle cx="10" cy="-25" r="16" fill="${TEAL_LIGHT}"/>
    <path d="M -10 35 q 0 -30 20 -30 q 20 0 20 30 Z" fill="${TEAL_LIGHT}"/>
    <circle cx="48" cy="-5" r="11" fill="${WHITE}"/>
    <path d="M 32 35 q 0 -22 16 -22 q 16 0 16 22 Z" fill="${WHITE}"/>
  `,
  pin: (a) => `
    <path d="M 0 55 Q -45 0 -45 -25 a 45 45 0 1 1 90 0 Q 45 0 0 55 Z" fill="${a}"/>
    <circle cx="0" cy="-25" r="18" fill="${BG_DARK}"/>
  `,
  police: (a) => `
    <rect x="-70" y="-8" width="140" height="42" rx="12" fill="${a}"/>
    <path d="M -45 -8 L -25 -34 L 35 -34 L 55 -8 Z" fill="${WHITE}" opacity="0.9"/>
    <rect x="-16" y="-50" width="14" height="14" fill="#F87171"/>
    <rect x="2" y="-50" width="14" height="14" fill="${TEAL_LIGHT}"/>
    <circle cx="-38" cy="36" r="15" fill="${DARK}"/>
    <circle cx="38" cy="36" r="15" fill="${DARK}"/>
  `,
  money: (a) => `
    <circle cx="0" cy="0" r="62" fill="${a}"/>
    <circle cx="0" cy="0" r="62" fill="none" stroke="${WHITE}" stroke-width="3" opacity="0.5"/>
    <text x="0" y="20" text-anchor="middle" font-family="Arial" font-size="60" font-weight="900" fill="${WHITE}">$</text>
  `,
  star: (a) => `
    <path d="M 0 -62 L 18 -20 L 62 -16 L 28 12 L 38 58 L 0 32 L -38 58 L -28 12 L -62 -16 L -18 -20 Z" fill="${a}"/>
  `,
  house: (a) => `
    <path d="M -55 10 L 0 -50 L 55 10 L 55 55 L -55 55 Z" fill="${a}"/>
    <rect x="-18" y="5" width="36" height="50" fill="${BG_DARK}"/>
    <rect x="-40" y="20" width="20" height="20" fill="${TEAL_LIGHT}"/>
  `,
  smile: (a) => `
    <circle cx="0" cy="0" r="65" fill="${a}"/>
    <circle cx="-22" cy="-15" r="8" fill="${BG_DARK}"/>
    <circle cx="22" cy="-15" r="8" fill="${BG_DARK}"/>
    <path d="M -28 18 Q 0 45 28 18" stroke="${BG_DARK}" stroke-width="8" fill="none" stroke-linecap="round"/>
  `,
  chart: (a) => `
    <rect x="-55" y="0" width="26" height="55" rx="4" fill="${a}"/>
    <rect x="-13" y="-25" width="26" height="80" rx="4" fill="${TEAL_LIGHT}"/>
    <rect x="29" y="-45" width="26" height="100" rx="4" fill="${a}"/>
  `,
  heart: (a) => `
    <path d="M 0 45 C -55 5 -55 -40 -20 -50 C -2 -55 0 -35 0 -28 C 0 -35 2 -55 20 -50 C 55 -40 55 5 0 45 Z" fill="${a}"/>
  `,
  android: (a) => `
    <rect x="-45" y="-15" width="90" height="75" rx="20" fill="${a}"/>
    <circle cx="-45" cy="-15" r="12" fill="${a}"/>
    <circle cx="45" cy="-15" r="12" fill="${a}"/>
    <rect x="-50" y="-50" width="100" height="45" rx="22" fill="${a}"/>
    <circle cx="-20" cy="-32" r="6" fill="${BG_DARK}"/>
    <circle cx="20" cy="-32" r="6" fill="${BG_DARK}"/>
    <line x1="-30" y1="-65" x2="-18" y2="-52" stroke="${a}" stroke-width="6" stroke-linecap="round"/>
    <line x1="30" y1="-65" x2="18" y2="-52" stroke="${a}" stroke-width="6" stroke-linecap="round"/>
    <rect x="-30" y="35" width="14" height="35" rx="6" fill="${a}"/>
    <rect x="16" y="35" width="14" height="35" rx="6" fill="${a}"/>
  `,
};

export function icon(key, accent, cx = 0, cy = 0) {
  const fn = ICONS[key] || ICONS.star;
  return `<g transform="translate(${cx},${cy})">${fn(accent)}</g>`;
}

export function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
