/**
 * Corrige o campo `createdAt` dos radares importados por
 * import-radars-rj-osm.mjs, que foi gravado como número (Date.now())
 * em vez de Firestore Timestamp — causando TypeError em docToRadar()
 * (.toMillis() em um número) e quebrando o fetch de TODOS os radares.
 *
 * Uso: node scripts/fix-radars-createdat.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
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

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

async function main() {
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);

  const snap = await getDocs(query(collection(db, 'radars'), where('stateUF', '==', 'RJ')));
  console.log(`Encontrados ${snap.size} radares RJ. Verificando createdAt...\n`);

  let fixed = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (typeof data.createdAt === 'number') {
      await updateDoc(doc(db, 'radars', d.id), {
        createdAt: Timestamp.fromMillis(data.createdAt),
      });
      fixed++;
      console.log(`✅ ${d.id}`);
    }
  }

  console.log(`\n🎉 ${fixed} documentos corrigidos.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
