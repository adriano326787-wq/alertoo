/**
 * Cria config/appConfig no Firestore usando firebase-tools API.
 */

const https = require('https');

// firebase-tools expõe API programática
let firebaseTools;
try {
  firebaseTools = require('firebase-tools');
} catch {
  console.error('❌ firebase-tools não encontrado. Instale: npm i -g firebase-tools');
  process.exit(1);
}

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
  console.log('🔑 Obtendo token via firebase-tools...');
  const token = await firebaseTools.login.list()
    .then(accounts => {
      if (!accounts || !accounts.length) throw new Error('Nenhuma conta logada');
      return accounts[0];
    })
    .then(account => firebaseTools.login.getIdToken(account.tokens, account.user));

  const config = {
    minVersionCode:    8,
    latestVersionCode: 12,
    forceUpdateUrl:    'https://play.google.com/store/apps/details?id=com.alertoo.app',
    maintenanceMode:   false,
    maintenanceMessage:'O Alertoo está em manutenção. Voltamos em breve!',
    updatedAt:         Date.now(),
  };

  console.log('📝 Gravando no Firestore...');
  await firestoreSet(token, config);

  console.log('\n✅ config/appConfig criado!');
  console.log(JSON.stringify(config, null, 2));
}

main().catch(err => {
  console.error('\n❌', err.message);
  process.exit(1);
});
