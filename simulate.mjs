/**
 * Alertoo — Simulação de 1000 usuários simultâneos
 * Uso: node simulate.mjs
 *
 * Simula: criação de eventos de estrada e entretenimento,
 * curtidas, comentários e confirmações/negações.
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, updateDoc, doc,
  arrayUnion, increment, Timestamp, getDocs, query,
  where, orderBy, limit, getDoc,
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// ── Config Firebase ────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: 'AIzaSyCoI9rNBK07vGZBuygprq4PkDKGT0iZkYU',
  authDomain: 'lei-seca---eventos.firebaseapp.com',
  projectId: 'lei-seca---eventos',
  storageBucket: 'lei-seca---eventos.firebasestorage.app',
  messagingSenderId: '657066902706',
  appId: '1:657066902706:web:3e3d49f23a819c5ce1b5ab',
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

// ── Dados de simulação ─────────────────────────────────────────────────────────
const ROAD_CATEGORIES = ['accident','traffic','drunkcheck','flood','roadwork','closure','policeblitz','hazard'];
const ENT_CATEGORIES  = ['bar','restaurant','party','show','festival','club'];

// Concentrado próximo ao Googleplex — Mountain View, CA
const LOCATIONS = [
  { lat: 37.4220, lon: -122.0841, city: 'Mountain View', state: 'CA' },
];

const ROAD_TITLES = [
  'Acidente com interdição na pista', 'Trânsito intenso sentido centro',
  'Viatura da polícia na marginal', 'Alagamento bloqueia via',
  'Obras na faixa da direita', 'Objeto na pista — cuidado!',
  'Incêndio em veículo', 'Buraco no asfalto perigoso',
  'Batida entre dois carros', 'Congestionamento na saída',
];
const ENT_TITLES = [
  'Show ao vivo na praça central', 'Festival gastronômico este fim de semana',
  'Jogo do campeonato estadual', 'Feira de artesanato aberta',
  'Festa junina no bairro', 'Mercado orgânico semanal',
  'Exposição de arte moderna', 'Sessão especial no cinema',
  'Apresentação de dança', 'Concerto gratuito na praça',
];
const COMMENTS = [
  'Confirmado! Acabei de passar por aí.', 'Cuidado pessoal, tá feio.',
  'Trânsito liberou agora.', 'Ótimo evento, super recomendo!',
  'Muito movimentado por aqui.', 'Polícia já está no local.',
  'Duração prevista: 2 horas.', 'Desvie pela paralela.',
  'Incrível! Venham todos.', 'Evento confirmado, muita gente.',
];

// ── Utilitários ────────────────────────────────────────────────────────────────
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randFloat = (min, max) => Math.random() * (max - min) + min;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function jitter(loc) {
  return {
    lat: loc.lat + randFloat(-0.03, 0.03),
    lon: loc.lon + randFloat(-0.03, 0.03),
    city: loc.city,
    state: loc.state,
  };
}

// ── Contadores globais ─────────────────────────────────────────────────────────
let created = 0, liked = 0, commented = 0, confirmed = 0, denied = 0, errors = 0;
const startTime = Date.now();

function printProgress(total, done) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  process.stdout.write(
    `\r[${elapsed}s] Usuários: ${done}/${total} | ` +
    `Eventos: ${created} | Curtidas: ${liked} | ` +
    `Comentários: ${commented} | Confirmações: ${confirmed} | ` +
    `Negações: ${denied} | Erros: ${errors}   `
  );
}

// ── Ações de um usuário ────────────────────────────────────────────────────────
async function simulateUser(userId, userIndex) {
  try {
    const loc = jitter(rand(LOCATIONS));
    const now = Date.now();

    // 1. Criar evento de estrada (70% dos usuários)
    if (Math.random() < 0.7) {
      const category = rand(ROAD_CATEGORIES);
      const ttlHours = 72; // 3 dias para testes
      await addDoc(collection(db, 'events'), {
        category,
        title: rand(ROAD_TITLES),
        latitude: loc.lat,
        longitude: loc.lon,
        createdAt: Timestamp.fromMillis(now),
        expiresAt: Timestamp.fromMillis(now + ttlHours * 3600 * 1000),
        userId,
        confirmations: Math.floor(Math.random() * 5),
        denials: Math.floor(Math.random() * 2),
        voters: [],
        stateUF: null,
        cityName: loc.city,
        countryCode: null,
      });
      created++;
    }

    // 2. Criar evento de entretenimento (40% dos usuários)
    if (Math.random() < 0.4) {
      const ttlHours = 168; // 7 dias para testes
      await addDoc(collection(db, 'entertainment_events'), {
        category: rand(ENT_CATEGORIES),
        title: rand(ENT_TITLES),
        latitude: loc.lat,
        longitude: loc.lon,
        createdAt: Timestamp.fromMillis(now),
        expiresAt: Timestamp.fromMillis(now + ttlHours * 3600 * 1000),
        userId,
        likes: [],
        commentCount: 0,
        stateUF: null,
        cityName: loc.city,
        countryCode: null,
        isFeatured: false,
      });
      created++;
    }

    // 3. Curtir eventos de entretenimento existentes (60% dos usuários)
    if (Math.random() < 0.6) {
      const snap = await getDocs(query(
        collection(db, 'entertainment_events'),
        where('expiresAt', '>', Timestamp.now()),
        orderBy('expiresAt', 'desc'),
        limit(5)
      ));
      for (const docSnap of snap.docs) {
        if (docSnap.data().userId !== userId && Math.random() < 0.5) {
          await updateDoc(doc(db, 'entertainment_events', docSnap.id), {
            likes: arrayUnion(userId),
          });
          liked++;
        }
      }
    }

    // 4. Confirmar/negar eventos de estrada existentes (50% dos usuários)
    if (Math.random() < 0.5) {
      const snap = await getDocs(query(
        collection(db, 'events'),
        where('expiresAt', '>', Timestamp.now()),
        orderBy('expiresAt', 'desc'),
        limit(5)
      ));
      for (const docSnap of snap.docs) {
        if (docSnap.data().userId !== userId && Math.random() < 0.4) {
          if (Math.random() < 0.75) {
            await updateDoc(doc(db, 'events', docSnap.id), { confirmations: increment(1) });
            confirmed++;
          } else {
            await updateDoc(doc(db, 'events', docSnap.id), { denials: increment(1) });
            denied++;
          }
        }
      }
    }

    // 5. Comentar em eventos de entretenimento (30% dos usuários)
    if (Math.random() < 0.3) {
      const snap = await getDocs(query(
        collection(db, 'entertainment_events'),
        where('expiresAt', '>', Timestamp.now()),
        orderBy('expiresAt', 'desc'),
        limit(3)
      ));
      for (const docSnap of snap.docs.slice(0, 1)) {
        await addDoc(collection(db, 'entertainment_events', docSnap.id, 'comments'), {
          userId,
          displayName: `Usuário ${userIndex}`,
          text: rand(COMMENTS),
          createdAt: Timestamp.now(),
        });
        await updateDoc(doc(db, 'entertainment_events', docSnap.id), {
          commentCount: increment(1),
        });
        commented++;
      }
    }

  } catch (e) {
    errors++;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const TOTAL_USERS = 500;
  const BATCH_SIZE  = 50;   // usuários por lote (respeita rate limits do Firestore)

  console.log(`\n🚀 Iniciando simulação de ${TOTAL_USERS} usuários no Alertoo...\n`);

  // Login anônimo único para autenticar na escrita
  await signInAnonymously(auth);

  let done = 0;
  for (let i = 0; i < TOTAL_USERS; i += BATCH_SIZE) {
    const batch = [];
    for (let j = i; j < Math.min(i + BATCH_SIZE, TOTAL_USERS); j++) {
      const fakeUid = `sim_user_${j}_${Date.now()}`;
      batch.push(simulateUser(fakeUid, j));
    }
    await Promise.all(batch);
    done = Math.min(i + BATCH_SIZE, TOTAL_USERS);
    printProgress(TOTAL_USERS, done);
    // Pequena pausa entre lotes para não bater nos rate limits
    if (done < TOTAL_USERS) await sleep(300);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n✅ Simulação concluída em ${elapsed}s!`);
  console.log(`   📍 Eventos criados:      ${created}`);
  console.log(`   ❤️  Curtidas:             ${liked}`);
  console.log(`   💬 Comentários:          ${commented}`);
  console.log(`   ✔️  Confirmações:         ${confirmed}`);
  console.log(`   ✖️  Negações:             ${denied}`);
  console.log(`   ⚠️  Erros:               ${errors}`);
  console.log(`   👥 Taxa de sucesso:      ${(((TOTAL_USERS - errors) / TOTAL_USERS) * 100).toFixed(1)}%`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
