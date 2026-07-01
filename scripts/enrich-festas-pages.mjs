/**
 * Injeta o widget "dados reais do Firestore" nas 45 páginas estáticas de
 * public/festas-e-eventos/<slug>/index.html — essas páginas já tinham cópia
 * única por bairro, mas estavam com <meta name="robots" content="noindex, ...">
 * porque nunca ganharam o bloco de eventos reais (diferente de acidentes/
 * alagamentos/radares/lei-seca, que já buscam do Firestore).
 *
 * Não usa o gerador de template (generate-category-pages.mjs) de propósito —
 * essas páginas têm conteúdo manual rico (menções a bairros) que seria
 * perdido se fossem regeradas por aquele sistema genérico.
 *
 * Uso: node scripts/enrich-festas-pages.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public', 'festas-e-eventos');

// Mesmo mapa slug -> {label, stateUF, cityName?} usado em generate-category-pages.mjs
const PAGES = {
  acre: { label: 'Acre', stateUF: 'AC' },
  alagoas: { label: 'Alagoas', stateUF: 'AL' },
  amapa: { label: 'Amapá', stateUF: 'AP' },
  amazonas: { label: 'Amazonas', stateUF: 'AM' },
  bahia: { label: 'Bahia', stateUF: 'BA' },
  ceara: { label: 'Ceará', stateUF: 'CE' },
  'distrito-federal': { label: 'Distrito Federal', stateUF: 'DF' },
  'espirito-santo': { label: 'Espírito Santo', stateUF: 'ES' },
  goias: { label: 'Goiás', stateUF: 'GO' },
  maranhao: { label: 'Maranhão', stateUF: 'MA' },
  'mato-grosso-do-sul': { label: 'Mato Grosso do Sul', stateUF: 'MS' },
  'mato-grosso': { label: 'Mato Grosso', stateUF: 'MT' },
  'minas-gerais': { label: 'Minas Gerais', stateUF: 'MG' },
  para: { label: 'Pará', stateUF: 'PA' },
  paraiba: { label: 'Paraíba', stateUF: 'PB' },
  parana: { label: 'Paraná', stateUF: 'PR' },
  pernambuco: { label: 'Pernambuco', stateUF: 'PE' },
  piaui: { label: 'Piauí', stateUF: 'PI' },
  'rio-de-janeiro': { label: 'Rio de Janeiro', stateUF: 'RJ' },
  'rio-grande-do-norte': { label: 'Rio Grande do Norte', stateUF: 'RN' },
  'rio-grande-do-sul': { label: 'Rio Grande do Sul', stateUF: 'RS' },
  rondonia: { label: 'Rondônia', stateUF: 'RO' },
  roraima: { label: 'Roraima', stateUF: 'RR' },
  'santa-catarina': { label: 'Santa Catarina', stateUF: 'SC' },
  'sao-paulo': { label: 'São Paulo', stateUF: 'SP' },
  sergipe: { label: 'Sergipe', stateUF: 'SE' },
  tocantins: { label: 'Tocantins', stateUF: 'TO' },
  blumenau: { label: 'Blumenau', stateUF: 'SC', cityName: 'Blumenau' },
  buzios: { label: 'Búzios', stateUF: 'RJ', cityName: 'Búzios' },
  'cabo-frio': { label: 'Cabo Frio', stateUF: 'RJ', cityName: 'Cabo Frio' },
  campinas: { label: 'Campinas', stateUF: 'SP', cityName: 'Campinas' },
  'caxias-do-sul': { label: 'Caxias do Sul', stateUF: 'RS', cityName: 'Caxias do Sul' },
  'feira-de-santana': { label: 'Feira de Santana', stateUF: 'BA', cityName: 'Feira de Santana' },
  'foz-do-iguacu': { label: 'Foz do Iguaçu', stateUF: 'PR', cityName: 'Foz do Iguaçu' },
  gramado: { label: 'Gramado', stateUF: 'RS', cityName: 'Gramado' },
  joinville: { label: 'Joinville', stateUF: 'SC', cityName: 'Joinville' },
  londrina: { label: 'Londrina', stateUF: 'PR', cityName: 'Londrina' },
  maringa: { label: 'Maringá', stateUF: 'PR', cityName: 'Maringá' },
  niteroi: { label: 'Niterói', stateUF: 'RJ', cityName: 'Niterói' },
  'porto-seguro': { label: 'Porto Seguro', stateUF: 'BA', cityName: 'Porto Seguro' },
  'ribeirao-preto': { label: 'Ribeirão Preto', stateUF: 'SP', cityName: 'Ribeirão Preto' },
  santos: { label: 'Santos', stateUF: 'SP', cityName: 'Santos' },
  'sao-jose-dos-campos': { label: 'São José dos Campos', stateUF: 'SP', cityName: 'São José dos Campos' },
  sorocaba: { label: 'Sorocaba', stateUF: 'SP', cityName: 'Sorocaba' },
  uberlandia: { label: 'Uberlândia', stateUF: 'MG', cityName: 'Uberlândia' },
};

const RECENT_CSS = `
    /* RECENT — eventos reais do Firestore (injetado por enrich-festas-pages.mjs) */
    .recent-section { max-width: 860px; margin: 0 auto 56px; padding: 0 24px; }
    .recent-section h2 { font-size: 22px; font-weight: 700; margin-bottom: 16px; text-align: center; }
    .recent-list { display: flex; flex-direction: column; gap: 10px; }
    .recent-item { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; gap: 14px; }
    .recent-emoji { font-size: 22px; flex-shrink: 0; }
    .recent-text { flex: 1; min-width: 0; }
    .recent-desc { font-size: 14px; font-weight: 600; color: var(--text); }
    .recent-city { font-size: 12px; color: var(--muted); margin-top: 2px; }
    .recent-time { font-size: 12px; font-weight: 700; color: var(--brand); flex-shrink: 0; white-space: nowrap; }
    .recent-empty { text-align: center; color: var(--muted); font-size: 14px; padding: 24px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; }
`;

function buildRecentSection(label) {
  return `
<!-- EVENTOS RECENTES — injetado por enrich-festas-pages.mjs -->
<section class="recent-section">
  <h2>Últimos Eventos Reportados em ${label}</h2>
  <div class="recent-list" id="recentList">
    <div class="recent-empty">Carregando eventos recentes...</div>
  </div>
</section>
`;
}

function buildRecentScript({ label, stateUF, cityName }) {
  const filterExpr = cityName
    ? `d.data().stateUF === '${stateUF}' && d.data().cityName === '${cityName}'`
    : `d.data().stateUF === '${stateUF}'`;

  return `
<!-- DADOS RECENTES — busca eventos reais do Firestore (entertainment_events) -->
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
  import { getFirestore, collection, query, where, orderBy, limit, getDocs, Timestamp }
    from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

  const app = initializeApp({
    apiKey:            'AIzaSyCoI9rNBK07vGZBuygprq4PkDKGT0iZkYU',
    authDomain:        'lei-seca---eventos.firebaseapp.com',
    projectId:         'lei-seca---eventos',
    storageBucket:     'lei-seca---eventos.firebasestorage.app',
    messagingSenderId: '657066902706',
    appId:             '1:657066902706:web:3e3d49f23a819c5ce1b5ab',
  });
  const db = getFirestore(app);

  function timeAgo(ms) {
    const d = Date.now() - ms, m = Math.floor(d / 60000);
    if (m < 1) return 'agora';
    if (m < 60) return \`há \${m} min\`;
    const h = Math.floor(m / 60);
    return \`há \${h}h\${m % 60 ? (m % 60) + 'min' : ''}\`;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  async function loadRecent() {
    const el = document.getElementById('recentList');
    try {
      const q = query(
        collection(db, 'entertainment_events'),
        where('expiresAt', '>', Timestamp.now()),
        orderBy('expiresAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      const docs = snap.docs
        .filter(d => ${filterExpr})
        .slice(0, 8);
      if (docs.length === 0) {
        el.innerHTML = '<div class="recent-empty">Nenhum evento ativo reportado em ${label} no momento. Abra o mapa ao vivo ou o app para acompanhar novos reportes.</div>';
        return;
      }
      el.innerHTML = docs.map(d => {
        const data = d.data();
        const created = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
        const desc = (data.title || data.description || 'Evento').toString();
        const city = data.cityName || '${label}';
        return \`<div class="recent-item">
          <div class="recent-emoji">🎉</div>
          <div class="recent-text">
            <div class="recent-desc">\${escapeHtml(desc)}</div>
            <div class="recent-city">\${escapeHtml(city)} — ${stateUF}</div>
          </div>
          <div class="recent-time">\${timeAgo(created)}</div>
        </div>\`;
      }).join('');
    } catch (err) {
      el.innerHTML = '<div class="recent-empty">Não foi possível carregar os eventos agora. Veja o mapa ao vivo acima.</div>';
    }
  }

  loadRecent();
</script>
`;
}

let patched = 0;
let skipped = 0;

for (const [slug, cfg] of Object.entries(PAGES)) {
  const filePath = join(PUBLIC_DIR, slug, 'index.html');
  if (!existsSync(filePath)) {
    console.log(`✗ não encontrado: ${slug}`);
    skipped++;
    continue;
  }

  let html = readFileSync(filePath, 'utf8');

  if (html.includes('id="recentList"')) {
    console.log(`- já enriquecido, pulando: ${slug}`);
    skipped++;
    continue;
  }

  // 1) CSS — antes de </style>
  html = html.replace('</style>', `${RECENT_CSS}  </style>`);

  // 2) HTML — depois do fechamento do map-section, antes do how-section
  // ($1 = "</section>\n" do map-section — precisa vir ANTES do conteúdo novo,
  // senão a nova seção fica aninhada dentro do map-section)
  html = html.replace(
    /(<\/section>\s*\n)(\s*<!-- COMO FUNCIONA -->)/,
    `$1${buildRecentSection(cfg.label)}\n$2`
  );

  // 3) Script Firestore — antes de </body>
  html = html.replace('</body>', `${buildRecentScript(cfg)}\n</body>`);

  // 4) noindex -> index (a página agora tem dado real, pode ser indexada)
  html = html.replace(
    '<meta name="robots" content="noindex, follow" />',
    '<meta name="robots" content="index, follow" />'
  );

  writeFileSync(filePath, html, 'utf8');
  patched++;
  console.log(`✓ ${slug}`);
}

console.log(`\nConcluído: ${patched} páginas enriquecidas, ${skipped} puladas.`);
