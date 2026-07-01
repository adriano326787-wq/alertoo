import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { BG_DARK, CARD, TEAL, TEAL_LIGHT, TEXT, SUBTEXT, WHITE, icon as iconAt, esc } from '../icons.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function icon(key, accent) {
  return iconAt(key, accent, 540, 320);
}

const posts = [
  { n: 1,  icon: 'car',      title: 'Teste o Alertoo\nantes de sair de casa', sub: 'Lei Seca, acidentes e alagamentos em tempo real', accent: TEAL },
  { n: 2,  icon: 'beer',     title: 'Tem blitz\nno seu caminho?', sub: 'Teste agora e descubra na hora', accent: '#F87171' },
  { n: 3,  icon: 'cheer',    title: 'Feito por quem\nestá na rua', sub: 'Teste e faça parte dessa comunidade', accent: TEAL },
  { n: 4,  icon: 'rain',     title: 'Aquela rua\nque sempre alaga', sub: 'Teste antes da próxima chuva', accent: '#3B82F6' },
  { n: 5,  icon: 'camera',   title: 'Radar fixo\ne móvel', sub: 'Teste o app e veja onde estão', accent: '#F59E0B' },
  { n: 6,  icon: 'clock',    title: 'Tempo é a coisa\nmais cara que existe', sub: 'Teste e evite congestionamentos', accent: TEAL },
  { n: 7,  icon: 'warn',     title: 'Acidente\nna pista?', sub: 'Teste e desvie antes de entrar na fila', accent: '#F59E0B' },
  { n: 8,  icon: 'phone',    title: '3 motivos para\ntestar hoje', sub: 'Lei Seca, trânsito e comunidade', accent: TEAL },
  { n: 9,  icon: 'party',    title: 'Vai sair\nno fim de semana?', sub: 'Teste e veja festas e blitz no mesmo app', accent: '#A855F7' },
  { n: 10, icon: 'support',  title: '"Desviei da blitz\na tempo"', sub: 'Teste e veja por que tanta gente confia', accent: TEAL_LIGHT },
  { n: 11, icon: 'forbidden',title: 'Não beba\ne dirija', sub: 'Teste o app e se planeje com segurança', accent: '#F87171' },
  { n: 12, icon: 'map',      title: 'Um mapa,\ntodos os alertas', sub: 'Teste e veja Lei Seca, acidente e mais', accent: TEAL },
  { n: 13, icon: 'road',     title: 'Antes de pegar\na estrada', sub: 'Teste e confira o que tem no caminho', accent: '#F59E0B' },
  { n: 14, icon: 'fuel',     title: 'Trânsito parado\ngasta mais', sub: 'Teste e economize combustível', accent: TEAL },
  { n: 15, icon: 'taxi',     title: 'Motorista de app,\neste é pra você', sub: 'Teste e rode mais, perca menos tempo', accent: TEAL_LIGHT },
  { n: 16, icon: 'smile',    title: '40 minutos parado\npor um carro quebrado?', sub: 'Teste e saiba o motivo antes', accent: '#F59E0B' },
  { n: 17, icon: 'family',   title: 'Levando a família\npor aí?', sub: 'Teste e dirija tranquilo com quem você ama', accent: TEAL },
  { n: 18, icon: 'pin',      title: 'Reporte.\nA comunidade vê na hora.', sub: 'Teste e veja como é simples', accent: TEAL_LIGHT },
  { n: 19, icon: 'police',   title: 'Sexta e sábado\nà noite', sub: 'Teste antes de sair pra rua', accent: '#F87171' },
  { n: 20, icon: 'money',    title: '100% grátis.\nSempre foi.', sub: 'Teste sem pagar nada', accent: TEAL },
  { n: 21, icon: 'phone',    title: 'Isso aqui é\no Alertoo de verdade', sub: 'Teste e veja com seus próprios olhos', accent: TEAL_LIGHT },
  { n: 22, icon: 'star',     title: 'Qual alerta\nte ajudaria mais?', sub: 'Teste e conta pra gente depois', accent: '#F59E0B' },
  { n: 23, icon: 'rain',     title: 'Temporada de\nchuva chegando', sub: 'Teste e saiba quais ruas alagam', accent: '#3B82F6' },
  { n: 24, icon: 'party',    title: 'Feriado chegando.\nE a festa?', sub: 'Teste e veja eventos e Lei Seca juntos', accent: '#A855F7' },
  { n: 25, icon: 'house',    title: 'Chegar em casa\nem segurança', sub: 'Teste — não é sorte, é informação', accent: TEAL },
  { n: 26, icon: 'cheer',    title: 'Marca aquele amigo\nque sempre pega trânsito', sub: 'Testem o Alertoo juntos', accent: TEAL_LIGHT },
  { n: 27, icon: 'chart',    title: 'Milhares de alertas\ntodos os dias', sub: 'Teste e faça parte da comunidade', accent: TEAL },
  { n: 28, icon: 'star',     title: 'Já testou\nalguma vez?', sub: 'Teste agora e deixe sua avaliação', accent: '#F59E0B' },
  { n: 29, icon: 'camera',   title: 'Radar móvel\npegando geral hoje', sub: 'Teste e veja em tempo real', accent: '#F59E0B' },
  { n: 30, icon: 'heart',    title: 'Dirija informado.\nChegue tranquilo.', sub: 'Teste o Alertoo agora — é grátis', accent: TEAL },
];

function wrapLines(title) {
  return title.split('\n');
}

function svgTemplate({ n, icon: iconKey, title, sub, accent }) {
  const lines = wrapLines(title);
  const lineHeight = 78;
  const startY = 560 - ((lines.length - 1) * lineHeight) / 2;

  const titleSvg = lines
    .map((line, i) => `<text x="540" y="${startY + i * lineHeight}" text-anchor="middle" font-family="Arial, sans-serif" font-size="60" font-weight="800" fill="${TEXT}">${esc(line)}</text>`)
    .join('\n    ');

  return `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BG_DARK}"/>
      <stop offset="100%" stop-color="#1a2540"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${TEAL}"/>
    </linearGradient>
  </defs>

  <rect width="1080" height="1080" fill="url(#bg)"/>

  <!-- top brand bar -->
  <rect x="0" y="0" width="1080" height="10" fill="url(#accentGrad)"/>

  <!-- "teste grátis" ribbon -->
  <rect x="40" y="40" width="200" height="48" rx="24" fill="${CARD}" stroke="${accent}" stroke-width="2"/>
  <text x="140" y="71" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="${accent}">TESTE GRÁTIS</text>

  <!-- brand label -->
  <text x="540" y="130" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="900" letter-spacing="4" fill="${accent}">ALERTOO</text>

  <!-- icon in circle -->
  <circle cx="540" cy="320" r="120" fill="${CARD}" stroke="${accent}" stroke-width="4"/>
  ${icon(iconKey, accent)}

  <!-- title -->
  ${titleSvg}

  <!-- subtitle -->
  <text x="540" y="${startY + lines.length * lineHeight + 40}" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="${SUBTEXT}">${esc(sub)}</text>

  <!-- CTA pill -->
  <rect x="320" y="900" width="440" height="84" rx="42" fill="${TEAL}"/>
  <text x="540" y="954" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="${WHITE}">Teste agora →</text>

  <!-- post number -->
  <text x="1020" y="1050" text-anchor="end" font-family="Arial, sans-serif" font-size="22" fill="#475569">#${String(n).padStart(2, '0')}</text>
</svg>`;
}

const outDir = __dirname;
mkdirSync(outDir, { recursive: true });

for (const post of posts) {
  const svg = svgTemplate(post);
  const filename = join(outDir, `post-${String(post.n).padStart(2, '0')}.svg`);
  writeFileSync(filename, svg, 'utf-8');
}

console.log(`Generated ${posts.length} SVG files in ${outDir}`);
