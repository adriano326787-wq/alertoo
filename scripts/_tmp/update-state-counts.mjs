import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getCountFromServer, doc, setDoc, Timestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config();

const app = initializeApp({
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db   = getFirestore(app);

await signInWithEmailAndPassword(auth, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
console.log('Auth OK');

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const now = Timestamp.now();
const counts = {};

await Promise.all(UFS.map(async (uf) => {
  const [roadSnap, entSnap] = await Promise.all([
    getCountFromServer(query(collection(db, 'events'),
      where('stateUF', '==', uf), where('expiresAt', '>', now))),
    getCountFromServer(query(collection(db, 'entertainment_events'),
      where('stateUF', '==', uf), where('expiresAt', '>', now))),
  ]);
  const total = roadSnap.data().count + entSnap.data().count;
  if (total > 0) counts[uf] = total;
  console.log(`${uf}: road=${roadSnap.data().count} ent=${entSnap.data().count} total=${total}`);
}));

await setDoc(doc(db, 'stats', 'eventCountsByState'), { counts, updatedAt: now });
console.log('\nstats/eventCountsByState atualizado:', counts);
process.exit(0);
