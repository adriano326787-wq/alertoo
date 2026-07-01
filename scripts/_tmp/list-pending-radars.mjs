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

const snap = await getDocs(query(collection(db, 'radars'), where('status', '==', 'pending')));
console.log(`Total pendentes: ${snap.size}`);
snap.docs.forEach((d) => {
  const r = d.data();
  console.log(`${d.id} | ${r.type} | ${r.latitude}, ${r.longitude} | ${r.speedLimit ?? '-'} km/h | ${r.cityName ?? '?'}, ${r.stateUF ?? '?'} | createdBy=${r.createdBy} | confirmations=${r.confirmations ?? 0}`);
});
process.exit(0);
