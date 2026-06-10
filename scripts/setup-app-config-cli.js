/**
 * Cria config/appConfig via Firestore REST API,
 * usando o token OAuth2 já armazenado pelo Firebase CLI.
 */

const https = require('https');
const path  = require('path');
const fs    = require('fs');
const os    = require('os');

const PROJECT_ID = 'lei-seca---eventos';
const COLLECTION = 'config';
const DOCUMENT   = 'appConfig';

// Lê o token de refresh armazenado pelo firebase-tools
const credsPath = path.join(
  os.homedir(),
  'AppData', 'Roaming', 'npm', 'node_modules', 'firebase-tools',
  '..' , '..', '..', '..', 'firebase', 'credentials.json'
);

// Caminho real no Windows: %APPDATA%\firebase\credentials.json
const credPathWin = path.join(process.env.APPDATA || '', 'firebase', 'credentials.json');

function readJson(p) {
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  return null;
}

async function getAccessToken(refreshToken) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8vu8R88MJRe5yYp8G',
    });
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path:     '/token',
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': body.length },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (json.access_token) resolve(json.access_token);
        else reject(new Error(JSON.stringify(json)));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function firestoreSet(token, docData) {
  const fields = {};
  for (const [k, v] of Object.entries(docData)) {
    if (typeof v === 'number')  fields[k] = { integerValue: String(v) };
    if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    if (typeof v === 'string')  fields[k] = { stringValue: v };
  }
  const body = JSON.stringify({ fields });
  const urlPath = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${DOCUMENT}`;

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'firestore.googleapis.com',
      path:     urlPath,
      method:   'PATCH',
      headers:  {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data));
        else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const creds = readJson(credPathWin);
  if (!creds) {
    console.error('❌ credentials.json não encontrado em:', credPathWin);
    process.exit(1);
  }

  const tokens = creds.tokens || creds;
  const accounts = Object.values(tokens);
  if (!accounts.length) {
    console.error('❌ Nenhuma conta encontrada no credentials.json');
    process.exit(1);
  }

  const account = accounts[0];
  const refreshToken = account.refresh_token || account.tokens?.refresh_token;
  if (!refreshToken) {
    console.error('❌ refresh_token não encontrado');
    process.exit(1);
  }

  console.log('🔑 Obtendo access token via Firebase CLI...');
  const accessToken = await getAccessToken(refreshToken);

  const config = {
    minVersionCode:    8,
    latestVersionCode: 12,
    forceUpdateUrl:    'https://play.google.com/store/apps/details?id=com.alertoo.app',
    maintenanceMode:   false,
    maintenanceMessage:'O Alertoo está em manutenção. Voltamos em breve!',
    updatedAt:         Date.now(),
  };

  console.log('📝 Gravando config/appConfig no Firestore...');
  await firestoreSet(accessToken, config);

  console.log('\n✅ Documento criado com sucesso!');
  console.log(JSON.stringify(config, null, 2));
  console.log('\n🔗 Ver no Firebase Console:');
  console.log('   https://console.firebase.google.com/project/lei-seca---eventos/firestore');
}

main().catch(err => {
  console.error('\n❌', err.message);
  process.exit(1);
});
