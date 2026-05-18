/**
 * patch-admob.js — executado via postinstall
 *
 * react-native-google-mobile-ads usa TurboModuleRegistry.getEnforcing()
 * que crasha no boot quando o módulo nativo não está disponível
 * (incompatibilidade com New Architecture do RN 0.81+).
 *
 * Este script substitui getEnforcing por get nos arquivos compilados
 * do pacote, tornando o erro não-fatal (retorna null em vez de crashar).
 */

const fs = require('fs');
const path = require('path');

const libDir = path.join(
  __dirname,
  '../node_modules/react-native-google-mobile-ads/lib'
);

if (!fs.existsSync(libDir)) {
  console.log('[patch-admob] pacote não encontrado, pulando.');
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
console.log(`[patch-admob] ${patched} arquivo(s) patchado(s) — getEnforcing → get`);
