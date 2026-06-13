/**
 * Propaga o bloco "Últimas Blitz de Lei Seca Reportadas em <Local>" (já
 * implementado em public/lei-seca/rio-de-janeiro/index.html) para as demais
 * páginas de estado/cidade em public/lei-seca/<slug>/index.html.
 *
 * Uso: node scripts/propagate-recent-blitz.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEI_SECA_DIR = join(__dirname, '..', 'public', 'lei-seca');
const TEMPLATE_PATH = join(LEI_SECA_DIR, 'rio-de-janeiro', 'index.html');

// slug -> { label: nome exibido no H2, stateUF, cityName (opcional, só para páginas de cidade) }
const PAGES = {
  // ── Estados ──
  acre:                  { label: 'Acre', stateUF: 'AC' },
  alagoas:               { label: 'Alagoas', stateUF: 'AL' },
  amapa:                 { label: 'Amapá', stateUF: 'AP' },
  amazonas:              { label: 'Amazonas', stateUF: 'AM' },
  bahia:                 { label: 'Bahia', stateUF: 'BA' },
  ceara:                 { label: 'Ceará', stateUF: 'CE' },
  'distrito-federal':    { label: 'Distrito Federal', stateUF: 'DF' },
  'espirito-santo':      { label: 'Espírito Santo', stateUF: 'ES' },
  goias:                 { label: 'Goiás', stateUF: 'GO' },
  maranhao:              { label: 'Maranhão', stateUF: 'MA' },
  'mato-grosso-do-sul':  { label: 'Mato Grosso do Sul', stateUF: 'MS' },
  'mato-grosso':         { label: 'Mato Grosso', stateUF: 'MT' },
  'minas-gerais':        { label: 'Minas Gerais', stateUF: 'MG' },
  para:                  { label: 'Pará', stateUF: 'PA' },
  paraiba:               { label: 'Paraíba', stateUF: 'PB' },
  parana:                { label: 'Paraná', stateUF: 'PR' },
  pernambuco:            { label: 'Pernambuco', stateUF: 'PE' },
  piaui:                 { label: 'Piauí', stateUF: 'PI' },
  'rio-grande-do-norte': { label: 'Rio Grande do Norte', stateUF: 'RN' },
  'rio-grande-do-sul':   { label: 'Rio Grande do Sul', stateUF: 'RS' },
  rondonia:              { label: 'Rondônia', stateUF: 'RO' },
  roraima:               { label: 'Roraima', stateUF: 'RR' },
  'santa-catarina':      { label: 'Santa Catarina', stateUF: 'SC' },
  'sao-paulo':           { label: 'São Paulo', stateUF: 'SP' },
  sergipe:               { label: 'Sergipe', stateUF: 'SE' },
  tocantins:             { label: 'Tocantins', stateUF: 'TO' },

  // ── Cidades ──
  blumenau:              { label: 'Blumenau', stateUF: 'SC', cityName: 'Blumenau' },
  buzios:                { label: 'Búzios', stateUF: 'RJ', cityName: 'Búzios' },
  'cabo-frio':           { label: 'Cabo Frio', stateUF: 'RJ', cityName: 'Cabo Frio' },
  campinas:              { label: 'Campinas', stateUF: 'SP', cityName: 'Campinas' },
  'caxias-do-sul':       { label: 'Caxias do Sul', stateUF: 'RS', cityName: 'Caxias do Sul' },
  'feira-de-santana':    { label: 'Feira de Santana', stateUF: 'BA', cityName: 'Feira de Santana' },
  'foz-do-iguacu':       { label: 'Foz do Iguaçu', stateUF: 'PR', cityName: 'Foz do Iguaçu' },
  gramado:               { label: 'Gramado', stateUF: 'RS', cityName: 'Gramado' },
  joinville:             { label: 'Joinville', stateUF: 'SC', cityName: 'Joinville' },
  londrina:              { label: 'Londrina', stateUF: 'PR', cityName: 'Londrina' },
  maringa:               { label: 'Maringá', stateUF: 'PR', cityName: 'Maringá' },
  niteroi:               { label: 'Niterói', stateUF: 'RJ', cityName: 'Niterói' },
  'porto-seguro':        { label: 'Porto Seguro', stateUF: 'BA', cityName: 'Porto Seguro' },
  'ribeirao-preto':      { label: 'Ribeirão Preto', stateUF: 'SP', cityName: 'Ribeirão Preto' },
  santos:                { label: 'Santos', stateUF: 'SP', cityName: 'Santos' },
  'sao-jose-dos-campos': { label: 'São José dos Campos', stateUF: 'SP', cityName: 'São José dos Campos' },
  sorocaba:              { label: 'Sorocaba', stateUF: 'SP', cityName: 'Sorocaba' },
  uberlandia:            { label: 'Uberlândia', stateUF: 'MG', cityName: 'Uberlândia' },
};

const template = readFileSync(TEMPLATE_PATH, 'utf8');

// ── Extrai bloco CSS "/* RECENT EVENTS LIST */" até (exclusive) "/* STATS */" ──
const cssStart = template.indexOf('    /* RECENT EVENTS LIST */');
const cssEnd = template.indexOf('    /* STATS */', cssStart);
if (cssStart === -1 || cssEnd === -1) throw new Error('CSS block markers não encontrados no template');
const cssBlock = template.slice(cssStart, cssEnd).replace(/\s+$/, '') + '\n\n';

// ── Extrai bloco HTML "<!-- ÚLTIMAS BLITZ REPORTADAS ... -->" até (exclusive) "<!-- STATS -->" ──
const htmlStart = template.indexOf('<!-- ÚLTIMAS BLITZ REPORTADAS');
const htmlEnd = template.indexOf('<!-- STATS -->', htmlStart);
if (htmlStart === -1 || htmlEnd === -1) throw new Error('HTML block markers não encontrados no template');
const htmlBlockTemplate = template.slice(htmlStart, htmlEnd).replace(/\s+$/, '') + '\n\n';

// ── Extrai bloco <script type="module"> de "Últimas Blitz" até </script> ──
const scriptStart = template.indexOf('<!-- ÚLTIMAS BLITZ — busca eventos reais do Firestore -->');
const scriptEnd = template.indexOf('</script>', scriptStart) + '</script>'.length;
if (scriptStart === -1) throw new Error('Script block marker não encontrado no template');
const scriptBlockTemplate = template.slice(scriptStart, scriptEnd) + '\n';

let processed = 0;
let skipped = 0;

for (const [slug, cfg] of Object.entries(PAGES)) {
  const filePath = join(LEI_SECA_DIR, slug, 'index.html');
  let html;
  try {
    html = readFileSync(filePath, 'utf8');
  } catch {
    console.warn(`⚠️  ${slug}: index.html não encontrado, pulando.`);
    skipped++;
    continue;
  }

  if (html.includes('ÚLTIMAS BLITZ REPORTADAS')) {
    console.log(`↩️  ${slug}: já contém o bloco, pulando.`);
    skipped++;
    continue;
  }

  // 1) Injeta CSS antes de "/* STATS */"
  const statsCssIdx = html.indexOf('    /* STATS */');
  if (statsCssIdx === -1) {
    console.warn(`⚠️  ${slug}: marcador CSS "/* STATS */" não encontrado, pulando.`);
    skipped++;
    continue;
  }
  html = html.slice(0, statsCssIdx) + cssBlock + html.slice(statsCssIdx);

  // 2) Injeta seção HTML antes de "<!-- STATS -->"
  const statsHtmlIdx = html.indexOf('<!-- STATS -->');
  if (statsHtmlIdx === -1) {
    console.warn(`⚠️  ${slug}: marcador HTML "<!-- STATS -->" não encontrado, pulando.`);
    skipped++;
    continue;
  }
  const htmlBlock = htmlBlockTemplate.replace(
    'Últimas Blitz de Lei Seca Reportadas em Rio de Janeiro',
    `Últimas Blitz de Lei Seca Reportadas em ${cfg.label}`
  );
  html = html.slice(0, statsHtmlIdx) + htmlBlock + html.slice(statsHtmlIdx);

  // 3) Injeta script antes de "</body>"
  const bodyIdx = html.lastIndexOf('</body>');
  if (bodyIdx === -1) {
    console.warn(`⚠️  ${slug}: tag </body> não encontrada, pulando.`);
    skipped++;
    continue;
  }

  // Monta a condição de filtro: estados filtram por stateUF; cidades também
  // exigem cityName igual ao nome da cidade.
  const filterExpr = cfg.cityName
    ? `d.data().category === 'drunkcheck' && d.data().stateUF === '${cfg.stateUF}' && d.data().cityName === '${cfg.cityName}'`
    : `d.data().category === 'drunkcheck' && d.data().stateUF === '${cfg.stateUF}'`;

  let scriptBlock = scriptBlockTemplate
    .replace(
      "d.data().category === 'drunkcheck' && d.data().stateUF === 'RJ'",
      filterExpr
    )
    .replace("const city = data.cityName || 'Rio de Janeiro';", `const city = data.cityName || '${cfg.label}';`)
    .replace("${escapeHtml(city)} — RJ", `\${escapeHtml(city)} — ${cfg.stateUF}`);

  html = html.slice(0, bodyIdx) + scriptBlock + '\n' + html.slice(bodyIdx);

  writeFileSync(filePath, html, 'utf8');
  console.log(`✅ ${slug}: bloco "Últimas Blitz" adicionado.`);
  processed++;
}

console.log(`\n🎉 Concluído: ${processed} páginas atualizadas, ${skipped} puladas.`);
