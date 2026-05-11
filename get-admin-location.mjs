import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const app = initializeApp({
  apiKey: 'AIzaSyCoI9rNBK07vGZBuygprq4PkDKGT0iZkYU',
  authDomain: 'lei-seca---eventos.firebaseapp.com',
  projectId: 'lei-seca---eventos',
});
const db = getFirestore(app);
await signInAnonymously(getAuth(app));

const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', 'adrianosethi@outlook.com'), limit(1)));

if (usersSnap.empty) { console.log('Usuário não encontrado'); process.exit(1); }

const userDoc = usersSnap.docs[0];
const uid = userDoc.id;
console.log(`uid: ${uid} | nome: ${userDoc.data().displayName}`);

const evSnap = await getDocs(query(collection(db, 'events'), where('userId', '==', uid), limit(5)));
evSnap.forEach(d => {
  const ev = d.data();
  console.log(`[road] lat: ${ev.latitude} | lon: ${ev.longitude} | cidade: ${ev.cityName} | UF: ${ev.stateUF}`);
});

const entSnap = await getDocs(query(collection(db, 'entertainment_events'), where('userId', '==', uid), limit(5)));
entSnap.forEach(d => {
  const ev = d.data();
  console.log(`[ent]  lat: ${ev.latitude} | lon: ${ev.longitude} | cidade: ${ev.cityName} | UF: ${ev.stateUF}`);
});

process.exit(0);
