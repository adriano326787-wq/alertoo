/**
 * tag-seo-v2.js — Tags remaining untranslated elements on all 7 SEO pages:
 * heroP, ctaP, chips, info card p, faq-a, Veja também links, map-caption variants
 */
const fs = require('fs');

function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// "Veja também" common link replacements
function applyVejaTambem(html) {
  html = html.replace(/(<a href="\/acidentes"[^>]*)>🚨 Acidentes agora<\/a>/g,
    '$1 data-i18n="seo.link.accidents">🚨 Acidentes agora</a>');
  html = html.replace(/(<a href="\/alagamentos"[^>]*)>🌧️ Alagamentos<\/a>/g,
    '$1 data-i18n="seo.link.floods">🌧️ Alagamentos</a>');
  html = html.replace(/(<a href="\/radares"[^>]*)>📷 Radares<\/a>/g,
    '$1 data-i18n="seo.link.radars">📷 Radares</a>');
  html = html.replace(/(<a href="\/fim-de-semana"[^>]*)>🗓️ Fim de Semana<\/a>/g,
    '$1 data-i18n="seo.link.weekend">🗓️ Fim de Semana</a>');
  html = html.replace(/(<a href="\/alternativa-waze"[^>]*)>🗺️ Alternativa ao Waze<\/a>/g,
    '$1 data-i18n="seo.link.wazeAlt">🗺️ Alternativa ao Waze</a>');
  html = html.replace(/(<a href="\/festas-e-eventos"[^>]*)>🎉 Festas e Baladas<\/a>/g,
    '$1 data-i18n="seo.link.partiesLong">🎉 Festas e Baladas</a>');
  return html;
}

// Cookie banner
function applyCookie(html) {
  html = html.replace(
    /(<p style="font-size:13px;color:rgba\(255,255,255,0\.7\);[^>]*>)\s*Usamos cookies para melhorar sua experiência e exibir anúncios relevantes\.\s*Ao continuar, você concorda com nossa <a href="\/privacidade\.html"[^>]*>Política de Privacidade<\/a>\.\s*(<\/p>)/,
    '$1<span data-i18n="cookie.text">Usamos cookies para melhorar sua experiência e exibir anúncios relevantes. Ao continuar, você concorda com nossa </span><a href="/privacidade.html" style="color:#FF5722;" data-i18n="cookie.privacy">Política de Privacidade</a>.<span></span>$2'
  );
  return html;
}

const pages = [
  {
    file: 'public/lei-seca.html', px: 'ls',
    heroP: 'Veja em tempo real todas as blitz e fiscalizações de lei seca reportadas pela comunidade. Alertoo é gratuito.',
    ctaP: 'Receba alertas de lei seca, blitz, acidentes e alagamentos em tempo real perto de você.',
    chips: [],
    cardPs: [
      'A Lei nº 11.705/2008 (atualizada pela Lei nº 12.760/2012) proíbe a ingestão de qualquer quantidade de álcool por motoristas no Brasil. Tolerância zero é a regra.',
      'A polícia para veículos aleatoriamente e solicita o bafômetro. Recusar é considerado infração grave, com as mesmas penalidades do resultado positivo.',
      'Baixe grátis, abra o mapa e veja os alertas próximos a você. Para reportar, toque no botão "+" e selecione "Lei Seca". O alerta aparece instantaneamente para todos.',
      'As blitz de lei seca acontecem especialmente sextas e sábados à noite, feriados e datas comemorativas — mas podem ocorrer a qualquer dia e horário.',
      'Você pode recusar o bafômetro, mas estará sujeito às penalidades. Solicite presença de advogado em caso de detenção. Seja respeitoso com os agentes.',
    ],
  },
  {
    file: 'public/acidentes.html', px: 'ac',
    heroP: 'Veja em tempo real acidentes, batidas e ocorrências reportadas pela comunidade no mapa. Evite congestionamentos e rotas perigosas.',
    ctaP: 'Baixe grátis e receba alertas de acidentes, alagamentos e blitz em tempo real perto de você.',
    chips: [],
    cardPs: [
      'Alertas aparecem no mapa segundos após serem reportados por motoristas reais na região.',
      'Veja a localização exata de cada ocorrência. Planeje sua rota para evitar congestionamentos causados por acidentes.',
      'Quanto mais motoristas usam, mais preciso fica. Cada alerta ajuda centenas de pessoas a evitar o mesmo trecho.',
      'Presenciou um acidente? Reporte em segundos pelo app. Seu alerta fica visível para todos os usuários da região.',
      'Funciona em estradas federais, estaduais, rodovias e vias urbanas em todo o Brasil.',
      'Receba alertas de acidentes na sua rota antes mesmo de sair de casa com o app instalado.',
    ],
  },
  {
    file: 'public/alagamentos.html', px: 'al',
    heroP: 'Veja ruas alagadas e pontos de enchente reportados em tempo real pela comunidade. Evite trajetos perigosos antes de sair de casa.',
    ctaP: 'Baixe grátis e veja alagamentos, acidentes e blitz em tempo real perto de você.',
    chips: [],
    cardPs: [
      'Assim que chove e ruas começam a alagar, usuários do Alertoo reportam no mapa. Você fica sabendo em segundos.',
      'Cada alerta de alagamento tem pin no mapa com localização precisa. Você vê qual rua, avenida ou trecho está com problema.',
      'Com o mapa ao vivo, você escolhe outro caminho antes de enfrentar o alagamento — economizando tempo e evitando riscos.',
      'Viu uma rua alagada? Reporte pelo app em segundos e ajude outros motoristas a desviar do ponto.',
      'São Paulo, Rio de Janeiro, Belo Horizonte e todo o Brasil. Funciona em qualquer cidade onde haja usuários do Alertoo.',
      'Os alertas expiram automaticamente após algumas horas, mantendo o mapa sempre atualizado com ocorrências recentes.',
    ],
  },
  {
    file: 'public/festas-e-eventos.html', px: 'fe',
    heroP: 'Veja em tempo real o que está rolando na sua cidade — festas, shows, baladas, eventos ao ar livre e muito mais. Reportados pela comunidade, grátis.',
    ctaP: 'Baixe grátis e descubra festas, baladas, shows e eventos ao vivo perto de você agora mesmo.',
    chips: ['🎉 Festas abertas','🎵 Shows ao vivo','🌃 Baladas','🍺 Bares com movimento','🎊 Eventos ao ar livre','🎶 Música ao vivo','🎭 Teatros e culturais','🏖️ Eventos de praia','⚽ Eventos esportivos'],
    cardPs: [
      'Fique sabendo das festas abertas e baladas que estão bombando perto de você — reportadas em tempo real por outros frequentadores.',
      'Shows de bandas locais, pagodes, forró, sertanejo, funk e muito mais. Encontre eventos musicais que estão acontecendo agora.',
      'Feiras, festivais, eventos em parques, praias e praças. O Alertoo centraliza tudo o que está rolando ao ar livre na sua região.',
      'Descubra quais bares estão com movimento, noite especial ou happy hour. Veja o que a comunidade está curtindo agora.',
      'Todos os eventos são fixados no mapa com localização exata. Saiba exatamente onde está acontecendo antes de sair de casa.',
      'Quanto mais pessoas usam, mais eventos aparecem. Ajude a comunidade reportando o que você vê — festas, shows, eventos esportivos.',
    ],
  },
  {
    file: 'public/fim-de-semana.html', px: 'fw',
    heroP: 'Descubra festas, shows, eventos ao ar livre e tudo que está rolando perto de você agora. Reportados pela comunidade, grátis.',
    ctaP: 'Baixe grátis e descubra festas, shows e eventos ao vivo perto de você toda semana.',
    chips: ['🎉 Festas','🎵 Shows','🌃 Baladas','🎊 Eventos ao ar livre','🎭 Teatro e cultura','🏖️ Praia e parques','⚽ Eventos esportivos','🍺 Bares e botequins'],
    cardPs: [
      'Festas abertas e baladas que estão bombando na sua cidade, reportadas em tempo real por quem está lá.',
      'Bandas locais, pagode, forró, sertanejo, funk — encontre shows acontecendo agora perto de você.',
      'Feiras, festivais, piqueniques, eventos em parques e praças. Tudo o que está rolando fora de casa.',
      'Muitos eventos reportados são gratuitos — feiras, shows em praça pública, eventos culturais e mais.',
      'Todo evento tem pin no mapa com endereço preciso. Saiba exatamente onde é antes de sair.',
      'Outros usuários confirmam os eventos, garantindo que a informação está atualizada e o evento está mesmo acontecendo.',
    ],
  },
  {
    file: 'public/alternativa-waze.html', px: 'wz',
    heroP: 'Alertoo é o app colaborativo brasileiro gratuito: veja blitz de lei seca, acidentes, alagamentos e eventos em tempo real no mapa. Android e iOS.',
    ctaP: 'Lei seca, alagamentos e eventos — o que o Waze não tem. Grátis para Android e iOS.',
    chips: [],
    cardPs: [],
  },
  {
    file: 'public/radares.html', px: 'rd',
    heroP: 'Veja radares móveis e blitz de velocidade reportados pela comunidade em tempo real no mapa. Evite multas e dirija com segurança.',
    ctaP: 'Baixe grátis e veja radares móveis, blitz de lei seca e alertas de trânsito em tempo real.',
    chips: [],
    cardPs: [
      'Instalado permanentemente na via, devidamente sinalizado. Registra automaticamente veículos acima da velocidade permitida.',
      'Operado por agentes em diferentes pontos da via. Muda de posição — por isso é mais importante ter alertas em tempo real.',
      'Instalado em viaturas ou motos da polícia. Registra velocidade de veículos que passam em sentido contrário ou ultrapassagem.',
      'Câmeras de monitoramento integradas ao sistema de multas automáticas — sem necessidade de agente presente.',
      'Motoristas reportam radares móveis em tempo real no Alertoo. Quanto mais usuários, mais preciso e completo fica o mapa.',
      'O objetivo do Alertoo não é "escapar" de radares, mas ajudar motoristas a dirigir com mais atenção e dentro dos limites de velocidade.',
    ],
  },
];

pages.forEach(cfg => {
  let html = fs.readFileSync(cfg.file, 'utf8');
  const px = cfg.px;

  // Apply Veja Também & cookie
  html = applyVejaTambem(html);

  // Hero <p> (right after </h1>)
  if (cfg.heroP) {
    html = html.replace(
      new RegExp('(<\/h1>\\s*)<p>' + esc(cfg.heroP) + '<\/p>'),
      '$1<p data-i18n="' + px + '.heroP">' + cfg.heroP + '</p>'
    );
  }

  // CTA <p> (inside download-cta)
  if (cfg.ctaP) {
    html = html.replace(
      new RegExp('(<section class="download-cta">[\\s\\S]{0,500})<p>' + esc(cfg.ctaP) + '<\/p>'),
      (m) => m.replace('<p>' + cfg.ctaP + '</p>', '<p data-i18n="' + px + '.ctaP">' + cfg.ctaP + '</p>')
    );
  }

  // Chips
  cfg.chips.forEach((chip, i) => {
    html = html.replace(
      new RegExp('(<div class="chip">)' + esc(chip) + '(<\/div>)'),
      '<div class="chip" data-i18n="' + px + '.chip.' + (i+1) + '">' + chip + '</div>'
    );
  });

  // Info card <p> descriptions
  cfg.cardPs.forEach((p, i) => {
    html = html.replace(
      new RegExp('(<div class="info-card">[\\s\\S]{0,200}?)<p>' + esc(p) + '<\/p>'),
      (m) => m.replace('<p>' + p + '</p>', '<p data-i18n="' + px + '.cardP.' + (i+1) + '">' + p + '</p>')
    );
  });

  // map-caption (fim-de-semana has "Eventos reportados..." instead of "Dados reportados...")
  html = html.replace(
    /<p class="map-caption">Eventos reportados pela comunidade em tempo real\. Atualizados continuamente\.<\/p>/,
    '<p class="map-caption" data-i18n="seo.map.caption2">Eventos reportados pela comunidade em tempo real. Atualizados continuamente.</p>'
  );

  fs.writeFileSync(cfg.file, html);
  const count = (html.match(/data-i18n/g)||[]).length;
  console.log('OK', cfg.file.split('/').pop(), '—', count, 'attrs');
});
