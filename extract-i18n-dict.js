/**
 * extract-i18n-dict.js
 *
 * Extrai o dicionário de traduções `n` do i18n.js minificado e salva como
 * i18n-dict.json (uma vez, para uso pelo gerador de páginas por idioma).
 * Também reporta quais chaves usadas em index.html (data-i18n*) estão
 * faltando em cada idioma.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'public', 'i18n.js'), 'utf8');

// Encontra "n={" e extrai o objeto balanceando chaves (respeitando strings)
const marker = 'n={';
const start = src.indexOf(marker);
if (start === -1) throw new Error('Marcador "n={" não encontrado em i18n.js');

let i = start + 2; // posiciona em "{"
let depth = 0;
let inString = false;
let escaped = false;
let end = -1;
for (; i < src.length; i++) {
  const ch = src[i];
  if (inString) {
    if (escaped) { escaped = false; }
    else if (ch === '\\') { escaped = true; }
    else if (ch === '"') { inString = false; }
    continue;
  }
  if (ch === '"') { inString = true; continue; }
  if (ch === '{') depth++;
  else if (ch === '}') {
    depth--;
    if (depth === 0) { end = i + 1; break; }
  }
}
if (end === -1) throw new Error('Não foi possível encontrar o fim do objeto n={...}');

const objStr = src.slice(start + 2, end);
// Não é JSON puro (chaves sem aspas, strings com aspas simples) — é um
// object literal JS válido, então avaliamos com new Function (fonte local confiável).
const dict = new Function('return (' + objStr + ')')();

fs.writeFileSync(path.join(__dirname, 'i18n-dict.json'), JSON.stringify(dict, null, 2), 'utf8');

const langs = Object.keys(dict);
console.log('Idiomas encontrados:', langs.join(', '));
for (const l of langs) {
  console.log(`  ${l}: ${Object.keys(dict[l]).length} chaves`);
}

// Chaves usadas em index.html (data-i18n*), extraídas via grep antes
const usedKeys = `nav.live,nav.alerts,nav.dui,nav.accidents,nav.floods,nav.radars,nav.events,nav.parties,nav.weekend,nav.more,nav.vsWaze,nav.about,nav.faq,nav.download,mobile.live,mobile.dui,mobile.accidents,mobile.floods,mobile.radars,mobile.parties,mobile.weekend,mobile.vsWaze,mobile.about,mobile.faq,mobile.download,hero.badge,hero.h1,hero.p,hero.googlePlay,hero.iosSoon,hero.alt.map,hero.alt.events,hero.alt.community,stats.categories,stats.radius,stats.languages,stats.free,events.liveNow,events.community,events.subtitle,events.activeLabel,events.all,events.traffic,events.accident,events.dui,events.police,events.flood,events.entertainment,events.loading,events.empty,events.refresh,ad.label,features.label,features.title,features.sub,feature1.title,feature1.p,feature2.title,feature2.p,feature3.title,feature3.p,feature4.title,feature4.p,feature5.title,feature5.p,feature6.title,feature6.p,how.label,how.title,how.sub,step1.title,step1.p,step2.title,step2.p,step3.title,step3.p,screenshots.label,screenshots.title,screenshots.sub,testimonials.label,testimonials.title,test1.text,test1.name,test1.city,test2.text,test2.name,test2.city,test3.text,test3.name,test3.city,ranking.label,ranking.title,ranking.sub,rank1,rank2,rank3,rank4,rank5,rank6,rank7,ios.h2,ios.p,ios.placeholder,ios.btn,ios.success,faq.label,faq.title,faq1.q,faq1.a,faq2.q,faq2.a,faq3.q,faq3.a,faq4.q,faq4.a,faq5.q,faq5.a,cta.title,cta.sub,cta.available,cta.iosSoon,footer.tagline,footer.app,footer.features,footer.how,footer.iosSoon,footer.about,footer.guides,footer.legal,footer.privacy,footer.delete,footer.rights,footer.made,cookie.text,cookie.privacy,cookie.decline,cookie.accept`.split(',');

const uniqueKeys = [...new Set(usedKeys)];
console.log(`\nTotal de chaves únicas usadas em index.html: ${uniqueKeys.length}`);

const targetLangs = ['en', 'es', 'fr', 'pt-PT'];
for (const l of targetLangs) {
  const missing = uniqueKeys.filter((k) => !(k in (dict[l] || {})));
  console.log(`\n[${l}] faltando ${missing.length} chave(s):`);
  if (missing.length) console.log('  ' + missing.join(', '));
}

// Também checa chaves de meta/og/twitter
const metaKeys = ['meta.title', 'meta.description', 'meta.keywords', 'og.title', 'og.description', 'twitter.title', 'twitter.description'];
console.log('\nChaves de meta/og/twitter por idioma:');
for (const l of ['pt-BR', ...targetLangs]) {
  const present = metaKeys.filter((k) => k in (dict[l] || {}));
  console.log(`  [${l}]: ${present.join(', ') || '(nenhuma)'}`);
}
