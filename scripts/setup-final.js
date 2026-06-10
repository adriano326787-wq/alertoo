/**
 * Cria config/appConfig no Firestore via firebase-tools API.
 */
const ft = require('C:/Users/adria/AppData/Roaming/npm/node_modules/firebase-tools');
const https = require('https');

const PROJECT_ID = 'lei-seca---eventos';

async function firestoreSet(token, data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'number')  fields[k] = { integerValue: String(Math.round(v)) };
    if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    if (typeof v === 'string')  fields[k] = { stringValue: v };
  }
  const body = JSON.stringify({ fields });
  const urlPath = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/config/appConfig`;
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'firestore.googleapis.com',
      path: urlPath,
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(d));
        else reject(new Error(`HTTP ${res.statusCode}: ${d}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('🔑 Buscando contas logadas...');
  const accounts = await ft.login.list();
  if (!accounts || !accounts.length) throw new Error('Nenhuma conta logada. Execute: firebase login');

  const account = accounts[0];
  console.log(`👤 Usando conta: ${account.user.email}`);

  const token = account.tokens.access_token;

  const config = {
    minVersionCode:    9,
    latestVersionCode: 13,
    forceUpdateUrl:    'https://play.google.com/store/apps/details?id=com.alertoo.app',
    maintenanceMode:   false,
    maintenanceMessage:'O Alertoo está em manutenção. Voltamos em breve!',
    updatedAt:         Date.now(),
  };

  console.log('📝 Gravando no Firestore...');
  await firestoreSet(token, config);

  console.log('\n✅ config/appConfig criado com sucesso!');
  console.log(JSON.stringify(config, null, 2));
  console.log('\n🔗 Veja no Firebase Console:');
  console.log('   https://console.firebase.google.com/project/lei-seca---eventos/firestore');
}

main().catch(err => {
  console.error('\n❌', err.message);
  process.exit(1);
});
