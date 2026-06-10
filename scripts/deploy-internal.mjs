/**
 * deploy-internal.mjs — Deploy automático para faixa de Teste Interno do Google Play.
 *
 * Uso:
 *   node scripts/deploy-internal.mjs
 *
 * Pré-requisitos:
 *   1. google-play-key.json na raiz do projeto (service account com permissão de lançamento)
 *   2. AAB já buildado em android/app/build/outputs/bundle/release/app-release.aab
 *      (ou use a flag --build para buildar automaticamente)
 *
 * Flags opcionais:
 *   --build    Faz o build do AAB antes de fazer upload
 *   --version  Exibe a versão atual sem fazer upload
 */

import { google } from 'googleapis';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

// ─── Configuração ─────────────────────────────────────────────────────────────
const PACKAGE_NAME    = 'com.alertoo.app';
const KEY_FILE        = resolve(ROOT, 'google-play-key.json');
const AAB_PATH        = resolve(ROOT, 'android/app/build/outputs/bundle/release/app-release.aab');
const TRACK           = 'internal'; // internal | alpha | beta | production
const RELEASE_STATUS  = 'completed'; // completed = disponível imediatamente

// ─── Helpers ──────────────────────────────────────────────────────────────────
function log(msg) { console.log(`\n▶  ${msg}`); }
function ok(msg)  { console.log(`✅  ${msg}`); }
function err(msg) { console.error(`❌  ${msg}`); process.exit(1); }

// ─── Validações iniciais ───────────────────────────────────────────────────────
if (!existsSync(KEY_FILE)) {
  err(
    'google-play-key.json não encontrado!\n\n' +
    '   Crie uma conta de serviço no Google Play Console:\n' +
    '   Configuração → Acesso à API → Criar conta de serviço\n' +
    '   Baixe a chave JSON e salve como: google-play-key.json (na raiz do projeto)'
  );
}

const args = process.argv.slice(2);

// ─── Build opcional ────────────────────────────────────────────────────────────
if (args.includes('--build')) {
  log('Fazendo build do AAB...');
  try {
    execSync('cd android && .\\gradlew.bat bundleRelease', {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
    });
    ok('Build concluído!');
  } catch {
    err('Falha no build do AAB.');
  }
}

if (!existsSync(AAB_PATH)) {
  err(
    'AAB não encontrado em:\n' +
    `   ${AAB_PATH}\n\n` +
    '   Execute primeiro: node scripts/deploy-internal.mjs --build'
  );
}

// ─── Autenticação ─────────────────────────────────────────────────────────────
log('Autenticando com Google Play API...');
const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});
const authClient = await auth.getClient();
const publisher  = google.androidpublisher({ version: 'v3', auth: authClient });

// ─── Lê versionCode do build.gradle ───────────────────────────────────────────
const buildGradle   = readFileSync(resolve(ROOT, 'android/app/build.gradle'), 'utf8');
const versionCode   = parseInt(buildGradle.match(/versionCode\s+(\d+)/)?.[1] ?? '0', 10);
const versionName   = buildGradle.match(/versionName\s+"([^"]+)"/)?.[1] ?? '?';

log(`Versão detectada: ${versionName} (versionCode ${versionCode})`);

if (args.includes('--version')) {
  console.log('\nNenhum upload realizado (flag --version).');
  process.exit(0);
}

// ─── Abre edição ──────────────────────────────────────────────────────────────
log('Abrindo edição no Play Console...');
const editRes = await publisher.edits.insert({ packageName: PACKAGE_NAME });
const editId  = editRes.data.id;
ok(`Edit ID: ${editId}`);

try {
  // ─── Upload do AAB ──────────────────────────────────────────────────────────
  log(`Fazendo upload do AAB (${Math.round(require.resolve ? 1 : 1)} arquivo)...`);
  const aabSize = (await import('node:fs')).statSync(AAB_PATH).size;
  console.log(`   Arquivo: app-release.aab (${(aabSize / 1024 / 1024).toFixed(1)} MB)`);

  const uploadRes = await publisher.edits.bundles.upload({
    packageName: PACKAGE_NAME,
    editId,
    media: {
      mimeType: 'application/octet-stream',
      body: createReadStream(AAB_PATH),
    },
  });
  const uploadedVersionCode = uploadRes.data.versionCode;
  ok(`AAB enviado! versionCode no Play: ${uploadedVersionCode}`);

  // ─── Configura a faixa de lançamento ────────────────────────────────────────
  log(`Configurando faixa "${TRACK}"...`);
  await publisher.edits.tracks.update({
    packageName: PACKAGE_NAME,
    editId,
    track: TRACK,
    requestBody: {
      track: TRACK,
      releases: [
        {
          versionCodes: [String(uploadedVersionCode)],
          status: RELEASE_STATUS,
          releaseNotes: [
            {
              language: 'pt-BR',
              text: `Versão ${versionName} — build ${uploadedVersionCode}`,
            },
          ],
        },
      ],
    },
  });
  ok(`Faixa "${TRACK}" configurada!`);

  // ─── Confirma a edição ──────────────────────────────────────────────────────
  log('Confirmando edição...');
  await publisher.edits.commit({ packageName: PACKAGE_NAME, editId });
  ok('Edição confirmada!');

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  ✅  Deploy concluído com sucesso!                        ║
║                                                          ║
║  App:     Alertoo ${versionName} (build ${String(uploadedVersionCode).padEnd(3)})                   ║
║  Faixa:   Teste Interno                                  ║
║  Status:  Disponível imediatamente para testadores       ║
║                                                          ║
║  Acesse o Play Console para ver o status:                ║
║  https://play.google.com/console                         ║
╚══════════════════════════════════════════════════════════╝
`);

} catch (e) {
  // Cancela a edição em caso de erro
  try {
    await publisher.edits.delete({ packageName: PACKAGE_NAME, editId });
  } catch {}
  err(`Falha no deploy: ${e?.message ?? e}`);
}
