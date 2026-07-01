/**
 * Cria 6 eventos de Lei Seca reportados em 14/06/2026.
 * Uso: node scripts/create-leiseca-jun14.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
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

const now     = Timestamp.now();
const expires = Timestamp.fromMillis(Date.now() + 4 * 60 * 60 * 1000); // 4 horas

const EVENTS = [
  {
    address: 'Av Meriti - Largo do Bicão', neighborhood: 'Largo do Bicão',
    cityName: 'São João de Meriti', stateUF: 'RJ',
    reference: "Habib's Bicão, 2 Sentidos",
    latitude: -22.8049, longitude: -43.3622,
  },
  {
    address: 'Rua Dalila Dias Borges', neighborhood: 'Muriqui',
    cityName: 'Mangaratiba', stateUF: 'RJ',
    reference: 'Descida para o DPO / Em frente ao Posto BR, 2 Sentidos',
    latitude: -22.9430, longitude: -44.1962,
  },
  {
    address: 'Praça Marcío Dias', neighborhood: 'Centro',
    cityName: 'Nova Friburgo', stateUF: 'RJ',
    reference: 'Paissandu / Super Pão, Único',
    latitude: -22.2819, longitude: -42.5311,
  },
  {
    address: 'Av Abílio Augusto Távora - Nova Iguaçu - RJ', neighborhood: 'Pedreira',
    cityName: 'Nova Iguaçu', stateUF: 'RJ',
    reference: 'Shopping Nova Iguaçu(Pedreira), 2 Sentidos',
    latitude: -22.7559, longitude: -43.4628,
  },
  {
    address: 'Av. Padre Guilherme Decaminada, 940', neighborhood: 'Santa Cruz',
    cityName: 'Rio de Janeiro', stateUF: 'RJ',
    reference: 'Condomínio Verona / Trevo, 2 Sentidos',
    latitude: -22.9120, longitude: -43.6850,
  },
  {
    address: 'Avenida Lúcio Meira, 402', neighborhood: 'Centro',
    cityName: 'Teresópolis', stateUF: 'RJ',
    reference: 'Tere Pão / Posto GNV, 2 Sentidos',
    latitude: -22.4153, longitude: -42.9658,
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

  console.log(`📍 Criando ${EVENTS.length} eventos de Lei Seca...\n`);
  for (const ev of EVENTS) {
    const ref = await addDoc(collection(db, 'events'), {
      address:       ev.address,
      neighborhood:  ev.neighborhood,
      cityName:      ev.cityName,
      stateUF:       ev.stateUF,
      title:         ev.reference,
      description:   ev.reference,
      category:      'drunkcheck',
      active:        true,
      createdAt:     now,
      expiresAt:     expires,
      confirmations: 2,
      denials:       0,
      latitude:      ev.latitude,
      longitude:     ev.longitude,
      userId:        uid,
      userName:      'Alertoo Admin',
    });
    console.log(`✅ ${ev.neighborhood} — ${ev.address}`);
    console.log(`   📌 ${ev.reference}`);
    console.log(`   🆔 ${ref.id}\n`);
  }

  console.log(`🎉 ${EVENTS.length} eventos criados com sucesso!`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
