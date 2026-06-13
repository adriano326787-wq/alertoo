/**
 * Gera páginas de SEO local para as categorias "radares", "acidentes" e
 * "alagamentos", uma para cada estado/cidade já usado em public/lei-seca/<slug>
 * e public/festas-e-eventos/<slug>.
 *
 * Saída: public/<categoria>/<slug>/index.html  (3 categorias x 45 locais = 135 páginas)
 *
 * Uso: node scripts/generate-category-pages.mjs
 */

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

// slug -> { label, stateUF, cityName? } — mesmo mapa usado em propagate-recent-blitz.mjs
const PAGES = {
  // Estados
  acre:                  { label: 'Acre', stateUF: 'AC' },
  alagoas:               { label: 'Alagoas', stateUF: 'AL' },
  amapa:                 { label: 'Amapá', stateUF: 'AP' },
  amazonas:              { label: 'Amazonas', stateUF: 'AM' },
  bahia:                 { label: 'Bahia', stateUF: 'BA' },
  ceara:                 { label: 'Ceará', stateUF: 'CE' },
  'distrito-federal':    { label: 'Distrito Federal', stateUF: 'DF' },
  'espirito-santo':      { label: 'Espírito Santo', stateUF: 'ES' },
  goias:                 { label: 'Goiás', stateUF: 'GO' },
  maranhao:              { label: 'Maranhão', stateUF: 'MA' },
  'mato-grosso-do-sul':  { label: 'Mato Grosso do Sul', stateUF: 'MS' },
  'mato-grosso':         { label: 'Mato Grosso', stateUF: 'MT' },
  'minas-gerais':        { label: 'Minas Gerais', stateUF: 'MG' },
  para:                  { label: 'Pará', stateUF: 'PA' },
  paraiba:               { label: 'Paraíba', stateUF: 'PB' },
  parana:                { label: 'Paraná', stateUF: 'PR' },
  pernambuco:            { label: 'Pernambuco', stateUF: 'PE' },
  piaui:                 { label: 'Piauí', stateUF: 'PI' },
  'rio-de-janeiro':      { label: 'Rio de Janeiro', stateUF: 'RJ' },
  'rio-grande-do-norte': { label: 'Rio Grande do Norte', stateUF: 'RN' },
  'rio-grande-do-sul':   { label: 'Rio Grande do Sul', stateUF: 'RS' },
  rondonia:              { label: 'Rondônia', stateUF: 'RO' },
  roraima:               { label: 'Roraima', stateUF: 'RR' },
  'santa-catarina':      { label: 'Santa Catarina', stateUF: 'SC' },
  'sao-paulo':           { label: 'São Paulo', stateUF: 'SP' },
  sergipe:               { label: 'Sergipe', stateUF: 'SE' },
  tocantins:             { label: 'Tocantins', stateUF: 'TO' },

  // Cidades
  blumenau:              { label: 'Blumenau', stateUF: 'SC', cityName: 'Blumenau' },
  buzios:                { label: 'Búzios', stateUF: 'RJ', cityName: 'Búzios' },
  'cabo-frio':           { label: 'Cabo Frio', stateUF: 'RJ', cityName: 'Cabo Frio' },
  campinas:              { label: 'Campinas', stateUF: 'SP', cityName: 'Campinas' },
  'caxias-do-sul':       { label: 'Caxias do Sul', stateUF: 'RS', cityName: 'Caxias do Sul' },
  'feira-de-santana':    { label: 'Feira de Santana', stateUF: 'BA', cityName: 'Feira de Santana' },
  'foz-do-iguacu':       { label: 'Foz do Iguaçu', stateUF: 'PR', cityName: 'Foz do Iguaçu' },
  gramado:               { label: 'Gramado', stateUF: 'RS', cityName: 'Gramado' },
  joinville:             { label: 'Joinville', stateUF: 'SC', cityName: 'Joinville' },
  londrina:              { label: 'Londrina', stateUF: 'PR', cityName: 'Londrina' },
  maringa:               { label: 'Maringá', stateUF: 'PR', cityName: 'Maringá' },
  niteroi:               { label: 'Niterói', stateUF: 'RJ', cityName: 'Niterói' },
  'porto-seguro':        { label: 'Porto Seguro', stateUF: 'BA', cityName: 'Porto Seguro' },
  'ribeirao-preto':      { label: 'Ribeirão Preto', stateUF: 'SP', cityName: 'Ribeirão Preto' },
  santos:                { label: 'Santos', stateUF: 'SP', cityName: 'Santos' },
  'sao-jose-dos-campos': { label: 'São José dos Campos', stateUF: 'SP', cityName: 'São José dos Campos' },
  sorocaba:              { label: 'Sorocaba', stateUF: 'SP', cityName: 'Sorocaba' },
  uberlandia:            { label: 'Uberlândia', stateUF: 'MG', cityName: 'Uberlândia' },
};

const STATE_SLUGS = Object.entries(PAGES).filter(([, c]) => !c.cityName).map(([slug]) => slug);
const CITY_SLUGS = Object.entries(PAGES).filter(([, c]) => c.cityName).map(([slug]) => slug);

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function faqJsonLd(items) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  });
}

function webPageJsonLd({ title, description, url, breadcrumbName, breadcrumbUrl, label, pageUrl }) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: pageUrl,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Alertoo', item: 'https://alertoo.com.br' },
        { '@type': 'ListItem', position: 2, name: breadcrumbName, item: breadcrumbUrl },
        { '@type': 'ListItem', position: 3, name: label, item: pageUrl },
      ],
    },
    publisher: {
      '@type': 'Organization',
      name: 'Alertoo',
      url: 'https://alertoo.com.br',
      logo: 'https://alertoo.com.br/icon.png',
    },
  });
}

function softwareAppJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Alertoo',
    operatingSystem: 'Android, iOS',
    applicationCategory: 'NavigationApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
    description: 'App gratuito de alertas de trânsito colaborativos: lei seca, blitz, radares, acidentes, alagamentos e eventos.',
    url: 'https://alertoo.com.br',
    downloadUrl: 'https://play.google.com/store/apps/details?id=com.alertoo.app',
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.5', ratingCount: '120' },
  });
}

function citiesGrid(dirSlug, emoji) {
  const stateCards = STATE_SLUGS.map((slug) => `    <div class="city-card">${emoji} <a href="/${dirSlug}/${slug}">${esc(PAGES[slug].label)}</a></div>`).join('\n');
  const cityCards = CITY_SLUGS.map((slug) => `    <div class="city-card">${emoji} <a href="/${dirSlug}/${slug}">${esc(PAGES[slug].label)}</a></div>`).join('\n');
  return { stateCards, cityCards };
}

function infoCard({ icon, h3, p }) {
  return `    <div class="info-card"><div class="info-icon">${icon}</div><h3>${esc(h3)}</h3><p>${p}</p></div>`;
}

function faqItem({ q, a }) {
  return `  <div class="faq-item">\n    <div class="faq-q">${esc(q)}</div>\n    <div class="faq-a">${a}</div>\n  </div>`;
}

// ── Configuração por categoria ──────────────────────────────────────────
const CATEGORIES = {
  radares: {
    dirSlug: 'radares',
    hubPath: '/radares',
    breadcrumbName: 'Radares',
    categoryValue: 'radar',
    recentEmoji: '📷',
    cityCardEmoji: '📷',
    brandRgb: '245,158,11',
    brand: '#F59E0B',
    adSlots: { top: '9058171901', mid: '7745090236', bot: '9813187084' },
    hero: { badge: '📷 Radar ao Vivo' },
    cont(label) {
      return {
        title: `Radar Móvel em ${label} Hoje — Onde Tem Radar Agora? | Alertoo`,
        metaDescription: `Veja radares móveis e blitz de velocidade em ${label} hoje. Alertoo mostra em tempo real radares e fiscalizações reportadas pela comunidade no mapa. Grátis.`,
        keywords: `radar móvel ${label}, onde tem radar em ${label}, blitz de radar ${label}, radar de velocidade ${label} hoje, fiscalização de velocidade ${label}, radar ao vivo ${label}`,
        ogTitle: `Radar Móvel em ${label} Hoje — Alertoo`,
        ogDescription: `Veja radares móveis e blitz de radar em ${label} reportados pela comunidade em tempo real. Grátis no Android e iOS.`,
        twitterTitle: `Radar Móvel em ${label} — Alertoo`,
        twitterDescription: `Radares móveis e blitz em ${label} em tempo real no mapa. Grátis.`,
        h1: `Onde Tem Radar<br/><span>em ${esc(label)} Agora?</span>`,
        heroP: `Veja em tempo real radares móveis e blitz de velocidade em ${label} reportados pela comunidade no mapa. Evite multas e dirija com segurança.`,
        mapH2: `Mapa de Radares ao Vivo em ${label}`,
        mapCaption: `Radares e blitz reportados pela comunidade em tempo real em ${label}.`,
        recentH2: `Últimos Radares Reportados em ${label}`,
        recentEmptyText: `Nenhum radar ativo reportado em ${label} no momento. Abra o mapa ao vivo ou o app para acompanhar novos reportes.`,
        infoH2: `Tudo sobre Radares de Velocidade em ${label}`,
        cityCards: [
          { icon: '📍', h3: `Radares em ${label}`, p: `Em ${esc(label)}, motoristas usam o Alertoo para reportar radares móveis e fiscalizações de velocidade em tempo real. Consulte o mapa ao vivo antes de sair de casa.` },
          { icon: '🎯', h3: `Fique Atento em ${label}`, p: `A fiscalização de velocidade pode ocorrer em qualquer via de ${esc(label)} — rodovias, avenidas e ruas urbanas. Quanto mais motoristas reportam, mais completo fica o mapa.` },
        ],
        genericCards: [
          { icon: '📷', h3: 'Radar Fixo', p: 'Instalado permanentemente na via, devidamente sinalizado. Registra automaticamente veículos acima da velocidade permitida.' },
          { icon: '🚗', h3: 'Radar Móvel', p: 'Operado por agentes em diferentes pontos da via. Muda de posição — por isso é mais importante ter alertas em tempo real.' },
          { icon: '📡', h3: 'Radar em Veículo', p: 'Instalado em viaturas ou motos da polícia. Registra velocidade de veículos em sentido contrário ou ultrapassagem.' },
          { icon: '⚡', h3: 'Fiscalização Eletrônica', p: 'Câmeras de monitoramento integradas ao sistema de multas automáticas — sem necessidade de agente presente.' },
          { icon: '📱', h3: 'Alertas da Comunidade', p: 'Motoristas reportam radares móveis em tempo real no Alertoo. Quanto mais usuários, mais preciso e completo fica o mapa.' },
          { icon: '🛡️', h3: 'Dirija com Segurança', p: 'O objetivo do Alertoo não é "escapar" de radares, mas ajudar motoristas a dirigir com mais atenção e dentro dos limites de velocidade.' },
        ],
        faq: [
          { q: `Como saber onde tem radar móvel em ${label} hoje?`, a: `No Alertoo, motoristas reportam radares móveis em ${esc(label)} em tempo real no mapa. Acesse <a href="/eventos">alertoo.com.br/eventos</a> ou baixe o app grátis para Android e iOS e veja onde estão os radares agora na região.` },
          { q: `O Alertoo avisa sobre radares de velocidade em ${label}?`, a: `Sim! Usuários do Alertoo em ${esc(label)} reportam radares móveis, blitz de velocidade e fiscalizações em tempo real. O alerta aparece no mapa para todos os usuários da região.` },
          { q: 'Qual a diferença entre radar fixo e radar móvel?', a: 'Radar fixo fica instalado permanentemente na via e é sinalizado. Radar móvel é operado por agentes ou em veículos e muda de posição — por isso é mais importante ter alertas em tempo real como o Alertoo oferece.' },
          { q: 'Como reportar um radar móvel pelo Alertoo?', a: 'No app Alertoo, toque em "+", selecione a categoria de fiscalização/radar, confirme a localização e envie. O alerta fica visível para todos os usuários da região por algumas horas.' },
          { q: 'Qual a multa por excesso de velocidade?', a: 'Depende do excesso: até 20% acima do limite = R$ 130,16 (leve); 20–50% = R$ 195,23 (grave, 5 pontos); acima de 50% = R$ 880,41 (gravíssima, 7 pontos); acima de 100% = R$ 2.934,70 com suspensão da CNH.' },
          { q: 'O app de radar é gratuito?', a: 'Sim! O Alertoo é totalmente gratuito para ver radares, blitz, acidentes e alagamentos em tempo real. Disponível para Android e iOS sem nenhum custo.' },
        ],
        citiesH2: `Radares por Estado e Cidade`,
      };
    },
  },
  acidentes: {
    dirSlug: 'acidentes',
    hubPath: '/acidentes',
    breadcrumbName: 'Acidentes',
    categoryValue: 'accident',
    recentEmoji: '🚨',
    cityCardEmoji: '🚨',
    brandRgb: '239,68,68',
    brand: '#EF4444',
    adSlots: { top: '3439350425', mid: '1371253571', bot: '2922635240' },
    hero: { badge: '🚨 Ao Vivo Agora' },
    cont(label) {
      return {
        title: `Acidente de Trânsito em ${label} Agora — Alertoo`,
        metaDescription: `Veja acidentes de trânsito em ${label} agora. Alertoo mostra em tempo real acidentes e ocorrências reportadas pela comunidade no mapa. Grátis.`,
        keywords: `acidente em ${label} agora, acidente de trânsito ${label} hoje, ocorrência de trânsito ${label}, batida de carro ${label} hoje, acidente ao vivo ${label}`,
        ogTitle: `Acidentes de Trânsito em ${label} Agora — Alertoo`,
        ogDescription: `Veja em tempo real acidentes e ocorrências em ${label} reportados pela comunidade. Mapa ao vivo, grátis.`,
        twitterTitle: `Acidentes em ${label} Agora — Alertoo`,
        twitterDescription: `Acidentes e ocorrências em ${label} em tempo real no mapa. Grátis.`,
        h1: `Acidentes de Trânsito<br/><span>em ${esc(label)} Agora</span>`,
        heroP: `Veja em tempo real acidentes, batidas e ocorrências em ${label} reportadas pela comunidade no mapa. Evite congestionamentos e rotas perigosas.`,
        mapH2: `Mapa de Acidentes ao Vivo em ${label}`,
        mapCaption: `Acidentes reportados pela comunidade em ${label} em tempo real. Atualizados continuamente.`,
        recentH2: `Últimos Acidentes Reportados em ${label}`,
        recentEmptyText: `Nenhum acidente ativo reportado em ${label} no momento. Abra o mapa ao vivo ou o app para acompanhar novos reportes.`,
        infoH2: `Por que usar o Alertoo para acidentes em ${label}?`,
        cityCards: [
          { icon: '📍', h3: `Acidentes em ${label}`, p: `Em ${esc(label)}, motoristas reportam acidentes, batidas e interdições em tempo real para ajudar outros condutores a evitar a rota.` },
          { icon: '🎯', h3: `Rotas Mais Seguras em ${label}`, p: `Consulte o mapa do Alertoo antes de sair de casa e veja se há acidentes reportados no seu trajeto em ${esc(label)}.` },
        ],
        genericCards: [
          { icon: '⚡', h3: 'Tempo Real', p: 'Alertas aparecem no mapa segundos após serem reportados por motoristas reais na região.' },
          { icon: '🗺️', h3: 'Mapa Interativo', p: 'Veja a localização exata de cada ocorrência. Planeje sua rota para evitar congestionamentos causados por acidentes.' },
          { icon: '🤝', h3: 'Comunidade Colaborativa', p: 'Quanto mais motoristas usam, mais preciso fica. Cada alerta ajuda centenas de pessoas a evitar o mesmo trecho.' },
          { icon: '📱', h3: '1 Toque para Reportar', p: 'Presenciou um acidente? Reporte em segundos pelo app. Seu alerta fica visível para todos os usuários da região.' },
          { icon: '🛣️', h3: 'Rodovias e Vias Urbanas', p: 'Funciona em estradas federais, estaduais, rodovias e vias urbanas em todo o Brasil.' },
          { icon: '🔔', h3: 'Notificações Próximas', p: 'Receba alertas de acidentes na sua rota antes mesmo de sair de casa com o app instalado.' },
        ],
        faq: [
          { q: `Como ver acidentes de trânsito ao vivo em ${label}?`, a: `Acesse <a href="/eventos">alertoo.com.br/eventos</a> ou baixe o app Alertoo gratuitamente. O mapa mostra em tempo real todos os acidentes reportados pela comunidade em ${esc(label)}.` },
          { q: 'Como reportar um acidente pelo Alertoo?', a: 'No app, toque em "+" no mapa, selecione "Acidente", confirme a localização e envie. O alerta fica visível para todos os usuários da região por algumas horas.' },
          { q: `O Alertoo avisa sobre acidentes em rodovias de ${label}?`, a: `Sim! O Alertoo funciona em estradas, rodovias e vias urbanas de ${esc(label)} e em todo o Brasil. Qualquer usuário pode reportar uma ocorrência em qualquer local.` },
          { q: 'O Alertoo é melhor que o Waze para acidentes?', a: 'O Alertoo é focado em alertas colaborativos brasileiros — acidentes, lei seca, alagamentos e eventos. É um complemento ao Waze, com foco em ocorrências locais reportadas pela comunidade em tempo real.' },
          { q: 'O app Alertoo é gratuito?', a: 'Sim, totalmente gratuito! Disponível na Google Play e App Store sem nenhum custo.' },
          { q: `Como saber se tem acidente na minha rota agora em ${label}?`, a: `Abra o mapa do Alertoo em <a href="/eventos">alertoo.com.br/eventos</a> ou no app e veja todos os alertas ativos de acidentes em ${esc(label)} no seu trajeto em tempo real.` },
        ],
        citiesH2: `Acidentes por Estado e Cidade`,
      };
    },
  },
  alagamentos: {
    dirSlug: 'alagamentos',
    hubPath: '/alagamentos',
    breadcrumbName: 'Alagamentos',
    categoryValue: 'flood',
    recentEmoji: '🌊',
    cityCardEmoji: '🌧️',
    brandRgb: '59,130,246',
    brand: '#3B82F6',
    adSlots: { top: '4125409424', mid: '2764226290', bot: '1673132757' },
    hero: { badge: '🌧️ Tempo Real' },
    cont(label) {
      return {
        title: `Alagamento em ${label} Agora — Ruas Alagadas | Alertoo`,
        metaDescription: `Veja alagamentos e ruas alagadas em ${label} agora. Alertoo mostra em tempo real pontos de alagamento e enchentes reportados pela comunidade. Grátis.`,
        keywords: `alagamento em ${label} hoje, rua alagada ${label} agora, enchente ${label} hoje, ponto de alagamento ${label}, alagamento ao vivo ${label}`,
        ogTitle: `Alagamentos em ${label} Agora — Alertoo`,
        ogDescription: `Veja ruas alagadas e enchentes em ${label} em tempo real no mapa. Reportados pela comunidade. Grátis.`,
        twitterTitle: `Alagamentos em ${label} — Alertoo`,
        twitterDescription: `Ruas alagadas e enchentes em ${label} em tempo real no mapa. Grátis.`,
        h1: `Alagamentos e Enchentes<br/><span>em ${esc(label)} Agora</span>`,
        heroP: `Veja em tempo real ruas alagadas e pontos de enchente em ${label} reportados pela comunidade. Evite trajetos perigosos antes de sair de casa.`,
        mapH2: `Mapa de Alagamentos ao Vivo em ${label}`,
        mapCaption: `Alagamentos reportados pela comunidade em ${label} em tempo real. Atualizados continuamente.`,
        recentH2: `Últimos Alagamentos Reportados em ${label}`,
        recentEmptyText: `Nenhum alagamento ativo reportado em ${label} no momento. Abra o mapa ao vivo ou o app para acompanhar novos reportes.`,
        infoH2: `Fique Seguro nas Chuvas em ${label}`,
        cityCards: [
          { icon: '📍', h3: `Alagamentos em ${label}`, p: `Em ${esc(label)}, usuários do Alertoo reportam ruas alagadas e pontos de enchente assim que chove, mantendo o mapa sempre atualizado.` },
          { icon: '🎯', h3: `Rotas Alternativas em ${label}`, p: `Com o mapa ao vivo do Alertoo, escolha outro caminho em ${esc(label)} antes de enfrentar um alagamento — economizando tempo e evitando riscos.` },
        ],
        genericCards: [
          { icon: '🌧️', h3: 'Alertas em Tempo Real', p: 'Assim que chove e ruas começam a alagar, usuários do Alertoo reportam no mapa. Você fica sabendo em segundos.' },
          { icon: '🗺️', h3: 'Localização Exata', p: 'Cada alerta de alagamento tem pin no mapa com localização precisa. Você vê qual rua, avenida ou trecho está com problema.' },
          { icon: '🚗', h3: 'Rota Alternativa', p: 'Com o mapa ao vivo, você escolhe outro caminho antes de enfrentar o alagamento — economizando tempo e evitando riscos.' },
          { icon: '📲', h3: 'Reporte em 1 Toque', p: 'Viu uma rua alagada? Reporte pelo app em segundos e ajude outros motoristas a desviar do ponto.' },
          { icon: '🏙️', h3: 'Cobertura Nacional', p: 'São Paulo, Rio de Janeiro, Belo Horizonte e todo o Brasil. Funciona em qualquer cidade onde haja usuários do Alertoo.' },
          { icon: '⏱️', h3: 'Alertas com Validade', p: 'Os alertas expiram automaticamente após algumas horas, mantendo o mapa sempre atualizado com ocorrências recentes.' },
        ],
        faq: [
          { q: `Como ver alagamentos ao vivo em ${label}?`, a: `Acesse <a href="/eventos">alertoo.com.br/eventos</a> ou baixe o app Alertoo. O mapa mostra em tempo real todos os pontos de alagamento em ${esc(label)} reportados pela comunidade.` },
          { q: `Como saber quais ruas estão alagadas agora em ${label}?`, a: `Abra o mapa do Alertoo em <a href="/eventos">alertoo.com.br/eventos</a> e veja os alertas de alagamento ativos em ${esc(label)}, reportados por motoristas e pedestres em tempo real.` },
          { q: 'Como reportar uma rua alagada pelo Alertoo?', a: 'Baixe o app Alertoo, toque em "+", selecione "Alagamento", confirme o local e envie. O alerta aparece imediatamente no mapa para todos da região.' },
          { q: 'É seguro atravessar uma rua alagada?', a: 'Nunca! Apenas 30 cm de água em movimento podem arrastar um veículo. Use o mapa do Alertoo para encontrar rotas alternativas e nunca arrisque atravessar ruas alagadas.' },
          { q: 'O Alertoo avisa sobre alagamentos antes da chuva?', a: 'O Alertoo exibe alertas em tempo real assim que outros usuários reportam. Quanto mais usuários na sua cidade, mais rápido você fica sabendo de alagamentos próximos.' },
          { q: `O Alertoo funciona para enchentes em estradas de ${label}?`, a: `Sim! Usuários podem reportar alagamentos e enchentes em rodovias, estradas e vias de ${esc(label)} e em qualquer parte do Brasil.` },
        ],
        citiesH2: `Alagamentos por Estado e Cidade`,
        alertBanner: '⚠️ <strong>Dica de segurança:</strong> Nunca atravesse ruas alagadas de carro. 30 cm de água em movimento são suficientes para arrastar um veículo. Use o mapa do Alertoo para encontrar rotas alternativas.',
      };
    },
  },
};

// ── Veja também: monta links cruzados (categoria atual fica de fora) ──────
function seeAlsoLinks(dirSlug, slug) {
  const others = {
    radares: { href: '/radares', label: '📷 Radares' },
    acidentes: { href: '/acidentes', label: '🚨 Acidentes agora' },
    alagamentos: { href: '/alagamentos', label: '🌧️ Alagamentos' },
  };
  const links = [];
  links.push({ href: `/lei-seca/${slug}`, label: `🍺 Lei Seca em ${esc(PAGES[slug].label)}` });
  links.push({ href: `/festas-e-eventos/${slug}`, label: `🎉 Festas e Eventos em ${esc(PAGES[slug].label)}` });
  for (const [key, val] of Object.entries(others)) {
    if (key !== dirSlug) links.push(val);
  }
  links.push({ href: '/fim-de-semana', label: '🗓️ Fim de Semana' });
  links.push({ href: '/alternativa-waze', label: '🗺️ Alternativa ao Waze' });
  return links.map((l) => `      <a href="${l.href}" style="display:inline-flex;align-items:center;gap:8px;background:#0F172A;color:#fff;padding:10px 16px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,0.08);">${l.label}</a>`).join('\n');
}

// ── Monta a página completa ────────────────────────────────────────────
function buildPage(catKey, slug) {
  const cat = CATEGORIES[catKey];
  const cfg = PAGES[slug];
  const label = cfg.label;
  const c = cat.cont(label);
  const pageUrl = `https://alertoo.com.br/${cat.dirSlug}/${slug}`;
  const hubUrl = `https://alertoo.com.br${cat.hubPath}`;
  const { stateCards, cityCards } = citiesGrid(cat.dirSlug, cat.cityCardEmoji);

  const filterExpr = cfg.cityName
    ? `d.data().category === '${cat.categoryValue}' && d.data().stateUF === '${cfg.stateUF}' && d.data().cityName === '${cfg.cityName}'`
    : `d.data().category === '${cat.categoryValue}' && d.data().stateUF === '${cfg.stateUF}'`;

  const alertBannerHtml = c.alertBanner
    ? `\n<div class="alert-banner">\n  ${c.alertBanner}\n</div>\n`
    : '';

  const alertBannerCss = c.alertBanner
    ? `\n    .alert-banner{background:rgba(${cat.brandRgb},.1);border:1px solid rgba(${cat.brandRgb},.3);border-radius:14px;padding:20px 24px;max-width:860px;margin:0 auto 40px;text-align:center;font-size:14px;color:var(--text)}\n    .alert-banner strong{color:var(--text)}`
    : '';

  const infoCardsHtml = [...c.cityCards, ...c.genericCards].map(infoCard).join('\n');
  const faqHtml = c.faq.map(faqItem).join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-TSS9J9VDTC"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-TSS9J9VDTC');</script>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4349309505537394" crossorigin="anonymous"></script>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${esc(c.metaDescription)}" />
  <meta name="keywords" content="${esc(c.keywords)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${pageUrl}" />
  <link rel="alternate" hreflang="pt-BR" href="${pageUrl}" />
  <link rel="alternate" hreflang="x-default" href="${pageUrl}" />
  <meta property="og:title" content="${esc(c.ogTitle)}" />
  <meta property="og:description" content="${esc(c.ogDescription)}" />
  <meta property="og:image" content="https://alertoo.com.br/feature-graphic-1024x500.png" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Alertoo" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(c.twitterTitle)}" />
  <meta name="twitter:description" content="${esc(c.twitterDescription)}" />
  <meta name="twitter:image" content="https://alertoo.com.br/feature-graphic-1024x500.png" />
  <script type="application/ld+json">${faqJsonLd(c.faq)}</script>
  <script type="application/ld+json">${webPageJsonLd({ title: c.title, description: c.metaDescription, breadcrumbName: cat.breadcrumbName, breadcrumbUrl: hubUrl, label, pageUrl })}</script>
  <script type="application/ld+json">${softwareAppJsonLd()}</script>
  <title>${esc(c.title)}</title>
  <link rel="icon" href="/icon.png" type="image/png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --brand: ${cat.brand};
      --dark: #0F172A;
      --card: #1E293B;
      --text: #F1F5F9;
      --muted: #94A3B8;
      --border: rgba(255,255,255,.08);
    }
    body { background: var(--dark); color: var(--text); font-family: 'Inter', sans-serif; line-height: 1.6; }
    a { color: var(--brand); text-decoration: none; }
    a:hover { text-decoration: underline; }
    nav { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: rgba(15,23,42,.95); backdrop-filter: blur(8px); z-index: 100; }
    .logo { font-size: 22px; font-weight: 800; color: var(--brand); }
    .nav-links { display: flex; gap: 20px; }
    .nav-links a { color: var(--muted); font-size: 14px; font-weight: 500; }
    .nav-links a:hover { color: var(--text); text-decoration: none; }
    .hero { text-align: center; padding: 72px 24px 56px; max-width: 800px; margin: 0 auto; }
    .hero-badge { display: inline-block; background: rgba(${cat.brandRgb},.15); color: var(--brand); font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: 6px 14px; border-radius: 20px; margin-bottom: 20px; border: 1px solid rgba(${cat.brandRgb},.3); }
    .hero h1 { font-size: clamp(28px, 5vw, 48px); font-weight: 900; line-height: 1.15; margin-bottom: 16px; }
    .hero h1 span { color: var(--brand); }
    .hero p { font-size: 18px; color: var(--muted); max-width: 600px; margin: 0 auto 32px; }
    .cta-group { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .btn-primary { background: var(--brand); color: #fff; font-weight: 700; font-size: 16px; padding: 14px 28px; border-radius: 12px; border: none; cursor: pointer; transition: opacity .2s; display: inline-block; }
    .btn-primary:hover { opacity: .85; text-decoration: none; }
    .btn-secondary { background: transparent; color: var(--text); font-weight: 600; font-size: 16px; padding: 14px 28px; border-radius: 12px; border: 1px solid var(--border); display: inline-block; transition: border-color .2s; }
    .btn-secondary:hover { border-color: var(--brand); text-decoration: none; }
    .map-section { max-width: 1100px; margin: 0 auto 56px; padding: 0 16px; }
    .map-section h2 { font-size: 22px; font-weight: 700; margin-bottom: 12px; text-align: center; }
    .map-frame { border-radius: 16px; overflow: hidden; border: 1px solid var(--border); height: 480px; }
    .map-frame iframe { width: 100%; height: 100%; border: none; }
    .map-caption { text-align: center; font-size: 13px; color: var(--muted); margin-top: 10px; }
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
    .stats { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; padding: 0 24px 56px; }
    .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px 32px; text-align: center; flex: 1; min-width: 160px; max-width: 220px; }
    .stat-number { font-size: 32px; font-weight: 900; color: var(--brand); }
    .stat-label { font-size: 13px; color: var(--muted); margin-top: 4px; }
    .info-section { max-width: 800px; margin: 0 auto 56px; padding: 0 24px; }
    .info-section h2 { font-size: 26px; font-weight: 800; margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 40px; }
    .info-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 20px; }
    .info-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
    .info-card p { font-size: 14px; color: var(--muted); line-height: 1.6; }
    .info-icon { font-size: 28px; margin-bottom: 10px; }${alertBannerCss}
    .cities-section { max-width: 860px; margin: 0 auto 56px; padding: 0 24px; }
    .cities-section h2 { font-size: 26px; font-weight: 800; margin-bottom: 16px; }
    .cities-section h3 { font-size: 18px; font-weight: 700; margin: 24px 0 12px; }
    .cities-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .city-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .city-card a { color: var(--text); text-decoration: none; }
    .city-card a:hover { color: var(--brand); }
    .faq-section { max-width: 800px; margin: 0 auto 72px; padding: 0 24px; }
    .faq-section h2 { font-size: 26px; font-weight: 800; margin-bottom: 24px; }
    .faq-item { background: var(--card); border: 1px solid var(--border); border-radius: 14px; margin-bottom: 12px; overflow: hidden; }
    .faq-q { padding: 18px 20px; font-weight: 600; font-size: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; }
    .faq-q::after { content: '+'; font-size: 22px; color: var(--brand); font-weight: 300; }
    .faq-item.open .faq-q::after { content: '−'; }
    .faq-a { display: none; padding: 0 20px 18px; font-size: 14px; color: var(--muted); line-height: 1.7; }
    .faq-item.open .faq-a { display: block; }
    .download-cta { text-align: center; padding: 64px 24px; background: linear-gradient(135deg, rgba(${cat.brandRgb},.12) 0%, rgba(${cat.brandRgb},.03) 100%); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin-bottom: 48px; }
    .download-cta h2 { font-size: clamp(22px,4vw,36px); font-weight: 900; margin-bottom: 12px; }
    .download-cta p { font-size: 16px; color: var(--muted); margin-bottom: 28px; max-width: 500px; margin-left: auto; margin-right: auto; }
    .store-badges { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .store-badge { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px 24px; font-size: 15px; font-weight: 600; color: var(--text); display: inline-flex; align-items: center; gap: 8px; }
    .store-badge:hover { border-color: var(--brand); text-decoration: none; }
    footer { text-align: center; padding: 32px 24px; color: var(--muted); font-size: 13px; border-top: 1px solid var(--border); }
    footer a { color: var(--muted); margin: 0 8px; }
    footer a:hover { color: var(--text); }
    .ad-slot-wrap { max-width: 860px; margin: 0 auto 48px; padding: 0 24px; }
    .ad-slot-wrap-full { width: 100%; background: rgba(255,255,255,.025); border-top: 1px solid rgba(255,255,255,.06); border-bottom: 1px solid rgba(255,255,255,.06); padding: 12px 24px; margin-bottom: 48px; }
    .ad-label { display: block; font-size: 9px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: rgba(255,255,255,.2); margin-bottom: 6px; text-align: center; }
    .adsbygoogle { display: block; min-height: 50px; }
  </style>
</head>
<body>

<nav>
  <a class="logo" href="/">Alertoo</a>
  <div class="nav-links">
    <a href="/eventos" data-i18n="seo.nav.live">Mapa ao Vivo</a>
    <a href="https://play.google.com/store/apps/details?id=com.alertoo.app" target="_blank" rel="noopener" data-i18n="seo.nav.download">Baixar App</a>
  </div>
</nav>

<section class="hero">
  <div class="hero-badge">${cat.hero.badge}</div>
  <h1>${c.h1}</h1>
  <p>${esc(c.heroP)}</p>
  <div class="cta-group">
    <a class="btn-primary" href="/eventos" data-i18n="seo.btn.map">Ver Mapa Agora</a>
    <a class="btn-secondary" href="https://play.google.com/store/apps/details?id=com.alertoo.app" target="_blank" rel="noopener" data-i18n="seo.btn.free">Baixar Grátis</a>
  </div>
</section>

<div class="ad-slot-wrap-full" id="adWrapTop">
  <span class="ad-label" data-i18n="seo.ad">Publicidade</span>
  <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-4349309505537394" data-ad-slot="${cat.adSlots.top}" data-ad-format="auto" data-full-width-responsive="true"></ins>
</div>

<section class="map-section">
  <h2>${esc(c.mapH2)}</h2>
  <div class="map-frame">
    <iframe src="/eventos" title="${esc(c.mapH2)} — Alertoo" loading="lazy" allow="geolocation"></iframe>
  </div>
  <p class="map-caption">${esc(c.mapCaption)}</p>
</section>
${alertBannerHtml}
<section class="recent-section">
  <h2>${esc(c.recentH2)}</h2>
  <div class="recent-list" id="recentList">
    <div class="recent-empty">Carregando reportes recentes...</div>
  </div>
</section>

<div class="stats">
  <div class="stat-card">
    <div class="stat-number">100%</div>
    <div class="stat-label" data-i18n="seo.stat.free">Gratuito</div>
  </div>
  <div class="stat-card">
    <div class="stat-number" data-i18n="seo.stat.live">Ao vivo</div>
    <div class="stat-label" data-i18n="seo.stat.liveAlerts">Alertas em tempo real</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">Android<br/>+ iOS</div>
    <div class="stat-label" data-i18n="seo.stat.allPlatforms">Disponível para todos</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">1 toque</div>
    <div class="stat-label" data-i18n="seo.stat.report">Para reportar</div>
  </div>
</div>

<section class="info-section">
  <h2>${esc(c.infoH2)}</h2>
  <div class="info-grid">
${infoCardsHtml}
  </div>
</section>

<div class="ad-slot-wrap" id="adWrapMid">
  <span class="ad-label" data-i18n="seo.ad">Publicidade</span>
  <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-4349309505537394" data-ad-slot="${cat.adSlots.mid}" data-ad-format="auto" data-full-width-responsive="true"></ins>
</div>

<section class="faq-section">
  <h2 data-i18n="seo.faqH2">Perguntas Frequentes</h2>
${faqHtml}
</section>

<section class="cities-section">
  <h2>${esc(c.citiesH2)}</h2>
  <h3>Por Estado</h3>
  <div class="cities-grid">
${stateCards}
  </div>
  <h3>Principais Cidades</h3>
  <div class="cities-grid">
${cityCards}
  </div>
</section>

<div class="ad-slot-wrap-full" id="adWrapBot">
  <span class="ad-label" data-i18n="seo.ad">Publicidade</span>
  <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-4349309505537394" data-ad-slot="${cat.adSlots.bot}" data-ad-format="auto" data-full-width-responsive="true"></ins>
</div>

<section class="download-cta">
  <h2 data-i18n="seo.ctaH2default">Baixe Grátis e Fique Informado</h2>
  <p data-i18n="seo.ctaPdefault">Receba alertas de trânsito em tempo real perto de você.</p>
  <div class="store-badges">
    <a class="store-badge" href="https://play.google.com/store/apps/details?id=com.alertoo.app" target="_blank" rel="noopener" data-i18n="seo.btn.googlePlay">▶ Google Play</a>
    <a class="store-badge" href="https://apps.apple.com/br/app/alertoo/id6744862588" target="_blank" rel="noopener" data-i18n="seo.btn.appStore"> App Store</a>
  </div>
</section>

<footer>
  <p>
    <a href="/">Alertoo</a> &bull;
    <a href="/eventos" data-i18n="seo.nav.live">Mapa ao Vivo</a> &bull;
    <a href="/privacidade.html" data-i18n="seo.footer.privacy">Privacidade</a> &bull;
    <a href="/deletar-conta.html" data-i18n="seo.footer.delete">Deletar Conta</a>
  </p>
  <p style="margin-top:10px;"><span data-i18n="footer.rights">© 2025 Alertoo. Todos os direitos reservados.</span></p>
</footer>

<script>
  function initAds(){document.querySelectorAll('ins.adsbygoogle').forEach(function(ins){var s=ins.getAttribute('data-ad-slot')||'';if(s.startsWith('SLOT_'))return;try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(_){}});}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',initAds):initAds();
</script>

<script>
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.parentElement;
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
</script>

<!-- VEJA TAMBÉM -->
<section style="background:#1E293B;padding:40px 5%;margin-top:0;">
  <div style="max-width:780px;margin:0 auto;">
    <h3 style="font-size:16px;font-weight:700;color:rgba(255,255,255,0.5);letter-spacing:1px;text-transform:uppercase;margin-bottom:20px;" data-i18n="seo.seeAlso">Veja também</h3>
    <div style="display:flex;flex-wrap:wrap;gap:12px;">
${seeAlsoLinks(cat.dirSlug, slug)}
    </div>
  </div>
</section>

<!-- COOKIE BANNER (LGPD) -->
<div id="cookieBanner" style="display:none;position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#1E293B;border-top:1px solid rgba(255,255,255,0.1);padding:16px 5%;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
  <p style="font-size:13px;color:rgba(255,255,255,0.7);flex:1;min-width:220px;margin:0;">
    <span data-i18n="cookie.text">Usamos cookies para melhorar sua experiência e exibir anúncios relevantes.
    Ao continuar, você concorda com nossa</span> <a href="/privacidade.html" style="color:#FF5722;" data-i18n="cookie.privacy">Política de Privacidade</a>.
  </p>
  <div style="display:flex;gap:8px;flex-shrink:0;">
    <button onclick="handleCookie(false)" style="background:transparent;border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.6);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;" data-i18n="cookie.decline">Recusar</button>
    <button onclick="handleCookie(true)" style="background:#FF5722;border:none;color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;" data-i18n="cookie.accept">Aceitar</button>
  </div>
</div>
<script>
  (function() {
    var c = localStorage.getItem('cookieConsent');
    if (!c) document.getElementById('cookieBanner').style.display = 'flex';
  })();
  function handleCookie(accept) {
    localStorage.setItem('cookieConsent', accept ? 'accepted' : 'declined');
    document.getElementById('cookieBanner').style.display = 'none';
  }
</script>
<script>
  (function() {
    var urlLang = new URLSearchParams(location.search).get('lang');
    if (urlLang) {
      var supported = ['pt-BR','en','es','fr','pt-PT'];
      if (supported.indexOf(urlLang) !== -1) {
        localStorage.setItem('alertoo_lang', urlLang);
        var url = new URL(location.href);
        url.searchParams.delete('lang');
        history.replaceState({}, '', url.pathname + (url.search || ''));
      }
    }
  })();
</script>
<script src="/i18n.js"></script>
<script src="/i18n-extra.js"></script>
<script src="/i18n-extra2.js"></script>

<!-- DADOS RECENTES — busca eventos reais do Firestore -->
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
        collection(db, 'events'),
        where('expiresAt', '>', Timestamp.now()),
        orderBy('expiresAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      const docs = snap.docs
        .filter(d => ${filterExpr})
        .slice(0, 8);
      if (docs.length === 0) {
        el.innerHTML = '<div class="recent-empty">${esc(c.recentEmptyText)}</div>';
        return;
      }
      el.innerHTML = docs.map(d => {
        const data = d.data();
        const created = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
        const desc = (data.description || data.title || '${cat.breadcrumbName}').toString();
        const city = data.cityName || '${esc(label)}';
        return \`<div class="recent-item">
          <div class="recent-emoji">${cat.recentEmoji}</div>
          <div class="recent-text">
            <div class="recent-desc">\${escapeHtml(desc)}</div>
            <div class="recent-city">\${escapeHtml(city)} — ${cfg.stateUF}</div>
          </div>
          <div class="recent-time">\${timeAgo(created)}</div>
        </div>\`;
      }).join('');
    } catch (err) {
      el.innerHTML = '<div class="recent-empty">Não foi possível carregar os reportes agora. Veja o mapa ao vivo acima.</div>';
    }
  }

  loadRecent();
</script>
</body>
</html>
`;
}

// ── Execução ───────────────────────────────────────────────────────────
let count = 0;
for (const catKey of Object.keys(CATEGORIES)) {
  const catDir = join(PUBLIC_DIR, CATEGORIES[catKey].dirSlug);
  for (const slug of Object.keys(PAGES)) {
    const outDir = join(catDir, slug);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    const html = buildPage(catKey, slug);
    writeFileSync(join(outDir, 'index.html'), html, 'utf8');
    count++;
  }
}

console.log(`🎉 Concluído: ${count} páginas geradas (3 categorias x ${Object.keys(PAGES).length} locais).`);
