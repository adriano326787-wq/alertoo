/**
 * Cria eventos de Lei Seca (drunkcheck) reportados pela comunidade.
 * Uso: node scripts/create-leiseca-events-2.mjs
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

const TTL_MS = 240 * 60 * 1000; // drunkcheck: 4h (EVENT_CATEGORIES.drunkcheck.defaultTtlMinutes)
const now = Date.now();

// "createdAgoMs" = há quanto tempo o evento foi reportado (segundo o print do grupo)
const EVENTS = [
  {
    description: 'Av. das Américas, 7083 - Barra Mall / Concessionária Nissan, Recreio',
    cityName: 'Rio de Janeiro',
    latitude: -23.0101410, longitude: -43.4426320,
    createdAgoMs: 4 * 60 * 1000,
  },
  {
    description: 'Av. das Américas - Ribalta Eventos / BRT Rio Mar, São Conrado',
    cityName: 'Rio de Janeiro',
    latitude: -22.9913592, longitude: -43.2675329,
    createdAgoMs: (60 + 12) * 60 * 1000,
  },
  {
    description: 'Rua Muniz Barreto, 51 - FACHA, Copacabana',
    cityName: 'Rio de Janeiro',
    latitude: -22.9428191, longitude: -43.1825892,
    createdAgoMs: 4 * 60 * 1000,
  },
  {
    description: 'Estrada Intendente Magalhães, 295 - Concessionária Honda / Hyundai, 2 Sentidos',
    cityName: 'Rio de Janeiro',
    latitude: -22.8780806, longitude: -43.3598338,
    createdAgoMs: 18 * 60 * 1000,
  },
  {
    description: 'R. Luís Belart, 364 - Jardim Guanabara, Esquina com Rua Cambaúba, 2 Sentidos',
    cityName: 'Rio de Janeiro',
    latitude: -22.8128362, longitude: -43.2007792,
    createdAgoMs: 49 * 1000,
  },
  {
    description: 'Av. Borges de Medeiros, 701 - Clube Monte Líbano / Posto BR, 2 Sentidos',
    cityName: 'Rio de Janeiro',
    latitude: -22.9754258, longitude: -43.2184961,
    createdAgoMs: 4 * 60 * 1000,
  },
  {
    description: 'R. Sacadura Cabral, 159 - Rua Camerino / Hospital Servidores do Estado, 2 Sentidos',
    cityName: 'Rio de Janeiro',
    latitude: -22.8962765, longitude: -43.1915958,
    createdAgoMs: 18 * 60 * 1000,
  },
  {
    description: 'Av Jornalista Roberto Marinho - Condomínio Colinas de Maricá, 2 Sentidos',
    cityName: 'São Gonçalo',
    latitude: -22.8188396, longitude: -43.0039672,
    createdAgoMs: 12 * 60 * 1000,
  },
  {
    description: 'R. Gessyr Gonçalves Fontes, 16 - Igreja São João Batista / Praça da Matriz, Único',
    cityName: 'São João de Meriti',
    latitude: -22.7853575, longitude: -43.3667150,
    createdAgoMs: 4 * 60 * 1000,
  },
  {
    description: 'Viaduto São João, Caxias, 486 - Descida do Shopping Grande Rio / Rua do Trevo, 2 Sentidos',
    cityName: 'São João de Meriti',
    latitude: -22.7973554, longitude: -43.3507782,
    createdAgoMs: 42 * 60 * 1000,
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

  console.log('📍 Criando eventos de Lei Seca...');
  for (const ev of EVENTS) {
    const createdAt = now - ev.createdAgoMs;
    const ref = await addDoc(collection(db, 'events'), {
      category: 'drunkcheck',
      title: 'Lei Seca',
      description: ev.description,
      latitude: ev.latitude,
      longitude: ev.longitude,
      createdAt: Timestamp.fromMillis(createdAt),
      expiresAt: Timestamp.fromMillis(createdAt + TTL_MS),
      confirmations: 1,
      denials: 0,
      voters: [],
      userId: uid,
      stateUF: 'RJ',
      cityName: ev.cityName,
      countryCode: 'BR',
      speedLimit: null,
    });
    console.log(`✅ ${ev.cityName} — ${ev.description} → ${ref.id}`);
  }

  console.log('\n🎉 Todos os eventos criados com sucesso!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
