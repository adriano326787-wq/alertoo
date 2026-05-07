/**
 * Simulação de 100 usuários no Road Events
 * Cria eventos de trânsito e entretenimento, votos, curtidas e comentários.
 *
 * Uso:
 *   node scripts/simulate100users.mjs
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getFirestore, collection, addDoc, doc, updateDoc,
  Timestamp, increment, arrayUnion, getDocs, query,
  where, orderBy, limit,
} from 'firebase/firestore';

// ─── Config Firebase ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: 'AIzaSyCoI9rNBK07vGZBuygprq4PkDKGT0iZkYU',
  authDomain: 'lei-seca---eventos.firebaseapp.com',
  projectId: 'lei-seca---eventos',
  storageBucket: 'lei-seca---eventos.firebasestorage.app',
  messagingSenderId: '657066902706',
  appId: '1:657066902706:web:3e3d49f23a819c5ce1b5ab',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

// ─── Dados de simulação ───────────────────────────────────────────────────────
const STATES = [
  { uf: 'SP', cities: ['São Paulo', 'Campinas', 'Santos', 'Ribeirão Preto'] },
  { uf: 'RJ', cities: ['Rio de Janeiro', 'Niterói', 'Petrópolis'] },
  { uf: 'MG', cities: ['Belo Horizonte', 'Uberlândia', 'Contagem'] },
  { uf: 'RS', cities: ['Porto Alegre', 'Caxias do Sul', 'Pelotas'] },
  { uf: 'PR', cities: ['Curitiba', 'Londrina', 'Maringá'] },
  { uf: 'BA', cities: ['Salvador', 'Feira de Santana', 'Vitória da Conquista'] },
  { uf: 'GO', cities: ['Goiânia', 'Anápolis'] },
  { uf: 'SC', cities: ['Florianópolis', 'Joinville', 'Blumenau'] },
];

// Coordenadas aproximadas por estado
const STATE_COORDS = {
  SP: { lat: -23.55, lng: -46.63 },
  RJ: { lat: -22.91, lng: -43.17 },
  MG: { lat: -19.92, lng: -43.94 },
  RS: { lat: -30.03, lng: -51.22 },
  PR: { lat: -25.43, lng: -49.27 },
  BA: { lat: -12.97, lng: -38.50 },
  GO: { lat: -16.68, lng: -49.25 },
  SC: { lat: -27.59, lng: -48.55 },
};

const ROAD_CATEGORIES = [
  { id: 'drunkcheck',  ttlMin: 60 },
  { id: 'policeblitz', ttlMin: 60 },
  { id: 'accident',    ttlMin: 60 },
  { id: 'roadwork',    ttlMin: 60 },
  { id: 'flood',       ttlMin: 60 },
  { id: 'closure',     ttlMin: 60 },
  { id: 'traffic',     ttlMin: 60 },
  { id: 'hazard',      ttlMin: 60 },
];

const ROAD_TITLES = {
  drunkcheck:  ['Lei Seca na Av. Paulista', 'Operação Lei Seca', 'Blitz Lei Seca no centro'],
  policeblitz: ['Blitz policial na rodovia', 'Fiscalização na entrada da cidade', 'Operação policial'],
  accident:    ['Acidente com dois carros', 'Colisão na pista', 'Batida na rotatória'],
  roadwork:    ['Obras na pista direita', 'Recapeamento asfáltico', 'Obras de saneamento'],
  flood:       ['Alagamento no viaduto', 'Rua alagada após chuva', 'Ponto de alagamento'],
  closure:     ['Via interditada', 'Pista fechada sentido bairro', 'Bloqueio na via'],
  traffic:     ['Congestionamento intenso', 'Trânsito parado na saída', 'Fila no pedágio'],
  hazard:      ['Buraco na pista', 'Animal na via', 'Objeto na pista'],
};

const ENT_CATEGORIES = ['bar', 'restaurant', 'party', 'show', 'festival', 'club'];

const ENT_TITLES = {
  bar:        ['Happy Hour no Bar do Zé', 'Barzinho com chopp gelado', 'Trivia Night no bar'],
  restaurant: ['Rodízio liberado', 'Almoço executivo', 'Festival gastronômico'],
  party:      ['Festa na cobertura', 'Aniversário aberto', 'Pool party'],
  show:       ['Show ao vivo na praça', 'Apresentação de jazz', 'Banda local no palco'],
  festival:   ['Festival de food trucks', 'Feira cultural', 'Festival de cerveja artesanal'],
  club:       ['Open bar até meia-noite', 'Noite temática anos 80', 'DJ set especial'],
};

const ENT_DESCS = [
  'Entrada franca, venha curtir!',
  'Imperdível, não perca essa oportunidade.',
  'Evento gratuito para todos.',
  'Traga os amigos!',
  null, null, // alguns sem descrição
];

const COMMENTS = [
  'Confirmado! Passando agora.',
  'Vi também, muito movimento.',
  'Tá feio isso aí.',
  'Cuidado pessoal!',
  'Já passei, ainda tá lá.',
  'Parece que liberou.',
  'Muito bom esse evento!',
  'Recomendo demais!',
  'Já fui, valeu a pena.',
  'Alguém sabe que horas termina?',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function uid(i) { return `sim_user_${String(i).padStart(3, '0')}`; }
function jitter(base, delta = 0.15) { return base + (Math.random() - 0.5) * delta; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

// ─── Fase 1: Criar eventos de trânsito ───────────────────────────────────────
async function createRoadEvents(userIds) {
  log('📍 Criando eventos de trânsito...');
  const created = [];

  // 40 eventos de trânsito distribuídos entre os estados
  for (let i = 0; i < 40; i++) {
    const userId = rand(userIds);
    const state = rand(STATES);
    const coords = STATE_COORDS[state.uf];
    const cat = rand(ROAD_CATEGORIES);
    const now = Date.now();
    // Mistura de eventos: alguns já quase expirando, outros recém criados
    const ageMin = randInt(0, 50); // criado entre 0 e 50 min atrás
    const createdAt = now - ageMin * 60_000;
    const expiresAt = createdAt + cat.ttlMin * 60_000;

    if (expiresAt <= now) continue; // não inserir já expirado

    const ref = await addDoc(collection(db, 'events'), {
      category: cat.id,
      title: rand(ROAD_TITLES[cat.id]),
      description: Math.random() > 0.5 ? 'Atenção motoristas, cuidado na via.' : null,
      latitude: jitter(coords.lat),
      longitude: jitter(coords.lng),
      createdAt: Timestamp.fromMillis(createdAt),
      expiresAt: Timestamp.fromMillis(expiresAt),
      confirmations: 0,
      denials: 0,
      voters: [],
      userId,
      stateUF: state.uf,
      cityName: rand(state.cities),
      countryCode: 'BR',
    });

    created.push({ id: ref.id, userId, expiresAt });
    process.stdout.write('.');
  }

  console.log(`\n✅ ${created.length} eventos de trânsito criados.`);
  return created;
}

// ─── Fase 2: Criar eventos de entretenimento ──────────────────────────────────
async function createEntertainmentEvents(userIds) {
  log('🎉 Criando eventos de entretenimento...');
  const created = [];
  const TTL_H = 4;

  for (let i = 0; i < 35; i++) {
    const userId = rand(userIds);
    const state = rand(STATES);
    const coords = STATE_COORDS[state.uf];
    const cat = rand(ENT_CATEGORIES);
    const now = Date.now();
    const ageMin = randInt(0, 200); // até 3h20min atrás
    const createdAt = now - ageMin * 60_000;
    const expiresAt = createdAt + TTL_H * 60 * 60_000;

    if (expiresAt <= now) continue;

    const ref = await addDoc(collection(db, 'entertainment_events'), {
      category: cat,
      title: rand(ENT_TITLES[cat]),
      description: rand(ENT_DESCS),
      address: `Rua ${rand(['das Flores', 'Sete de Setembro', 'Boa Vista', 'Dom Pedro II'])}, ${randInt(10, 999)}`,
      latitude: jitter(coords.lat),
      longitude: jitter(coords.lng),
      createdAt: Timestamp.fromMillis(createdAt),
      expiresAt: Timestamp.fromMillis(expiresAt),
      userId,
      likes: [],
      commentCount: 0,
      stateUF: state.uf,
      cityName: rand(state.cities),
      countryCode: 'BR',
      isFeatured: false,
    });

    created.push({ id: ref.id, userId });
    process.stdout.write('.');
  }

  console.log(`\n✅ ${created.length} eventos de entretenimento criados.`);
  return created;
}

// ─── Fase 3: Votar em eventos de trânsito ────────────────────────────────────
async function voteOnRoadEvents(roadEvents, userIds) {
  log('🗳️  Simulando votos em eventos de trânsito...');
  let votes = 0;

  for (const event of roadEvents) {
    // Entre 2 e 15 usuários votam em cada evento
    const voters = new Set();
    const voteCount = randInt(2, 15);
    const candidates = userIds.filter(u => u !== event.userId);

    for (let i = 0; i < voteCount && i < candidates.length; i++) {
      let voter;
      do { voter = rand(candidates); } while (voters.has(voter));
      voters.add(voter);

      const isConfirm = Math.random() > 0.25; // 75% confirmam, 25% negam
      const ref = doc(db, 'events', event.id);
      await updateDoc(ref, {
        [isConfirm ? 'confirmations' : 'denials']: increment(1),
        voters: arrayUnion(voter),
      });
      votes++;
    }
    process.stdout.write('.');
  }

  console.log(`\n✅ ${votes} votos registrados.`);
}

// ─── Fase 4: Curtir eventos de entretenimento ─────────────────────────────────
async function likeEntertainmentEvents(entEvents, userIds) {
  log('❤️  Simulando curtidas...');
  let likes = 0;

  for (const event of entEvents) {
    const likeCount = randInt(1, 20);
    const likers = new Set();
    const candidates = userIds.filter(u => u !== event.userId);

    for (let i = 0; i < likeCount && i < candidates.length; i++) {
      let liker;
      do { liker = rand(candidates); } while (likers.has(liker));
      likers.add(liker);

      const ref = doc(db, 'entertainment_events', event.id);
      await updateDoc(ref, { likes: arrayUnion(liker) });
      likes++;
    }
    process.stdout.write('.');
  }

  console.log(`\n✅ ${likes} curtidas registradas.`);
}

// ─── Fase 5: Comentar em eventos de entretenimento ───────────────────────────
async function commentOnEvents(entEvents, userIds) {
  log('💬 Simulando comentários...');
  let comments = 0;

  for (const event of entEvents) {
    const commentCount = randInt(0, 6);
    for (let i = 0; i < commentCount; i++) {
      const commenter = rand(userIds.filter(u => u !== event.userId));
      await addDoc(collection(db, 'entertainment_events', event.id, 'comments'), {
        userId: commenter,
        displayName: `Usuário ${commenter.split('_')[2]}`,
        text: rand(COMMENTS),
        createdAt: Timestamp.fromMillis(Date.now() - randInt(0, 30) * 60_000),
      });
      // Atualiza contador
      await updateDoc(doc(db, 'entertainment_events', event.id), {
        commentCount: increment(1),
      });
      comments++;
    }
    process.stdout.write('.');
  }

  console.log(`\n✅ ${comments} comentários criados.`);
}

// ─── Relatório final ──────────────────────────────────────────────────────────
async function printReport(roadEvents, entEvents) {
  log('\n📊 RELATÓRIO DA SIMULAÇÃO');
  console.log('━'.repeat(50));

  // Busca os estados com mais eventos de trânsito
  const roadSnap = await getDocs(
    query(collection(db, 'events'), where('expiresAt', '>', Timestamp.now()))
  );
  const entSnap = await getDocs(
    query(collection(db, 'entertainment_events'), where('expiresAt', '>', Timestamp.now()))
  );

  const stateCounts = {};
  roadSnap.forEach(d => {
    const uf = d.data().stateUF ?? '??';
    stateCounts[uf] = (stateCounts[uf] ?? 0) + 1;
  });

  const entStateCounts = {};
  entSnap.forEach(d => {
    const uf = d.data().stateUF ?? '??';
    entStateCounts[uf] = (entStateCounts[uf] ?? 0) + 1;
  });

  console.log(`\n🚗 Eventos de trânsito ativos no Firestore: ${roadSnap.size}`);
  Object.entries(stateCounts).sort((a,b) => b[1]-a[1]).forEach(([uf, n]) => {
    console.log(`   ${uf}: ${'█'.repeat(n)} (${n})`);
  });

  console.log(`\n🎉 Eventos de entretenimento ativos: ${entSnap.size}`);
  Object.entries(entStateCounts).sort((a,b) => b[1]-a[1]).forEach(([uf, n]) => {
    console.log(`   ${uf}: ${'█'.repeat(n)} (${n})`);
  });

  console.log('\n👥 Usuários simulados: 100');
  console.log(`📍 Eventos de trânsito criados: ${roadEvents.length}`);
  console.log(`🎉 Eventos de entretenimento criados: ${entEvents.length}`);
  console.log('━'.repeat(50));
  console.log('✅ Simulação concluída! Abra o app para ver os resultados.\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Road Events — Simulação de 100 usuários\n');

  // Autentica anonimamente para passar nas regras de segurança do Firestore
  log('🔐 Autenticando no Firebase...');
  const cred = await signInAnonymously(auth);
  log(`✅ Autenticado como: ${cred.user.uid}`);

  // Gera 100 IDs de usuários simulados
  const userIds = Array.from({ length: 100 }, (_, i) => uid(i + 1));

  const roadEvents = await createRoadEvents(userIds);
  await sleep(500);

  const entEvents = await createEntertainmentEvents(userIds);
  await sleep(500);

  await voteOnRoadEvents(roadEvents, userIds);
  await sleep(300);

  await likeEntertainmentEvents(entEvents, userIds);
  await sleep(300);

  await commentOnEvents(entEvents, userIds);
  await sleep(300);

  await printReport(roadEvents, entEvents);

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro na simulação:', err);
  process.exit(1);
});
