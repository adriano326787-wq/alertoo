import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await signInWithEmailAndPassword(auth, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);

const snap = await getDocs(collection(db, 'events'));
console.log('Total events docs:', snap.size);
const byState = {}, byCity = {}, byCat = {};
snap.forEach(d => {
  const data = d.data();
  const st = data.stateUF || data.countryCode || 'unknown';
  const city = data.cityName || 'unknown';
  byState[st] = (byState[st]||0)+1;
  byCity[city] = (byCity[city]||0)+1;
  byCat[data.category] = (byCat[data.category]||0)+1;
});
console.log('By state:', byState);
console.log('By category:', byCat);
console.log('Top cities:');
console.log(Object.entries(byCity).sort((a,b)=>b[1]-a[1]).slice(0,30));

// also radars collection
const radarsSnap = await getDocs(collection(db, 'radars'));
console.log('Total radars docs:', radarsSnap.size);
const radarByState = {};
radarsSnap.forEach(d => {
  const data = d.data();
  const st = data.stateUF || 'unknown';
  radarByState[st] = (radarByState[st]||0)+1;
});
console.log('Radars by state:', radarByState);

process.exit(0);
