/**
 * Cria/atualiza config/appConfig no Firestore.
 * Usa Application Default Credentials (ADC) do Firebase CLI já logado.
 *
 * Uso:
 *   node scripts/setup-app-config.js
 */

const { initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

const PROJECT_ID = 'lei-seca---eventos';

// Tenta usar service account se existir, senão usa ADC
const KEY_PATH = path.join(__dirname, '..', 'serviceAccountKey.json');
let credential;
if (fs.existsSync(KEY_PATH)) {
  credential = cert(require(KEY_PATH));
  console.log('🔑 Usando serviceAccountKey.json');
} else {
  credential = applicationDefault();
  console.log('🔑 Usando Application Default Credentials (Firebase CLI)');
}

initializeApp({ credential, projectId: PROJECT_ID });
const db = getFirestore();

async function main() {
  const ref = db.collection('config').doc('appConfig');

  const config = {
    // versionCode atual: 12 (app.config.js android.versionCode)
    // minVersionCode 8 = suporta as 5 versões anteriores (8, 9, 10, 11, 12)
    minVersionCode:    8,
    latestVersionCode: 12,
    forceUpdateUrl: 'https://play.google.com/store/apps/details?id=com.alertoo.app',
    maintenanceMode:    false,
    maintenanceMessage: 'O Alertoo está em manutenção. Voltamos em breve!',
    updatedAt: Date.now(),
  };

  await ref.set(config, { merge: true });

  console.log('\n✅ config/appConfig criado com sucesso:');
  console.log(JSON.stringify(config, null, 2));
  console.log('\n📌 Para bloquear versões antigas, altere minVersionCode no Firebase Console:');
  console.log('   https://console.firebase.google.com/project/lei-seca---eventos/firestore/databases/-default-/data/~2Fconfig~2FappConfig');
}

main().catch((err) => {
  console.error('\n❌ Erro:', err.message);
  if (err.message.includes('credential')) {
    console.error('\n💡 Solução: baixe a service account em:');
    console.error('   Firebase Console → Configurações → Contas de serviço → Gerar nova chave privada');
    console.error('   Salve como serviceAccountKey.json na raiz do projeto e rode novamente.\n');
  }
  process.exit(1);
});
