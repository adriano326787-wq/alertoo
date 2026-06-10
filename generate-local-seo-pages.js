/**
 * generate-local-seo-pages.js
 *
 * Gera páginas locais de SEO em:
 *   public/lei-seca/{slug}/index.html
 *   public/festas-e-eventos/{slug}/index.html
 *
 * Baseado nos templates public/lei-seca.html e public/festas-e-eventos.html,
 * com título, meta tags, schema.org, H1, hero, FAQ e um card extra
 * personalizados por estado/cidade (ver seo-locations-data.js).
 */
const fs = require('fs');
const path = require('path');
const { STATES, CITIES } = require('./seo-locations-data');

const PUBLIC_DIR = path.join(__dirname, 'public');
const LS_TEMPLATE = fs.readFileSync(path.join(PUBLIC_DIR, 'lei-seca.html'), 'utf8');
const FE_TEMPLATE = fs.readFileSync(path.join(PUBLIC_DIR, 'festas-e-eventos.html'), 'utf8');

function replaceOnce(content, search, replacement, label) {
  const idx = content.indexOf(search);
  if (idx === -1) {
    throw new Error(`Trecho não encontrado (${label}):\n${search.slice(0, 120)}...`);
  }
  const idx2 = content.indexOf(search, idx + 1);
  if (idx2 !== -1) {
    throw new Error(`Trecho encontrado mais de uma vez (${label})`);
  }
  return content.slice(0, idx) + replacement + content.slice(idx + search.length);
}

function joinList(arr) {
  if (arr.length === 1) return arr[0];
  return arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1];
}

const ALL_LOCATIONS = [
  ...STATES.map((s) => ({ ...s, kind: 'state' })),
  ...CITIES.map((c) => ({ ...c, kind: 'city' })),
];

// ─────────────────────────────────────────────────────────────────────────
// LEI SECA
// ─────────────────────────────────────────────────────────────────────────
function buildLeiSeca(loc) {
  let html = LS_TEMPLATE;
  const name = loc.name;
  const slug = loc.slug;
  const url = `https://alertoo.com.br/lei-seca/${slug}`;
  const highwaysList = joinList(loc.highways);

  // <title>
  html = replaceOnce(
    html,
    '<title>Lei Seca Hoje — Onde Estão as Blitz Agora? | Alertoo</title>',
    `<title>Lei Seca em ${name} Hoje — Onde Estão as Blitz Agora? | Alertoo</title>`,
    'title'
  );

  // meta description
  html = replaceOnce(
    html,
    '<meta name="description" content="Saiba onde estão as blitz de lei seca hoje. O Alertoo mostra em tempo real todas as fiscalizações reportadas pela comunidade. Veja o mapa ao vivo, grátis." />',
    `<meta name="description" content="Saiba onde estão as blitz de lei seca em ${name} hoje. O Alertoo mostra em tempo real as fiscalizações reportadas pela comunidade em vias como ${highwaysList}. Veja o mapa ao vivo, grátis." />`,
    'meta description'
  );

  // meta keywords
  html = replaceOnce(
    html,
    '<meta name="keywords" content="lei seca hoje, blitz lei seca, onde está a lei seca, fiscalização lei seca, blitz policial, lei seca ao vivo, blitz agora, alertoo lei seca" />',
    `<meta name="keywords" content="lei seca ${name.toLowerCase()}, blitz lei seca ${name.toLowerCase()}, onde está a lei seca em ${name.toLowerCase()}, fiscalização lei seca ${name.toLowerCase()}, blitz hoje ${name.toLowerCase()}, lei seca ao vivo, alertoo ${name.toLowerCase()}" />`,
    'meta keywords'
  );

  // canonical + hreflang
  html = replaceOnce(
    html,
`  <link rel="canonical" href="https://alertoo.com.br/lei-seca" />
  <link rel="alternate" hreflang="pt-BR" href="https://alertoo.com.br/lei-seca" />
  <link rel="alternate" hreflang="en"    href="https://alertoo.com.br/lei-seca?lang=en" />
  <link rel="alternate" hreflang="es"    href="https://alertoo.com.br/lei-seca?lang=es" />
  <link rel="alternate" hreflang="fr"    href="https://alertoo.com.br/lei-seca?lang=fr" />
  <link rel="alternate" hreflang="pt-PT" href="https://alertoo.com.br/lei-seca?lang=pt-PT" />
  <link rel="alternate" hreflang="x-default" href="https://alertoo.com.br/lei-seca" />`,
`  <link rel="canonical" href="${url}" />
  <link rel="alternate" hreflang="pt-BR" href="${url}" />
  <link rel="alternate" hreflang="x-default" href="${url}" />`,
    'canonical/hreflang'
  );

  // og + twitter
  html = replaceOnce(
    html,
    '<meta property="og:title" content="Onde Está a Lei Seca Hoje? — Alertoo" />',
    `<meta property="og:title" content="Lei Seca em ${name} Hoje — Alertoo" />`,
    'og:title'
  );
  html = replaceOnce(
    html,
    '<meta property="og:description" content="Veja ao vivo no mapa onde estão as blitz de lei seca reportadas pela comunidade. Alertoo é gratuito." />',
    `<meta property="og:description" content="Veja ao vivo no mapa onde estão as blitz de lei seca em ${name}, reportadas pela comunidade. Alertoo é gratuito." />`,
    'og:description'
  );
  html = replaceOnce(
    html,
    '<meta property="og:url" content="https://alertoo.com.br/lei-seca" />',
    `<meta property="og:url" content="${url}" />`,
    'og:url'
  );
  html = replaceOnce(
    html,
    '<meta name="twitter:title" content="Onde Está a Lei Seca Hoje? — Alertoo" />',
    `<meta name="twitter:title" content="Lei Seca em ${name} Hoje — Alertoo" />`,
    'twitter:title'
  );
  html = replaceOnce(
    html,
    '<meta name="twitter:description" content="Alertas de lei seca em tempo real, reportados pela comunidade." />',
    `<meta name="twitter:description" content="Alertas de lei seca em ${name} em tempo real, reportados pela comunidade." />`,
    'twitter:description'
  );

  // FAQ schema — Q1
  html = replaceOnce(
    html,
`      {
        "@type": "Question",
        "name": "Onde está a lei seca hoje?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No Alertoo você vê em tempo real todas as blitz de lei seca reportadas pela comunidade no mapa. Acesse alertoo.com.br/eventos ou baixe o app gratuitamente para Android e iOS para ver as fiscalizações mais próximas de você."
        }
      },`,
`      {
        "@type": "Question",
        "name": "Onde está a lei seca em ${name} hoje?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No Alertoo você vê em tempo real todas as blitz de lei seca em ${name} reportadas pela comunidade no mapa, incluindo vias como ${highwaysList}. Acesse alertoo.com.br/eventos ou baixe o app gratuitamente para Android e iOS."
        }
      },`,
    'faq schema q1'
  );

  // WebPage schema
  html = replaceOnce(
    html,
`    "name": "Onde Está a Lei Seca Hoje? — Alertoo",
    "description": "Mapa ao vivo com blitz de lei seca reportadas pela comunidade.",
    "url": "https://alertoo.com.br/lei-seca",
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Alertoo", "item": "https://alertoo.com.br" },
        { "@type": "ListItem", "position": 2, "name": "Lei Seca", "item": "https://alertoo.com.br/lei-seca" }
      ]
    },`,
`    "name": "Lei Seca em ${name} Hoje — Alertoo",
    "description": "Mapa ao vivo com blitz de lei seca em ${name} reportadas pela comunidade.",
    "url": "${url}",
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Alertoo", "item": "https://alertoo.com.br" },
        { "@type": "ListItem", "position": 2, "name": "Lei Seca", "item": "https://alertoo.com.br/lei-seca" },
        { "@type": "ListItem", "position": 3, "name": "${name}", "item": "${url}" }
      ]
    },`,
    'webpage schema'
  );

  // HERO h1 + heroP (sem data-i18n, conteúdo único por localidade)
  html = replaceOnce(
    html,
    '<h1 data-i18n-html="ls.h1">Onde Está a<br/><span>Lei Seca Hoje?</span></h1>\n  <p data-i18n="ls.heroP">Veja em tempo real todas as blitz e fiscalizações de lei seca reportadas pela comunidade. Alertoo é gratuito.</p>',
    `<h1>Onde Está a<br/><span>Lei Seca em ${name}?</span></h1>\n  <p>Veja em tempo real todas as blitz e fiscalizações de lei seca em ${name} reportadas pela comunidade — incluindo trechos como ${highwaysList}. Alertoo é gratuito.</p>`,
    'hero'
  );

  // Card extra no início do info-grid
  html = replaceOnce(
    html,
    '<div class="info-grid">\n    <div class="info-card">\n      <div class="info-icon">📋</div>',
    `<div class="info-grid">\n    <div class="info-card">\n      <div class="info-icon">📍</div>\n      <h3>Lei Seca em ${name}</h3>\n      <p>Em ${name}, blitz de lei seca costumam ser reportadas em vias como ${highwaysList}. Acompanhe o mapa ao vivo do Alertoo para saber onde a fiscalização está passando agora perto de você.</p>\n    </div>\n    <div class="info-card">\n      <div class="info-icon">📋</div>`,
    'info card extra'
  );

  // FAQ item 1 — resposta
  html = replaceOnce(
    html,
    '<div class="faq-a">No mapa do Alertoo você vê em tempo real todas as blitz reportadas pela comunidade. Acesse <a href="/eventos">alertoo.com.br/eventos</a> ou baixe o app gratuitamente para Android e iOS.</div>',
    `<div class="faq-a">No mapa do Alertoo você vê em tempo real as blitz de lei seca em ${name}, incluindo trechos como ${highwaysList}. Acesse <a href="/eventos">alertoo.com.br/eventos</a> ou baixe o app gratuitamente para Android e iOS.</div>`,
    'faq item1'
  );

  // FAQ item 6 — "qual cidade"
  html = replaceOnce(
    html,
    '<div class="faq-a">O Alertoo funciona em todo o Brasil. Qualquer usuário pode reportar uma blitz em qualquer cidade. O mapa exibe alertas de lei seca em São Paulo, Rio de Janeiro, Belo Horizonte, Brasília, Curitiba, Porto Alegre e em todo o país.</div>',
    `<div class="faq-a">O Alertoo funciona em ${name} e em todo o Brasil. Qualquer usuário pode reportar uma blitz de lei seca em qualquer ponto da cidade — a comunidade já reporta com frequência em vias como ${highwaysList}.</div>`,
    'faq item6'
  );

  // Veja também — chips extras: hub /lei-seca + festas-e-eventos da mesma localidade
  html = replaceOnce(
    html,
    '<div style="display:flex;flex-wrap:wrap;gap:12px;">\n      <a href="/acidentes"',
    `<div style="display:flex;flex-wrap:wrap;gap:12px;">\n      <a href="/lei-seca" style="display:inline-flex;align-items:center;gap:8px;background:#0F172A;color:#fff;padding:10px 16px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,0.08);">🍺 Lei Seca em todo o Brasil</a>\n      <a href="/festas-e-eventos/${slug}" style="display:inline-flex;align-items:center;gap:8px;background:#0F172A;color:#fff;padding:10px 16px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,0.08);">🎉 Festas e Eventos em ${name}</a>\n      <a href="/acidentes"`,
    'veja tambem'
  );

  return html;
}

// ─────────────────────────────────────────────────────────────────────────
// FESTAS E EVENTOS
// ─────────────────────────────────────────────────────────────────────────
function buildFestas(loc) {
  let html = FE_TEMPLATE;
  const name = loc.name;
  const slug = loc.slug;
  const url = `https://alertoo.com.br/festas-e-eventos/${slug}`;
  const regionsList = joinList(loc.regions);

  // <title>
  html = replaceOnce(
    html,
    '<title>Festas e Baladas Perto de Mim Hoje — Alertoo</title>',
    `<title>Festas e Baladas em ${name} Hoje — Alertoo</title>`,
    'title'
  );

  // meta description
  html = replaceOnce(
    html,
    '<meta name="description" content="Descubra festas, baladas e eventos perto de você agora. O Alertoo reúne eventos da comunidade em tempo real no mapa — shows, festas abertas, eventos ao ar livre e muito mais. Grátis." />',
    `<meta name="description" content="Descubra festas, baladas e eventos em ${name} agora. O Alertoo reúne no mapa em tempo real o que está rolando em ${regionsList} e mais. Grátis." />`,
    'meta description'
  );

  // meta keywords
  html = replaceOnce(
    html,
    '<meta name="keywords" content="festas perto de mim, baladas hoje, eventos hoje, o que fazer hoje à noite, festas abertas, eventos ao vivo, shows hoje, festas em São Paulo, baladas em Rio de Janeiro, eventos gratuitos, alertoo eventos" />',
    `<meta name="keywords" content="festas em ${name.toLowerCase()}, baladas em ${name.toLowerCase()}, eventos hoje ${name.toLowerCase()}, o que fazer hoje em ${name.toLowerCase()}, festas perto de mim, eventos ao vivo, shows hoje ${name.toLowerCase()}, alertoo ${name.toLowerCase()}" />`,
    'meta keywords'
  );

  // canonical + hreflang
  html = replaceOnce(
    html,
`  <link rel="canonical" href="https://alertoo.com.br/festas-e-eventos" />
  <link rel="alternate" hreflang="pt-BR" href="https://alertoo.com.br/festas-e-eventos" />
  <link rel="alternate" hreflang="en"    href="https://alertoo.com.br/festas-e-eventos?lang=en" />
  <link rel="alternate" hreflang="es"    href="https://alertoo.com.br/festas-e-eventos?lang=es" />
  <link rel="alternate" hreflang="fr"    href="https://alertoo.com.br/festas-e-eventos?lang=fr" />
  <link rel="alternate" hreflang="pt-PT" href="https://alertoo.com.br/festas-e-eventos?lang=pt-PT" />
  <link rel="alternate" hreflang="x-default" href="https://alertoo.com.br/festas-e-eventos" />`,
`  <link rel="canonical" href="${url}" />
  <link rel="alternate" hreflang="pt-BR" href="${url}" />
  <link rel="alternate" hreflang="x-default" href="${url}" />`,
    'canonical/hreflang'
  );

  // og + twitter
  html = replaceOnce(
    html,
    '<meta property="og:title" content="Festas e Baladas Perto de Você — Alertoo" />',
    `<meta property="og:title" content="Festas e Baladas em ${name} — Alertoo" />`,
    'og:title'
  );
  html = replaceOnce(
    html,
    '<meta property="og:description" content="Descubra o que está rolando perto de você: festas, baladas, shows e eventos reportados pela comunidade em tempo real. Grátis no Android e iOS." />',
    `<meta property="og:description" content="Descubra o que está rolando em ${name}: festas, baladas, shows e eventos em ${regionsList} reportados pela comunidade em tempo real. Grátis." />`,
    'og:description'
  );
  html = replaceOnce(
    html,
    '<meta property="og:url" content="https://alertoo.com.br/festas-e-eventos" />',
    `<meta property="og:url" content="${url}" />`,
    'og:url'
  );
  html = replaceOnce(
    html,
    '<meta name="twitter:title" content="Festas e Baladas Perto de Você — Alertoo" />',
    `<meta name="twitter:title" content="Festas e Baladas em ${name} — Alertoo" />`,
    'twitter:title'
  );
  html = replaceOnce(
    html,
    '<meta name="twitter:description" content="Eventos, festas e baladas em tempo real perto de você. Reportados pela comunidade. Grátis." />',
    `<meta name="twitter:description" content="Eventos, festas e baladas em ${name} em tempo real. Reportados pela comunidade. Grátis." />`,
    'twitter:description'
  );

  // FAQ schema — Q1
  html = replaceOnce(
    html,
`      {
        "@type": "Question",
        "name": "Como descobrir festas e baladas perto de mim hoje?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No Alertoo você vê em tempo real no mapa todos os eventos, festas e baladas reportados pela comunidade perto de você. Acesse alertoo.com.br/eventos ou baixe o app grátis para Android e iOS."
        }
      },`,
`      {
        "@type": "Question",
        "name": "Como descobrir festas e baladas em ${name} hoje?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No Alertoo você vê em tempo real no mapa todos os eventos, festas e baladas em ${name} reportados pela comunidade, incluindo regiões como ${regionsList}. Acesse alertoo.com.br/eventos ou baixe o app grátis para Android e iOS."
        }
      },`,
    'faq schema q1'
  );

  // WebPage schema
  html = replaceOnce(
    html,
`    "name": "Festas e Baladas Perto de Você — Alertoo",
    "description": "Descubra festas, baladas e eventos perto de você em tempo real.",
    "url": "https://alertoo.com.br/festas-e-eventos",
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Alertoo", "item": "https://alertoo.com.br" },
        { "@type": "ListItem", "position": 2, "name": "Festas e Eventos", "item": "https://alertoo.com.br/festas-e-eventos" }
      ]
    },`,
`    "name": "Festas e Baladas em ${name} — Alertoo",
    "description": "Descubra festas, baladas e eventos em ${name} em tempo real.",
    "url": "${url}",
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Alertoo", "item": "https://alertoo.com.br" },
        { "@type": "ListItem", "position": 2, "name": "Festas e Eventos", "item": "https://alertoo.com.br/festas-e-eventos" },
        { "@type": "ListItem", "position": 3, "name": "${name}", "item": "${url}" }
      ]
    },`,
    'webpage schema'
  );

  // HERO h1 + heroP
  html = replaceOnce(
    html,
    '<h1 data-i18n-html="fe.h1">Festas e Baladas<br/><span>Perto de Você Agora</span></h1>\n  <p data-i18n="fe.heroP">Veja em tempo real o que está rolando na sua cidade — festas, shows, baladas, eventos ao ar livre e muito mais. Reportados pela comunidade, grátis.</p>',
    `<h1>Festas e Baladas<br/><span>em ${name} Agora</span></h1>\n  <p>Veja em tempo real o que está rolando em ${name} — festas, shows, baladas e eventos em ${regionsList} e muito mais. Reportados pela comunidade, grátis.</p>`,
    'hero'
  );

  // Card extra no início do info-grid
  html = replaceOnce(
    html,
    '<div class="info-grid">\n    <div class="info-card">\n      <div class="info-icon">🎉</div>',
    `<div class="info-grid">\n    <div class="info-card">\n      <div class="info-icon">📍</div>\n      <h3>Festas e Eventos em ${name}</h3>\n      <p>Fique por dentro do que está rolando em ${name}, em regiões como ${regionsList} — festas, shows e eventos reportados em tempo real pela comunidade no mapa do Alertoo.</p>\n    </div>\n    <div class="info-card">\n      <div class="info-icon">🎉</div>`,
    'info card extra'
  );

  // FAQ item 1 — resposta
  html = replaceOnce(
    html,
    '<div class="faq-a">No mapa do Alertoo você vê em tempo real todos os eventos reportados pela comunidade na sua área. Acesse <a href="/eventos">alertoo.com.br/eventos</a> ou baixe o app para ver festas, baladas, shows e eventos ao ar livre perto de você agora.</div>',
    `<div class="faq-a">No mapa do Alertoo você vê em tempo real os eventos em ${name}, incluindo regiões como ${regionsList}. Acesse <a href="/eventos">alertoo.com.br/eventos</a> ou baixe o app para ver festas, baladas, shows e eventos ao ar livre perto de você agora.</div>`,
    'faq item1'
  );

  // FAQ item 5 — "tem baladas em SP e RJ?"
  html = replaceOnce(
    html,
    '<div class="faq-a">Sim! Quanto mais usuários na cidade, mais eventos aparecem. São Paulo e Rio de Janeiro são as cidades com mais alertas e eventos reportados. Baixe o app para ver em tempo real o que está acontecendo na sua cidade.</div>',
    `<div class="faq-a">Sim! Quanto mais usuários em ${name}, mais eventos aparecem no mapa — incluindo regiões como ${regionsList}. Baixe o app para ver em tempo real o que está acontecendo agora na cidade.</div>`,
    'faq item5'
  );

  // Veja também — chips extras: hub /festas-e-eventos + lei-seca da mesma localidade
  html = replaceOnce(
    html,
    '<div style="display:flex;flex-wrap:wrap;gap:12px;">\n      <a href="/lei-seca"',
    `<div style="display:flex;flex-wrap:wrap;gap:12px;">\n      <a href="/festas-e-eventos" style="display:inline-flex;align-items:center;gap:8px;background:#0F172A;color:#fff;padding:10px 16px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,0.08);">🎉 Festas e Eventos em todo o Brasil</a>\n      <a href="/lei-seca/${slug}" style="display:inline-flex;align-items:center;gap:8px;background:#0F172A;color:#fff;padding:10px 16px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,0.08);">🍺 Lei Seca em ${name}</a>\n      <a href="/lei-seca"`,
    'veja tambem'
  );

  return html;
}

// ─────────────────────────────────────────────────────────────────────────
// GERAÇÃO
// ─────────────────────────────────────────────────────────────────────────
let count = 0;
const sitemapEntries = [];

for (const loc of ALL_LOCATIONS) {
  // Lei Seca
  const lsHtml = buildLeiSeca(loc);
  const lsDir = path.join(PUBLIC_DIR, 'lei-seca', loc.slug);
  fs.mkdirSync(lsDir, { recursive: true });
  fs.writeFileSync(path.join(lsDir, 'index.html'), lsHtml, 'utf8');
  sitemapEntries.push({ loc: `https://alertoo.com.br/lei-seca/${loc.slug}`, changefreq: 'weekly', priority: '0.7' });

  // Festas e Eventos
  const feHtml = buildFestas(loc);
  const feDir = path.join(PUBLIC_DIR, 'festas-e-eventos', loc.slug);
  fs.mkdirSync(feDir, { recursive: true });
  fs.writeFileSync(path.join(feDir, 'index.html'), feHtml, 'utf8');
  sitemapEntries.push({ loc: `https://alertoo.com.br/festas-e-eventos/${loc.slug}`, changefreq: 'weekly', priority: '0.7' });

  count += 2;
}

console.log(`Geradas ${count} páginas (${ALL_LOCATIONS.length} localidades x 2).`);

// ─────────────────────────────────────────────────────────────────────────
// SITEMAP
// ─────────────────────────────────────────────────────────────────────────
const sitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf8');

const missingEntries = sitemapEntries.filter((e) => !sitemap.includes(`<loc>${e.loc}</loc>`));

if (missingEntries.length > 0) {
  const newUrls = missingEntries
    .map((e) => `  <url>\n    <loc>${e.loc}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`)
    .join('\n');

  sitemap = sitemap.replace('</urlset>', newUrls + '\n</urlset>');
  fs.writeFileSync(sitemapPath, sitemap, 'utf8');
}

console.log(`sitemap.xml: ${missingEntries.length} novas URLs adicionadas, ${sitemapEntries.length - missingEntries.length} já existiam.`);
