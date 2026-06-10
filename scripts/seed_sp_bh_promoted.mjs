/**
 * seed_sp_bh_promoted.mjs
 * 1. Adiciona eventos de São Paulo (Gold 🥇) e Belo Horizonte (Silver 🥈)
 * 2. Promove todos os eventos do Rio de Janeiro já existentes (Bronze 🥉)
 */

const FIREBASE_API_KEY = 'AIzaSyCoI9rNBK07vGZBuygprq4PkDKGT0iZkYU';
const PROJECT_ID       = 'lei-seca---eventos';
const BASE             = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function auth() {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const d = await r.json();
  console.log(`✓ Auth OK — UID: ${d.localId}`);
  return { token: d.idToken, uid: d.localId };
}

async function post(path, body, token) {
  const r = await fetch(`${BASE}/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (d.error) throw new Error(JSON.stringify(d.error));
  return d;
}

async function patch(docName, fields, token) {
  const updateMask = Object.keys(fields).map(f => `updateMask.fieldPaths=${f}`).join('&');
  const r = await fetch(`https://firestore.googleapis.com/v1/${docName}?${updateMask}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields }),
  });
  const d = await r.json();
  if (d.error) throw new Error(JSON.stringify(d.error));
  return d;
}

async function query(filter, token) {
  const r = await fetch(`${BASE}:runQuery`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'entertainment_events' }],
      where: { fieldFilter: { field: { fieldPath: filter.field }, op: 'EQUAL', value: { stringValue: filter.value } } },
      limit: 50,
    }}),
  });
  const arr = await r.json();
  return arr.filter(a => a.document);
}

const now = Date.now();
const d   = (days) => new Date(now + days * 864e5).toISOString();

const str  = v => ({ stringValue: String(v) });
const num  = v => ({ doubleValue: Number(v) });
const bool = v => ({ booleanValue: Boolean(v) });
const int  = v => ({ integerValue: String(Math.round(v)) });
const nil  = () => ({ nullValue: 'NULL_VALUE' });
const ts   = v => ({ timestampValue: v });
const arr0 = () => ({ arrayValue: { values: [] } });

// ─── Eventos São Paulo — 🥇 GOLD ──────────────────────────────────────────────
const SP_EVENTS = [
  {
    title: 'Só Track Boa — 11ª Edição',
    category: 'festival',
    description: 'O maior festival de música eletrônica do Brasil! 4 palcos, +24h de música e 80 mil pessoas. Headliners internacionais no Autódromo de Interlagos. Não perca!',
    address: 'Autódromo de Interlagos, São Paulo — SP',
    lat: -23.7036, lon: -46.6974, city: 'São Paulo', uf: 'SP', days: 5,
  },
  {
    title: 'O Maior Encontro do Samba — Zeca, Alcione & Jorge Aragão',
    category: 'show',
    description: 'Três ícones do samba brasileiro em um único palco! Zeca Pagodinho, Alcione e Jorge Aragão no Allianz Parque. Um espetáculo histórico.',
    address: 'Allianz Parque, Perdizes, São Paulo — SP',
    lat: -23.5270, lon: -46.6763, city: 'São Paulo', uf: 'SP', days: 20,
  },
  {
    title: 'Kid Abelha — Allianz Parque',
    category: 'show',
    description: 'A banda que marcou gerações volta aos palcos! Kid Abelha em grande show no Allianz Parque com os maiores sucessos da história do pop rock nacional.',
    address: 'Allianz Parque, Perdizes, São Paulo — SP',
    lat: -23.5270, lon: -46.6763, city: 'São Paulo', uf: 'SP', days: 27,
  },
  {
    title: 'Disney On Ice — Festa em Família',
    category: 'show',
    description: 'Os personagens mais amados da Disney em apresentação de patinação no gelo! Mickey, Elsa, Moana e muito mais no Ginásio do Ibirapuera.',
    address: 'Ginásio do Ibirapuera, São Paulo — SP',
    lat: -23.5874, lon: -46.6576, city: 'São Paulo', uf: 'SP', days: 28,
  },
  {
    title: 'Festival Gastronômico SP — 10 Anos',
    category: 'festival',
    description: 'O maior festival gastronômico do mundo celebra 10 anos em São Paulo! Mais de 100 restaurantes, chefs estrelados e experiências culinárias únicas no Parque Villa-Lobos.',
    address: 'Parque Villa-Lobos, São Paulo — SP',
    lat: -23.5469, lon: -46.7248, city: 'São Paulo', uf: 'SP', days: 7,
  },
  {
    title: 'Arraiá do Ibirapuera 2026',
    category: 'festa',
    description: 'A maior festa junina de São Paulo! Quadrilhas, forró, comidas típicas, xadrez e muito arraiá no Parque do Ibirapuera. Entrada gratuita!',
    address: 'Parque Ibirapuera, São Paulo — SP',
    lat: -23.5874, lon: -46.6576, city: 'São Paulo', uf: 'SP', days: 28,
  },
  {
    title: 'Arena Copa do Mundo SP 2026',
    category: 'festival',
    description: 'Festa oficial da Copa do Mundo 2026 em São Paulo! Shows, telões gigantes, ativações de marcas e toda a emoção dos jogos ao vivo.',
    address: 'Vale do Anhangabaú, São Paulo — SP',
    lat: -23.5455, lon: -46.6362, city: 'São Paulo', uf: 'SP', days: 45,
  },
];

// ─── Eventos Belo Horizonte — 🥈 SILVER ──────────────────────────────────────
const BH_EVENTS = [
  {
    title: 'Alceu Valença — 80 Girassóis (Mineirão)',
    category: 'show',
    description: 'Alceu Valença celebra seus 80 anos com a turnê "80 Girassóis" no Mineirão! Uma celebração histórica da música nordestina e brasileira.',
    address: 'Mineirão, Pampulha, Belo Horizonte — MG',
    lat: -19.8656, lon: -43.9715, city: 'Belo Horizonte', uf: 'MG', days: 13,
  },
  {
    title: 'Marcos Catarina — Tributo a Vander Lee',
    category: 'show',
    description: 'Espetáculo emocionante dedicado à obra de Vander Lee, um dos maiores compositores de BH. Uma noite de música e memória no coração da cidade.',
    address: 'Belo Horizonte — MG',
    lat: -19.9191, lon: -43.9386, city: 'Belo Horizonte', uf: 'MG', days: 12,
  },
  {
    title: 'Flora — Miguel Amaro no Cine Theatro Brasil',
    category: 'show',
    description: 'Espetáculo "Flora" de Miguel Amaro no histórico Cine Theatro Brasil. Arte, música e emoção em um dos palcos mais tradicionais de BH.',
    address: 'Cine Theatro Brasil Vallourec, Centro, Belo Horizonte — MG',
    lat: -19.9166, lon: -43.9345, city: 'Belo Horizonte', uf: 'MG', days: 20,
  },
  {
    title: 'Auto da Compadecida — Grupo Maria Cutia',
    category: 'show',
    description: 'Mostra Cine Brasil de Teatro apresenta "Auto da Compadecida" pelo Grupo Maria Cutia. Um clássico da dramaturgia brasileira em versão imperdível.',
    address: 'Belo Horizonte — MG',
    lat: -19.9245, lon: -43.9352, city: 'Belo Horizonte', uf: 'MG', days: 27,
  },
  {
    title: 'Festas Juninas BH 2026',
    category: 'festa',
    description: 'As melhores festas juninas de Belo Horizonte! Arraiais espalhados pelos bairros com forró, quadrilhas, comidas típicas e muito forró pé de serra.',
    address: 'Belo Horizonte — MG',
    lat: -19.9324, lon: -43.9381, city: 'Belo Horizonte', uf: 'MG', days: 30,
  },
  {
    title: 'Copa do Mundo no Mineirão — Fan Zone BH',
    category: 'festival',
    description: 'Zona oficial de fãs da Copa do Mundo 2026 no Mineirão! Telões, shows e toda a animação dos jogos com os torcedores de Minas Gerais.',
    address: 'Mineirão, Pampulha, Belo Horizonte — MG',
    lat: -19.8656, lon: -43.9715, city: 'Belo Horizonte', uf: 'MG', days: 45,
  },
];

// ─── Campos de promoção por tier ──────────────────────────────────────────────
function promoFields(tier, uid, expiresInDays) {
  const endDate = new Date(now + expiresInDays * 864e5).toISOString();
  return {
    promotionTier:    str(tier),
    isFeatured:       bool(true),
    promotionEndDate: int(now + expiresInDays * 864e5),
    promotionWeeks:   int(Math.ceil(expiresInDays / 7)),
    promotionPackage: str(`${tier}-standard`),
    promotionActiveDays: int(expiresInDays),
    userId: str(uid),
  };
}

function buildEventDoc(ev, uid, tier) {
  const createdAt = now;
  const expiresAt = now + ev.days * 864e5;
  const promo     = promoFields(tier, uid, ev.days);
  return {
    fields: {
      title:       str(ev.title),
      category:    str(ev.category),
      description: str(ev.description),
      address:     str(ev.address),
      latitude:    num(ev.lat),
      longitude:   num(ev.lon),
      cityName:    str(ev.city),
      stateUF:     str(ev.uf),
      countryCode: str('BR'),
      userId:      str(uid),
      likes:       arr0(),
      attendees:   arr0(),
      commentCount: int(0),
      viewCount:   int(0),
      avgRating:   nil(),
      ratingCount: int(0),
      isRecurring: bool(false),
      createdAt:   ts(new Date(createdAt).toISOString()),
      expiresAt:   ts(new Date(expiresAt).toISOString()),
      ...promo,
    },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log('🚀 Iniciando seed de eventos promovidos...\n');

const { token, uid } = await auth();

let ok = 0, fail = 0;

// ── 1. Adicionar eventos de São Paulo (🥇 GOLD) ────────────────────────────
console.log('\n🥇 Adicionando eventos de São Paulo (Gold)...');
for (const ev of SP_EVENTS) {
  try {
    await post('entertainment_events', buildEventDoc(ev, uid, 'gold'), token);
    console.log(`  ✅ ${ev.title}`);
    ok++;
  } catch (e) { console.error(`  ❌ ${ev.title}: ${e.message}`); fail++; }
  await new Promise(r => setTimeout(r, 300));
}

// ── 2. Adicionar eventos de Belo Horizonte (🥈 SILVER) ────────────────────
console.log('\n🥈 Adicionando eventos de Belo Horizonte (Silver)...');
for (const ev of BH_EVENTS) {
  try {
    await post('entertainment_events', buildEventDoc(ev, uid, 'silver'), token);
    console.log(`  ✅ ${ev.title}`);
    ok++;
  } catch (e) { console.error(`  ❌ ${ev.title}: ${e.message}`); fail++; }
  await new Promise(r => setTimeout(r, 300));
}

// ── 3. Promover eventos do Rio de Janeiro já existentes (🥉 BRONZE) ────────
console.log('\n🥉 Promovendo eventos do Rio de Janeiro (Bronze)...');
const rioEvents = await query({ field: 'stateUF', value: 'RJ' }, token);
console.log(`  Encontrados ${rioEvents.length} eventos do RJ`);
for (const item of rioEvents) {
  try {
    const docName = item.document.name;
    await patch(docName, {
      promotionTier:       str('bronze'),
      isFeatured:          bool(true),
      promotionEndDate:    int(now + 30 * 864e5),
      promotionWeeks:      int(4),
      promotionPackage:    str('bronze-standard'),
      promotionActiveDays: int(30),
    }, token);
    const title = item.document.fields?.title?.stringValue ?? 'sem título';
    console.log(`  ✅ ${title.slice(0, 50)}`);
    ok++;
  } catch (e) { console.error(`  ❌ ${e.message}`); fail++; }
  await new Promise(r => setTimeout(r, 200));
}

console.log(`\n✨ Concluído! ${ok} operações com sucesso, ${fail} falhas.\n`);
console.log('📍 Eventos promovidos por cidade:');
console.log('   🥇 São Paulo     — 7 eventos Gold');
console.log('   🥈 Belo Horizonte — 6 eventos Silver');
console.log(`   🥉 Rio de Janeiro — ${rioEvents.length} eventos Bronze\n`);
console.log('Abra o Alertoo → aba Entretenimento para ver os pins promovidos no mapa! 🗺️');
