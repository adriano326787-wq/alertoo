/**
 * Ativa (status: 'active', confirmations: 2) os radares importados pelo script
 * import-radars-rj-osm.mjs, que ficam 'pending' (visíveis só pro criador) por
 * padrão. Update é permitido pelas regras (isRadarVoteChange) para qualquer
 * usuário autenticado, alterando apenas confirmations/status.
 *
 * Uso: node scripts/activate-radars-rj-osm.mjs
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

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env');
  process.exit(1);
}

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

async function main() {
  console.log('🔐 Autenticando...');
  const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  const uid  = cred.user.uid;
  console.log(`✅ Logado como ${ADMIN_EMAIL}\n`);

  const snap = await getDocs(query(
    collection(db, 'radars'),
    where('createdBy', '==', uid),
    where('status', '==', 'pending'),
    where('stateUF', '==', 'RJ'),
  ));

  console.log(`📍 ${snap.size} radares pending encontrados. Ativando...\n`);

  let updated = 0;
  for (const d of snap.docs) {
    await updateDoc(doc(db, 'radars', d.id), {
      status: 'active',
      confirmations: 2,
      lastConfirmedAt: Timestamp.fromMillis(Date.now()),
    });
    updated++;
    console.log(`✅ [${updated}/${snap.size}] ${d.id}`);
  }

  console.log(`\n🎉 ${updated} radares ativados!`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
