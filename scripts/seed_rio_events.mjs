/**
 * seed_rio_events.mjs — Adiciona eventos reais de junho 2026 no Rio de Janeiro
 *
 * Uso:
 *   node scripts/seed_rio_events.mjs
 */

const FIREBASE_API_KEY = 'AIzaSyCoI9rNBK07vGZBuygprq4PkDKGT0iZkYU';
const PROJECT_ID       = 'lei-seca---eventos';
const FIRESTORE_BASE   = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const AUTH_URL         = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

// Usa a conta admin para ter permissão de escrita
const ADMIN_EMAIL    = 'adrianosethi@hotmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

async function getAuthToken() {
  // Tenta login com email/senha do admin
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true }),
    });
    const data = await res.json();
    if (data.idToken) {
      console.log(`✓ Login admin OK — UID: ${data.localId}`);
      return { token: data.idToken, uid: data.localId };
    }
  }
  // Fallback: anônimo
  const res2 = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const data2 = await res2.json();
  if (!data2.idToken) throw new Error(`Auth falhou: ${JSON.stringify(data2)}`);
  console.log(`✓ Auth anônima OK — UID: ${data2.localId}`);
  return { token: data2.idToken, uid: data2.localId };
}

async function createDoc(collection, body, token) {
  const res = await fetch(`${FIRESTORE_BASE}/${collection}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Firestore error: ${JSON.stringify(data.error)}`);
  return data;
}

function now()       { return Date.now(); }
function daysMs(d)   { return d * 24 * 3600 * 1000; }
function ts(ms)      { return { timestampValue: new Date(ms).toISOString() }; }
function str(v)      { return { stringValue: String(v) }; }
function num(v)      { return { doubleValue: Number(v) }; }
function bool(v)     { return { booleanValue: Boolean(v) }; }
function intVal(v)   { return { integerValue: String(Math.round(v)) }; }
function nullVal()   { return { nullValue: 'NULL_VALUE' }; }
function arr(...items) { return { arrayValue: { values: items } }; }

// ─── Eventos de Entretenimento do Rio de Janeiro ──────────────────────────────

const EVENTS = [
  {
    title: 'Fan Fest Copa do Mundo 2026 — Copacabana',
    category: 'festival',
    description: 'Fan Fest oficial na Praia de Copacabana com telões gigantes, shows e atrações para torcer junto com os fãs de futebol de todo o Brasil. Entrada gratuita.',
    address: 'Praia de Copacabana, Rio de Janeiro — RJ',
    latitude: -22.9711,
    longitude: -43.1822,
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    expiresInDays: 44, // até 19 de julho
  },
  {
    title: 'Rio Marathon 2026 — Maratona do Rio',
    category: 'show',
    description: 'A maior maratona do Brasil! Provas de 5k, 10k, 21k e 42k. Ativações fitness espalhadas pela cidade. Largada no Aterro do Flamengo.',
    address: 'Aterro do Flamengo, Rio de Janeiro — RJ',
    latitude: -22.9264,
    longitude: -43.1757,
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    expiresInDays: 2,
  },
  {
    title: 'Carol Saboya — Bossas e Outros Sons (25 anos)',
    category: 'show',
    description: 'Carol Saboya celebra 25 anos de carreira com o espetáculo "Bossas e Outros Sons". Uma noite especial de música brasileira e bossa nova.',
    address: 'Rio de Janeiro — RJ',
    latitude: -22.9756,
    longitude: -43.1875,
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    expiresInDays: 11,
  },
  {
    title: 'Festa do Medo e Delírio — Circo Voador',
    category: 'festa',
    description: 'Uma das festas mais icônicas do Rio no lendário Circo Voador, na Lapa. Música eletrônica, performances e muito entretenimento.',
    address: 'Circo Voador, Rua dos Arcos — Lapa, Rio de Janeiro — RJ',
    latitude: -22.9065,
    longitude: -43.1812,
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    expiresInDays: 15,
  },
  {
    title: 'Grupo Barbatuques — "Boa Noite Povo"',
    category: 'show',
    description: 'O Grupo Barbatuques apresenta "Boa Noite Povo" no Teatro Axia Casa Grande. Percussão corporal, música e poesia em espetáculo único.',
    address: 'Teatro Axia Casa Grande, Leblon, Rio de Janeiro — RJ',
    latitude: -22.9862,
    longitude: -43.2248,
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    expiresInDays: 23,
  },
  {
    title: 'Festa Copa — Lapa com Marimbondo Não Respeita',
    category: 'festa',
    description: 'Estreia do Brasil na Copa do Mundo com festa especial na Lapa! Show com Marimbondo Não Respeita, DJ Lencinho e Digital Mandinga. Telão LED, petiscos e dose dupla de cerveja a cada gol.',
    address: 'Lapa, Rio de Janeiro — RJ',
    latitude: -22.9068,
    longitude: -43.1788,
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    expiresInDays: 8,
  },
  {
    title: 'Pink Flamingo Arena Copa 2026',
    category: 'festa',
    description: 'O Pink Flamingo, um dos principais bares LGBTQIAPN+ do Rio, recebe a Arena Copa com DJs e telões para os jogos. Entrada gratuita até 22h.',
    address: 'Pink Flamingo, Copacabana, Rio de Janeiro — RJ',
    latitude: -22.9656,
    longitude: -43.1824,
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    expiresInDays: 19,
  },
  {
    title: 'Jogos da Copa no Quiosque — Ipanema',
    category: 'restaurante',
    description: 'Quiosque à beira-mar de Ipanema transmite os jogos do Brasil na Copa! DJ a partir das 16h, dose dupla de chopp e caipirinha a cada gol da Seleção.',
    address: 'Orla de Ipanema, Rio de Janeiro — RJ',
    latitude: -22.9865,
    longitude: -43.2034,
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    expiresInDays: 30,
  },
  {
    title: 'Festival de Inverno Rio 2026',
    category: 'festival',
    description: 'Festival de Inverno do Rio de Janeiro com shows, gastronomia e cultura. De 24 de julho a 2 de agosto. Uma das festas mais aguardadas do inverno carioca.',
    address: 'Rio de Janeiro — RJ',
    latitude: -22.9035,
    longitude: -43.1724,
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    expiresInDays: 49,
  },
  {
    title: 'Rio Nature & Climate Week 2026',
    category: 'festival',
    description: 'Encontro internacional que une as agendas de clima e biodiversidade. Painéis, exposições e atividades abertas ao público na zona portuária do Rio.',
    address: 'Zona Portuária, Rio de Janeiro — RJ',
    latitude: -22.8974,
    longitude: -43.1802,
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    expiresInDays: 1,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('🎉 Adicionando eventos do Rio de Janeiro ao Alertoo...\n');

const { token, uid } = await getAuthToken();

let success = 0;
let failed = 0;

for (const ev of EVENTS) {
  try {
    const createdAt = now();
    const expiresAt = createdAt + daysMs(ev.expiresInDays);

    const body = {
      fields: {
        title:       str(ev.title),
        category:    str(ev.category),
        description: str(ev.description),
        address:     str(ev.address),
        latitude:    num(ev.latitude),
        longitude:   num(ev.longitude),
        cityName:    str(ev.cityName),
        stateUF:     str(ev.stateUF),
        countryCode: str('BR'),
        userId:      str(uid),
        likes:       arr(),
        attendees:   arr(),
        commentCount: intVal(0),
        viewCount:   intVal(0),
        avgRating:   nullVal(),
        ratingCount: intVal(0),
        promotionTier:    nullVal(),
        promotionEndDate: nullVal(),
        isFeatured:  bool(false),
        isRecurring: bool(false),
        createdAt:   ts(createdAt),
        expiresAt:   ts(expiresAt),
      },
    };

    await createDoc('entertainment_events', body, token);
    console.log(`✅ ${ev.title.slice(0, 55)}...`);
    success++;
    // Pausa para não throttlar o Firestore
    await new Promise(r => setTimeout(r, 300));
  } catch (e) {
    console.error(`❌ ${ev.title}: ${e.message}`);
    failed++;
  }
}

console.log(`\n✨ Concluído! ${success} eventos adicionados, ${failed} falhas.`);
console.log('   Abra o Alertoo e filtre por Rio de Janeiro para ver os eventos! 🗺️');
