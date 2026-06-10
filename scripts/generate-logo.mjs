/**
 * Gera alertoo-logo.jpg a partir de SVG usando sharp (já instalado no projeto).
 * Uso: node scripts/generate-logo.mjs
 */

import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── SVG da logo ─────────────────────────────────────────────────────────────
const W = 800;
const H = 320;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- Fundo branco -->
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>

  <!-- Badge laranja arredondado -->
  <rect x="40" y="40" width="240" height="240" rx="54" ry="54" fill="#FF5722"/>

  <!-- Sino (bell) — desenhado com paths -->
  <!-- Corpo do sino -->
  <path d="M160 85
           C130 85 108 110 108 142
           L108 175
           L92 192
           L92 202
           L228 202
           L228 192
           L212 175
           L212 142
           C212 110 190 85 160 85 Z"
        fill="white"/>
  <!-- Batoque (círculo pequeno embaixo) -->
  <circle cx="160" cy="214" r="14" fill="white"/>
  <!-- Topo do cabo -->
  <rect x="151" y="70" width="18" height="20" rx="9" fill="white"/>

  <!-- Ponto de notificação (bolinha verde no canto superior) -->
  <circle cx="221" cy="79" r="20" fill="#4CAF50"/>
  <text x="221" y="86" text-anchor="middle" font-family="Arial" font-size="22"
        font-weight="900" fill="white">!</text>

  <!-- Texto "alertoo" -->
  <text x="316" y="190"
        font-family="Arial Black, Arial, sans-serif"
        font-size="110"
        font-weight="900"
        fill="#1A1A1A"
        letter-spacing="-4">alertoo</text>

  <!-- Ponto laranja no segundo "o" — efeito de destaque -->
  <!-- (opcional — pequeno detalhe de identidade) -->
  <circle cx="735" cy="145" r="12" fill="#FF5722"/>
</svg>
`.trim();

// ─── Conversão SVG → JPG via sharp ───────────────────────────────────────────
const outputPath = join(__dirname, '..', 'alertoo-logo.jpg');

try {
  await sharp(Buffer.from(svg))
    .flatten({ background: { r: 255, g: 255, b: 255 } }) // fundo branco garantido
    .jpeg({ quality: 97 })
    .toFile(outputPath);

  console.log(`✅ Logo gerada com sucesso: ${outputPath}`);
  console.log(`   Dimensões: ${W}×${H}px`);
} catch (err) {
  console.error('❌ Erro ao gerar logo:', err.message);
  process.exit(1);
}
