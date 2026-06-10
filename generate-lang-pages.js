/**
 * generate-lang-pages.js
 *
 * Fase 2 i18n — gera public/en/index.html, public/es/index.html,
 * public/fr/index.html, public/pt-PT/index.html como cópias estáticas
 * de public/index.html totalmente pré-traduzidas (data-i18n* preenchidos
 * com o conteúdo de i18n-dict.json — extraído do i18n.js, fonte única
 * de verdade), com meta/OG/Twitter/Schema.org no idioma alvo, lang/
 * canonical/inLanguage corretos.
 *
 * Também corrige public/index.html (pt-BR): alinha o FAQPage schema com
 * o FAQ visível (faq1-5) e adiciona "inLanguage" aos 3 blocos JSON-LD.
 */
const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, 'public');
const dict = JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n-dict.json'), 'utf8'));

// ---------- helpers ----------
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function replaceOnce(html, search, replacement, label) {
  const occurrences = html.split(search).length - 1;
  if (occurrences !== 1) throw new Error(`replaceOnce(${label}): esperado 1 ocorrência, encontrado ${occurrences}`);
  return html.replace(search, replacement);
}

function replaceContent(html, key, value, { isHtml = false } = {}) {
  const attr = isHtml ? 'data-i18n-html' : 'data-i18n';
  const re = new RegExp(
    '(<([a-zA-Z0-9]+)\\b[^>]*\\s' + attr + '="' + escapeRegex(key) + '"[^>]*>)([\\s\\S]*?)(<\\/\\2>)',
    'g'
  );
  const replacement = isHtml ? value : escapeHtml(value);
  let count = 0;
  const out = html.replace(re, (_m, open, _tag, _content, close) => {
    count++;
    return open + replacement + close;
  });
  if (!count) throw new Error(`replaceContent: não encontrado ${attr}="${key}"`);
  return out;
}

function replaceAttr(html, dataAttr, key, targetAttr, value) {
  const tagRe = new RegExp('<[a-zA-Z0-9]+\\b[^>]*\\s' + dataAttr + '="' + escapeRegex(key) + '"[^>]*>', 'g');
  let count = 0;
  const out = html.replace(tagRe, (tag) => {
    count++;
    // \s antes do nome do atributo evita casar com o sufixo de
    // data-i18n-title="..." quando targetAttr === 'title' (mesma lógica
    // protegeria placeholder/alt caso algum dia colidissem).
    const attrRe = new RegExp('(\\s)' + targetAttr + '="[^"]*"');
    if (!attrRe.test(tag)) throw new Error(`replaceAttr: ${dataAttr}="${key}" sem ${targetAttr}=`);
    return tag.replace(attrRe, (_m, ws) => `${ws}${targetAttr}="${escapeAttr(value)}"`);
  });
  if (!count) throw new Error(`replaceAttr: não encontrado ${dataAttr}="${key}"`);
  return out;
}

function buildFaqMainEntity(d) {
  const items = [1, 2, 3, 4, 5]
    .map((i) => `      { "@type": "Question", "name": ${JSON.stringify(d[`faq${i}.q`])}, "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(d[`faq${i}.a`])} } }`)
    .join(',\n');
  return `"mainEntity": [\n${items}\n    ]`;
}

// ---------- chaves data-i18n* usadas em index.html ----------
const ALL_KEYS = `nav.live,nav.alerts,nav.dui,nav.accidents,nav.floods,nav.radars,nav.events,nav.parties,nav.weekend,nav.more,nav.vsWaze,nav.about,nav.faq,nav.download,mobile.live,mobile.dui,mobile.accidents,mobile.floods,mobile.radars,mobile.parties,mobile.weekend,mobile.vsWaze,mobile.about,mobile.faq,mobile.download,hero.badge,hero.h1,hero.p,hero.googlePlay,hero.iosSoon,hero.alt.map,hero.alt.events,hero.alt.community,stats.categories,stats.radius,stats.languages,stats.free,events.liveNow,events.community,events.subtitle,events.activeLabel,events.all,events.traffic,events.accident,events.dui,events.police,events.flood,events.entertainment,events.loading,events.empty,events.refresh,ad.label,features.label,features.title,features.sub,feature1.title,feature1.p,feature2.title,feature2.p,feature3.title,feature3.p,feature4.title,feature4.p,feature5.title,feature5.p,feature6.title,feature6.p,how.label,how.title,how.sub,step1.title,step1.p,step2.title,step2.p,step3.title,step3.p,screenshots.label,screenshots.title,screenshots.sub,testimonials.label,testimonials.title,test1.text,test1.name,test1.city,test2.text,test2.name,test2.city,test3.text,test3.name,test3.city,ranking.label,ranking.title,ranking.sub,rank1,rank2,rank3,rank4,rank5,rank6,rank7,ios.h2,ios.p,ios.placeholder,ios.btn,ios.success,faq.label,faq.title,faq1.q,faq1.a,faq2.q,faq2.a,faq3.q,faq3.a,faq4.q,faq4.a,faq5.q,faq5.a,cta.title,cta.sub,cta.available,cta.iosSoon,footer.tagline,footer.app,footer.features,footer.how,footer.iosSoon,footer.about,footer.guides,footer.legal,footer.privacy,footer.delete,footer.rights,footer.made,cookie.text,cookie.privacy,cookie.decline,cookie.accept`.split(',');

const I18N_HTML_KEYS = ['hero.h1', 'hero.googlePlay', 'features.title', 'ranking.title'];
const I18N_ALT_KEYS = ['hero.alt.map', 'hero.alt.events', 'hero.alt.community'];
const I18N_TITLE_KEYS = ['events.refresh'];
const I18N_PLACEHOLDER_KEYS = ['ios.placeholder'];
const SPECIAL = new Set([...I18N_HTML_KEYS, ...I18N_ALT_KEYS, ...I18N_TITLE_KEYS, ...I18N_PLACEHOLDER_KEYS]);
const I18N_TEXT_KEYS = ALL_KEYS.filter((k) => !SPECIAL.has(k));

console.log(`Chaves: ${ALL_KEYS.length} total, ${I18N_TEXT_KEYS.length} texto, ${I18N_HTML_KEYS.length} html, ${I18N_ALT_KEYS.length} alt, ${I18N_TITLE_KEYS.length} title, ${I18N_PLACEHOLDER_KEYS.length} placeholder`);

// ---------- Passo 1: corrigir public/index.html (pt-BR) ----------
let base = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');
const dPt = dict['pt-BR'];

if (base.includes('"inLanguage": "pt-BR"')) {
  console.log('public/index.html: já corrigido (inLanguage presente), pulando Passo 1.');
} else {
  base = replaceOnce(
    base,
    '"description": "Alertas de trânsito em tempo real e descoberta de eventos perto de você. Lei seca, acidentes, alagamentos e festas.",',
    '"description": "Alertas de trânsito em tempo real e descoberta de eventos perto de você. Lei seca, acidentes, alagamentos e festas.",\n    "inLanguage": "pt-BR",',
    'SoftwareApplication inLanguage'
  );

  base = replaceOnce(
    base,
    '"url": "https://alertoo.com.br",\n    "potentialAction"',
    '"url": "https://alertoo.com.br",\n    "inLanguage": "pt-BR",\n    "potentialAction"',
    'WebSite inLanguage'
  );

  base = base.replace(/"mainEntity": \[[\s\S]*?\n    \]/, `"inLanguage": "pt-BR",\n    ${buildFaqMainEntity(dPt)}`);

  fs.writeFileSync(path.join(PUB, 'index.html'), base, 'utf8');
  console.log('public/index.html: FAQPage alinhado com faq1-5 (pt-BR) + inLanguage adicionado aos 3 schemas.');
}

// ---------- Passo 2: gerar páginas por idioma ----------
const LANGS = ['en', 'es', 'fr', 'pt-PT'];

for (const lang of LANGS) {
  let html = base;
  const d = dict[lang];

  html = replaceOnce(html, '<html lang="pt-BR">', `<html lang="${lang}">`, 'html lang');
  html = replaceOnce(html, '<link rel="canonical" href="https://alertoo.com.br/" />', `<link rel="canonical" href="https://alertoo.com.br/${lang}/" />`, 'canonical');
  html = replaceOnce(html, '<title>Alertoo — Alertas de Trânsito e Eventos em Tempo Real</title>', `<title>${escapeHtml(d['meta.title'])}</title>`, 'title');
  html = html.replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeAttr(d['meta.description'])}" />`);
  html = html.replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeAttr(d['meta.title'])}" />`);
  html = html.replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeAttr(d['meta.description'])}" />`);
  html = replaceOnce(html, '<meta property="og:url" content="https://alertoo.com.br/" />', `<meta property="og:url" content="https://alertoo.com.br/${lang}/" />`, 'og:url');
  html = html.replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeAttr(d['meta.title'])}" />`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeAttr(d['meta.description'])}" />`);

  // inLanguage: pt-BR -> lang (3 ocorrências: SoftwareApplication, WebSite, FAQPage)
  const before = html.split('"inLanguage": "pt-BR"').length - 1;
  if (before !== 3) throw new Error(`inLanguage: esperado 3 ocorrências de "pt-BR", encontrado ${before}`);
  html = html.split('"inLanguage": "pt-BR"').join(`"inLanguage": "${lang}"`);

  // FAQPage mainEntity -> traduzido
  html = html.replace(/"mainEntity": \[[\s\S]*?\n    \]/, buildFaqMainEntity(d));

  // data-i18n* -> conteúdo traduzido
  for (const key of I18N_TEXT_KEYS) html = replaceContent(html, key, d[key]);
  for (const key of I18N_HTML_KEYS) html = replaceContent(html, key, d[key], { isHtml: true });
  for (const key of I18N_ALT_KEYS) html = replaceAttr(html, 'data-i18n-alt', key, 'alt', d[key]);
  for (const key of I18N_TITLE_KEYS) html = replaceAttr(html, 'data-i18n-title', key, 'title', d[key]);
  for (const key of I18N_PLACEHOLDER_KEYS) html = replaceAttr(html, 'data-i18n-placeholder', key, 'placeholder', d[key]);

  // marca o idioma no localStorage antes do i18n.js rodar
  html = replaceOnce(html, '<head>', `<head>\n  <script>try{localStorage.setItem('alertoo_lang','${lang}');}catch(e){}</script>`, 'head script');

  const outDir = path.join(PUB, lang);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  console.log(`public/${lang}/index.html gerado (${(html.length / 1024).toFixed(1)} KB)`);
}
