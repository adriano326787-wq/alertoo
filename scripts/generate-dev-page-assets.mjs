/**
 * generate-dev-page-assets.mjs
 * Gera as imagens da Página do Desenvolvedor do Google Play:
 *  - developer-icon-512x512.png  (já existe como icon-512x512.png)
 *  - developer-header-4096x2304.png  (banner de cabeçalho)
 */

import sharp from 'sharp';
import { readFile, copyFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../play-store-assets');
const ASSETS = resolve(__dirname, '../assets');

// ─── Paleta Alertoo ────────────────────────────────────────────────────────────
const BRAND    = '#FF5722';
const DARK     = '#0F172A';
const DARK2    = '#1E293B';

// ─── SVG → PNG helper ──────────────────────────────────────────────────────────
async function svgToPng(svg, outPath, w, h) {
  await sharp(Buffer.from(svg))
    .resize(w, h)
    .png()
    .toFile(outPath);
  console.log(`✅  ${outPath.split('/').pop()}  (${w}×${h})`);
}

// ─── 1. Developer icon — copia o icon-512x512 já existente ─────────────────────
async function makeDeveloperIcon() {
  const src = `${OUT}/icon-512x512.png`;
  const dst = `${OUT}/developer-icon-512x512.png`;
  await copyFile(src, dst);
  console.log('✅  developer-icon-512x512.png  (512×512) — copiado do icon existente');
}

// ─── 2. Developer header 4096×2304 ─────────────────────────────────────────────
async function makeDeveloperHeader() {
  const W = 4096, H = 2304;

  // Lê ícone do app como base64 para embutir no SVG
  const iconBytes = await readFile(`${OUT}/icon-512x512.png`);
  const iconB64   = `data:image/png;base64,${iconBytes.toString('base64')}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="${DARK}"/>
      <stop offset="60%"  stop-color="${DARK2}"/>
      <stop offset="100%" stop-color="#1a0a05"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"  stop-color="${BRAND}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${BRAND}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="halo" cx="38%" cy="50%" r="40%">
      <stop offset="0%"  stop-color="${BRAND}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="${BRAND}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="iconClip">
      <rect x="0" y="0" width="460" height="460" rx="90" ry="90"/>
    </clipPath>
  </defs>

  <!-- Fundo degradê escuro -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Halo laranja ao redor do ícone -->
  <ellipse cx="1040" cy="${H/2}" rx="780" ry="780" fill="url(#halo)"/>

  <!-- Grid de pontos decorativo (fundo) -->
  ${Array.from({length: 24}, (_, row) =>
    Array.from({length: 42}, (_, col) =>
      `<circle cx="${col*100+50}" cy="${row*100+52}" r="2.5"
        fill="white" opacity="${0.03 + (row % 3 === 0 ? 0.03 : 0)}"/>`
    ).join('')
  ).join('')}

  <!-- Linhas decorativas suaves -->
  <line x1="0" y1="600" x2="${W}" y2="600" stroke="white" stroke-width="1" opacity="0.04"/>
  <line x1="0" y1="1704" x2="${W}" y2="1704" stroke="white" stroke-width="1" opacity="0.04"/>
  <line x1="1700" y1="0" x2="1700" y2="${H}" stroke="white" stroke-width="1" opacity="0.04"/>

  <!-- Ícone do app (esquerda) -->
  <g transform="translate(580, ${H/2 - 230})">
    <rect x="-20" y="-20" width="500" height="500" rx="110" ry="110"
      fill="${BRAND}" opacity="0.12"/>
    <image href="${iconB64}" x="0" y="0" width="460" height="460"
      clip-path="url(#iconClip)" preserveAspectRatio="xMidYMid meet"/>
    <!-- Borda sutil -->
    <rect x="0" y="0" width="460" height="460" rx="90" ry="90"
      fill="none" stroke="white" stroke-width="6" opacity="0.12"/>
  </g>

  <!-- Textos (centro-direita) -->
  <!-- Nome do app -->
  <text x="1250" y="${H/2 - 200}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="230" font-weight="900"
    fill="white" opacity="1" letter-spacing="-6">Alertoo</text>

  <!-- Linha laranja decorativa abaixo do nome -->
  <rect x="1252" y="${H/2 - 130}" width="580" height="18" rx="9"
    fill="${BRAND}" opacity="0.9"/>

  <!-- Subtítulo -->
  <text x="1252" y="${H/2 + 30}"
    font-family="Arial, sans-serif"
    font-size="96" font-weight="400"
    fill="white" opacity="0.70">Alertas e eventos em tempo real</text>

  <!-- Tags de features -->
  <!-- Tag 1 -->
  <rect x="1252" y="${H/2 + 120}" width="380" height="90" rx="45"
    fill="${BRAND}" opacity="0.18"/>
  <text x="1442" y="${H/2 + 177}"
    font-family="Arial, sans-serif"
    font-size="58" font-weight="700"
    fill="${BRAND}" text-anchor="middle">🚦 Trânsito</text>

  <!-- Tag 2 -->
  <rect x="1660" y="${H/2 + 120}" width="340" height="90" rx="45"
    fill="${BRAND}" opacity="0.18"/>
  <text x="1830" y="${H/2 + 177}"
    font-family="Arial, sans-serif"
    font-size="58" font-weight="700"
    fill="${BRAND}" text-anchor="middle">🎉 Eventos</text>

  <!-- Tag 3 -->
  <rect x="2030" y="${H/2 + 120}" width="320" height="90" rx="45"
    fill="${BRAND}" opacity="0.18"/>
  <text x="2190" y="${H/2 + 177}"
    font-family="Arial, sans-serif"
    font-size="58" font-weight="700"
    fill="${BRAND}" text-anchor="middle">🧭 GPS</text>

  <!-- Descrição curta -->
  <text x="1252" y="${H/2 + 330}"
    font-family="Arial, sans-serif"
    font-size="72" font-weight="400"
    fill="white" opacity="0.45">Feito no Brasil · Gratuito · Android</text>

  <!-- Acento laranja canto inferior direito -->
  <circle cx="${W - 200}" cy="${H - 200}" r="420"
    fill="${BRAND}" opacity="0.06"/>
  <circle cx="${W - 200}" cy="${H - 200}" r="240"
    fill="${BRAND}" opacity="0.06"/>

  <!-- Linha inferior decorativa -->
  <rect x="0" y="${H - 16}" width="${W}" height="16" fill="${BRAND}" opacity="0.6"/>
</svg>`;

  const outPath = `${OUT}/developer-header-4096x2304.png`;
  await svgToPng(svg, outPath, W, H);
}

// ─── Main ──────────────────────────────────────────────────────────────────────
console.log('🎨  Gerando assets da Página do Desenvolvedor...\n');
await makeDeveloperIcon();
await makeDeveloperHeader();
console.log('\n✨  Concluído! Arquivos em play-store-assets/');
