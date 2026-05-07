import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
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

async function run() {
  console.log('\n🔍 Verificador de administrador — Road Events\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const password = await rl.question(`🔑 Digite a senha do ${ADMIN_EMAIL}: `);
  rl.close();

  console.log('\n⏳ Autenticando...');
  try {
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
    console.log('✅ Autenticado com sucesso!\n');
  } catch (err) {
    console.error('❌ Falha na autenticação:', err.message);
    process.exit(1);
  }

  // Verifica/cria documento config/admins
  const ref = doc(db, 'config', 'admins');
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    console.log('⚠️  Documento config/admins não existe. Criando...');
    await setDoc(ref, { emails: [ADMIN_EMAIL] });
    console.log('✅ Documento criado com sucesso!');
  } else {
    const emails = snap.data()?.emails ?? [];
    console.log('✅ Documento config/admins encontrado.');
    console.log(`📧 Admins cadastrados: ${emails.join(', ')}`);

    const isAdmin = emails.map(e => e.toLowerCase()).includes(ADMIN_EMAIL.toLowerCase());
    if (isAdmin) {
      console.log(`\n✅ "${ADMIN_EMAIL}" JÁ É administrador.\n`);
    } else {
      console.log(`\n⚠️  "${ADMIN_EMAIL}" não está na lista. Adicionando...`);
      await setDoc(ref, { emails: [...emails, ADMIN_EMAIL] }, { merge: true });
      console.log('✅ Adicionado com sucesso!\n');
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
