import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore, collection, getDocs, writeBatch, doc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config();

// ---------------------------------------------------------------------------
// Haversine — retorna distância em metros
// ---------------------------------------------------------------------------
function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Firebase
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

await signInWithEmailAndPassword(auth, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
console.log('Auth OK');

// ---------------------------------------------------------------------------
// Carrega radares existentes do Firestore
// ---------------------------------------------------------------------------
const snap = await getDocs(collection(db, 'radars'));
const existing = [];
snap.forEach(d => {
  const { latitude, longitude } = d.data();
  if (latitude && longitude) existing.push({ latitude, longitude });
});
console.log(`Firestore existentes: ${existing.length}`);

// ---------------------------------------------------------------------------
// Carrega OSM, filtra sem velocidade
// ---------------------------------------------------------------------------
const osmRaw = JSON.parse(readFileSync('./scripts/_tmp/osm_radars_rj.json', 'utf-8'));
const osmNodes = osmRaw.elements.filter(e => e.type === 'node');

const candidates = osmNodes
  .map(n => {
    const tags = n.tags || {};
    const maxspeed = tags.maxspeed || tags['maxspeed:forward'] || '';
    return { osmId: n.id, lat: n.lat, lon: n.lon, maxspeed, direction: tags.direction || tags['camera:direction'] || '' };
  })
  .filter(n => n.maxspeed !== '');  // ignora os 20 sem velocidade

console.log(`Candidatos OSM (com velocidade): ${candidates.length}`);

// ---------------------------------------------------------------------------
// Deduplicação por proximidade (30 m)
// ---------------------------------------------------------------------------
const DEDUP_M = 30;
const toCreate = candidates.filter(n => {
  return !existing.some(e => haversineM(n.lat, n.lon, e.latitude, e.longitude) <= DEDUP_M);
});

const skipped = candidates.length - toCreate.length;
console.log(`Duplicatas detectadas (≤${DEDUP_M}m): ${skipped}`);
console.log(`A criar no Firestore: ${toCreate.length}`);

if (toCreate.length === 0) {
  console.log('Nada a importar.');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Importação em lotes de 500
// ---------------------------------------------------------------------------
const now = Timestamp.now();
const radarsCol = collection(db, 'radars');
let created = 0;
const BATCH_SIZE = 499; // < 500 para deixar margem

for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
  const batch = writeBatch(db);
  const chunk = toCreate.slice(i, i + BATCH_SIZE);

  chunk.forEach(n => {
    const ref = doc(radarsCol);
    batch.set(ref, {
      osmId:           n.osmId,
      type:            'fixed',
      status:          'active',
      latitude:        n.lat,
      longitude:       n.lon,
      speedLimit:      parseInt(n.maxspeed, 10),
      countryCode:     'BR',
      stateUF:         'RJ',
      createdBy:       'osm_import',
      createdAt:       now,
      expiresAt:       null,
      confirmations:   0,
      denials:         0,
      voterStamps:     {},
      lastConfirmedAt: null,
    });
  });

  await batch.commit();
  created += chunk.length;
  console.log(`Lote ${Math.ceil((i + 1) / BATCH_SIZE)}: +${chunk.length} (total: ${created})`);
}

console.log(`\nImportação concluída. ${created} radares criados.`);
process.exit(0);
