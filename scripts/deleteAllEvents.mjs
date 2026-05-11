// Script para deletar todos os documentos da coleção entertainment_events
// Uso: node scripts/deleteAllEvents.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCoI9rNBK07vGZBuygprq4PkDKGT0iZkYU',
  authDomain: 'lei-seca---eventos.firebaseapp.com',
  projectId: 'lei-seca---eventos',
  storageBucket: 'lei-seca---eventos.firebasestorage.app',
  messagingSenderId: '657066902706',
  appId: '1:657066902706:web:3e3d49f23a819c5ce1b5ab',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteAll() {
  const snap = await getDocs(collection(db, 'entertainment_events'));
  if (snap.empty) {
    console.log('Nenhum evento encontrado.');
    process.exit(0);
  }

  console.log(`Deletando ${snap.size} eventos...`);
  const promises = snap.docs.map((d) => deleteDoc(doc(db, 'entertainment_events', d.id)));
  await Promise.all(promises);
  console.log('✅ Todos os eventos deletados!');
  process.exit(0);
}

deleteAll().catch((err) => {
  console.error('Erro:', err);
  process.exit(1);
});
