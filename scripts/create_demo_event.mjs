/**
 * Cria evento demo via Firebase Auth anônimo + Firestore REST API.
 * Uso: node scripts/create_demo_event.mjs
 */
import https from 'https';

const PROJECT_ID = 'lei-seca---eventos';
const API_KEY    = 'AIzaSyCoI9rNBK07vGZBuygprq4PkDKGT0iZkYU';

function post(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const buf = JSON.stringify(body);
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(buf), ...headers },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(buf);
    req.end();
  });
}

// 1) Login anônimo para obter idToken
console.log('🔑 Autenticando anonimamente...');
const authRes = await post(
  `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
  { returnSecureToken: true }
);

if (authRes.status !== 200) {
  console.error('❌ Falha na autenticação:', authRes.body);
  process.exit(1);
}

const idToken = authRes.body.idToken;
const uid     = authRes.body.localId;
console.log(`   UID: ${uid}`);

// 2) Cria o documento no Firestore
const now       = Date.now();
const expiresAt = now + 48 * 3600 * 1000;

const doc = {
  fields: {
    category:    { stringValue: 'show' },
    title:       { stringValue: '🎸 Show na Praia — Icaraí' },
    description: { stringValue: 'Evento demo — Simulação de navegação GPS. Praia de Icaraí, Niterói-RJ.' },
    address:     { stringValue: 'Av. Jansen de Melo, Icaraí, Niterói - RJ' },
    latitude:    { doubleValue: -22.9022 },
    longitude:   { doubleValue: -43.1264 },
    cityName:    { stringValue: 'Niterói' },
    stateUF:     { stringValue: 'RJ' },
    countryCode: { stringValue: 'BR' },
    userId:      { stringValue: uid },
    likes:       { arrayValue: { values: [] } },
    commentCount:{ integerValue: '0' },
    isFeatured:  { booleanValue: false },
    photoUrl:    { nullValue: null },
    promotionTier:      { nullValue: null },
    promotionEndDate:   { nullValue: null },
    promotionPhotoUrl:  { nullValue: null },
    promotionPhotoUrls: { nullValue: null },
    createdAt:  { timestampValue: new Date(now).toISOString() },
    expiresAt:  { timestampValue: new Date(expiresAt).toISOString() },
  }
};

console.log('📝 Criando evento em Firestore...');
const fsRes = await post(
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/entertainment_events?key=${API_KEY}`,
  doc,
  { Authorization: `Bearer ${idToken}` }
);

if (fsRes.status !== 200) {
  console.error('❌ Erro Firestore:', fsRes.body?.error?.message ?? fsRes.body);
  process.exit(1);
}

const docId = fsRes.body.name.split('/').pop();
console.log('');
console.log('✅ Evento criado com sucesso!');
console.log(`   ID:       ${docId}`);
console.log(`   📍 Local: -22.9022, -43.1264 (Praia de Icaraí, Niterói-RJ)`);
console.log(`   ⏱️  Expira: ${new Date(expiresAt).toLocaleString('pt-BR')}`);
console.log('');
console.log('═══════════════════════════════════════════════');
console.log('👉 PASSOS PARA SIMULAR A NAVEGAÇÃO:');
console.log('');
console.log('  1. O GPS do emulador já está em Centro de Niterói');
console.log('  2. No app, vá ao mapa ou lista de Entretenimento');
console.log('  3. Encontre "🎸 Show na Praia — Icaraí" (Niterói-RJ)');
console.log('  4. Toque → "Como chegar" → "▶ Iniciar"');
console.log('  5. Volte aqui e rode:');
console.log('     python3 scripts/simulate_navigation.py');
console.log('═══════════════════════════════════════════════');
