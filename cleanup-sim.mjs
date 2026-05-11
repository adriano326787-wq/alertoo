/**
 * Remove eventos criados pela simulação com categorias inválidas
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCoI9rNBK07vGZBuygprq4PkDKGT0iZkYU',
  authDomain: 'lei-seca---eventos.firebaseapp.com',
  projectId: 'lei-seca---eventos',
  storageBucket: 'lei-seca---eventos.firebasestorage.app',
  messagingSenderId: '657066902706',
  appId: '1:657066902706:web:3e3d49f23a819c5ce1b5ab',
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

const VALID_ROAD = new Set(['drunkcheck','policeblitz','accident','roadwork','flood','closure','traffic','hazard']);
const VALID_ENT  = new Set(['bar','restaurant','party','show','festival','club']);

async function deleteInvalid(collectionName, validSet) {
  const snap = await getDocs(collection(db, collectionName));
  let deleted = 0;
  const ops = [];
  for (const d of snap.docs) {
    const cat = d.data().category;
    // Deleta se categoria inválida OU se é evento de simulação (userId começa com sim_)
    if (!validSet.has(cat) || d.data().userId?.startsWith('sim_')) {
      ops.push(deleteDoc(doc(db, collectionName, d.id)).then(() => deleted++));
    }
  }
  await Promise.all(ops);
  console.log(`  ${collectionName}: ${deleted} documentos removidos (de ${snap.docs.length})`);
}

async function main() {
  console.log('\n🧹 Limpando dados da simulação...\n');
  await signInAnonymously(auth);
  await deleteInvalid('events', VALID_ROAD);
  await deleteInvalid('entertainment_events', VALID_ENT);
  console.log('\n✅ Limpeza concluída!');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
