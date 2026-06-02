/**
 * seed_niteroi.mjs — Cria 50 eventos simulados em Niterói via Firestore REST API
 *
 * 25 eventos de trânsito (collection: events)
 * 25 eventos de entretenimento (collection: entertainment_events)
 *
 * Uso:
 *   node scripts/seed_niteroi.mjs
 */

// ─── Configuração Firebase ────────────────────────────────────────────────────

const FIREBASE_API_KEY  = 'AIzaSyCoI9rNBK07vGZBuygprq4PkDKGT0iZkYU';
const PROJECT_ID        = 'lei-seca---eventos';
const FIRESTORE_BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const AUTH_URL          = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;

// ─── Autenticação anônima ─────────────────────────────────────────────────────

async function getAuthToken() {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const data = await res.json();
  if (!data.idToken) throw new Error(`Auth falhou: ${JSON.stringify(data)}`);
  console.log(`✓ Auth anônima OK — UID: ${data.localId}`);
  return { token: data.idToken, uid: data.localId };
}

// ─── Helper REST ──────────────────────────────────────────────────────────────

async function createDoc(collection, body, token) {
  const res = await fetch(`${FIRESTORE_BASE}/${collection}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Firestore error: ${JSON.stringify(data.error)}`);
  return data;
}

function ts(ms) {
  return { timestampValue: new Date(ms).toISOString() };
}
function str(v)  { return { stringValue: v }; }
function num(v)  { return { doubleValue: v }; }
function int(v)  { return { integerValue: String(v) }; }
function bool(v) { return { booleanValue: v }; }
function arr(items) {
  return { arrayValue: { values: items } };
}
function nul() { return { nullValue: 'NULL_VALUE' }; }

// ─── Dados geográficos de Niterói ────────────────────────────────────────────

const BAIRROS = [
  { name: 'Icaraí',         lat: -22.9022, lon: -43.1264 },
  { name: 'Centro',         lat: -22.8838, lon: -43.1018 },
  { name: 'Ingá',           lat: -22.9008, lon: -43.1368 },
  { name: 'Fonseca',        lat: -22.8948, lon: -43.0978 },
  { name: 'São Francisco',  lat: -22.9289, lon: -43.1228 },
  { name: 'Piratininga',    lat: -22.9467, lon: -43.1136 },
  { name: 'Itaipu',         lat: -22.9571, lon: -43.0603 },
  { name: 'Charitas',       lat: -22.9286, lon: -43.1175 },
  { name: 'Santa Rosa',     lat: -22.9078, lon: -43.1094 },
  { name: 'Largo da Batalha', lat: -22.9148, lon: -43.0798 },
  { name: 'Camboinhas',     lat: -22.9697, lon: -43.0636 },
  { name: 'Barreto',        lat: -22.8898, lon: -43.1148 },
  { name: 'Vital Brazil',   lat: -22.9138, lon: -43.1048 },
  { name: 'Jurujuba',       lat: -22.9511, lon: -43.1008 },
  { name: 'Boa Viagem',     lat: -22.9198, lon: -43.1148 },
];

function jitter(val, range = 0.002) {
  return val + (Math.random() - 0.5) * range;
}

function pickBairro() {
  return BAIRROS[Math.floor(Math.random() * BAIRROS.length)];
}

const now = Date.now();

// ─── 25 EVENTOS DE TRÂNSITO ───────────────────────────────────────────────────

const ROAD_EVENTS = [
  // Acidentes
  { category: 'accident', title: 'Acidente com moto',        desc: 'Colisão entre moto e carro. Faixa direita bloqueada.',             ttl: 90  },
  { category: 'accident', title: 'Engavetamento na Av. Jansen de Melo', desc: 'Três veículos envolvidos. Aguardando guincho.', ttl: 120 },
  { category: 'accident', title: 'Batida na rotatória',      desc: 'Acidente entre dois carros. Desvio pelo acostamento.',             ttl: 60  },
  { category: 'accident', title: 'Carro capotado',           desc: 'Veículo capotou após bater em canteiro. Via parcialmente bloqueada.', ttl: 90 },
  { category: 'accident', title: 'Colisão traseira',         desc: 'Batida traseira durante congestionamento. Retorno lento.',          ttl: 60  },

  // Trânsito
  { category: 'traffic',  title: 'Congestionamento na Av. Ernani do Amaral Peixoto', desc: 'Trânsito intenso sentido Centro. Lentidão de 2 km.', ttl: 30 },
  { category: 'traffic',  title: 'Lentidão na Ponte',        desc: 'Fila na entrada da Ponte Rio-Niterói. Aguarde 20 min.',             ttl: 25  },
  { category: 'traffic',  title: 'Trânsito parado na Feliciano Sodré', desc: 'Semáforo com defeito. Fluxo em corredor.',               ttl: 20  },
  { category: 'traffic',  title: 'Congestionamento no Centro', desc: 'Trânsito pesado próximo ao Terminal João Goulart.',              ttl: 30  },
  { category: 'traffic',  title: 'Lentidão no Ingá',         desc: 'Manifestação bloqueia parcialmente a via. Desvio pela lateral.',   ttl: 35  },

  // Risco
  { category: 'hazard',   title: 'Buraco fundo na pista',    desc: 'Buraco grande no meio da faixa esquerda. Risco de dano ao veículo.', ttl: 45 },
  { category: 'hazard',   title: 'Óleo na pista',            desc: 'Mancha de óleo após acidente. Solo escorregadio.',                 ttl: 40  },
  { category: 'hazard',   title: 'Animal na pista',          desc: 'Cachorro solto na via. Reduza a velocidade.',                      ttl: 20  },
  { category: 'hazard',   title: 'Pedras na pista',          desc: 'Fragmentos de concreto após queda de muro. Use acostamento.',      ttl: 50  },
  { category: 'hazard',   title: 'Árvore caída',             desc: 'Árvore de médio porte caiu após chuva. Faixa bloqueada.',          ttl: 60  },

  // Alagamento
  { category: 'flood',    title: 'Alagamento na Av. Visconde do Rio Branco', desc: 'Pista inundada após chuva forte. Profundidade ~30 cm.', ttl: 180 },
  { category: 'flood',    title: 'Rua alagada no Fonseca',   desc: 'Água cobre meio-fio. Veículos baixos devem evitar.',               ttl: 120 },
  { category: 'flood',    title: 'Alagamento em Barreto',    desc: 'Galeria transbordou. Acesso por rua alternativa.',                 ttl: 150 },

  // Blitze
  { category: 'policeblitz', title: 'Blitz na Saída da Ponte', desc: 'Operação Bafômetro. Agentes verificando todos os veículos.',     ttl: 180 },
  { category: 'policeblitz', title: 'Fiscalização na Feliciano Sodré', desc: 'Blitz de documentação e bafômetro. Fila de ~500m.',     ttl: 150 },
  { category: 'drunkcheck',  title: 'Lei Seca na Praia de Icaraí', desc: 'Operação ativa próximo ao calçadão. Todos os veículos parados.', ttl: 240 },
  { category: 'drunkcheck',  title: 'Lei Seca no Largo da Batalha', desc: 'Fiscalização intensa. Agentes em ambos os sentidos.',      ttl: 200 },

  // Obras
  { category: 'roadwork', title: 'Obras na Av. Amaral Peixoto', desc: 'Recapeamento em andamento. Uma faixa liberada das 8h às 17h.',  ttl: 4320 },
  { category: 'roadwork', title: 'Obras de drenagem no Centro', desc: 'Galeria sendo substituída. Trânsito desviado por 3 dias.',     ttl: 4320 },
  { category: 'closure',  title: 'Via fechada para evento',  desc: 'Corrida de rua bloqueia a av. neste domingo. Use rotas alternativas.', ttl: 720 },
];

// ─── 25 EVENTOS DE ENTRETENIMENTO ────────────────────────────────────────────

const ENT_EVENTS = [
  // Shows
  { category: 'show',       title: 'Show de Samba na Praia de Icaraí',      desc: 'Roda de samba ao vivo com grupos locais. Entrada gratuita. Das 18h às 22h.', ttl: 18 },
  { category: 'show',       title: 'Pagode do Botequim',                     desc: 'Pagode e churrasco. Open bar de chopp. Mulher não paga até 21h.',           ttl: 16 },
  { category: 'show',       title: 'Forró no Largo do Boa Viagem',          desc: 'Banda de forró ao vivo. Aula de dança às 19h, show às 21h.',                ttl: 18 },
  { category: 'show',       title: 'Show de Rock — Tributo ao Legião',      desc: 'Tributo ao Legião Urbana. Ingressos na entrada. Aberto às 20h.',            ttl: 16 },
  { category: 'show',       title: 'Samba de Raiz em Jurujuba',             desc: 'Show ao ar livre com vista para a Baía de Guanabara.',                     ttl: 14 },

  // Festas
  { category: 'party',      title: 'Festa Junina de Icaraí',                desc: 'Quadrilha, comidas típicas e forró pé de serra. Família toda bem-vinda.',   ttl: 20 },
  { category: 'party',      title: 'Festa na Laje — Piratininga',           desc: 'DJ set e open bar. 18+. Camiseta obrigatória. A partir das 22h.',          ttl: 18 },
  { category: 'party',      title: 'Aniversário do Clube Icaraí',           desc: 'Festa de 50 anos com bufê e banda ao vivo. Sócios e convidados.',          ttl: 20 },
  { category: 'party',      title: 'Pool Party em Charitas',                desc: 'Festa na piscina com DJ, drinks e petiscos. Traje de banho obrigatório.',  ttl: 16 },
  { category: 'party',      title: 'Réveillon Antecipado no Caminho Niemeyer', desc: 'Festa pré-ano novo com fogos e DJ. Ingressos limitados.',              ttl: 20 },

  // Baladas
  { category: 'club',       title: 'Balada Eletrônica — Club Niterói',      desc: 'DJ internacional na pick. Open bar premium. Aberto das 23h às 6h.',       ttl: 20 },
  { category: 'club',       title: 'Noite do Funk — Boate Niterói',         desc: 'MC convidado, funk carioca e baile. Entrada R$30. 18+.',                   ttl: 18 },
  { category: 'club',       title: 'Karaokê Night',                         desc: 'Karaokê temático anos 80/90. Bebidas e aperitivos. Venha fantasiado!',     ttl: 14 },

  // Bares
  { category: 'bar',        title: 'Cerveja Artesanal — Icaraí Beer Week',  desc: 'Festival com 30 rótulos de cerveja artesanal. Música ao vivo na sexta.',  ttl: 36 },
  { category: 'bar',        title: 'Happy Hour na Beira Mar',               desc: 'Chopp gelado a R$8 e caipirinha a R$12. Petiscos gratuitos até as 19h.',  ttl: 36 },
  { category: 'bar',        title: 'Boteco do Porto — Feijoada Especial',   desc: 'Feijoada completa aos sábados. Com samba ao fundo. A partir do meio-dia.', ttl: 36 },
  { category: 'bar',        title: 'Bar do Chico — Noite de Trivia',        desc: 'Quiz de cultura geral com premiação. Equipes de até 5 pessoas.',          ttl: 24 },
  { category: 'bar',        title: 'Rooftop em São Francisco',              desc: 'Bar no telhado com vista para Niterói. Drinks autorais e boa música.',    ttl: 36 },

  // Restaurantes
  { category: 'restaurant', title: 'Rodízio Japonês em Icaraí',             desc: 'Rodízio completo de sushi e temaki. R$89,90/pessoa. Reservas pelo WhatsApp.', ttl: 36 },
  { category: 'restaurant', title: 'Churrascaria Gaúcha — Icaraí',         desc: 'Carnes nobres no espeto corrido. R$99,90. Crianças até 5 anos grátis.',   ttl: 36 },
  { category: 'restaurant', title: 'Frutos do Mar em Jurujuba',            desc: 'Camarão, peixe e lagosta frescos. Vista para a baía. Almoço e jantar.',   ttl: 36 },
  { category: 'restaurant', title: 'Brunch Dominical em Charitas',         desc: 'Brunch completo das 9h às 14h. R$65/pessoa. Café, sucos e doces artesanais.', ttl: 24 },

  // Festivais
  { category: 'festival',   title: 'Festival de Gastronomia de Niterói',   desc: 'Mais de 40 restaurantes participantes com pratos especiais por R$39.',   ttl: 72 },
  { category: 'festival',   title: 'Festival de Cinema de Niterói',        desc: 'Exibições ao ar livre no MAC Niterói. Entrada gratuita. 7 dias de programação.', ttl: 72 },
  { category: 'festival',   title: 'Feira Hippie de Icaraí',               desc: 'Artesanato, comida regional e música. Domingos das 8h às 18h.',           ttl: 72 },
  { category: 'festival',   title: 'Natal Iluminado no Centro',            desc: 'Decoração natalina e apresentações musicais gratuitas no calçadão.',      ttl: 72 },
];

// ─── Cria evento de trânsito ──────────────────────────────────────────────────

async function createRoadEvent(ev, token, uid) {
  const bairro = pickBairro();
  const lat = jitter(bairro.lat);
  const lon = jitter(bairro.lon);
  const createdAt = now - Math.floor(Math.random() * 3600000); // até 1h atrás
  const expiresAt = createdAt + ev.ttl * 60 * 1000;

  const body = {
    fields: {
      category:       str(ev.category),
      title:          str(ev.title),
      description:    str(ev.desc),
      latitude:       num(lat),
      longitude:      num(lon),
      createdAt:      ts(createdAt),
      expiresAt:      ts(expiresAt),
      userId:         str(uid),
      voters:         arr([str(uid)]), // já votado pelo criador = sem auto-voto
      confirmations:  int(Math.floor(Math.random() * 12)),
      denials:        int(Math.floor(Math.random() * 3)),
      cityName:       str('Niterói'),
      stateUF:        str('RJ'),
      countryCode:    str('BR'),
    },
  };

  const doc = await createDoc('events', body, token);
  const id = doc.name.split('/').pop();
  console.log(`  ✓ [road] ${ev.category.padEnd(12)} ${ev.title.substring(0, 45)} — ${bairro.name} (${id})`);
}

// ─── Cria evento de entretenimento ───────────────────────────────────────────

async function createEntEvent(ev, token, uid) {
  const bairro = pickBairro();
  const lat = jitter(bairro.lat);
  const lon = jitter(bairro.lon);
  const createdAt = now - Math.floor(Math.random() * 7200000); // até 2h atrás
  const expiresAt = createdAt + ev.ttl * 60 * 60 * 1000;
  const likes = Math.floor(Math.random() * 25);

  const body = {
    fields: {
      category:       str(ev.category),
      title:          str(ev.title),
      description:    str(ev.desc),
      latitude:       num(lat),
      longitude:      num(lon),
      createdAt:      ts(createdAt),
      expiresAt:      ts(expiresAt),
      userId:         str(uid),
      likes:          arr([]),
      commentCount:   int(Math.floor(Math.random() * 8)),
      cityName:       str('Niterói'),
      stateUF:        str('RJ'),
      countryCode:    str('BR'),
      photoUrl:       nul(),
      promotionTier:  nul(),
      promotionEndDate: nul(),
      promotionPhotoUrl: nul(),
      isFeatured:     bool(false),
    },
  };

  const doc = await createDoc('entertainment_events', body, token);
  const id = doc.name.split('/').pop();
  console.log(`  ✓ [ent]  ${ev.category.padEnd(12)} ${ev.title.substring(0, 45)} — ${bairro.name} (${id})`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Seed Niterói — criando 50 eventos simulados\n');

  const { token, uid } = await getAuthToken();

  console.log(`\n📍 Criando 25 eventos de TRÂNSITO...\n`);
  for (const ev of ROAD_EVENTS) {
    await createRoadEvent(ev, token, uid);
    await new Promise(r => setTimeout(r, 150)); // evita rate limiting
  }

  console.log(`\n🎉 Criando 25 eventos de ENTRETENIMENTO...\n`);
  for (const ev of ENT_EVENTS) {
    await createEntEvent(ev, token, uid);
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n✅ 50 eventos criados com sucesso em Niterói, RJ!`);
}

main().catch((err) => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
