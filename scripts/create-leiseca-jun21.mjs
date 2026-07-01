/**
 * Cria 7 eventos de Lei Seca (RJ) reportados em 21/06/2026, via Firestore REST API,
 * usando a "conta admin" (OAuth do Google account do dev) — mesmo esquema de
 * scripts/create-lei-seca.mjs. userId fica como 'admin'.
 *
 * Rodar: FIREBASE_TOKEN=<refresh token> node scripts/create-leiseca-jun21.mjs
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

// ─── Eventos — geocodificados via Nominatim previamente ────────────────────
const TTL_MINUTES = 240; // Lei Seca = 4h
const MIN_REMAINING_MS = 60 * 60 * 1000; // garante pelo menos 1h ativo a partir de agora

const leiSecaEvents = [
  {
    title: 'Lei Seca - Joalpa Hotel / Padaria Remmar',
    description: 'Av. Ver. Antônio Ferreira dos Santos, 2, Joalpa Hotel / Padaria Remmar, 2 Sentidos',
    cityName: 'Cabo Frio',
    stateUF: 'RJ',
    latitude: -22.8804369,
    longitude: -42.0189227,
    reportedAgoMin: 84, // 1h24min
  },
  {
    title: 'Lei Seca - Algi Veículos / Art Latex',
    description: 'Estr. Rio-São Paulo, 99, Algi Veículos / Art Latex, Est. da Caroba, Campo Grande',
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    latitude: -22.8692526,
    longitude: -43.5956613,
    reportedAgoMin: 162, // 2h42min
  },
  {
    title: 'Lei Seca - Praça Eugênio Jardim / Metrô',
    description: 'Rua Pompeu Loureiro, 137, Praça Eugênio Jardim / Metrô, Lagoa, Copacabana',
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    latitude: -22.9722935,
    longitude: -43.1918572,
    reportedAgoMin: 91, // 1h31min
  },
  {
    title: 'Lei Seca - Rotatória / Supermercado',
    description: 'Av. Ver. Francisco Sabino da Costa, 236, Eldorado, Maricá, Rotatória / Supermarket, 2 Sentidos',
    cityName: 'Maricá',
    stateUF: 'RJ',
    latitude: -22.9167572,
    longitude: -42.8229974,
    reportedAgoMin: 165, // 2h45min
  },
  {
    title: 'Lei Seca - Portal de Penedo / Posto Shell',
    description: 'Av Casa das Pedras, 3072, Portal de Penedo / Posto Shell, 2 Sentidos, Penedo-Itatiaia',
    cityName: 'Itatiaia',
    stateUF: 'RJ',
    latitude: -22.4414863,
    longitude: -44.5160791,
    reportedAgoMin: 270, // 4h30min
  },
  {
    title: 'Lei Seca - Tijuca Medical Center / Após a UPA',
    description: 'Rua Conde de Bonfim, Tijuca Medical Center / Após a UPA, Estácio, Rio de Janeiro',
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    latitude: -22.9260123,
    longitude: -43.2349190,
    reportedAgoMin: 129, // 2h9min
  },
  {
    title: 'Lei Seca - Rotatória da UFRRJ / Posto Shell',
    description: 'Av. Pref. Alberto da Silva Lavinas, 1960, Na Rotatória da UFRRJ / Posto Shell, 2 Sentidos',
    cityName: 'Três Rios',
    stateUF: 'RJ',
    latitude: -22.1201732,
    longitude: -43.1072134,
    reportedAgoMin: 162, // 2h42min
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
