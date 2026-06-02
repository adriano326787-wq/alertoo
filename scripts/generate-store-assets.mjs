/**
 * generate-store-assets.mjs — Gera assets de marketing do Play Console.
 *
 * Saída em `play-store-assets/`:
 *   - feature-graphic-1024x500.png  (banner do Play)
 *   - screenshots/01-mapa.png       (1080x1920, 5 telas promocionais)
 *   - screenshots/02-reportar.png
 *   - screenshots/03-eventos.png
 *   - screenshots/04-comunidade.png
 *   - screenshots/05-promover.png
 *
 * Uso:
 *   node scripts/generate-store-assets.mjs
 */

import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'play-store-assets');
const SCREENSHOTS = resolve(OUT, 'screenshots');

// ─── Brand tokens ────────────────────────────────────────────────────────────
const BRAND       = '#FF5722';
const BRAND_DARK  = '#E64A19';
const BRAND_LIGHT = '#FF8A65';
const WHITE       = '#FFFFFF';
const INK         = '#1E293B';
const MUTED       = '#64748B';
const SURFACE     = '#F8FAFC';
const BORDER      = '#E2E8F0';

// Category accents
const RED    = '#E53935'; // blitz / acidente
const BLUE   = '#1E88E5'; // alagamento
const AMBER  = '#FFB300'; // obra
const PURPLE = '#6A1B9A'; // entertainment
const GREEN  = '#2E7D32'; // confirmado

// Tier colors
const BRONZE = '#CD7F32';
const SILVER = '#9E9E9E';
const GOLD   = '#FFC107';

// Font stack — Segoe UI é o default no Windows, sempre disponível em sharp/librsvg
const FONT = 'Segoe UI, Arial, sans-serif';

/** Escurece uma cor hex em pct (0..1) */
function darken(hex, pct = 0.25) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.floor((num >> 16) * (1 - pct)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0xff) * (1 - pct)));
  const b = Math.max(0, Math.floor((num & 0xff) * (1 - pct)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Render an SVG string to PNG at the given path */
async function svgToPng(svg, outPath, width, height) {
  await sharp(Buffer.from(svg), { density: 144 })
    .resize(width, height)
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`✓ ${outPath.replace(ROOT, '.').replace(/\\/g, '/')}`);
}

/** Phone frame SVG — used inside screenshots */
function phoneFrame(innerSvg, { width = 600, height = 1200, cornerRadius = 60 } = {}) {
  return `
    <g>
      <!-- shadow -->
      <rect x="-10" y="-10" width="${width + 20}" height="${height + 20}"
            rx="${cornerRadius + 10}" ry="${cornerRadius + 10}"
            fill="rgba(0,0,0,0.25)" />
      <!-- body -->
      <rect width="${width}" height="${height}" rx="${cornerRadius}" ry="${cornerRadius}"
            fill="#1a1a1a" stroke="#2a2a2a" stroke-width="3"/>
      <!-- screen -->
      <rect x="14" y="14" width="${width - 28}" height="${height - 28}"
            rx="${cornerRadius - 14}" ry="${cornerRadius - 14}"
            fill="${WHITE}"/>
      <!-- notch -->
      <rect x="${width / 2 - 60}" y="14" width="120" height="22" rx="11" ry="11" fill="#1a1a1a"/>
      <!-- inner content -->
      <g clip-path="url(#screenClip-${width})">
        ${innerSvg}
      </g>
      <defs>
        <clipPath id="screenClip-${width}">
          <rect x="14" y="14" width="${width - 28}" height="${height - 28}"
                rx="${cornerRadius - 14}" ry="${cornerRadius - 14}"/>
        </clipPath>
      </defs>
    </g>
  `;
}

/** Pin SVG used inside the map */
function pinSvg({ x, y, color, emoji, scale = 1 }) {
  const r = 22 * scale;
  return `
    <g transform="translate(${x},${y})">
      <ellipse cx="0" cy="${r * 1.5}" rx="${r * 0.7}" ry="${r * 0.15}" fill="rgba(0,0,0,0.25)"/>
      <path d="M0,${r * 1.3} L${-r * 0.4},${r * 0.6} L${r * 0.4},${r * 0.6} Z" fill="${color}"/>
      <circle cx="0" cy="0" r="${r}" fill="${color}" stroke="${WHITE}" stroke-width="${3 * scale}"/>
      <text x="0" y="${r * 0.3}" font-size="${r * 1.1}" text-anchor="middle"
            font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif">${emoji}</text>
    </g>
  `;
}

// ─── Feature Graphic 1024×500 ────────────────────────────────────────────────

async function generateFeatureGraphic() {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"  stop-color="${BRAND}"/>
      <stop offset="100%" stop-color="${BRAND_DARK}"/>
    </linearGradient>
    <linearGradient id="phoneShadow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"  stop-color="rgba(0,0,0,0.3)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.5)"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>

  <!-- background -->
  <rect width="1024" height="500" fill="url(#bg)"/>

  <!-- decorative circles -->
  <circle cx="900" cy="100" r="180" fill="rgba(255,255,255,0.06)"/>
  <circle cx="980" cy="450" r="120" fill="rgba(255,255,255,0.08)"/>
  <circle cx="50"  cy="450" r="140" fill="rgba(255,255,255,0.05)"/>

  <!-- left: brand + tagline -->
  <g transform="translate(60, 110)">
    <!-- bell icon -->
    <g transform="translate(0, 0)">
      <circle cx="50" cy="50" r="60" fill="rgba(255,255,255,0.18)"/>
      <g transform="translate(50, 50)">
        <!-- bell -->
        <path d="M-22,-12 Q-22,-30 0,-30 Q22,-30 22,-12 L22,8 L26,14 L-26,14 L-22,8 Z"
              fill="${WHITE}"/>
        <circle cx="0" cy="22" r="6" fill="${WHITE}"/>
        <rect x="-3" y="-34" width="6" height="6" rx="2" fill="${WHITE}"/>
        <!-- waves -->
        <path d="M-38,-4 Q-44,4 -38,12" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="3" stroke-linecap="round"/>
        <path d="M38,-4 Q44,4 38,12" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="3" stroke-linecap="round"/>
      </g>
    </g>

    <text x="130" y="50" font-family="${FONT}"
          font-weight="900" font-size="78" fill="${WHITE}">Alertoo</text>
    <text x="130" y="88" font-family="${FONT}"
          font-weight="600" font-size="22" fill="rgba(255,255,255,0.85)"
          letter-spacing="2">AVISOS · EVENTOS · COMUNIDADE</text>

    <text x="0" y="170" font-family="${FONT}"
          font-weight="800" font-size="36" fill="${WHITE}">Trânsito sem surpresa.</text>
    <text x="0" y="215" font-family="${FONT}"
          font-weight="800" font-size="36" fill="${WHITE}">Diversão sem perder hora.</text>

    <text x="0" y="270" font-family="${FONT}"
          font-weight="500" font-size="20" fill="rgba(255,255,255,0.9)">
      Blitz · Acidentes · Alagamentos · Shows · Bares
    </text>
  </g>

  <!-- right: phone mockup -->
  <g transform="translate(720, 60)">
    <!-- shadow -->
    <rect x="-8" y="12" width="250" height="380" rx="30" fill="rgba(0,0,0,0.35)"/>
    <!-- phone -->
    <rect width="244" height="380" rx="28" fill="#1a1a1a"/>
    <rect x="8" y="8" width="228" height="364" rx="22" fill="${WHITE}"/>
    <!-- notch -->
    <rect x="100" y="8" width="44" height="10" rx="5" fill="#1a1a1a"/>

    <!-- inner map screen -->
    <g transform="translate(8, 18)">
      <!-- background -->
      <rect width="228" height="354" fill="#E5EEF5"/>
      <!-- roads -->
      <path d="M0,80 Q60,90 110,70 T228,90" stroke="#FFF" stroke-width="14" fill="none"/>
      <path d="M0,180 Q80,160 140,180 T228,170" stroke="#FFF" stroke-width="14" fill="none"/>
      <path d="M0,280 Q70,290 130,270 T228,290" stroke="#FFF" stroke-width="14" fill="none"/>
      <path d="M70,0 Q80,80 65,160 T80,354" stroke="#FFF" stroke-width="14" fill="none"/>
      <path d="M170,0 Q160,100 180,200 T165,354" stroke="#FFF" stroke-width="14" fill="none"/>

      <!-- pins -->
      ${pinSvg({ x: 60, y: 80, color: RED, emoji: '🚓', scale: 0.7 })}
      ${pinSvg({ x: 170, y: 90, color: AMBER, emoji: '🚧', scale: 0.7 })}
      ${pinSvg({ x: 80, y: 180, color: BLUE, emoji: '💧', scale: 0.7 })}
      ${pinSvg({ x: 175, y: 200, color: PURPLE, emoji: '🎉', scale: 0.8 })}
      ${pinSvg({ x: 110, y: 280, color: RED, emoji: '⚠️', scale: 0.7 })}

      <!-- top bar -->
      <rect x="0" y="0" width="228" height="36" fill="${WHITE}"/>
      <rect x="12" y="10" width="160" height="16" rx="8" fill="${SURFACE}"/>
      <circle cx="200" cy="18" r="10" fill="${BRAND}"/>

      <!-- FAB -->
      <circle cx="200" cy="320" r="22" fill="${BRAND}"/>
      <text x="200" y="328" font-size="24" text-anchor="middle" fill="${WHITE}" font-weight="700">+</text>
    </g>
  </g>
</svg>`;
  await svgToPng(svg, resolve(OUT, 'feature-graphic-1024x500.png'), 1024, 500);
}

// ─── Screenshot template ──────────────────────────────────────────────────────
// 1080×1920 (portrait phone aspect)

const SW = 1080;
const SH = 1920;

/** Wrap a phone-content SVG into a full screenshot */
function screenshotShell({ title, subtitle, phoneContent, accent = BRAND }) {
  const accentDark = darken(accent, 0.35);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="${accent}"/>
      <stop offset="100%" stop-color="${accentDark}"/>
    </linearGradient>
  </defs>

  <!-- background -->
  <rect width="${SW}" height="${SH}" fill="url(#bg)"/>

  <!-- decorative circles -->
  <circle cx="${SW - 80}" cy="180"  r="240" fill="rgba(255,255,255,0.07)"/>
  <circle cx="80"        cy="${SH - 180}" r="200" fill="rgba(255,255,255,0.07)"/>

  <!-- title block -->
  <g transform="translate(${SW / 2}, 180)">
    <text x="0" y="0" font-family="${FONT}"
          font-weight="900" font-size="78" fill="${WHITE}" text-anchor="middle">${title}</text>
    <text x="0" y="60" font-family="${FONT}"
          font-weight="500" font-size="34" fill="rgba(255,255,255,0.92)"
          text-anchor="middle">${subtitle}</text>
  </g>

  <!-- phone -->
  <g transform="translate(${(SW - 720) / 2}, 360)">
    ${phoneFrame(phoneContent, { width: 720, height: 1440, cornerRadius: 70 })}
  </g>

  <!-- footer brand -->
  <g transform="translate(${SW / 2}, ${SH - 80})">
    <text x="0" y="0" font-family="${FONT}"
          font-weight="800" font-size="44" fill="${WHITE}" text-anchor="middle">Alertoo</text>
  </g>
</svg>`;
}

// ─── Screenshot 01 — Mapa ─────────────────────────────────────────────────────

async function screenshot01_mapa() {
  // The inner is a "map" screen. Coords are within the 720×1440 phone frame
  // (with 14px screen inset on all sides; we'll just draw within 14..706, 14..1426).
  const inner = `
    <!-- map base -->
    <rect x="14" y="14" width="692" height="1412" fill="#E5EEF5"/>

    <!-- roads -->
    <path d="M14,200 Q200,250 360,200 T706,240" stroke="${WHITE}" stroke-width="40" fill="none"/>
    <path d="M14,500 Q220,440 380,500 T706,470" stroke="${WHITE}" stroke-width="40" fill="none"/>
    <path d="M14,850 Q240,800 400,850 T706,830" stroke="${WHITE}" stroke-width="40" fill="none"/>
    <path d="M14,1200 Q200,1240 380,1200 T706,1230" stroke="${WHITE}" stroke-width="36" fill="none"/>
    <path d="M200,14 Q230,400 180,800 T220,1426" stroke="${WHITE}" stroke-width="40" fill="none"/>
    <path d="M500,14 Q470,400 540,800 T490,1426" stroke="${WHITE}" stroke-width="40" fill="none"/>

    <!-- pins -->
    ${pinSvg({ x: 180, y: 220, color: RED,    emoji: '🚓', scale: 1.4 })}
    ${pinSvg({ x: 520, y: 250, color: AMBER,  emoji: '🚧', scale: 1.4 })}
    ${pinSvg({ x: 230, y: 520, color: BLUE,   emoji: '💧', scale: 1.4 })}
    ${pinSvg({ x: 530, y: 480, color: PURPLE, emoji: '🎉', scale: 1.6 })}
    ${pinSvg({ x: 360, y: 870, color: RED,    emoji: '⚠️', scale: 1.4 })}
    ${pinSvg({ x: 200, y: 1220, color: GREEN, emoji: '✓',  scale: 1.3 })}
    ${pinSvg({ x: 520, y: 1180, color: PURPLE, emoji: '🍻', scale: 1.5 })}

    <!-- top status bar -->
    <rect x="14" y="14" width="692" height="60" fill="rgba(255,255,255,0.0)"/>

    <!-- search bar -->
    <g transform="translate(14, 90)">
      <rect x="20" y="0" width="652" height="80" rx="40" fill="${WHITE}"/>
      <circle cx="60" cy="40" r="14" fill="none" stroke="${MUTED}" stroke-width="4"/>
      <line x1="72" y1="52" x2="84" y2="64" stroke="${MUTED}" stroke-width="5" stroke-linecap="round"/>
      <text x="110" y="52" font-family="${FONT}"
            font-weight="600" font-size="30" fill="${MUTED}">Buscar local…</text>
    </g>

    <!-- FAB add -->
    <g transform="translate(580, 1280)">
      <circle r="60" fill="${BRAND}"/>
      <circle r="60" fill="rgba(0,0,0,0)" stroke="${WHITE}" stroke-width="6" stroke-opacity="0.3"/>
      <text y="20" font-family="sans-serif" font-size="80" font-weight="800" text-anchor="middle" fill="${WHITE}">+</text>
    </g>

    <!-- location dot (user) -->
    <g transform="translate(360, 700)">
      <circle r="44" fill="rgba(33,150,243,0.2)"/>
      <circle r="24" fill="rgba(33,150,243,0.4)"/>
      <circle r="14" fill="#2196F3" stroke="${WHITE}" stroke-width="5"/>
    </g>
  `;

  const svg = screenshotShell({
    title: 'Mapa em tempo real',
    subtitle: 'Veja o que está acontecendo perto de você',
    phoneContent: inner,
    accent: BRAND,
  });
  await svgToPng(svg, resolve(SCREENSHOTS, '01-mapa.png'), SW, SH);
}

// ─── Screenshot 02 — Reportar ────────────────────────────────────────────────

async function screenshot02_reportar() {
  // Grid 2x3 — 6 categories. Cards 280×170, gap 30
  // Sheet origin: x=14, y=320. Sheet width 692, height 1106.
  // Inside the sheet we render relative to (0,0).
  const cats = [
    { emoji: '🚓', label: 'Blitz',      color: RED },
    { emoji: '💥', label: 'Acidente',   color: '#FF6F00' },
    { emoji: '💧', label: 'Alagamento', color: BLUE },
    { emoji: '🚧', label: 'Obra',       color: AMBER },
    { emoji: '🚙', label: 'Trânsito',   color: '#FF7043' },
    { emoji: '⚠️', label: 'Perigo',     color: '#D32F2F' },
  ];

  // Sheet 692 wide → 2 cards × 280 + 1 gap × 30 = 590; left padding = (692-590)/2 = 51
  // 3 rows × 170 + 2 gaps × 24 = 558; starts at y=230 → ends at 788
  // CTA at y=836, height 100 → ends at 936 (sheet has 1106 → comfortable)
  let grid = '';
  cats.forEach((c, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 51 + col * (280 + 30);
    const y = 230 + row * (170 + 24);
    grid += `
      <g transform="translate(${x}, ${y})">
        <rect width="280" height="170" rx="24" fill="${c.color}"/>
        <text x="140" y="85" font-size="64" text-anchor="middle">${c.emoji}</text>
        <text x="140" y="138" font-family="${FONT}" font-weight="800"
              font-size="28" fill="${WHITE}" text-anchor="middle">${c.label}</text>
      </g>
    `;
  });

  const inner = `
    <!-- dimmed map behind -->
    <rect x="14" y="14" width="692" height="1412" fill="#E5EEF5"/>
    <!-- faint roads on dimmed map for context -->
    <path d="M14,180 Q200,220 360,180 T706,210" stroke="${WHITE}" stroke-width="20" fill="none" opacity="0.4"/>
    <path d="M14,260 Q220,230 380,260 T706,250" stroke="${WHITE}" stroke-width="20" fill="none" opacity="0.4"/>
    <rect x="14" y="14" width="692" height="1412" fill="rgba(0,0,0,0.55)"/>

    <!-- bottom sheet -->
    <g transform="translate(14, 320)">
      <rect width="692" height="1106" rx="40" fill="${WHITE}"/>
      <!-- handle -->
      <rect x="316" y="24" width="60" height="6" rx="3" fill="#E0E0E0"/>

      <!-- title -->
      <text x="346" y="100" font-family="${FONT}" font-weight="900"
            font-size="42" fill="${INK}" text-anchor="middle">Reportar evento</text>
      <text x="346" y="150" font-family="${FONT}" font-weight="500"
            font-size="28" fill="${MUTED}" text-anchor="middle">O que está acontecendo?</text>

      ${grid}

      <!-- big CTA button -->
      <g transform="translate(56, 836)">
        <rect width="580" height="100" rx="50" fill="${BRAND}"/>
        <text x="290" y="64" font-family="${FONT}" font-weight="800"
              font-size="34" fill="${WHITE}" text-anchor="middle">Reportar agora</text>
      </g>

      <!-- helper text -->
      <text x="346" y="990" font-family="${FONT}" font-weight="500"
            font-size="22" fill="${MUTED}" text-anchor="middle">📍 Niterói, RJ — sua localização</text>
    </g>
  `;

  const svg = screenshotShell({
    title: 'Reporte em 1 toque',
    subtitle: 'Alerte motoristas em segundos',
    phoneContent: inner,
    accent: RED,
  });
  await svgToPng(svg, resolve(SCREENSHOTS, '02-reportar.png'), SW, SH);
}

// ─── Screenshot 03 — Eventos ────────────────────────────────────────────────

async function screenshot03_eventos() {
  const cards = [
    { emoji: '🎵', title: 'Show de Samba', sub: 'Niterói · hoje 21h', color: PURPLE, tier: 'GOLD' },
    { emoji: '🍻', title: 'Bar do Tião',   sub: 'Icaraí · aberto',    color: '#1976D2', tier: null },
    { emoji: '🍕', title: 'Pizza &amp; Drinks',sub: 'Pendotiba · 18h',    color: '#388E3C', tier: 'SILVER' },
    { emoji: '🎪', title: 'Festival Verão',sub: 'São Francisco · sáb',color: '#E91E63', tier: null },
  ];

  let list = '';
  cards.forEach((c, i) => {
    const y = 280 + i * 240;
    const tierBadge = c.tier ? `
      <g transform="translate(560, 24)">
        <rect width="100" height="36" rx="18"
              fill="${c.tier === 'GOLD' ? GOLD : SILVER}"/>
        <text x="50" y="26" font-family="${FONT}" font-weight="900"
              font-size="20" fill="${INK}" text-anchor="middle">${c.tier}</text>
      </g>` : '';
    list += `
      <g transform="translate(40, ${y})">
        <!-- card -->
        <rect width="680" height="200" rx="28" fill="${WHITE}"
              stroke="${BORDER}" stroke-width="2"/>
        <!-- avatar / emoji -->
        <rect x="24" y="24" width="152" height="152" rx="20" fill="${c.color}"/>
        <text x="100" y="130" font-size="84" text-anchor="middle">${c.emoji}</text>
        <!-- text -->
        <text x="200" y="80" font-family="${FONT}" font-weight="800"
              font-size="36" fill="${INK}">${c.title}</text>
        <text x="200" y="124" font-family="${FONT}" font-weight="500"
              font-size="26" fill="${MUTED}">${c.sub}</text>
        <!-- meta row -->
        <g transform="translate(200, 148)">
          <text x="0" y="0" font-size="22">❤️</text>
          <text x="34" y="0" font-family="${FONT}" font-weight="700"
                font-size="22" fill="${MUTED}">${12 + i * 4}</text>
          <text x="90" y="0" font-size="22">💬</text>
          <text x="124" y="0" font-family="${FONT}" font-weight="700"
                font-size="22" fill="${MUTED}">${3 + i}</text>
        </g>
        ${tierBadge}
      </g>
    `;
  });

  const inner = `
    <rect x="14" y="14" width="692" height="1412" fill="${SURFACE}"/>

    <!-- header -->
    <rect x="14" y="14" width="692" height="220" fill="${WHITE}"/>
    <text x="60" y="120" font-family="${FONT}" font-weight="900"
          font-size="56" fill="${INK}">Eventos</text>
    <text x="60" y="170" font-family="${FONT}" font-weight="500"
          font-size="28" fill="${MUTED}">Perto de você</text>

    <!-- filter chips -->
    <g transform="translate(40, 200)">
      <rect x="0"   y="0" width="120" height="44" rx="22" fill="${PURPLE}"/>
      <text x="60"  y="30" font-family="${FONT}" font-weight="700"
            font-size="20" fill="${WHITE}" text-anchor="middle">Todos</text>
      <rect x="140" y="0" width="110" height="44" rx="22" fill="${WHITE}" stroke="${BORDER}" stroke-width="2"/>
      <text x="195" y="30" font-family="${FONT}" font-weight="700"
            font-size="20" fill="${INK}" text-anchor="middle">🎵 Shows</text>
      <rect x="270" y="0" width="100" height="44" rx="22" fill="${WHITE}" stroke="${BORDER}" stroke-width="2"/>
      <text x="320" y="30" font-family="${FONT}" font-weight="700"
            font-size="20" fill="${INK}" text-anchor="middle">🍻 Bares</text>
    </g>

    ${list}

    <!-- bottom tab -->
    <rect x="14" y="1346" width="692" height="80" fill="${WHITE}" stroke="${BORDER}" stroke-width="1"/>
    <text x="180" y="1398" font-size="32" text-anchor="middle">🗺️</text>
    <text x="360" y="1398" font-size="32" text-anchor="middle">🎉</text>
    <text x="540" y="1398" font-size="32" text-anchor="middle">👤</text>
    <circle cx="360" cy="1386" r="34" fill="rgba(106,27,154,0.15)"/>
    <text x="360" y="1398" font-size="32" text-anchor="middle">🎉</text>
  `;

  const svg = screenshotShell({
    title: 'Descubra eventos',
    subtitle: 'Bares, shows e festivais ao seu redor',
    phoneContent: inner,
    accent: PURPLE,
  });
  await svgToPng(svg, resolve(SCREENSHOTS, '03-eventos.png'), SW, SH);
}

// ─── Screenshot 04 — Comunidade ─────────────────────────────────────────────

async function screenshot04_comunidade() {
  const inner = `
    <rect x="14" y="14" width="692" height="1412" fill="${SURFACE}"/>

    <!-- hero card (event detail) -->
    <g transform="translate(40, 60)">
      <rect width="680" height="1320" rx="32" fill="${WHITE}"
            stroke="${BORDER}" stroke-width="2"/>

      <!-- header strip -->
      <rect width="680" height="220" rx="32" fill="${RED}"/>
      <rect y="180" width="680" height="40" fill="${RED}"/>
      <text x="340" y="130" font-size="120" text-anchor="middle">🚓</text>

      <!-- title -->
      <text x="40" y="290" font-family="${FONT}" font-weight="900"
            font-size="40" fill="${INK}">Blitz na Av. Roberto Silveira</text>
      <text x="40" y="332" font-family="${FONT}" font-weight="500"
            font-size="26" fill="${MUTED}">Icaraí, Niterói — há 12 min</text>

      <!-- stats row -->
      <g transform="translate(40, 380)">
        <rect width="186" height="100" rx="20" fill="${SURFACE}"/>
        <text x="93" y="46" font-size="32" text-anchor="middle">✓</text>
        <text x="93" y="82" font-family="${FONT}" font-weight="900"
              font-size="28" fill="${GREEN}" text-anchor="middle">23 confirmações</text>

        <rect x="206" width="186" height="100" rx="20" fill="${SURFACE}"/>
        <text x="299" y="46" font-size="32" text-anchor="middle">✗</text>
        <text x="299" y="82" font-family="${FONT}" font-weight="900"
              font-size="28" fill="${MUTED}" text-anchor="middle">2 negações</text>

        <rect x="412" width="186" height="100" rx="20" fill="${SURFACE}"/>
        <text x="505" y="46" font-size="32" text-anchor="middle">⏱</text>
        <text x="505" y="82" font-family="${FONT}" font-weight="900"
              font-size="28" fill="${INK}" text-anchor="middle">48 min</text>
      </g>

      <!-- action buttons -->
      <g transform="translate(40, 520)">
        <rect width="295" height="90" rx="45" fill="${GREEN}"/>
        <text x="148" y="58" font-family="${FONT}" font-weight="800"
              font-size="32" fill="${WHITE}" text-anchor="middle">✓ Confirmar</text>

        <rect x="305" width="295" height="90" rx="45" fill="${WHITE}"
              stroke="${RED}" stroke-width="3"/>
        <text x="452" y="58" font-family="${FONT}" font-weight="800"
              font-size="32" fill="${RED}" text-anchor="middle">✗ Negar</text>
      </g>

      <!-- comments -->
      <text x="40" y="690" font-family="${FONT}" font-weight="800"
            font-size="32" fill="${INK}">💬 Comentários</text>

      <g transform="translate(40, 720)">
        <rect width="600" height="120" rx="20" fill="${SURFACE}"/>
        <text x="24" y="44" font-family="${FONT}" font-weight="700"
              font-size="24" fill="${BRAND}">Carlos M.</text>
        <text x="24" y="80" font-family="${FONT}" font-weight="500"
              font-size="26" fill="${INK}">Confirmado, dois carros parados</text>
        <text x="24" y="108" font-family="${FONT}" font-weight="500"
              font-size="20" fill="${MUTED}">há 5 min</text>
      </g>
      <g transform="translate(40, 860)">
        <rect width="600" height="120" rx="20" fill="${SURFACE}"/>
        <text x="24" y="44" font-family="${FONT}" font-weight="700"
              font-size="24" fill="${BRAND}">Marina S.</text>
        <text x="24" y="80" font-family="${FONT}" font-weight="500"
              font-size="26" fill="${INK}">Acabei de passar, sem problemas</text>
        <text x="24" y="108" font-family="${FONT}" font-weight="500"
              font-size="20" fill="${MUTED}">há 2 min</text>
      </g>

      <!-- rank / points -->
      <g transform="translate(40, 1020)">
        <rect width="600" height="160" rx="24" fill="${BRAND}" fill-opacity="0.1"/>
        <text x="40" y="60" font-size="56">🏆</text>
        <text x="120" y="60" font-family="${FONT}" font-weight="900"
              font-size="32" fill="${INK}">+10 pontos</text>
        <text x="120" y="100" font-family="${FONT}" font-weight="500"
              font-size="24" fill="${MUTED}">Ranking: Top 5% da semana</text>
        <text x="120" y="135" font-family="${FONT}" font-weight="700"
              font-size="22" fill="${BRAND}">Você é um VIGIA ⭐</text>
      </g>

      <!-- nav button -->
      <g transform="translate(40, 1210)">
        <rect width="600" height="90" rx="45" fill="${BRAND}"/>
        <text x="300" y="58" font-family="${FONT}" font-weight="800"
              font-size="32" fill="${WHITE}" text-anchor="middle">🧭 Como chegar</text>
      </g>
    </g>
  `;

  const svg = screenshotShell({
    title: 'Comunidade ativa',
    subtitle: 'Confirme alertas e ganhe pontos',
    phoneContent: inner,
    accent: GREEN,
  });
  await svgToPng(svg, resolve(SCREENSHOTS, '04-comunidade.png'), SW, SH);
}

// ─── Screenshot 05 — Promover ───────────────────────────────────────────────

async function screenshot05_promover() {
  const inner = `
    <rect x="14" y="14" width="692" height="1412" fill="${SURFACE}"/>

    <!-- header -->
    <g transform="translate(0, 14)">
      <rect width="720" height="280" fill="${PURPLE}"/>
      <text x="360" y="120" font-family="${FONT}" font-weight="900"
            font-size="52" fill="${WHITE}" text-anchor="middle">Promova seu evento</text>
      <text x="360" y="180" font-family="${FONT}" font-weight="500"
            font-size="28" fill="rgba(255,255,255,0.9)" text-anchor="middle">Apareça em destaque no mapa</text>
      <text x="360" y="230" font-family="${FONT}" font-weight="700"
            font-size="22" fill="rgba(255,255,255,0.85)" text-anchor="middle">Escolha um plano abaixo</text>
    </g>

    <!-- bronze -->
    <g transform="translate(40, 340)">
      <rect width="640" height="290" rx="28" fill="${WHITE}" stroke="${BRONZE}" stroke-width="3"/>
      <g transform="translate(40, 40)">
        <circle cx="40" cy="40" r="40" fill="${BRONZE}"/>
        <text x="40" y="55" font-size="42" text-anchor="middle">🥉</text>
        <text x="100" y="36" font-family="${FONT}" font-weight="900"
              font-size="36" fill="${INK}">BRONZE</text>
        <text x="100" y="74" font-family="${FONT}" font-weight="500"
              font-size="24" fill="${MUTED}">Pin com foto · 1 dia</text>
      </g>
      <text x="40" y="200" font-family="${FONT}" font-weight="500"
            font-size="24" fill="${MUTED}">✓ Apareça com foto · ✓ Sem cluster</text>
      <text x="40" y="240" font-family="${FONT}" font-weight="500"
            font-size="24" fill="${MUTED}">✓ Tag colorida no card</text>
      <g transform="translate(450, 180)">
        <rect width="170" height="80" rx="40" fill="${BRONZE}"/>
        <text x="85" y="52" font-family="${FONT}" font-weight="900"
              font-size="28" fill="${WHITE}" text-anchor="middle">1 crédito</text>
      </g>
    </g>

    <!-- silver -->
    <g transform="translate(40, 660)">
      <rect width="640" height="290" rx="28" fill="${WHITE}" stroke="${SILVER}" stroke-width="3"/>
      <g transform="translate(40, 40)">
        <circle cx="40" cy="40" r="40" fill="${SILVER}"/>
        <text x="40" y="55" font-size="42" text-anchor="middle">🥈</text>
        <text x="100" y="36" font-family="${FONT}" font-weight="900"
              font-size="36" fill="${INK}">PRATA</text>
        <text x="100" y="74" font-family="${FONT}" font-weight="500"
              font-size="24" fill="${MUTED}">Pin maior · 3 dias</text>
      </g>
      <text x="40" y="200" font-family="${FONT}" font-weight="500"
            font-size="24" fill="${MUTED}">✓ Tudo do Bronze · ✓ Pin maior</text>
      <text x="40" y="240" font-family="${FONT}" font-weight="500"
            font-size="24" fill="${MUTED}">✓ Galeria com até 3 fotos</text>
      <g transform="translate(450, 180)">
        <rect width="170" height="80" rx="40" fill="${SILVER}"/>
        <text x="85" y="52" font-family="${FONT}" font-weight="900"
              font-size="28" fill="${WHITE}" text-anchor="middle">2 créditos</text>
      </g>
    </g>

    <!-- gold -->
    <g transform="translate(40, 980)">
      <rect width="640" height="290" rx="28" fill="${WHITE}" stroke="${GOLD}" stroke-width="4"/>
      <!-- recommended badge -->
      <g transform="translate(450, -16)">
        <rect width="170" height="36" rx="18" fill="${BRAND}"/>
        <text x="85" y="26" font-family="${FONT}" font-weight="900"
              font-size="20" fill="${WHITE}" text-anchor="middle">⭐ POPULAR</text>
      </g>
      <g transform="translate(40, 40)">
        <circle cx="40" cy="40" r="40" fill="${GOLD}"/>
        <text x="40" y="55" font-size="42" text-anchor="middle">🥇</text>
        <text x="100" y="36" font-family="${FONT}" font-weight="900"
              font-size="36" fill="${INK}">OURO</text>
        <text x="100" y="74" font-family="${FONT}" font-weight="500"
              font-size="24" fill="${MUTED}">Pin animado · 7 dias</text>
      </g>
      <text x="40" y="200" font-family="${FONT}" font-weight="500"
            font-size="24" fill="${MUTED}">✓ Tudo da Prata · ✓ Animação</text>
      <text x="40" y="240" font-family="${FONT}" font-weight="500"
            font-size="24" fill="${MUTED}">✓ Topo de busca · ✓ Brilho</text>
      <g transform="translate(450, 180)">
        <rect width="170" height="80" rx="40" fill="${GOLD}"/>
        <text x="85" y="52" font-family="${FONT}" font-weight="900"
              font-size="28" fill="${INK}" text-anchor="middle">3 créditos</text>
      </g>
    </g>

    <!-- footer note -->
    <text x="360" y="1340" font-family="${FONT}" font-weight="700"
          font-size="26" fill="${MUTED}" text-anchor="middle">A partir de R$ 4,99</text>
    <text x="360" y="1380" font-family="${FONT}" font-weight="500"
          font-size="22" fill="${MUTED}" text-anchor="middle">Ou ganhe créditos grátis vendo anúncios 🎁</text>
  `;

  const svg = screenshotShell({
    title: 'Promova seu negócio',
    subtitle: 'Bronze · Prata · Ouro — a partir de R$ 4,99',
    phoneContent: inner,
    accent: PURPLE,
  });
  await svgToPng(svg, resolve(SCREENSHOTS, '05-promover.png'), SW, SH);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Gerando assets do Play Console em', OUT);
  await generateFeatureGraphic();
  await screenshot01_mapa();
  await screenshot02_reportar();
  await screenshot03_eventos();
  await screenshot04_comunidade();
  await screenshot05_promover();
  console.log('\n✅ Tudo pronto! Arquivos em play-store-assets/');
}

main().catch((err) => {
  console.error('ERRO:', err);
  process.exit(1);
});
