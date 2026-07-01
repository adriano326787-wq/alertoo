/**
 * Cria 8 eventos de Lei Seca (RJ) reportados em 21/06/2026 (segundo lote do dia),
 * via Firestore REST API, mesmo esquema de scripts/create-leiseca-jun21.mjs.
 * userId fica como 'admin'.
 *
 * Rodar: FIREBASE_TOKEN=<refresh token> node scripts/create-leiseca-jun21-2.mjs
 */

const PROJECT_ID = 'lei-seca---eventos';

async function getAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Token refresh falhou: ${JSON.stringify(json.error)}`);
  return json.access_token;
}

async function addDocument(idToken, collection, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.name.split('/').pop();
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null) fields[k] = { nullValue: null };
    else if (typeof v === 'number') fields[k] = { doubleValue: v };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (typeof v === 'string') fields[k] = { stringValue: v };
    else if (Array.isArray(v)) fields[k] = { arrayValue: { values: v.map((i) => ({ stringValue: i })) } };
    else if (v && typeof v === 'object' && v.__type === 'timestamp') fields[k] = { timestampValue: new Date(v.ms).toISOString() };
    else fields[k] = { stringValue: String(v) };
  }
  return fields;
}

function ts(ms) { return { __type: 'timestamp', ms }; }

// ─── Eventos — geocodificados via Nominatim (aproximado para pontos sem número exato) ──
const TTL_MINUTES = 240; // Lei Seca = 4h
const MIN_REMAINING_MS = 60 * 60 * 1000; // garante pelo menos 1h ativo a partir de agora

const leiSecaEvents = [
  {
    title: 'Lei Seca - Barra Mall / Concessionária Nissan',
    description: 'Av. das Américas, 7083, Barra Mall / Concessionária Nissan, Recreio',
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    latitude: -23.0185151,
    longitude: -43.4634021,
    reportedAgoMin: 79, // 1h19min
  },
  {
    title: "Lei Seca - Habib's, 2 Sentidos",
    description: 'Estrada do Galeão, 2434, Habib\'s, 2 Sentidos, Ilha do Governador',
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    latitude: -22.8150,
    longitude: -43.2400,
    reportedAgoMin: 79, // 1h19min
  },
  {
    title: 'Lei Seca - Procor, Estrada do Galeão',
    description: 'Rua Cambaúba, Procor, Estrada do Galeão, Ilha do Governador',
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    latitude: -22.8170,
    longitude: -43.2420,
    reportedAgoMin: 26,
  },
  {
    title: 'Lei Seca - Subida do Viaduto / Clínica Enio Serra',
    description: 'Rua Soares Cabral, 38, Subida do Viaduto / Clínica Enio Serra, Largo do Machado, Laranjeiras',
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    latitude: -22.9359345,
    longitude: -43.1859500,
    reportedAgoMin: 26,
  },
  {
    title: 'Lei Seca - Supermarket, 2 Sentidos',
    description: 'Rua Martinho de Almeida, 479, Supermarket, 2 Sentidos',
    cityName: 'Rio Bonito',
    stateUF: 'RJ',
    latitude: -22.7158510,
    longitude: -42.6372661,
    reportedAgoMin: 146, // 2h26min
  },
  {
    title: "Lei Seca - McDonald's / Habib's",
    description: "Estrada dos Bandeirantes - Taquara, McDonald's / Habib's, Barra da Tijuca",
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    latitude: -22.9241464,
    longitude: -43.3737520,
    reportedAgoMin: 1,
  },
  {
    title: 'Lei Seca - DPO / Praça de Tinguá, 2 Sentidos',
    description: 'Estrada Federal de Tinguá, DPO / Praça de Tinguá, 2 Sentidos',
    cityName: 'Nova Iguaçu',
    stateUF: 'RJ',
    latitude: -22.6314,
    longitude: -43.5316,
    reportedAgoMin: 146, // 2h26min
  },
  {
    title: 'Lei Seca - Rotatória da UFRRJ / Posto Shell',
    description: 'Av. Pref. Alberto da Silva Lavinas, 1960, Na Rotatória da UFRRJ / Posto Shell, 2 Sentidos',
    cityName: 'Três Rios',
    stateUF: 'RJ',
    latitude: -22.1201732,
    longitude: -43.1072134,
    reportedAgoMin: 146, // 2h26min
  },
];

async function main() {
  const refreshToken = process.env.FIREBASE_TOKEN;
  if (!refreshToken) throw new Error('FIREBASE_TOKEN não definido.');

  process.stdout.write('Autenticando... ');
  const idToken = await getAccessToken(refreshToken);
  console.log('✓\n');

  const now = Date.now();

  for (const ev of leiSecaEvents) {
    const createdAtMs = now - ev.reportedAgoMin * 60 * 1000;
    const naturalExpiry = createdAtMs + TTL_MINUTES * 60 * 1000;
    const expiresAtMs = Math.max(naturalExpiry, now + MIN_REMAINING_MS);

    const docData = {
      category: 'drunkcheck',
      title: ev.title,
      description: ev.description,
      latitude: ev.latitude,
      longitude: ev.longitude,
      createdAt: ts(createdAtMs),
      expiresAt: ts(expiresAtMs),
      confirmations: 0,
      denials: 0,
      voters: [],
      userId: 'admin',
      stateUF: ev.stateUF,
      cityName: ev.cityName,
      countryCode: 'BR',
      speedLimit: null,
    };

    try {
      const id = await addDocument(idToken, 'events', docData);
      console.log(`✓ ${ev.title} → ${id}`);
    } catch (err) {
      console.log(`✗ ${ev.title}: ${err.message}`);
    }
  }

  console.log('\nConcluído.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
