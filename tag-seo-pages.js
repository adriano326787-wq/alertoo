const fs = require('fs');

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function applyCommon(html) {
  html = html.replace(/<a (href="\/eventos"[^>]*)>Mapa ao Vivo<\/a>/g,
    '<a $1 data-i18n="seo.nav.live">Mapa ao Vivo</a>');
  html = html.replace(/<a (href="\/eventos"[^>]*)>🔴 Ao vivo<\/a>/g,
    '<a $1 data-i18n="seo.nav.live2">🔴 Ao vivo</a>');
  html = html.replace(/(<a [^>]*play\.google[^>]*)>Baixar App<\/a>/g,
    '$1 data-i18n="seo.nav.download">Baixar App</a>');
  html = html.replace(/<a (class="btn-primary"[^>]*)>Ver Mapa Agora<\/a>/g,
    '<a $1 data-i18n="seo.btn.map">Ver Mapa Agora</a>');
  html = html.replace(/<a (class="btn-secondary"[^>]*)>Baixar Grátis<\/a>/g,
    '<a $1 data-i18n="seo.btn.free">Baixar Grátis</a>');
  html = html.replace(/<a (class="btn-primary"[^>]*)>Baixar Grátis Agora<\/a>/g,
    '<a $1 data-i18n="seo.btn.freeNow">Baixar Grátis Agora</a>');
  html = html.replace(/<a (class="btn-secondary"[^>]*)>Ver Mapa ao Vivo<\/a>/g,
    '<a $1 data-i18n="seo.btn.map">Ver Mapa ao Vivo</a>');
  html = html.replace(/<span class="ad-label">Publicidade<\/span>/g,
    '<span class="ad-label" data-i18n="seo.ad">Publicidade</span>');
  html = html.replace(/(<p class="map-caption">)Dados reportados pela comunidade em tempo real\. Atualizados continuamente\.(<\/p>)/g,
    '$1<span data-i18n="seo.map.caption">Dados reportados pela comunidade em tempo real. Atualizados continuamente.</span>$2');
  html = html.replace(/<div class="stat-label">Gratuito<\/div>/g,
    '<div class="stat-label" data-i18n="seo.stat.free">Gratuito</div>');
  html = html.replace(/<div class="stat-label">Alertas em tempo real<\/div>/g,
    '<div class="stat-label" data-i18n="seo.stat.liveAlerts">Alertas em tempo real</div>');
  html = html.replace(/<div class="stat-label">Disponível para todos<\/div>/g,
    '<div class="stat-label" data-i18n="seo.stat.allPlatforms">Disponível para todos</div>');
  html = html.replace(/<div class="stat-number">Ao vivo<\/div>/g,
    '<div class="stat-number" data-i18n="seo.stat.live">Ao vivo</div>');
  html = html.replace(/<div class="stat-label">Para reportar uma blitz<\/div>/g,
    '<div class="stat-label" data-i18n="seo.stat.report">Para reportar uma blitz</div>');
  html = html.replace(/(<a class="store-badge"[^>]*play\.google[^>]*)>\s*▶ Google Play\s*<\/a>/g,
    '$1 data-i18n="seo.btn.googlePlay">▶ Google Play</a>');
  html = html.replace(/(<a class="store-badge"[^>]*apps\.apple[^>]*)>\s*App Store\s*<\/a>/g,
    '$1 data-i18n="seo.btn.appStore"> App Store</a>');
  html = html.replace(/<a href="\/eventos">Mapa ao Vivo<\/a>/g,
    '<a href="/eventos" data-i18n="seo.footer.live">Mapa ao Vivo</a>');
  html = html.replace(/<a href="\/privacidade\.html">Privacidade<\/a>/g,
    '<a href="/privacidade.html" data-i18n="seo.footer.privacy">Privacidade</a>');
  html = html.replace(/<a href="\/deletar-conta\.html">Deletar Conta<\/a>/g,
    '<a href="/deletar-conta.html" data-i18n="seo.footer.delete">Deletar Conta</a>');
  html = html.replace(/<h3>Veja também<\/h3>/g,
    '<h3 data-i18n="seo.seeAlso">Veja também</h3>');
  html = html.replace(/<a href="\/lei-seca">🚔 Lei Seca<\/a>/g,
    '<a href="/lei-seca" data-i18n="seo.link.dui">🚔 Lei Seca</a>');
  html = html.replace(/<a href="\/festas-e-eventos">🎉 Festas<\/a>/g,
    '<a href="/festas-e-eventos" data-i18n="seo.link.parties">🎉 Festas</a>');
  return html;
}

const pageConfig = [
  {
    file: 'public/lei-seca.html', px: 'ls',
    badge: '🚔 Lei Seca ao Vivo',
    h1: 'Onde Está a', h1span: 'Lei Seca Hoje?',
    mapH2: 'Mapa de Blitz ao Vivo',
    infoH2: 'Tudo sobre Lei Seca',
    h3s: ['O que é a Lei Seca?','Multas e Penalidades','Como Funciona a Blitz?','Como usar o Alertoo?','Quando Ocorrem as Blitz?','Seus Direitos na Blitz'],
    faqH2: 'Perguntas Frequentes sobre Lei Seca',
    faqs: ['Onde está a lei seca hoje?','O que acontece se eu beber e dirigir?','Posso me recusar ao bafômetro?','Como reportar uma blitz de lei seca pelo Alertoo?','Os alertas do Alertoo são confiáveis?','O Alertoo tem lei seca em qual cidade?'],
    ctaH2: 'Baixe Grátis e Fique Informado',
  },
  {
    file: 'public/acidentes.html', px: 'ac',
    badge: '🚨 Ao Vivo Agora',
    h1: 'Acidentes de Trânsito', h1span: 'Agora Perto de Você',
    mapH2: 'Mapa de Acidentes ao Vivo',
    infoH2: 'Por que usar o Alertoo para acidentes?',
    h3s: ['Tempo Real','Mapa Interativo','Comunidade Colaborativa','1 Toque para Reportar','Rodovias e Vias Urbanas','Notificações Próximas'],
    faqH2: 'Perguntas Frequentes',
    faqs: ['Como ver acidentes de trânsito ao vivo perto de mim?','Como reportar um acidente pelo Alertoo?','O Alertoo funciona em rodovias?','O Alertoo é melhor que o Waze para acidentes?','O app Alertoo é gratuito?'],
    ctaH2: 'Evite Acidentes na Sua Rota 🚨',
  },
  {
    file: 'public/alagamentos.html', px: 'al',
    badge: '🌧️ Tempo Real',
    h1: 'Alagamentos e Enchentes', h1span: 'Agora Perto de Você',
    mapH2: 'Mapa de Alagamentos ao Vivo',
    infoH2: 'Fique Seguro nas Chuvas',
    h3s: ['Alertas em Tempo Real','Localização Exata','Rota Alternativa','Reporte em 1 Toque','Cobertura Nacional','Alertas com Validade'],
    faqH2: 'Perguntas Frequentes',
    faqs: ['Como ver alagamentos ao vivo perto de mim?','Como saber quais ruas estão alagadas agora em SP?','O Alertoo avisa sobre alagamentos antes de eu sair?','É seguro atravessar uma rua alagada?','O Alertoo funciona para enchentes em estradas?'],
    ctaH2: 'Não seja pego de surpresa pela chuva 🌧️',
  },
  {
    file: 'public/festas-e-eventos.html', px: 'fe',
    badge: '🎉 Eventos ao Vivo',
    h1: 'Festas e Baladas', h1span: 'Perto de Você Agora',
    mapH2: 'Mapa de Eventos ao Vivo',
    infoH2: 'Descubra o que Rola na Sua Cidade',
    h3s: ['Abra o mapa','Explore eventos','Reporte a sua festa','Confirme eventos','Festas e Baladas','Shows e Música ao Vivo','Eventos ao Ar Livre','Bares e Botequins','Localização em Tempo Real','Comunidade Colaborativa'],
    faqH2: 'Perguntas Frequentes',
    faqs: ['O que está rolando perto de mim hoje à noite?','Como descobrir festas abertas perto de mim?','Posso divulgar minha festa ou evento gratuitamente?','O Alertoo é diferente do Facebook Eventos?','O Alertoo tem baladas em São Paulo e Rio de Janeiro?','Precisa pagar para usar o Alertoo?'],
    ctaH2: 'Não Perca Nenhuma Festa 🎉',
  },
  {
    file: 'public/fim-de-semana.html', px: 'fw',
    badge: '🗓️ Fim de Semana',
    h1: 'O Que Fazer no', h1span: 'Fim de Semana?',
    mapH2: 'Mapa de Eventos ao Vivo',
    infoH2: 'Seu Fim de Semana Cheio de Opções',
    h3s: ['Festas e Baladas','Shows e Música ao Vivo','Eventos ao Ar Livre','Eventos Gratuitos','Localização Exata','Confirmado pela Comunidade'],
    faqH2: 'Perguntas Frequentes',
    faqs: ['O que fazer no fim de semana perto de mim?','Como achar eventos gratuitos no fim de semana?','Como divulgar meu evento de sábado ou domingo?','O Alertoo funciona no interior?','Preciso pagar para ver os eventos no Alertoo?'],
    ctaH2: 'Nunca Fique Sem Saber o Que Fazer 🎉',
  },
  {
    file: 'public/alternativa-waze.html', px: 'wz',
    badge: '🗺️ App de Trânsito',
    h1: 'A Melhor', h1span: 'Alternativa ao Waze',
    mapH2: 'Mapa de Alertas ao Vivo',
    infoH2: 'Por que usar o Alertoo?',
    h3s: ['Lei Seca em Destaque','Alagamentos','Eventos e Festas','Funciona pelo Site','100% Brasileiro','Sempre Gratuito'],
    faqH2: 'Perguntas Frequentes',
    faqs: ['O Alertoo substitui o Waze?','O Alertoo avisa sobre blitz de lei seca como o Waze?','O Alertoo tem navegação GPS?','O Alertoo é gratuito e sem anúncios?','Como baixar o Alertoo?'],
    ctaH2: 'Baixe Agora e Complete o Waze 🗺️',
  },
  {
    file: 'public/radares.html', px: 'rd',
    badge: '📷 Radar ao Vivo',
    h1: 'Onde Tem Radar', h1span: 'Hoje Agora?',
    mapH2: 'Mapa de Radares e Fiscalizações ao Vivo',
    infoH2: 'Tudo sobre Radares de Velocidade',
    h3s: ['Radar Fixo','Radar Móvel','Radar em Veículo','Fiscalização Eletrônica','Alertas da Comunidade','Dirija com Segurança'],
    faqH2: 'Perguntas Frequentes',
    faqs: ['Como saber onde tem radar móvel hoje?','Qual app avisa sobre radar de velocidade no Brasil?','Como reportar um radar móvel no Alertoo?','Qual a multa por excesso de velocidade em 2025?','O Alertoo é gratuito?'],
    ctaH2: 'Fique Sempre à Frente dos Radares 📷',
  },
];

pageConfig.forEach(cfg => {
  let html = fs.readFileSync(cfg.file, 'utf8');
  html = applyCommon(html);
  const px = cfg.px;

  // hero badge
  html = html.replace(
    new RegExp('(<div class="hero-badge">)' + escapeRe(cfg.badge) + '(</div>)'),
    '<div class="hero-badge" data-i18n="' + px + '.badge">' + cfg.badge + '</div>'
  );

  // hero h1 with span
  if (cfg.h1span) {
    html = html.replace(
      new RegExp('(<h1>)' + escapeRe(cfg.h1) + '<br/><span>' + escapeRe(cfg.h1span) + '</span>(</h1>)'),
      '<h1 data-i18n-html="' + px + '.h1">' + cfg.h1 + '<br/><span>' + cfg.h1span + '</span></h1>'
    );
  }

  // map section h2
  html = html.replace(
    new RegExp('(<section class="map-section">[\\s\\S]{0,100}<h2>)' + escapeRe(cfg.mapH2) + '(</h2>)'),
    (m) => m.replace('<h2>' + cfg.mapH2 + '</h2>', '<h2 data-i18n="' + px + '.mapH2">' + cfg.mapH2 + '</h2>')
  );

  // info section h2
  if (cfg.infoH2) {
    html = html.replace(
      new RegExp('(<section class="info-section"[\\s\\S]{0,100}<h2>)' + escapeRe(cfg.infoH2) + '(</h2>)'),
      (m) => m.replace('<h2>' + cfg.infoH2 + '</h2>', '<h2 data-i18n="' + px + '.infoH2">' + cfg.infoH2 + '</h2>')
    );
    // fallback: replace first unwrapped occurrence
    html = html.replace(
      new RegExp('(<h2>)' + escapeRe(cfg.infoH2) + '(</h2>)'),
      '<h2 data-i18n="' + px + '.infoH2">' + cfg.infoH2 + '</h2>'
    );
  }

  // h3 titles
  cfg.h3s.forEach((h3, i) => {
    html = html.replace(
      new RegExp('(<h3>)' + escapeRe(h3) + '(</h3>)'),
      '<h3 data-i18n="' + px + '.h3.' + (i+1) + '">' + h3 + '</h3>'
    );
  });

  // FAQ h2
  html = html.replace(
    new RegExp('(<h2>)' + escapeRe(cfg.faqH2) + '(</h2>)'),
    '<h2 data-i18n="' + px + '.faqH2">' + cfg.faqH2 + '</h2>'
  );

  // FAQ questions
  cfg.faqs.forEach((q, i) => {
    html = html.replace(
      new RegExp('(<div class="faq-q">)' + escapeRe(q) + '(</div>)'),
      '<div class="faq-q" data-i18n="' + px + '.faq.' + (i+1) + '">' + q + '</div>'
    );
  });

  // CTA h2
  html = html.replace(
    new RegExp('(<h2>)' + escapeRe(cfg.ctaH2) + '(</h2>)'),
    '<h2 data-i18n="' + px + '.ctaH2">' + cfg.ctaH2 + '</h2>'
  );

  fs.writeFileSync(cfg.file, html);
  const count = (html.match(/data-i18n/g)||[]).length;
  console.log('OK ' + cfg.file + ' — ' + count + ' attrs');
});
