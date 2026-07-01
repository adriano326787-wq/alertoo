/**
 * Importa uma amostra de radares fixos (speed cameras) do OpenStreetMap para o
 * estado do RJ, como documentos 'pending' na coleção `radars`.
 *
 * Fonte: scripts/_tmp/osm_radars_rj.json (Overpass API, highway=speed_camera, BR-RJ)
 * Dados © OpenStreetMap contributors, licença ODbL.
 *
 * Uso: node scripts/import-radars-rj-osm.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config();

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env');
  process.exit(1);
}

// Amostra de teste: ~50 radares espalhados pelo dataset (passo fixo), para boa
// distribuição geográfica em vez de pegar só os primeiros (que tendem a ficar
// concentrados numa região).
const SAMPLE_SIZE = 50;

const raw = JSON.parse(readFileSync('./scripts/_tmp/osm_radars_rj.json', 'utf-8'));
const nodes = raw.elements.filter((e) => e.type === 'node' && e.tags?.highway === 'speed_camera');

const step = Math.max(1, Math.floor(nodes.length / SAMPLE_SIZE));
const sample = [];
for (let i = 0; i < nodes.length && sample.length < SAMPLE_SIZE; i += step) {
  sample.push(nodes[i]);
}

console.log(`📊 Dataset total: ${nodes.length} radares | amostra selecionada: ${sample.length}\n`);

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

async function main() {
  console.log('🔐 Autenticando...');
  const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  const uid  = cred.user.uid;
  console.log(`✅ Logado como ${ADMIN_EMAIL}\n`);

  console.log(`📍 Criando ${sample.length} radares (amostra OSM/RJ)...\n`);
  const now = Timestamp.fromMillis(Date.now());
  let created = 0;

  for (const node of sample) {
    const maxspeedRaw = node.tags?.maxspeed;
    const maxspeed = maxspeedRaw ? parseInt(maxspeedRaw, 10) : null;
    const speedLimit = (maxspeed && maxspeed >= 10 && maxspeed <= 150) ? maxspeed : null;

    const data = {
      type: 'fixed',
      latitude: node.lat,
      longitude: node.lon,
      createdBy: uid,
      createdAt: now,
      expiresAt: null,
      confirmations: 0,
      denials: 0,
      voterStamps: {},
      lastConfirmedAt: now,
      status: 'pending',
      stateUF: 'RJ',
      countryCode: 'BR',
    };
    if (speedLimit !== null) data.speedLimit = speedLimit;

    const ref = await addDoc(collection(db, 'radars'), data);
    created++;
    console.log(`✅ [${created}/${sample.length}] ${node.lat}, ${node.lon}` +
      (speedLimit ? ` — ${speedLimit} km/h` : ' — sem limite') + ` — ${ref.id}`);
  }

  console.log(`\n🎉 ${created} radares criados com sucesso! (status: pending)`);
  console.log('ℹ️  Dados: © OpenStreetMap contributors (ODbL)');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
