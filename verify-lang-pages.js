/**
 * verify-lang-pages.js
 *
 * Verifica as páginas em produção (alertoo.com.br): para cada chave
 * data-i18n* usada em index.html, compara o conteúdo renderizado ao vivo
 * com o valor esperado em i18n-dict.json para cada idioma.
 */
const fs = require('fs');
const path = require('path');

const dict = JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n-dict.json'), 'utf8'));

const ALL_KEYS = `nav.live,nav.alerts,nav.dui,nav.accidents,nav.floods,nav.radars,nav.events,nav.parties,nav.weekend,nav.more,nav.vsWaze,nav.about,nav.faq,nav.download,mobile.live,mobile.dui,mobile.accidents,mobile.floods,mobile.radars,mobile.parties,mobile.weekend,mobile.vsWaze,mobile.about,mobile.faq,mobile.download,hero.badge,hero.h1,hero.p,hero.googlePlay,hero.iosSoon,hero.alt.map,hero.alt.events,hero.alt.community,stats.categories,stats.radius,stats.languages,stats.free,events.liveNow,events.community,events.subtitle,events.activeLabel,events.all,events.traffic,events.accident,events.dui,events.police,events.flood,events.entertainment,events.loading,events.empty,events.refresh,ad.label,features.label,features.title,features.sub,feature1.title,feature1.p,feature2.title,feature2.p,feature3.title,feature3.p,feature4.title,feature4.p,feature5.title,feature5.p,feature6.title,feature6.p,how.label,how.title,how.sub,step1.title,step1.p,step2.title,step2.p,step3.title,step3.p,screenshots.label,screenshots.title,screenshots.sub,testimonials.label,testimonials.title,test1.text,test1.name,test1.city,test2.text,test2.name,test2.city,test3.text,test3.name,test3.city,ranking.label,ranking.title,ranking.sub,rank1,rank2,rank3,rank4,rank5,rank6,rank7,ios.h2,ios.p,ios.placeholder,ios.btn,ios.success,faq.label,faq.title,faq1.q,faq1.a,faq2.q,faq2.a,faq3.q,faq3.a,faq4.q,faq4.a,faq5.q,faq5.a,cta.title,cta.sub,cta.available,cta.iosSoon,footer.tagline,footer.app,footer.features,footer.how,footer.iosSoon,footer.about,footer.guides,footer.legal,footer.privacy,footer.delete,footer.rights,footer.made,cookie.text,cookie.privacy,cookie.decline,cookie.accept`.split(',');

const I18N_HTML_KEYS = new Set(['hero.h1', 'hero.googlePlay', 'features.title', 'ranking.title']);
const I18N_ALT_KEYS = new Set(['hero.alt.map', 'hero.alt.events', 'hero.alt.community']);
const I18N_TITLE_KEYS = new Set(['events.refresh']);
const I18N_PLACEHOLDER_KEYS = new Set(['ios.placeholder']);

function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

async function check(lang, urlBase) {
  const res = await fetch(urlBase);
  const html = await res.text();
  const d = dict[lang];
  const mismatches = [];

  for (const key of ALL_KEYS) {
    const expected = d[key];

    if (I18N_ALT_KEYS.has(key)) {
      const tagMatch = html.match(new RegExp('<[a-zA-Z0-9]+[^>]*data-i18n-alt="' + escapeRegex(key) + '"[^>]*>'));
      const altMatch = tagMatch && tagMatch[0].match(/\salt="([^"]*)"/);
      if (!altMatch || altMatch[1] !== escapeAttr(expected)) mismatches.push(`${key}: alt esperado "${escapeAttr(expected)}" obtido ${altMatch ? JSON.stringify(altMatch[1]) : 'AUSENTE'}`);
      continue;
    }
    if (I18N_TITLE_KEYS.has(key)) {
      const tagMatch = html.match(new RegExp('<[a-zA-Z0-9]+[^>]*data-i18n-title="' + escapeRegex(key) + '"[^>]*>'));
      const titleMatch = tagMatch && tagMatch[0].match(/\stitle="([^"]*)"/);
      if (!titleMatch || titleMatch[1] !== escapeAttr(expected)) mismatches.push(`${key}: title esperado "${escapeAttr(expected)}" obtido ${titleMatch ? JSON.stringify(titleMatch[1]) : 'AUSENTE'}`);
      continue;
    }
    if (I18N_PLACEHOLDER_KEYS.has(key)) {
      const tagMatch = html.match(new RegExp('<[a-zA-Z0-9]+[^>]*data-i18n-placeholder="' + escapeRegex(key) + '"[^>]*>'));
      const phMatch = tagMatch && tagMatch[0].match(/\splaceholder="([^"]*)"/);
      if (!phMatch || phMatch[1] !== escapeAttr(expected)) mismatches.push(`${key}: placeholder esperado "${escapeAttr(expected)}" obtido ${phMatch ? JSON.stringify(phMatch[1]) : 'AUSENTE'}`);
      continue;
    }

    const attr = I18N_HTML_KEYS.has(key) ? 'data-i18n-html' : 'data-i18n';
    const re = new RegExp('<([a-zA-Z0-9]+)\\b[^>]*\\s' + attr + '="' + escapeRegex(key) + '"[^>]*>([\\s\\S]*?)<\\/\\1>', 'g');
    const matches = [...html.matchAll(re)];
    if (matches.length === 0) { mismatches.push(`${key}: NÃO ENCONTRADO`); continue; }
    const expectedContent = I18N_HTML_KEYS.has(key) ? expected : escapeHtml(expected);
    for (const m of matches) {
      if (m[2] !== expectedContent) mismatches.push(`${key}: esperado ${JSON.stringify(expectedContent.slice(0, 80))} obtido ${JSON.stringify(m[2].slice(0, 80))}`);
    }
  }

  console.log(`=== ${lang} (${urlBase}) — ${mismatches.length} discrepância(s) de ${ALL_KEYS.length} chaves ===`);
  mismatches.slice(0, 20).forEach((m) => console.log('  ' + m));
}

(async () => {
  await check('pt-BR', 'https://alertoo.com.br/');
  await check('en', 'https://alertoo.com.br/en/');
  await check('es', 'https://alertoo.com.br/es/');
  await check('fr', 'https://alertoo.com.br/fr/');
  await check('pt-PT', 'https://alertoo.com.br/pt-PT/');
})();
