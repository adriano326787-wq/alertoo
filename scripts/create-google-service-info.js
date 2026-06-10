/**
 * create-google-service-info.js
 *
 * Gera o GoogleService-Info.plist a partir da variável de ambiente
 * GOOGLE_SERVICE_INFO_PLIST (conteúdo base64 do arquivo .plist).
 *
 * Uso no EAS Build (eas.json env ou EAS Secrets):
 *   GOOGLE_SERVICE_INFO_PLIST=<base64 do arquivo plist>
 *
 * Como obter o base64:
 *   base64 -w 0 GoogleService-Info.plist
 *
 * Adicione este script ao seu eas.json hooks ou rode antes do build:
 *   node scripts/create-google-service-info.js
 */

const fs = require('fs');
const path = require('path');

const b64 = process.env.GOOGLE_SERVICE_INFO_PLIST;
const outPath = path.resolve(__dirname, '..', 'GoogleService-Info.plist');

if (!b64) {
  // Se a variável não existe, verifica se o arquivo já está presente (dev local)
  if (fs.existsSync(outPath)) {
    console.log('[iOS] GoogleService-Info.plist já existe — nenhuma ação necessária.');
  } else {
    console.warn(
      '[iOS] AVISO: GOOGLE_SERVICE_INFO_PLIST não definida e GoogleService-Info.plist não encontrado.\n' +
      '  → Baixe o arquivo em: Firebase Console → Projeto → App iOS → GoogleService-Info.plist\n' +
      '  → Coloque na raiz do projeto OU defina a variável GOOGLE_SERVICE_INFO_PLIST (base64).'
    );
  }
  process.exit(0);
}

try {
  const content = Buffer.from(b64, 'base64').toString('utf-8');
  fs.writeFileSync(outPath, content, 'utf-8');
  console.log('[iOS] GoogleService-Info.plist gerado com sucesso em:', outPath);
} catch (err) {
  console.error('[iOS] Erro ao gerar GoogleService-Info.plist:', err.message);
  process.exit(1);
}
