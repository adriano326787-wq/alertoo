/**
 * Script para criar eventos de Lei Seca no Firestore via REST API.
 * Autentica com Firebase Auth (email/senha) e escreve via Firestore REST.
 *
 * Rodar: node scripts/create-lei-seca.mjs
 */

const PROJECT_ID = 'lei-seca---eventos';

// ─── Troca refresh token (firebase login:ci) por access token ─────────────
// Client ID/Secret do firebase-tools são públicos (github.com/firebase/firebase-tools)
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

// ─── Escrever documento via Firestore REST API ─────────────────────────────
async function addDocument(idToken, collection, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.name.split('/').pop(); // document ID
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

// ─── Geocodificação via Nominatim (OpenStreetMap) — sem API key ────────────
async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=br`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Alertoo-admin-script/1.0' },
  });
  const json = await res.json();
  if (!json[0]) throw new Error(`Geocode sem resultado para "${address}"`);
  return { latitude: parseFloat(json[0].lat), longitude: parseFloat(json[0].lon) };
}

// ─── Dados dos eventos de Lei Seca ─────────────────────────────────────────
const leiSecaEvents = [
  {
    address: 'Av Ministro Ivan Lins, Barra da Tijuca, Rio de Janeiro, RJ',
    title: 'Lei Seca - Descida do Joá / Barra Grill',
    description: 'Descida do Joá / Barra Grill, Recreio dos Bandeirantes',
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
  },
  {
    address: 'Av. Luís Carlos Prestes, Barra da Tijuca, Rio de Janeiro, RJ',
    title: 'Lei Seca - Atrás do Barra Shopping',
    description: 'Atrás do Barra Shopping, 2 Sentidos',
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
  },
  {
    address: 'Av. Princesa Isabel, 429, Copacabana, Rio de Janeiro, RJ',
    title: 'Lei Seca - Saída do Túnel Novo',
    description: 'Saída do Túnel Novo, Praia',
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
  },
  {
    address: 'Estr. do Mato Alto, 7003, Guaratiba, Rio de Janeiro, RJ',
    title: 'Lei Seca - Após Fazenda Modelo / Posto BR',
    description: 'Após a Fazenda Modelo / Posto BR, Campo Grande',
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
  },
  {
    address: 'Av Padre Leonel Franca, 182, Gávea, Rio de Janeiro, RJ',
    title: 'Lei Seca - PUC / Planetário',
    description: 'PUC / Planetário, 2 Sentidos',
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
  },
  {
    address: 'Av Monsenhor Félix, 1779, Irajá, Rio de Janeiro, RJ',
    title: 'Lei Seca - Supermercado Guanabara / Habib\'s',
    description: 'Supermercado Guanabara / Habib\'s, 2 Sentidos',
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
  },
  {
    address: 'Av. Vinte e Dois de Maio, 2453, Itaboraí, RJ',
    title: 'Lei Seca - Igreja Lagoinha / Antiga Ita Music',
    description: 'Igreja Lagoinha / Antiga Ita Music, 2 Sentidos',
    cityName: 'Itaboraí',
    stateUF: 'RJ',
  },
  {
    address: 'Estrada Deputado Octávio Cabral, Itaguaí, RJ',
    title: 'Lei Seca - Fukamati / Light',
    description: 'Fukamati / Light, 2 Sentidos',
    cityName: 'Itaguaí',
    stateUF: 'RJ',
    fallbackCoords: { latitude: -22.8598, longitude: -43.7918 }, // centro de Itaguaí
  },
  {
    address: 'Av Francisco Bicalho, 1614, Rio de Janeiro, RJ',
    title: 'Lei Seca - Descida Gasômetro / IML',
    description: 'Descida Gasometro / IML, Centro',
    cityName: 'Rio de Janeiro',
    stateUF: 'RJ',
    fallbackCoords: { latitude: -22.8964, longitude: -43.2151 }, // Leopoldina / São Cristóvão
  },
];

// ─── Criar eventos ─────────────────────────────────────────────────────────
const TTL_MINUTES = 180; // policeblitz = 3h

// IDs dos eventos criados anteriormente
const EVENT_IDS = [
  'PYBKZAxfeTS601adK2wh',
  'qqRcZWycDXR4z4Zmo1ak',
  'MgupjsDN1JgQAniST5jn',
  'ppyjtE8QCoi55tyWXJHG',
  'KRgW8aP9qWRo4XSvFVP0',
  '3w6tWA1zleOibuRHzw2m',
  '2Dmjl5UM6hLEIjHgWcup',
  'pU67zdGT3Qq4mJNwm9ZO',
  'jQiEwRXiyxrlLi9kHAgg',
];

async function patchDocument(idToken, collection, docId, fields) {
  const fieldMask = Object.keys(fields).map(f => `updateMask.fieldPaths=${f}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}?${fieldMask}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
    body: JSON.stringify({ fields: toFirestoreFields(fields) }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json;
}

async function main() {
  const now = Date.now();
  const expiresAt = now + TTL_MINUTES * 60 * 1000;

  const refreshToken = process.env.FIREBASE_TOKEN;
  if (!refreshToken) throw new Error('FIREBASE_TOKEN não definido.');

  process.stdout.write('Autenticando... ');
  const idToken = await getAccessToken(refreshToken);
  console.log('✓\n');

  // Atualiza categoria dos eventos existentes para drunkcheck (Lei Seca)
  console.log('Atualizando categoria para "drunkcheck" (Lei Seca)...');
  for (const id of EVENT_IDS) {
    try {
      await patchDocument(idToken, 'events', id, { category: 'drunkcheck' });
      console.log(`  ✓ ${id}`);
    } catch (err) {
      console.log(`  ✗ ${id}: ${err.message}`);
    }
  }
  console.log('\nConcluído.');
  process.exit(0);

  // (código de criação abaixo não roda — mantido para referência)
  for (const ev of leiSecaEvents) {
    process.stdout.write(`Geocodificando: ${ev.address} ... `);
    let coords;
    try {
      coords = await geocode(ev.address);
      console.log(`✓ (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`);
    } catch (err) {
      // Fallback manual para endereços que o Nominatim não achou
      if (ev.fallbackCoords) {
        coords = ev.fallbackCoords;
        console.log(`(fallback manual) ✓ (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`);
      } else {
        console.log(`✗ ERRO: ${err.message}`);
        continue;
      }
    }

    const docData = {
      category: 'policeblitz',
      title: ev.title,
      description: ev.description,
      latitude: coords.latitude,
      longitude: coords.longitude,
      createdAt: ts(now),
      expiresAt: ts(expiresAt),
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
      console.log(`  → Evento criado: ${id}`);
    } catch (err) {
      console.log(`  → ERRO ao salvar: ${err.message}`);
    }

    // Nominatim exige 1s entre requests
    await new Promise(r => setTimeout(r, 1100));
  }

  console.log('\nConcluído.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
