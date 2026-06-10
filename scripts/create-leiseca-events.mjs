/**
 * Script para criar eventos de Lei Seca manualmente no Firestore.
 * Uso: node scripts/create-leiseca-events.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
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

// IDs dos eventos criados anteriormente com campos errados — serão deletados
const OLD_IDS = [
  'LlbVQYvnvYhRWN2XMkRI',
  'F1i4CZ3trWALGRePWWH0',
  'pV7O1M3D9UG6RJRd688o',
  'aRf1BqMCxSv3mCianRcc',
  'j9jrEgKilhfcTpRw6Nbn',
  'UmzHe0DREKx8XFGntfks',
];

const now     = Timestamp.now();
const expires = Timestamp.fromMillis(Date.now() + 4 * 60 * 60 * 1000); // 4 horas

const EVENTS = [
  {
    address: 'Av Brasil, 31860', neighborhood: 'Bangu',
    city: 'Rio de Janeiro', stateUF: 'RJ',
    reference: 'Motel Palazzo / Barril da Brasil, Santa Cruz',
    latitude: -22.8560009, longitude: -43.4768213,
  },
  {
    address: 'Av. Vinte e Dois de Maio, 2453', neighborhood: 'Itaboraí',
    city: 'Itaboraí', stateUF: 'RJ',
    reference: 'Igreja Lagoinha / Antiga Ita Music, 2 Sentidos',
    latitude: -22.7477726, longitude: -42.8629525,
  },
  {
    address: 'Rod. Pres. Joao Goulart, 20400', neighborhood: 'Papucaia',
    city: 'Cachoeiras de Macacu', stateUF: 'RJ',
    reference: 'Posto Shell / Multi Market, 2 Sentidos',
    latitude: -22.5933296, longitude: -42.7280354,
  },
  {
    address: 'Estrada Paracambi-Vassouras', neighborhood: 'Paracambi',
    city: 'Paracambi', stateUF: 'RJ',
    reference: 'Detran / Trem Bão de Minas, 2 Sentidos',
    latitude: -22.5776774, longitude: -43.6922071,
  },
  {
    address: 'Av. das Américas, 17655', neighborhood: 'Recreio dos Bandeirantes',
    city: 'Rio de Janeiro', stateUF: 'RJ',
    reference: 'Concessionária Toyota / BRT Guiomar Novaes, Barra / Nas 2 Pistas',
    latitude: -23.0176608, longitude: -43.4780660,
  },
  {
    address: 'Av das Américas, 13000', neighborhood: 'Recreio dos Bandeirantes',
    city: 'Rio de Janeiro', stateUF: 'RJ',
    reference: 'BRT Salvador Allende / 2 Pistas, Sent Guaratiba',
    latitude: -23.0062407, longitude: -43.4384888,
  },
];

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

async function main() {
  console.log('🔐 Autenticando...');
  const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  const uid  = cred.user.uid;
  console.log(`✅ Logado como ${ADMIN_EMAIL}\n`);

  // Deletar eventos antigos com campos errados
  console.log('🗑️  Removendo eventos antigos...');
  for (const id of OLD_IDS) {
    try {
      await deleteDoc(doc(db, 'events', id));
      console.log(`   ✓ Deletado ${id}`);
    } catch (e) {
      console.log(`   ⚠ Não encontrado ${id}`);
    }
  }

  console.log('\n📍 Criando eventos corrigidos...');
  for (const ev of EVENTS) {
    const ref = await addDoc(collection(db, 'events'), {
      ...ev,
      category:      'drunkcheck',
      active:        true,
      createdAt:     now,
      expiresAt:     expires,
      confirmations: 2,
      denials:       0,
      userId:        uid,
      userName:      'Alertoo Admin',
    });
    console.log(`✅ ${ev.neighborhood} — ${ev.address} → ${ref.id}`);
  }

  console.log('\n🎉 Todos os eventos criados com sucesso!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
