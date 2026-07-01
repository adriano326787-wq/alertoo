// Cria os eventos de lei seca autenticando como admin via client SDK
// (mesmo padrão do check-admin.mjs) — mais confiável que functions:shell
// nesta máquina, que não completa as escritas via Admin SDK/ADC.
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import * as readline from 'readline/promises';

const firebaseConfig = {
  apiKey: "AIzaSyCoI9rNBK07vGZBuygprq4PkDKGT0iZkYU",
  projectId: "lei-seca---eventos",
  authDomain: "lei-seca---eventos.firebaseapp.com",
};

const ADMIN_EMAIL = 'adrianosethi@hotmail.com';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const TTL_MIN = 240; // Lei Seca = 4h
const MIN_REMAIN_MS = 60 * 60 * 1000;

const events = [
  { title: 'Lei Seca - Vivo Rio / Antes do SDU, Av Brasil', description: 'Av. Infante Dom Henrique, Vivo Rio / Antes do SDU, Av Brasil, Centro', latitude: -22.9356, longitude: -43.1729, cityName: 'Rio de Janeiro', stateUF: 'RJ', reportedAgoMin: 119 },
  { title: 'Lei Seca - DPO Praia dos Cavaleiros / Droga Raia', description: 'Av N Srª da Glória, DPO Praia dos Cavaleiros / Droga Raia, Centro', latitude: -22.3708, longitude: -41.7869, cityName: 'Macaé', stateUF: 'RJ', reportedAgoMin: 88 },
  { title: 'Lei Seca - Educandário Terra Santa, Único', description: 'Rua Monsenhor Bacelar, 489, Educandário Terra Santa, Único', latitude: -22.5079, longitude: -43.1857, cityName: 'Petrópolis', stateUF: 'RJ', reportedAgoMin: 197 },
  { title: 'Lei Seca - Padaria Rei do Recreio / Após Ponte de Madeira', description: 'Av. Pedro Moura, 128, Recreio dos Bandeirantes, Padaria Rei do Recreio / Após Ponte de Madeira, 2 Sentidos', latitude: -23.0099, longitude: -43.4639, cityName: 'Rio de Janeiro', stateUF: 'RJ', reportedAgoMin: 35 },
];

async function run() {
  console.log('\n🍺 Criar eventos de Lei Seca — conta admin\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const password = await rl.question(`🔑 Digite a senha do ${ADMIN_EMAIL}: `);
  rl.close();

  console.log('\n⏳ Autenticando...');
  const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
  const uid = cred.user.uid;
  console.log(`✅ Autenticado como ${ADMIN_EMAIL} (uid: ${uid})\n`);

  const now = Date.now();
  for (const ev of events) {
    const createdAtMs = now - ev.reportedAgoMin * 60 * 1000;
    const expiresAtMs = Math.max(createdAtMs + TTL_MIN * 60 * 1000, now + MIN_REMAIN_MS);

    try {
      const ref = await addDoc(collection(db, 'events'), {
        category: 'drunkcheck',
        title: ev.title,
        description: ev.description,
        latitude: ev.latitude,
        longitude: ev.longitude,
        createdAt: Timestamp.fromMillis(createdAtMs),
        expiresAt: Timestamp.fromMillis(expiresAtMs),
        confirmations: 0,
        denials: 0,
        voters: [],
        userId: uid,
        stateUF: ev.stateUF,
        cityName: ev.cityName,
        countryCode: 'BR',
        speedLimit: null,
      });
      console.log('✅ Criado:', ref.id, '-', ev.title);
    } catch (e) {
      console.log('❌ Falhou:', ev.title, '-', e.message);
    }
    await new Promise((r) => setTimeout(r, 18000)); // rate-limit real é 15s + margem pro Cloud Function trigger reagir
  }

  console.log('\nConcluído.');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
