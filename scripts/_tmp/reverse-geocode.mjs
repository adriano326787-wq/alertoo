import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';
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

const snap = await getDocs(query(collection(db, 'radars'), where('stateUF', '==', 'RJ')));
const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

console.log(`Total: ${docs.length}\n`);

for (const r of docs) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${r.latitude}&lon=${r.longitude}&format=json&zoom=14`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Alertoo-RadarImport/1.0 (contato: adriano326787@gmail.com)' } });
  const j = await res.json();
  const addr = j.address || {};
  const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '?';
  const road = addr.road || j.name || '';
  console.log(`${r.latitude}, ${r.longitude} | ${r.speedLimit ?? '-'} km/h | ${city}${road ? ' — ' + road : ''}`);
  await new Promise((res) => setTimeout(res, 1100));
}
process.exit(0);
