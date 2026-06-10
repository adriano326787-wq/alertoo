/**
 * verify-links.js
 *
 * Para cada página de idioma em produção, extrai todos os href/src internos
 * (mesma origem) e verifica o status HTTP de cada um (uma vez, deduplicado).
 */
const PAGES = [
  'https://alertoo.com.br/',
  'https://alertoo.com.br/en/',
  'https://alertoo.com.br/es/',
  'https://alertoo.com.br/fr/',
  'https://alertoo.com.br/pt-PT/',
];

function extractUrls(html) {
  const urls = new Set();
  const attrRe = /\s(?:href|src)="([^"]+)"/g;
  let m;
  while ((m = attrRe.exec(html))) {
    let u = m[1];
    if (u.startsWith('#') || u.startsWith('mailto:') || u.startsWith('http') && !u.startsWith('https://alertoo.com.br')) continue;
    if (u.startsWith('//')) continue;
    urls.add(u);
  }
  return urls;
}

(async () => {
  const allUrls = new Set();
  for (const page of PAGES) {
    const res = await fetch(page);
    const html = await res.text();
    for (const u of extractUrls(html)) allUrls.add(u);
  }

  console.log(`Total de URLs internas únicas: ${allUrls.size}\n`);

  const results = [];
  for (const u of allUrls) {
    const full = u.startsWith('http') ? u : new URL(u, 'https://alertoo.com.br/').href;
    try {
      const res = await fetch(full, { method: 'GET' });
      results.push({ u, status: res.status });
    } catch (e) {
      results.push({ u, status: 'ERR ' + e.message });
    }
  }

  const bad = results.filter((r) => r.status !== 200);
  const ok = results.filter((r) => r.status === 200);
  console.log(`OK (200): ${ok.length}`);
  console.log(`PROBLEMAS: ${bad.length}`);
  bad.forEach((r) => console.log(`  ${r.status}  ${r.u}`));
})();
