/**
 * Cria 8 eventos de Lei Seca reportados em 08/06/2026.
 * Uso: node scripts/create-leiseca-jun08.mjs
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
    address: 'Av. Ayrton Senna', neighborhood: 'Barra da Tijuca',
    cityName: 'Rio de Janeiro', stateUF: 'RJ',
    reference: 'Terminal BRT Alvorada / Posto Ipiranga, Praia',
    latitude: -22.9793438, longitude: -43.3657808,
  },
  {
    address: 'Rua Raul Pompéia, 168', neighborhood: 'Copacabana',
    cityName: 'Rio de Janeiro', stateUF: 'RJ',
    reference: 'Esquina Francisco Sá / Parque Peter Pan, 2 Vias',
    latitude: -22.9816463, longitude: -43.1924110,
  },
  {
    address: 'Estr. dos Bandeirantes, 4965', neighborhood: 'Curicica',
    cityName: 'Rio de Janeiro', stateUF: 'RJ',
    reference: 'BRT Curicica / Nestle, Taquara',
    latitude: -22.9704299, longitude: -43.4138434,
  },
  {
    address: 'Av. Monsenhor Félix, 1779', neighborhood: 'Irajá',
    cityName: 'Rio de Janeiro', stateUF: 'RJ',
    reference: 'Supermercado Guanabara / Habib\'s, 2 Sent',
    latitude: -22.8490579, longitude: -43.3254878,
  },
  {
    address: 'R. Lampadosa, 133', neighborhood: 'Centro',
    cityName: 'Nova Iguaçu', stateUF: 'RJ',
    reference: 'Universidade Estácio / Dinamicar, Marques Rollo',
    latitude: -22.7617858, longitude: -43.4265557,
  },
  {
    address: 'Rua Francisco Real, 375', neighborhood: 'Padre Miguel',
    cityName: 'Rio de Janeiro', stateUF: 'RJ',
    reference: 'Posto Amor / Praça Abrolhos, Realengo',
    latitude: -22.8831664, longitude: -43.4516104,
  },
  {
    address: 'Autoestrada Lagoa Barra', neighborhood: 'São Conrado',
    cityName: 'Rio de Janeiro', stateUF: 'RJ',
    reference: 'Posto Shell / Mercado Zona Sul, 2 Sentidos',
    latitude: -22.9971508, longitude: -43.2628095,
  },
  {
    address: 'Rua Dr. Nilo Peçanha', neighborhood: 'Centro',
    cityName: 'São Gonçalo', stateUF: 'RJ',
    reference: 'Estrela do Norte / Samcordis, 2 Sentidos',
    latitude: -22.8219295, longitude: -43.0422300,
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

  console.log('📍 Criando 8 eventos de Lei Seca...\n');
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

  console.log('🎉 8 eventos criados com sucesso!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
