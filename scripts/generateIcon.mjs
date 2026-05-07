/**
 * Gerador de ícone Alertoo
 * Gera icon.png, adaptive-icon.png e splash-icon.png em ./assets/
 *
 * Uso: node scripts/generateIcon.mjs
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, '..', 'assets');

// ─── Paleta Alertoo ───────────────────────────────────────────────────────────
const PRIMARY   = '#FF5722';  // Deep Orange
const DARK      = '#1E293B';  // Dark Slate
const WHITE     = '#FFFFFF';

// Converte hex para RGB
function hex(h) {
  const r = parseInt(h.slice(1,3),16);
  const g = parseInt(h.slice(3,5),16);
  const b = parseInt(h.slice(5,7),16);
  return { r, g, b };
}

const orange = hex(PRIMARY);
const dark   = hex(DARK);

// ─── SVG do ícone (1024x1024) ─────────────────────────────────────────────────
function buildIconSVG(size = 1024, withBg = true) {
  const c  = size / 2;
  const r  = size * 0.42; // raio do círculo central
  const bell = size * 0.38; // tamanho do sino

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#FF7043"/>
      <stop offset="100%" stop-color="#E64A19"/>
    </linearGradient>
    <linearGradient id="bellGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="100%" stop-color="#FFE0D6" stop-opacity="1"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="${size*0.02}" stdDeviation="${size*0.025}" flood-color="rgba(0,0,0,0.25)"/>
    </filter>
  </defs>

  ${withBg ? `<rect width="${size}" height="${size}" fill="url(#bgGrad)" rx="${size*0.22}"/>` : ''}

  <!-- Sino -->
  <g filter="url(#shadow)">
    <!-- Corpo do sino -->
    <path d="
      M ${c} ${c - bell*0.52}
      C ${c - bell*0.08} ${c - bell*0.52}
        ${c - bell*0.42} ${c - bell*0.3}
        ${c - bell*0.42} ${c - bell*0.05}
      L ${c - bell*0.42} ${c + bell*0.22}
      L ${c - bell*0.5}  ${c + bell*0.32}
      L ${c + bell*0.5}  ${c + bell*0.32}
      L ${c + bell*0.42} ${c + bell*0.22}
      L ${c + bell*0.42} ${c - bell*0.05}
      C ${c + bell*0.42} ${c - bell*0.3}
        ${c + bell*0.08} ${c - bell*0.52}
        ${c} ${c - bell*0.52}
      Z
    " fill="url(#bellGrad)"/>
    <!-- Base do sino (clapper) -->
    <ellipse cx="${c}" cy="${c + bell*0.32}" rx="${bell*0.5}" ry="${bell*0.08}" fill="url(#bellGrad)"/>
    <!-- Badalo (bolinha) -->
    <circle cx="${c}" cy="${c + bell*0.48}" r="${bell*0.11}" fill="url(#bellGrad)"/>
    <!-- Topo do sino -->
    <rect x="${c - bell*0.07}" y="${c - bell*0.65}" width="${bell*0.14}" height="${bell*0.15}" rx="${bell*0.04}" fill="url(#bellGrad)"/>
    <!-- Alça do topo -->
    <path d="M ${c - bell*0.12} ${c - bell*0.64} Q ${c} ${c - bell*0.82} ${c + bell*0.12} ${c - bell*0.64}"
      stroke="white" stroke-width="${bell*0.07}" fill="none" stroke-linecap="round"/>
    <!-- Ondas de alerta (esquerda e direita) -->
    <path d="M ${c - bell*0.72} ${c - bell*0.35}
             Q ${c - bell*0.85} ${c - bell*0.1}
               ${c - bell*0.72} ${c + bell*0.15}"
      stroke="white" stroke-width="${bell*0.07}" fill="none" stroke-linecap="round" stroke-opacity="0.7"/>
    <path d="M ${c - bell*0.9} ${c - bell*0.5}
             Q ${c - bell*1.08} ${c - bell*0.1}
               ${c - bell*0.9} ${c + bell*0.3}"
      stroke="white" stroke-width="${bell*0.06}" fill="none" stroke-linecap="round" stroke-opacity="0.45"/>
    <path d="M ${c + bell*0.72} ${c - bell*0.35}
             Q ${c + bell*0.85} ${c - bell*0.1}
               ${c + bell*0.72} ${c + bell*0.15}"
      stroke="white" stroke-width="${bell*0.07}" fill="none" stroke-linecap="round" stroke-opacity="0.7"/>
    <path d="M ${c + bell*0.9} ${c - bell*0.5}
             Q ${c + bell*1.08} ${c - bell*0.1}
               ${c + bell*0.9} ${c + bell*0.3}"
      stroke="white" stroke-width="${bell*0.06}" fill="none" stroke-linecap="round" stroke-opacity="0.45"/>
  </g>

  <!-- Nome Alertoo -->
  <text
    x="${c}"
    y="${size * 0.88}"
    text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif"
    font-weight="900"
    font-size="${size * 0.115}"
    letter-spacing="${size * -0.003}"
    fill="white"
    filter="url(#shadow)"
  >Alertoo</text>
</svg>`;
}

// ─── SVG do splash (1024x1024, sem borda arredondada) ─────────────────────────
function buildSplashSVG(size = 1024) {
  const c    = size / 2;
  const bell = size * 0.30;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#FF7043"/>
      <stop offset="100%" stop-color="#E64A19"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="${size*0.015}" stdDeviation="${size*0.02}" flood-color="rgba(0,0,0,0.2)"/>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bgGrad)"/>

  <!-- Sino centralizado -->
  <g filter="url(#shadow)" transform="translate(0, -${size*0.06})">
    <path d="
      M ${c} ${c - bell*0.52}
      C ${c - bell*0.08} ${c - bell*0.52}
        ${c - bell*0.42} ${c - bell*0.3}
        ${c - bell*0.42} ${c - bell*0.05}
      L ${c - bell*0.42} ${c + bell*0.22}
      L ${c - bell*0.5}  ${c + bell*0.32}
      L ${c + bell*0.5}  ${c + bell*0.32}
      L ${c + bell*0.42} ${c + bell*0.22}
      L ${c + bell*0.42} ${c - bell*0.05}
      C ${c + bell*0.42} ${c - bell*0.3}
        ${c + bell*0.08} ${c - bell*0.52}
        ${c} ${c - bell*0.52}
      Z
    " fill="white"/>
    <ellipse cx="${c}" cy="${c + bell*0.32}" rx="${bell*0.5}" ry="${bell*0.08}" fill="white"/>
    <circle cx="${c}" cy="${c + bell*0.48}" r="${bell*0.11}" fill="white"/>
    <rect x="${c - bell*0.07}" y="${c - bell*0.65}" width="${bell*0.14}" height="${bell*0.15}" rx="${bell*0.04}" fill="white"/>
    <path d="M ${c - bell*0.12} ${c - bell*0.64} Q ${c} ${c - bell*0.82} ${c + bell*0.12} ${c - bell*0.64}"
      stroke="white" stroke-width="${bell*0.07}" fill="none" stroke-linecap="round"/>
  </g>

  <!-- Nome Alertoo -->
  <text
    x="${c}" y="${size * 0.82}"
    text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif"
    font-weight="900"
    font-size="${size * 0.13}"
    letter-spacing="${size * -0.004}"
    fill="white"
    filter="url(#shadow)"
  >Alertoo</text>
  <text
    x="${c}" y="${size * 0.91}"
    text-anchor="middle"
    font-family="Arial, sans-serif"
    font-weight="400"
    font-size="${size * 0.055}"
    fill="rgba(255,255,255,0.75)"
  >alertas em tempo real</text>
</svg>`;
}

async function generate() {
  console.log('\n🔔 Gerando ícones do Alertoo...\n');

  // icon.png — 1024x1024 com bordas arredondadas (Play Store)
  await sharp(Buffer.from(buildIconSVG(1024, true)))
    .png()
    .toFile(path.join(ASSETS, 'icon.png'));
  console.log('✅ icon.png (1024×1024)');

  // adaptive-icon.png — foreground sem fundo (Android adaptive)
  await sharp(Buffer.from(buildIconSVG(1024, false)))
    .png()
    .toFile(path.join(ASSETS, 'adaptive-icon.png'));
  console.log('✅ adaptive-icon.png (1024×1024)');

  // splash-icon.png — 1024x1024 sem bordas
  await sharp(Buffer.from(buildSplashSVG(1024)))
    .png()
    .toFile(path.join(ASSETS, 'splash-icon.png'));
  console.log('✅ splash-icon.png (1024×1024)');

  // favicon.png — 196x196
  await sharp(Buffer.from(buildIconSVG(196, true)))
    .png()
    .toFile(path.join(ASSETS, 'favicon.png'));
  console.log('✅ favicon.png (196×196)');

  console.log('\n🎨 Identidade visual Alertoo aplicada com sucesso!\n');
}

generate().catch(err => {
  console.error('❌ Erro ao gerar ícones:', err);
  process.exit(1);
});
