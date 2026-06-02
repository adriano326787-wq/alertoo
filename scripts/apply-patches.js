/**
 * apply-patches.js — aplica patches manuais em node_modules após npm install
 *
 * Por que não usar patch-package?
 * Em Windows, os builds Android geram arquivos .dex com paths longos dentro de
 * node_modules que quebram o patch-package (erro "Filename too long" no git).
 * Esta abordagem usa cp simples — sem git, sem problemas.
 */

const fs = require('fs');
const path = require('path');

const PATCHES = [
  {
    // Fix para React Native New Architecture (Fabric): createDrawable() usava
    // this.width/height do SizeReportingShadowNode (API Old Arch) que retorna 0
    // no Fabric, causando o bitmap de 100×100 com o círculo no canto — arco de 1/4.
    // Fix: usa getWidth()/getHeight() (dimensões reais do View layout do Fabric) primeiro.
    src: path.join(__dirname, '../patches/MapMarker.java'),
    dest: path.join(
      __dirname,
      '../node_modules/react-native-maps/android/src/main/java/com/rnmaps/maps/MapMarker.java'
    ),
    description: 'react-native-maps MapMarker: Fabric bitmap capture fix',
  },
];

let applied = 0;
let skipped = 0;

for (const patch of PATCHES) {
  if (!fs.existsSync(patch.src)) {
    console.log(`[patches] SKIP (source não encontrado): ${patch.description}`);
    skipped++;
    continue;
  }
  if (!fs.existsSync(path.dirname(patch.dest))) {
    console.log(`[patches] SKIP (destino não existe): ${patch.description}`);
    skipped++;
    continue;
  }
  try {
    fs.copyFileSync(patch.src, patch.dest);
    console.log(`[patches] OK: ${patch.description}`);
    applied++;
  } catch (e) {
    console.error(`[patches] ERRO em ${patch.description}:`, e.message);
  }
}

console.log(`[patches] ${applied} aplicado(s), ${skipped} ignorado(s).`);
