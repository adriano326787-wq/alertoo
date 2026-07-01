/**
 * Corrige os radares importados com createdAt como número (Date.now()) em vez
 * de Firestore Timestamp, o que quebra docToRadar() (.toMillis() em número) e
 * impede TODOS os radares de carregarem no app.
 *
 * Estratégia: para cada radar com createdAt numérico, deleta (permitido pois
 * createdBy == uid logado) e recria via addDoc com status 'pending' (exigido
 * pelas regras de create), depois ativa (status:'active', confirmations:2) via
 * updateDoc (vote-only change, permitido).
 *
 * Uso: node scripts/fix-radars-recreate.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore, collection, query, where, getDocs,
  doc, deleteDoc, addDoc, updateDoc, Timestamp,
} from 'firebase/firestore';
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
  const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  const uid = cred.user.uid;

  const snap = await getDocs(query(collection(db, 'radars'), where('stateUF', '==', 'RJ')));
  const bad = snap.docs.filter((d) => typeof d.data().createdAt === 'number');
  console.log(`Encontrados ${snap.size} radares RJ, ${bad.length} com createdAt inválido.\n`);

  let fixed = 0;
  for (const d of bad) {
    const data = d.data();
    const now = Timestamp.fromMillis(data.createdAt);

    await deleteDoc(doc(db, 'radars', d.id));

    const ref = await addDoc(collection(db, 'radars'), {
      type: data.type,
      latitude: data.latitude,
      longitude: data.longitude,
      ...(data.speedLimit !== undefined ? { speedLimit: data.speedLimit } : {}),
      createdBy: uid,
      createdAt: now,
      expiresAt: null,
      confirmations: 0,
      denials: 0,
      voterStamps: {},
      lastConfirmedAt: now,
      status: 'pending',
      stateUF: data.stateUF,
      countryCode: data.countryCode,
    });

    await updateDoc(doc(db, 'radars', ref.id), {
      status: 'active',
      confirmations: 2,
      lastConfirmedAt: Timestamp.fromMillis(Date.now()),
    });

    fixed++;
    console.log(`✅ [${fixed}/${bad.length}] ${d.id} -> ${ref.id}`);
  }

  console.log(`\n🎉 ${fixed} radares recriados corretamente.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
