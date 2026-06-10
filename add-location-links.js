/**
 * add-location-links.js
 *
 * Adiciona, nas páginas hub /lei-seca e /festas-e-eventos, um diretório de
 * links para as 45 páginas locais geradas (27 estados + 18 cidades),
 * resolvendo o problema de "páginas órfãs" (sem links internos) para SEO.
 *
 * Também corrige os 12 links da seção "CIDADES" de festas-e-eventos.html,
 * que apontavam para /eventos, para apontar para a página local correta.
 */
const fs = require('fs');
const path = require('path');
const { STATES, CITIES } = require('./seo-locations-data');

const PUBLIC_DIR = path.join(__dirname, 'public');

function replaceOnce(content, search, replacement, label) {
  const idx = content.indexOf(search);
  if (idx === -1) throw new Error(`Trecho não encontrado (${label})`);
  if (content.indexOf(search, idx + 1) !== -1) throw new Error(`Trecho encontrado mais de uma vez (${label})`);
  return content.slice(0, idx) + replacement + content.slice(idx + search.length);
}

const sortedStates = [...STATES].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
const sortedCities = [...CITIES].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

function buildGrid(items, basePath, emoji) {
  return items.map((it) => `    <div class="city-card">${emoji} <a href="${basePath}/${it.slug}">${it.name}</a></div>`).join('\n');
}

// ─────────────────────────────────────────────────────────────────────────
// LEI SECA
// ─────────────────────────────────────────────────────────────────────────
let ls = fs.readFileSync(path.join(PUBLIC_DIR, 'lei-seca.html'), 'utf8');

const CITIES_CSS_FULL = `    /* CITY LIST */
    .cities-section { max-width: 860px; margin: 0 auto 56px; padding: 0 24px; }
    .cities-section h2 { font-size: 26px; font-weight: 800; margin-bottom: 16px; }
    .cities-section h3 { font-size: 18px; font-weight: 700; margin: 24px 0 12px; }
    .cities-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;
    }
    .city-card {
      background: var(--card); border: 1px solid var(--border); border-radius: 12px;
      padding: 14px 16px; font-size: 14px; font-weight: 600;
      display: flex; align-items: center; gap: 8px;
    }
    .city-card a { color: var(--text); text-decoration: none; }
    .city-card a:hover { color: var(--brand); }

    /* FAQ */
    .faq-section {`;

ls = replaceOnce(
  ls,
  `    /* FAQ */
    .faq-section {`,
  CITIES_CSS_FULL,
  'lei-seca css anchor'
);

const lsSection = `
<!-- ESTADOS E CIDADES (SEO) -->
<section class="cities-section">
  <h2>Lei Seca por Estado e Cidade</h2>
  <h3>Por Estado</h3>
  <div class="cities-grid">
${buildGrid(sortedStates, '/lei-seca', '🍺')}
  </div>
  <h3>Principais Cidades</h3>
  <div class="cities-grid">
${buildGrid(sortedCities, '/lei-seca', '🍺')}
  </div>
</section>

<!-- AD 3: Banner rodapé`;

ls = replaceOnce(ls, '\n<!-- AD 3: Banner rodapé', lsSection, 'lei-seca insertion point');

fs.writeFileSync(path.join(PUBLIC_DIR, 'lei-seca.html'), ls, 'utf8');
console.log('lei-seca.html: CSS + seção de 45 links adicionados.');

// ─────────────────────────────────────────────────────────────────────────
// FESTAS E EVENTOS
// ─────────────────────────────────────────────────────────────────────────
let fe = fs.readFileSync(path.join(PUBLIC_DIR, 'festas-e-eventos.html'), 'utf8');

// Adiciona regra h3 que faltava na seção .cities-section existente
fe = replaceOnce(
  fe,
  '    .cities-section h2 { font-size: 26px; font-weight: 800; margin-bottom: 16px; }',
  '    .cities-section h2 { font-size: 26px; font-weight: 800; margin-bottom: 16px; }\n    .cities-section h3 { font-size: 18px; font-weight: 700; margin: 24px 0 12px; }',
  'festas css h3'
);

// Corrige os 12 links da seção "CIDADES" para apontar para a página local correta
const CITY_TO_STATE_SLUG = {
  'São Paulo': 'sao-paulo',
  'Rio de Janeiro': 'rio-de-janeiro',
  'Belo Horizonte': 'minas-gerais',
  'Brasília': 'distrito-federal',
  'Curitiba': 'parana',
  'Porto Alegre': 'rio-grande-do-sul',
  'Salvador': 'bahia',
  'Recife': 'pernambuco',
  'Fortaleza': 'ceara',
  'Manaus': 'amazonas',
  'Belém': 'para',
  'Goiânia': 'goias',
};
for (const [city, slug] of Object.entries(CITY_TO_STATE_SLUG)) {
  fe = replaceOnce(
    fe,
    `<div class="city-card">📍 <a href="/eventos">${city}</a></div>`,
    `<div class="city-card">📍 <a href="/festas-e-eventos/${slug}">${city}</a></div>`,
    `festas city link ${city}`
  );
}

const feSection = `
<!-- ESTADOS E CIDADES (SEO) -->
<section class="cities-section">
  <h2>Festas e Eventos por Estado e Cidade</h2>
  <h3>Por Estado</h3>
  <div class="cities-grid">
${buildGrid(sortedStates, '/festas-e-eventos', '🎉')}
  </div>
  <h3>Principais Cidades</h3>
  <div class="cities-grid">
${buildGrid(sortedCities, '/festas-e-eventos', '🎉')}
  </div>
</section>

<!-- AD 3: Banner rodapé`;

fe = replaceOnce(fe, '\n<!-- AD 3: Banner rodapé', feSection, 'festas insertion point');

fs.writeFileSync(path.join(PUBLIC_DIR, 'festas-e-eventos.html'), fe, 'utf8');
console.log('festas-e-eventos.html: 12 links corrigidos + seção de 45 links adicionada.');
