import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
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

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

await signInWithEmailAndPassword(auth, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);

// Busca todos os radares do Firestore com osmId
const snap = await getDocs(collection(db, 'radars'));
const existingOsmIds = new Set();
snap.forEach(doc => {
  const d = doc.data();
  if (d.osmId) existingOsmIds.add(String(d.osmId));
});
console.log('FIRESTORE_COUNT:' + snap.size);
console.log('WITH_OSMID:' + existingOsmIds.size);

// Carrega os 719 do OSM
const osmRaw = JSON.parse(readFileSync('./scripts/_tmp/osm_radars_rj.json', 'utf-8'));
const osmNodes = osmRaw.elements.filter(e => e.type === 'node');
console.log('OSM_TOTAL:' + osmNodes.length);

// Pendentes = OSM que não estão no Firestore
const missing = osmNodes.filter(n => !existingOsmIds.has(String(n.id)));
console.log('MISSING:' + missing.length);

// Saída JSON linha por linha
missing.forEach(n => {
  const tags = n.tags || {};
  console.log('ROW:' + JSON.stringify({
    osmId:      n.id,
    lat:        n.lat,
    lon:        n.lon,
    maxspeed:   tags.maxspeed || tags['maxspeed:forward'] || '',
    direction:  tags.direction || tags['camera:direction'] || '',
    ref:        tags.ref || '',
  }));
});
