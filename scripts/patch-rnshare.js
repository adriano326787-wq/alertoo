/**
 * patch-rnshare.js — executado via postinstall
 *
 * react-native-share usa TurboModuleRegistry.getEnforcing('RNShare') no
 * top-level de NativeRNShare.js, que é importado eagerly por index.js.
 * Isso crasha o app NA ABERTURA (não só ao compartilhar) quando o módulo
 * nativo não está disponível (ex: binário nativo mais antigo que o JS
 * bundle entregue via OTA — incompatibilidade de versão, não de New Architecture).
 *
 * Este script substitui getEnforcing por get nos arquivos compilados
 * do pacote, tornando o erro não-fatal (retorna null em vez de crashar).
 * Ver também scripts/patch-admob.js (mesmo padrão, outro pacote).
 */

const fs = require('fs');
const path = require('path');

const libDir = path.join(
  __dirname,
  '../node_modules/react-native-share/lib'
);

if (!fs.existsSync(libDir)) {
  console.log('[patch-rnshare] pacote não encontrado, pulando.');
  process.exit(0);
}

let patched = 0;

function patchDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      patchDir(full);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('getEnforcing')) {
        fs.writeFileSync(full, content.replaceAll('getEnforcing', 'get'), 'utf8');
        patched++;
      }
    }
  }
}

patchDir(libDir);
console.log(`[patch-rnshare] ${patched} arquivo(s) patchado(s) — getEnforcing → get`);
