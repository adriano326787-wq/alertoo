/**
 * Genera páginas de SEO local para Argentina, Chile, Uruguay, Colombia y Perú.
 * Categorías: radares, accidentes, inundaciones, fiestas-y-eventos, control-de-alcoholemia.
 *
 * Salida:
 *  - public/<cc>/<categoria>/<slug>/index.html   (subpáginas por ciudad)
 *  - public/<cc>/<categoria>.html                (hub por país)
 *
 * Uso: node scripts/generate-intl-pages.mjs
 */

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

// ── Países y ciudades ────────────────────────────────────────────────────
const COUNTRIES = {
  ar: {
    code: 'AR', name: 'Argentina', regionLabel: 'Provincia',
    locations: {
      'buenos-aires':    { label: 'Buenos Aires',    region: 'Ciudad Autónoma de Buenos Aires' },
      'cordoba':         { label: 'Córdoba',         region: 'Córdoba' },
      'rosario':         { label: 'Rosario',         region: 'Santa Fe' },
      'mendoza':         { label: 'Mendoza',         region: 'Mendoza' },
      'la-plata':        { label: 'La Plata',        region: 'Buenos Aires' },
      'mar-del-plata':   { label: 'Mar del Plata',   region: 'Buenos Aires' },
    },
  },
  cl: {
    code: 'CL', name: 'Chile', regionLabel: 'Región',
    locations: {
      'santiago':        { label: 'Santiago',        region: 'Región Metropolitana' },
      'valparaiso':      { label: 'Valparaíso',      region: 'Valparaíso' },
      'concepcion':      { label: 'Concepción',      region: 'Biobío' },
      'vina-del-mar':    { label: 'Viña del Mar',    region: 'Valparaíso' },
      'la-serena':       { label: 'La Serena',       region: 'Coquimbo' },
      'antofagasta':     { label: 'Antofagasta',     region: 'Antofagasta' },
    },
  },
  uy: {
    code: 'UY', name: 'Uruguay', regionLabel: 'Departamento',
    locations: {
      'montevideo':         { label: 'Montevideo',         region: 'Montevideo' },
      'punta-del-este':      { label: 'Punta del Este',      region: 'Maldonado' },
      'ciudad-de-la-costa':  { label: 'Ciudad de la Costa',  region: 'Canelones' },
      'salto':               { label: 'Salto',               region: 'Salto' },
      'paysandu':            { label: 'Paysandú',            region: 'Paysandú' },
      'maldonado':           { label: 'Maldonado',           region: 'Maldonado' },
    },
  },
  co: {
    code: 'CO', name: 'Colombia', regionLabel: 'Departamento',
    locations: {
      'bogota':          { label: 'Bogotá',          region: 'Bogotá D.C.' },
      'medellin':        { label: 'Medellín',        region: 'Antioquia' },
      'cali':            { label: 'Cali',            region: 'Valle del Cauca' },
      'barranquilla':    { label: 'Barranquilla',    region: 'Atlántico' },
      'cartagena':       { label: 'Cartagena',       region: 'Bolívar' },
      'bucaramanga':     { label: 'Bucaramanga',     region: 'Santander' },
    },
  },
  pe: {
    code: 'PE', name: 'Perú', regionLabel: 'Región',
    locations: {
      'lima':            { label: 'Lima',            region: 'Lima' },
      'arequipa':        { label: 'Arequipa',        region: 'Arequipa' },
      'trujillo':        { label: 'Trujillo',        region: 'La Libertad' },
      'cusco':           { label: 'Cusco',           region: 'Cusco' },
      'piura':           { label: 'Piura',           region: 'Piura' },
      'chiclayo':        { label: 'Chiclayo',        region: 'Lambayeque' },
    },
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function faqJsonLd(items) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  });
}

function webPageJsonLd({ title, description, breadcrumbName, breadcrumbUrl, label, pageUrl }) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: pageUrl,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Alertoo', item: 'https://alertoo.com.br' },
        { '@type': 'ListItem', position: 2, name: breadcrumbName, item: breadcrumbUrl },
        { '@type': 'ListItem', position: 3, name: label, item: pageUrl },
      ],
    },
    publisher: {
      '@type': 'Organization',
      name: 'Alertoo',
      url: 'https://alertoo.com.br',
      logo: 'https://alertoo.com.br/icon.png',
    },
  });
}

function softwareAppJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Alertoo',
    operatingSystem: 'Android, iOS',
    applicationCategory: 'NavigationApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: 'App gratuito de alertas de tránsito colaborativos: radares, accidentes, inundaciones, control de alcoholemia y eventos.',
    url: 'https://alertoo.com.br',
    downloadUrl: 'https://play.google.com/store/apps/details?id=com.alertoo.app',
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.5', ratingCount: '120' },
  });
}

function infoCard({ icon, h3, p }) {
  return `    <div class="info-card"><div class="info-icon">${icon}</div><h3>${esc(h3)}</h3><p>${p}</p></div>`;
}

function faqItem({ q, a }) {
  return `  <div class="faq-item">\n    <div class="faq-q">${esc(q)}</div>\n    <div class="faq-a">${a}</div>\n  </div>`;
}

// ── Configuración por categoría ─────────────────────────────────────────
const CATEGORIES = {
  radares: {
    dirSlug: 'radares',
    breadcrumbName: 'Radares',
    categoryValue: 'radar',
    recentEmoji: '📷',
    cityCardEmoji: '📷',
    brandRgb: '245,158,11',
    brand: '#F59E0B',
    adSlots: { top: '9058171901', mid: '7745090236', bot: '9813187084' },
    hero: { badge: '📷 Radar en Vivo' },
    cont(label, country, isHub) {
      const where = isHub ? `en ${label}` : `en ${label}, ${country}`;
      return {
        title: `Radares Móviles en ${label} Hoy — ¿Dónde Hay Radar Ahora? | Alertoo`,
        metaDescription: `Mira radares móviles y controles de velocidad ${where} hoy. Alertoo muestra en tiempo real radares y fiscalizaciones reportadas por la comunidad en el mapa. Gratis.`,
        keywords: `radar móvil ${label}, dónde hay radar en ${label}, control de velocidad ${label}, radar en vivo ${label}, fiscalización de velocidad ${label}`,
        ogTitle: `Radares Móviles en ${label} Hoy — Alertoo`,
        ogDescription: `Mira radares móviles y controles de velocidad ${where} reportados por la comunidad en tiempo real. Gratis para Android y iOS.`,
        twitterTitle: `Radares Móviles en ${label} — Alertoo`,
        twitterDescription: `Radares móviles y controles ${where} en tiempo real en el mapa. Gratis.`,
        h1: `¿Dónde Hay Radar<br/><span>en ${esc(label)} Ahora?</span>`,
        heroP: `Mira en tiempo real radares móviles y controles de velocidad ${where} reportados por la comunidad en el mapa. Evita multas y conduce con seguridad.`,
        mapH2: `Mapa de Radares en Vivo en ${label}`,
        mapCaption: `Radares y controles reportados por la comunidad ${where} en tiempo real.`,
        recentH2: `Últimos Radares Reportados en ${label}`,
        recentEmptyText: `No hay radares activos reportados ${where} en este momento. Abre el mapa en vivo o la app para ver nuevos reportes.`,
        infoH2: `Todo sobre Radares de Velocidad en ${label}`,
        cityCards: [
          { icon: '📍', h3: `Radares en ${label}`, p: `${esc(label)} usa Alertoo para reportar radares móviles y controles de velocidad en tiempo real. Consulta el mapa en vivo antes de salir.` },
          { icon: '🎯', h3: `Estate Atento en ${label}`, p: `Los controles de velocidad pueden ocurrir en cualquier vía ${where} — rutas, avenidas y calles urbanas. Cuanta más gente reporta, más completo es el mapa.` },
        ],
        genericCards: [
          { icon: '📷', h3: 'Radar Fijo', p: 'Instalado permanentemente en la vía, debidamente señalizado. Registra automáticamente vehículos por encima del límite de velocidad.' },
          { icon: '🚗', h3: 'Radar Móvil', p: 'Operado por agentes en distintos puntos de la vía. Cambia de posición — por eso es importante tener alertas en tiempo real.' },
          { icon: '📡', h3: 'Radar en Vehículo', p: 'Instalado en patrulleros o motos policiales. Registra la velocidad de vehículos en sentido contrario o en maniobras de sobrepaso.' },
          { icon: '⚡', h3: 'Fiscalización Electrónica', p: 'Cámaras de monitoreo integradas al sistema de multas automáticas — sin necesidad de agente presente.' },
          { icon: '📱', h3: 'Alertas de la Comunidad', p: 'Los conductores reportan radares móviles en tiempo real en Alertoo. Cuantos más usuarios, más preciso es el mapa.' },
          { icon: '🛡️', h3: 'Conduce con Seguridad', p: 'El objetivo de Alertoo no es "esquivar" radares, sino ayudar a los conductores a estar más atentos y dentro de los límites de velocidad.' },
        ],
        faq: [
          { q: `¿Cómo saber dónde hay radar móvil en ${label} hoy?`, a: `En Alertoo, los conductores reportan radares móviles ${where} en tiempo real en el mapa. Entra a <a href="/eventos">alertoo.com.br/eventos</a> o descarga la app gratis para Android y iOS y mira dónde están los radares ahora en la zona.` },
          { q: `¿Alertoo avisa sobre radares de velocidad en ${label}?`, a: `¡Sí! Los usuarios de Alertoo ${where} reportan radares móviles, controles de velocidad y fiscalizaciones en tiempo real. La alerta aparece en el mapa para todos los usuarios de la zona.` },
          { q: '¿Cuál es la diferencia entre radar fijo y radar móvil?', a: 'El radar fijo está instalado permanentemente en la vía y está señalizado. El radar móvil es operado por agentes o desde vehículos y cambia de posición — por eso es importante contar con alertas en tiempo real como las de Alertoo.' },
          { q: '¿Cómo reportar un radar móvil con Alertoo?', a: 'En la app Alertoo, toca "+", selecciona la categoría de fiscalización/radar, confirma la ubicación y envía. La alerta queda visible para todos los usuarios de la zona durante algunas horas.' },
          { q: '¿La app de radares es gratuita?', a: '¡Sí! Alertoo es completamente gratuito para ver radares, controles, accidentes e inundaciones en tiempo real. Disponible para Android y iOS sin ningún costo.' },
          { q: `¿Funciona Alertoo en rutas y autopistas cerca de ${label}?`, a: `Sí, cualquier usuario puede reportar radares en rutas, autopistas y calles urbanas ${where} y en cualquier parte del mundo.` },
        ],
        citiesH2: `Radares en ${country}`,
      };
    },
  },
  accidentes: {
    dirSlug: 'accidentes',
    breadcrumbName: 'Accidentes',
    categoryValue: 'accident',
    recentEmoji: '🚨',
    cityCardEmoji: '🚨',
    brandRgb: '239,68,68',
    brand: '#EF4444',
    adSlots: { top: '3439350425', mid: '1371253571', bot: '2922635240' },
    hero: { badge: '🚨 En Vivo Ahora' },
    cont(label, country, isHub) {
      const where = isHub ? `en ${label}` : `en ${label}, ${country}`;
      return {
        title: `Accidentes de Tránsito en ${label} Ahora — Alertoo`,
        metaDescription: `Mira accidentes de tránsito ${where} ahora. Alertoo muestra en tiempo real accidentes y siniestros reportados por la comunidad en el mapa. Gratis.`,
        keywords: `accidente en ${label} ahora, accidente de tránsito ${label} hoy, siniestro vial ${label}, choque ${label} hoy, accidente en vivo ${label}`,
        ogTitle: `Accidentes de Tránsito en ${label} Ahora — Alertoo`,
        ogDescription: `Mira en tiempo real accidentes y siniestros ${where} reportados por la comunidad. Mapa en vivo, gratis.`,
        twitterTitle: `Accidentes en ${label} Ahora — Alertoo`,
        twitterDescription: `Accidentes y siniestros ${where} en tiempo real en el mapa. Gratis.`,
        h1: `Accidentes de Tránsito<br/><span>en ${esc(label)} Ahora</span>`,
        heroP: `Mira en tiempo real accidentes, choques y siniestros ${where} reportados por la comunidad en el mapa. Evita congestiones y rutas peligrosas.`,
        mapH2: `Mapa de Accidentes en Vivo en ${label}`,
        mapCaption: `Accidentes reportados por la comunidad ${where} en tiempo real. Actualizados continuamente.`,
        recentH2: `Últimos Accidentes Reportados en ${label}`,
        recentEmptyText: `No hay accidentes activos reportados ${where} en este momento. Abre el mapa en vivo o la app para ver nuevos reportes.`,
        infoH2: `¿Por qué usar Alertoo para accidentes en ${label}?`,
        cityCards: [
          { icon: '📍', h3: `Accidentes en ${label}`, p: `${esc(label)} reporta accidentes, choques y cortes de vía en tiempo real para ayudar a otros conductores a evitar la ruta.` },
          { icon: '🎯', h3: `Rutas Más Seguras en ${label}`, p: `Consulta el mapa de Alertoo antes de salir y mira si hay accidentes reportados en tu trayecto ${where}.` },
        ],
        genericCards: [
          { icon: '⚡', h3: 'Tiempo Real', p: 'Las alertas aparecen en el mapa segundos después de ser reportadas por conductores reales en la zona.' },
          { icon: '🗺️', h3: 'Mapa Interactivo', p: 'Mira la ubicación exacta de cada siniestro. Planifica tu ruta para evitar congestiones causadas por accidentes.' },
          { icon: '🤝', h3: 'Comunidad Colaborativa', p: 'Cuantos más conductores usan la app, más preciso es el mapa. Cada alerta ayuda a cientos de personas a evitar el mismo tramo.' },
          { icon: '📱', h3: '1 Toque para Reportar', p: '¿Viste un accidente? Repórtalo en segundos desde la app. Tu alerta queda visible para todos los usuarios de la zona.' },
          { icon: '🛣️', h3: 'Rutas y Vías Urbanas', p: 'Funciona en rutas nacionales, autopistas y calles urbanas en todo el país.' },
          { icon: '🔔', h3: 'Notificaciones Cercanas', p: 'Recibe alertas de accidentes en tu ruta antes de salir de casa con la app instalada.' },
        ],
        faq: [
          { q: `¿Cómo ver accidentes de tránsito en vivo en ${label}?`, a: `Entra a <a href="/eventos">alertoo.com.br/eventos</a> o descarga la app Alertoo gratis. El mapa muestra en tiempo real todos los accidentes reportados por la comunidad ${where}.` },
          { q: '¿Cómo reportar un accidente con Alertoo?', a: 'En la app, toca "+" en el mapa, selecciona "Accidente", confirma la ubicación y envía. La alerta queda visible para todos los usuarios de la zona durante algunas horas.' },
          { q: `¿Alertoo avisa sobre accidentes en rutas de ${label}?`, a: `Sí, Alertoo funciona en rutas, autopistas y calles urbanas ${where}. Cualquier usuario puede reportar un siniestro en cualquier lugar.` },
          { q: '¿Alertoo es mejor que Waze para accidentes?', a: 'Alertoo se centra en alertas colaborativas de tránsito — accidentes, radares, inundaciones, control de alcoholemia y eventos. Es un complemento ideal a otras apps, con foco en reportes locales en tiempo real.' },
          { q: '¿La app Alertoo es gratuita?', a: 'Sí, completamente gratuita. Disponible en Google Play y App Store sin ningún costo.' },
          { q: `¿Cómo saber si hay accidente en mi ruta ahora en ${label}?`, a: `Abre el mapa de Alertoo en <a href="/eventos">alertoo.com.br/eventos</a> o en la app y mira todas las alertas activas de accidentes ${where} en tu trayecto en tiempo real.` },
        ],
        citiesH2: `Accidentes en ${country}`,
      };
    },
  },
  inundaciones: {
    dirSlug: 'inundaciones',
    breadcrumbName: 'Inundaciones',
    categoryValue: 'flood',
    recentEmoji: '🌊',
    cityCardEmoji: '🌧️',
    brandRgb: '59,130,246',
    brand: '#3B82F6',
    adSlots: { top: '4125409424', mid: '2764226290', bot: '1673132757' },
    hero: { badge: '🌧️ Tiempo Real' },
    cont(label, country, isHub) {
      const where = isHub ? `en ${label}` : `en ${label}, ${country}`;
      return {
        title: `Inundaciones en ${label} Ahora — Calles Anegadas | Alertoo`,
        metaDescription: `Mira inundaciones y calles anegadas ${where} ahora. Alertoo muestra en tiempo real puntos de inundación reportados por la comunidad. Gratis.`,
        keywords: `inundación en ${label} hoy, calle anegada ${label} ahora, anegamiento ${label} hoy, punto de inundación ${label}, inundación en vivo ${label}`,
        ogTitle: `Inundaciones en ${label} Ahora — Alertoo`,
        ogDescription: `Mira calles anegadas e inundaciones ${where} en tiempo real en el mapa. Reportadas por la comunidad. Gratis.`,
        twitterTitle: `Inundaciones en ${label} — Alertoo`,
        twitterDescription: `Calles anegadas e inundaciones ${where} en tiempo real en el mapa. Gratis.`,
        h1: `Inundaciones y Anegamientos<br/><span>en ${esc(label)} Ahora</span>`,
        heroP: `Mira en tiempo real calles anegadas y puntos de inundación ${where} reportados por la comunidad. Evita trayectos peligrosos antes de salir.`,
        mapH2: `Mapa de Inundaciones en Vivo en ${label}`,
        mapCaption: `Inundaciones reportadas por la comunidad ${where} en tiempo real. Actualizadas continuamente.`,
        recentH2: `Últimas Inundaciones Reportadas en ${label}`,
        recentEmptyText: `No hay inundaciones activas reportadas ${where} en este momento. Abre el mapa en vivo o la app para ver nuevos reportes.`,
        infoH2: `Mantente Seguro en las Lluvias en ${label}`,
        cityCards: [
          { icon: '📍', h3: `Inundaciones en ${label}`, p: `Los usuarios de Alertoo ${where} reportan calles anegadas y puntos de inundación apenas llueve, manteniendo el mapa siempre actualizado.` },
          { icon: '🎯', h3: `Rutas Alternativas en ${label}`, p: `Con el mapa en vivo de Alertoo, elige otro camino ${where} antes de enfrentar una inundación — ahorrando tiempo y evitando riesgos.` },
        ],
        genericCards: [
          { icon: '🌧️', h3: 'Alertas en Tiempo Real', p: 'En cuanto llueve y las calles empiezan a anegarse, los usuarios de Alertoo reportan en el mapa. Te enteras en segundos.' },
          { icon: '🗺️', h3: 'Ubicación Exacta', p: 'Cada alerta de inundación tiene un pin en el mapa con ubicación precisa. Ves qué calle, avenida o tramo tiene problemas.' },
          { icon: '🚗', h3: 'Ruta Alternativa', p: 'Con el mapa en vivo, eliges otro camino antes de enfrentar la inundación — ahorrando tiempo y evitando riesgos.' },
          { icon: '📲', h3: 'Reporta en 1 Toque', p: '¿Viste una calle anegada? Repórtala desde la app en segundos y ayuda a otros conductores a desviarse del punto.' },
          { icon: '🏙️', h3: 'Cobertura Nacional', p: 'Funciona en cualquier ciudad del país donde haya usuarios de Alertoo.' },
          { icon: '⏱️', h3: 'Alertas con Vigencia', p: 'Las alertas expiran automáticamente después de algunas horas, manteniendo el mapa siempre actualizado con casos recientes.' },
        ],
        faq: [
          { q: `¿Cómo ver inundaciones en vivo en ${label}?`, a: `Entra a <a href="/eventos">alertoo.com.br/eventos</a> o descarga la app Alertoo. El mapa muestra en tiempo real todos los puntos de inundación ${where} reportados por la comunidad.` },
          { q: `¿Cómo saber qué calles están anegadas ahora en ${label}?`, a: `Abre el mapa de Alertoo en <a href="/eventos">alertoo.com.br/eventos</a> y mira las alertas de inundación activas ${where}, reportadas por conductores y peatones en tiempo real.` },
          { q: 'Cómo reportar una calle anegada con Alertoo?', a: 'Descarga la app Alertoo, toca "+", selecciona "Inundación", confirma el lugar y envía. La alerta aparece de inmediato en el mapa para todos en la zona.' },
          { q: '¿Es seguro cruzar una calle anegada?', a: '¡Nunca! Solo 30 cm de agua en movimiento pueden arrastrar un vehículo. Usa el mapa de Alertoo para encontrar rutas alternativas y nunca arriesgues cruzar calles anegadas.' },
          { q: '¿Alertoo avisa de inundaciones antes de la lluvia?', a: 'Alertoo muestra alertas en tiempo real en cuanto otros usuarios reportan. Cuantos más usuarios en tu ciudad, más rápido te enteras de inundaciones cercanas.' },
          { q: `¿Funciona Alertoo para inundaciones en rutas de ${label}?`, a: `Sí, los usuarios pueden reportar inundaciones en rutas, autopistas y calles ${where} y en cualquier parte del país.` },
        ],
        citiesH2: `Inundaciones en ${country}`,
        alertBanner: '⚠️ <strong>Consejo de seguridad:</strong> Nunca cruces calles anegadas en auto. 30 cm de agua en movimiento bastan para arrastrar un vehículo. Usa el mapa de Alertoo para encontrar rutas alternativas.',
      };
    },
  },
  'fiestas-y-eventos': {
    dirSlug: 'fiestas-y-eventos',
    breadcrumbName: 'Fiestas y Eventos',
    categoryValue: null,
    recentEmoji: '🎉',
    cityCardEmoji: '🎉',
    brandRgb: '255,87,34',
    brand: '#FF5722',
    adSlots: { top: '4269216366', mid: '5581961324', bot: '9088588349' },
    hero: { badge: '🎉 Agenda en Vivo' },
    cont(label, country, isHub) {
      const where = isHub ? `en ${label}` : `en ${label}, ${country}`;
      return {
        title: `Fiestas y Eventos en ${label} — Agenda de Hoy | Alertoo`,
        metaDescription: `Descubre fiestas, recitales y eventos ${where} hoy y este fin de semana. Alertoo muestra en el mapa los eventos compartidos por la comunidad. Gratis.`,
        keywords: `fiestas en ${label}, eventos en ${label} hoy, agenda ${label} fin de semana, qué hacer en ${label}, recitales ${label}`,
        ogTitle: `Fiestas y Eventos en ${label} — Alertoo`,
        ogDescription: `Descubre qué fiestas y eventos hay ${where} hoy y este fin de semana. Mapa en vivo, gratis.`,
        twitterTitle: `Fiestas y Eventos en ${label} — Alertoo`,
        twitterDescription: `Agenda de fiestas y eventos ${where} en el mapa. Gratis.`,
        h1: `Fiestas y Eventos<br/><span>en ${esc(label)} Hoy</span>`,
        heroP: `Descubre fiestas, recitales, ferias y eventos ${where} compartidos por la comunidad en el mapa. Planifica tu salida y no te pierdas nada.`,
        mapH2: `Mapa de Fiestas y Eventos en ${label}`,
        mapCaption: `Eventos compartidos por la comunidad ${where}. Actualizado continuamente.`,
        recentH2: `Próximos Eventos en ${label}`,
        recentEmptyText: `Todavía no hay eventos publicados ${where}. Abre el mapa en vivo o la app para ver nuevos eventos.`,
        infoH2: `Todo sobre Fiestas y Eventos en ${label}`,
        cityCards: [
          { icon: '📍', h3: `Eventos en ${label}`, p: `${esc(label)} usa Alertoo para compartir fiestas, recitales y actividades en el mapa, ayudando a la comunidad a descubrir qué pasa cerca.` },
          { icon: '🎯', h3: `No Te Pierdas Nada en ${label}`, p: `Consulta el mapa de Alertoo y descubre fiestas, ferias y eventos ${where} antes de salir de casa.` },
        ],
        genericCards: [
          { icon: '🎶', h3: 'Recitales y Música en Vivo', p: 'Encuentra recitales, bares con música en vivo y after-office cerca de ti, compartidos por la comunidad.' },
          { icon: '🎉', h3: 'Fiestas y Boliches', p: 'Descubre qué fiestas y eventos nocturnos hay hoy y este fin de semana en tu ciudad.' },
          { icon: '🗺️', h3: 'Mapa Interactivo', p: 'Mira la ubicación exacta de cada evento. Planifica tu salida y elige el más cercano.' },
          { icon: '📱', h3: '1 Toque para Compartir', p: '¿Organizas o conoces un evento? Compártelo en segundos desde la app para que toda la comunidad lo vea.' },
          { icon: '🤝', h3: 'Comunidad Colaborativa', p: 'Cuanta más gente comparte, más completa es la agenda. Cada evento ayuda a otros a planificar su salida.' },
          { icon: '🔔', h3: 'Notificaciones de Eventos', p: 'Recibe alertas de eventos cercanos a tu ubicación con la app instalada.' },
        ],
        faq: [
          { q: `¿Cómo ver fiestas y eventos en ${label}?`, a: `Entra a <a href="/eventos">alertoo.com.br/eventos</a> o descarga la app Alertoo gratis. El mapa muestra eventos compartidos por la comunidad ${where}.` },
          { q: '¿Cómo publicar un evento en Alertoo?', a: 'En la app, toca "+" en el mapa, selecciona "Evento", agrega los detalles, confirma la ubicación y envía. El evento queda visible para toda la comunidad de la zona.' },
          { q: `¿Qué tipo de eventos puedo encontrar ${where}?`, a: `Fiestas, recitales, ferias, eventos deportivos, after-office y mucho más — todo compartido por usuarios reales ${where}.` },
          { q: '¿Alertoo es gratuito para ver eventos?', a: 'Sí, completamente gratuito. Disponible en Google Play y App Store sin ningún costo.' },
          { q: `¿Cómo saber qué eventos hay este fin de semana en ${label}?`, a: `Abre el mapa de Alertoo en <a href="/eventos">alertoo.com.br/eventos</a> o en la app y filtra los eventos compartidos por la comunidad ${where}.` },
          { q: '¿Puedo promocionar mi evento o negocio en Alertoo?', a: 'Sí, Alertoo permite destacar eventos y emprendimientos en el mapa para llegar a más personas en tu zona.' },
        ],
        citiesH2: `Eventos en ${country}`,
      };
    },
  },
  'control-de-alcoholemia': {
    dirSlug: 'control-de-alcoholemia',
    breadcrumbName: 'Control de Alcoholemia',
    categoryValue: 'drunkcheck',
    recentEmoji: '🍺',
    cityCardEmoji: '🍺',
    brandRgb: '255,87,34',
    brand: '#FF5722',
    adSlots: { top: '2714751684', mid: '3259050312', bot: '4572131985' },
    hero: { badge: '🍺 Control en Vivo' },
    cont(label, country, isHub) {
      const where = isHub ? `en ${label}` : `en ${label}, ${country}`;
      return {
        title: `Control de Alcoholemia en ${label} Hoy — Alertoo`,
        metaDescription: `Mira controles de alcoholemia y puestos de control ${where} hoy. Alertoo muestra en tiempo real controles reportados por la comunidad en el mapa. Gratis.`,
        keywords: `control de alcoholemia ${label}, dónde hay control en ${label}, puesto de control ${label} hoy, alcoholemia ${label} en vivo, control policial ${label}`,
        ogTitle: `Control de Alcoholemia en ${label} Hoy — Alertoo`,
        ogDescription: `Mira controles de alcoholemia ${where} reportados por la comunidad en tiempo real. Gratis para Android y iOS.`,
        twitterTitle: `Control de Alcoholemia en ${label} — Alertoo`,
        twitterDescription: `Controles de alcoholemia ${where} en tiempo real en el mapa. Gratis.`,
        h1: `Control de Alcoholemia<br/><span>en ${esc(label)} Hoy</span>`,
        heroP: `Mira en tiempo real puestos de control de alcoholemia ${where} reportados por la comunidad en el mapa. Planifica tu regreso a casa con seguridad.`,
        mapH2: `Mapa de Controles en Vivo en ${label}`,
        mapCaption: `Controles de alcoholemia reportados por la comunidad ${where} en tiempo real.`,
        recentH2: `Últimos Controles Reportados en ${label}`,
        recentEmptyText: `No hay controles activos reportados ${where} en este momento. Abre el mapa en vivo o la app para ver nuevos reportes.`,
        infoH2: `Todo sobre Controles de Alcoholemia en ${label}`,
        cityCards: [
          { icon: '📍', h3: `Controles en ${label}`, p: `${esc(label)} usa Alertoo para reportar puestos de control de alcoholemia en tiempo real. Consulta el mapa antes de salir.` },
          { icon: '🎯', h3: `Conduce con Responsabilidad en ${label}`, p: `Recuerda: la mejor manera de evitar un problema en un control ${where} es no conducir si bebiste. Alertoo te ayuda a planificar tu regreso.` },
        ],
        genericCards: [
          { icon: '🍺', h3: 'Controles de Rutina', p: 'Puestos de control fijos en rutas y avenidas, realizados de forma habitual por la policía de tránsito.' },
          { icon: '🚓', h3: 'Controles Móviles', p: 'Operativos que cambian de lugar — por eso es importante contar con alertas en tiempo real de la comunidad.' },
          { icon: '📱', h3: 'Alertas de la Comunidad', p: 'Los usuarios reportan controles en tiempo real en Alertoo. Cuantos más usuarios, más preciso es el mapa.' },
          { icon: '🛡️', h3: 'Conduce con Seguridad', p: 'El objetivo de Alertoo no es evadir controles, sino fomentar que nadie conduzca habiendo bebido. Si tomaste, no manejes.' },
          { icon: '🚕', h3: 'Alternativas de Transporte', p: 'Si vas a beber, planifica con anticipación: taxi, app de transporte o un conductor designado.' },
          { icon: '⚖️', h3: 'Conoce la Ley', p: 'Cada país tiene límites de alcohol en sangre permitidos para conducir. Infórmate sobre la normativa local antes de salir.' },
        ],
        faq: [
          { q: `¿Cómo saber dónde hay control de alcoholemia en ${label} hoy?`, a: `En Alertoo, los usuarios reportan controles de alcoholemia ${where} en tiempo real en el mapa. Entra a <a href="/eventos">alertoo.com.br/eventos</a> o descarga la app gratis y mira los controles activos en la zona.` },
          { q: '¿Cómo reportar un control de alcoholemia con Alertoo?', a: 'En la app Alertoo, toca "+", selecciona la categoría de control/alcoholemia, confirma la ubicación y envía. La alerta queda visible para todos los usuarios de la zona durante algunas horas.' },
          { q: '¿Alertoo promueve manejar después de beber?', a: 'No. Alertoo promueve la conducción responsable. Si vas a beber, no conduzcas — usa transporte alternativo. La información de controles ayuda a generar conciencia sobre la fiscalización vial.' },
          { q: '¿La app es gratuita?', a: 'Sí, completamente gratuita. Disponible en Google Play y App Store sin ningún costo.' },
          { q: `¿Funciona Alertoo en rutas y autopistas cerca de ${label}?`, a: `Sí, cualquier usuario puede reportar controles en rutas, autopistas y calles urbanas ${where} y en cualquier parte del país.` },
          { q: '¿Qué pasa si me detectan con alcohol al conducir?', a: 'Las sanciones varían según el país: multas, retención de licencia y del vehículo. Consulta la normativa de tránsito local para conocer los límites y sanciones vigentes.' },
        ],
        citiesH2: `Control de Alcoholemia en ${country}`,
      };
    },
  },
};

// ── CSS compartido ───────────────────────────────────────────────────────
function buildCss(cat, alertBannerCss) {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --brand: ${cat.brand};
      --dark: #0F172A;
      --card: #1E293B;
      --text: #F1F5F9;
      --muted: #94A3B8;
      --border: rgba(255,255,255,.08);
    }
    body { background: var(--dark); color: var(--text); font-family: 'Inter', sans-serif; line-height: 1.6; }
    a { color: var(--brand); text-decoration: none; }
    a:hover { text-decoration: underline; }
    nav { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: rgba(15,23,42,.95); backdrop-filter: blur(8px); z-index: 100; }
    .logo { font-size: 22px; font-weight: 800; color: var(--brand); }
    .nav-links { display: flex; gap: 20px; }
    .nav-links a { color: var(--muted); font-size: 14px; font-weight: 500; }
    .nav-links a:hover { color: var(--text); text-decoration: none; }
    .hero { text-align: center; padding: 72px 24px 56px; max-width: 800px; margin: 0 auto; }
    .hero-badge { display: inline-block; background: rgba(${cat.brandRgb},.15); color: var(--brand); font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: 6px 14px; border-radius: 20px; margin-bottom: 20px; border: 1px solid rgba(${cat.brandRgb},.3); }
    .hero h1 { font-size: clamp(28px, 5vw, 48px); font-weight: 900; line-height: 1.15; margin-bottom: 16px; }
    .hero h1 span { color: var(--brand); }
    .hero p { font-size: 18px; color: var(--muted); max-width: 600px; margin: 0 auto 32px; }
    .cta-group { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .btn-primary { background: var(--brand); color: #fff; font-weight: 700; font-size: 16px; padding: 14px 28px; border-radius: 12px; border: none; cursor: pointer; transition: opacity .2s; display: inline-block; }
    .btn-primary:hover { opacity: .85; text-decoration: none; }
    .btn-secondary { background: transparent; color: var(--text); font-weight: 600; font-size: 16px; padding: 14px 28px; border-radius: 12px; border: 1px solid var(--border); display: inline-block; transition: border-color .2s; }
    .btn-secondary:hover { border-color: var(--brand); text-decoration: none; }
    .map-section { max-width: 1100px; margin: 0 auto 56px; padding: 0 16px; }
    .map-section h2 { font-size: 22px; font-weight: 700; margin-bottom: 12px; text-align: center; }
    .map-frame { border-radius: 16px; overflow: hidden; border: 1px solid var(--border); height: 480px; }
    .map-frame iframe { width: 100%; height: 100%; border: none; }
    .map-caption { text-align: center; font-size: 13px; color: var(--muted); margin-top: 10px; }
    .recent-section { max-width: 860px; margin: 0 auto 56px; padding: 0 24px; }
    .recent-section h2 { font-size: 22px; font-weight: 700; margin-bottom: 16px; text-align: center; }
    .recent-list { display: flex; flex-direction: column; gap: 10px; }
    .recent-item { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; gap: 14px; }
    .recent-emoji { font-size: 22px; flex-shrink: 0; }
    .recent-text { flex: 1; min-width: 0; }
    .recent-desc { font-size: 14px; font-weight: 600; color: var(--text); }
    .recent-city { font-size: 12px; color: var(--muted); margin-top: 2px; }
    .recent-time { font-size: 12px; font-weight: 700; color: var(--brand); flex-shrink: 0; white-space: nowrap; }
    .recent-empty { text-align: center; color: var(--muted); font-size: 14px; padding: 24px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; }
    .stats { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; padding: 0 24px 56px; }
    .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px 32px; text-align: center; flex: 1; min-width: 160px; max-width: 220px; }
    .stat-number { font-size: 32px; font-weight: 900; color: var(--brand); }
    .stat-label { font-size: 13px; color: var(--muted); margin-top: 4px; }
    .info-section { max-width: 800px; margin: 0 auto 56px; padding: 0 24px; }
    .info-section h2 { font-size: 26px; font-weight: 800; margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 40px; }
    .info-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 20px; }
    .info-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
    .info-card p { font-size: 14px; color: var(--muted); line-height: 1.6; }
    .info-icon { font-size: 28px; margin-bottom: 10px; }${alertBannerCss}
    .cities-section { max-width: 860px; margin: 0 auto 56px; padding: 0 24px; }
    .cities-section h2 { font-size: 26px; font-weight: 800; margin-bottom: 16px; }
    .cities-section h3 { font-size: 18px; font-weight: 700; margin: 24px 0 12px; }
    .cities-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .city-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .city-card a { color: var(--text); text-decoration: none; }
    .city-card a:hover { color: var(--brand); }
    .faq-section { max-width: 800px; margin: 0 auto 72px; padding: 0 24px; }
    .faq-section h2 { font-size: 26px; font-weight: 800; margin-bottom: 24px; }
    .faq-item { background: var(--card); border: 1px solid var(--border); border-radius: 14px; margin-bottom: 12px; overflow: hidden; }
    .faq-q { padding: 18px 20px; font-weight: 600; font-size: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; }
    .faq-q::after { content: '+'; font-size: 22px; color: var(--brand); font-weight: 300; }
    .faq-item.open .faq-q::after { content: '−'; }
    .faq-a { display: none; padding: 0 20px 18px; font-size: 14px; color: var(--muted); line-height: 1.7; }
    .faq-item.open .faq-a { display: block; }
    .download-cta { text-align: center; padding: 64px 24px; background: linear-gradient(135deg, rgba(${cat.brandRgb},.12) 0%, rgba(${cat.brandRgb},.03) 100%); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin-bottom: 48px; }
    .download-cta h2 { font-size: clamp(22px,4vw,36px); font-weight: 900; margin-bottom: 12px; }
    .download-cta p { font-size: 16px; color: var(--muted); margin-bottom: 28px; max-width: 500px; margin-left: auto; margin-right: auto; }
    .store-badges { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .store-badge { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px 24px; font-size: 15px; font-weight: 600; color: var(--text); display: inline-flex; align-items: center; gap: 8px; }
    .store-badge:hover { border-color: var(--brand); text-decoration: none; }
    footer { text-align: center; padding: 32px 24px; color: var(--muted); font-size: 13px; border-top: 1px solid var(--border); }
    footer a { color: var(--muted); margin: 0 8px; }
    footer a:hover { color: var(--text); }
    .ad-slot-wrap { max-width: 860px; margin: 0 auto 48px; padding: 0 24px; }
    .ad-slot-wrap-full { width: 100%; background: rgba(255,255,255,.025); border-top: 1px solid rgba(255,255,255,.06); border-bottom: 1px solid rgba(255,255,255,.06); padding: 12px 24px; margin-bottom: 48px; }
    .ad-label { display: block; font-size: 9px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: rgba(255,255,255,.2); margin-bottom: 6px; text-align: center; }
    .adsbygoogle { display: block; min-height: 50px; }`;
}

// ── Links cruzados "También te puede interesar" ────────────────────────
function seeAlsoLinks(ccKey, dirSlug, slug, isHub) {
  const base = `/${ccKey}`;
  const others = {
    radares: { href: `${base}/radares`, label: '📷 Radares' },
    accidentes: { href: `${base}/accidentes`, label: '🚨 Accidentes ahora' },
    inundaciones: { href: `${base}/inundaciones`, label: '🌧️ Inundaciones' },
    'fiestas-y-eventos': { href: `${base}/fiestas-y-eventos`, label: '🎉 Fiestas y Eventos' },
    'control-de-alcoholemia': { href: `${base}/control-de-alcoholemia`, label: '🍺 Control de Alcoholemia' },
  };
  const links = [];
  for (const [key, val] of Object.entries(others)) {
    if (key !== dirSlug) links.push(val);
  }
  if (!isHub) {
    links.push({ href: `${base}/${dirSlug}`, label: `🌎 ${others[dirSlug].label.replace(/^\S+\s/, '')} — todo el país` });
  }
  links.push({ href: '/eventos', label: '🗺️ Mapa en Vivo' });
  return links.map((l) => `      <a href="${l.href}" style="display:inline-flex;align-items:center;gap:8px;background:#0F172A;color:#fff;padding:10px 16px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,0.08);">${l.label}</a>`).join('\n');
}

// ── Genera HTML completo para subpágina o hub ───────────────────────────
function buildPage(catKey, ccKey, slug /* null = hub */) {
  const cat = CATEGORIES[catKey];
  const country = COUNTRIES[ccKey];
  const isHub = slug === null;
  const cfg = isHub ? null : country.locations[slug];
  const label = isHub ? country.name : cfg.label;
  const c = cat.cont(label, country.name, isHub);

  const pageUrl = isHub
    ? `https://alertoo.com.br/${ccKey}/${cat.dirSlug}`
    : `https://alertoo.com.br/${ccKey}/${cat.dirSlug}/${slug}`;
  const hubUrl = `https://alertoo.com.br/${ccKey}/${cat.dirSlug}`;

  // Grid de ciudades del país (link cruzado entre subpáginas y hub)
  const locationEntries = Object.entries(country.locations);
  const cityCardsGrid = locationEntries
    .map(([s, loc]) => `    <div class="city-card">${cat.cityCardEmoji} <a href="/${ccKey}/${cat.dirSlug}/${s}">${esc(loc.label)}</a></div>`)
    .join('\n');

  const hasRecent = !!cat.categoryValue;
  const filterExpr = isHub
    ? `d.data().category === '${cat.categoryValue}' && d.data().countryCode === '${country.code}'`
    : `d.data().category === '${cat.categoryValue}' && d.data().countryCode === '${country.code}' && d.data().cityName === '${cfg.label}'`;

  const alertBannerHtml = c.alertBanner
    ? `\n<div class="alert-banner">\n  ${c.alertBanner}\n</div>\n`
    : '';

  const alertBannerCss = c.alertBanner
    ? `\n    .alert-banner{background:rgba(${cat.brandRgb},.1);border:1px solid rgba(${cat.brandRgb},.3);border-radius:14px;padding:20px 24px;max-width:860px;margin:0 auto 40px;text-align:center;font-size:14px;color:var(--text)}\n    .alert-banner strong{color:var(--text)}`
    : '';

  const infoCardsHtml = [...c.cityCards, ...c.genericCards].map(infoCard).join('\n');
  const faqHtml = c.faq.map(faqItem).join('\n');

  const recentSectionHtml = hasRecent
    ? `${alertBannerHtml}
<section class="recent-section">
  <h2>${esc(c.recentH2)}</h2>
  <div class="recent-list" id="recentList">
    <div class="recent-empty">Cargando reportes recientes...</div>
  </div>
</section>
`
    : `${alertBannerHtml}`;

  const recentScript = hasRecent ? `
<!-- DATOS RECIENTES — busca eventos reales en Firestore -->
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
  import { getFirestore, collection, query, where, orderBy, limit, getDocs, Timestamp }
    from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

  const app = initializeApp({
    apiKey:            'AIzaSyCoI9rNBK07vGZBuygprq4PkDKGT0iZkYU',
    authDomain:        'lei-seca---eventos.firebaseapp.com',
    projectId:         'lei-seca---eventos',
    storageBucket:     'lei-seca---eventos.firebasestorage.app',
    messagingSenderId: '657066902706',
    appId:             '1:657066902706:web:3e3d49f23a819c5ce1b5ab',
  });
  const db = getFirestore(app);

  function timeAgo(ms) {
    const d = Date.now() - ms, m = Math.floor(d / 60000);
    if (m < 1) return 'ahora';
    if (m < 60) return \`hace \${m} min\`;
    const h = Math.floor(m / 60);
    return \`hace \${h}h\${m % 60 ? (m % 60) + 'min' : ''}\`;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  async function loadRecent() {
    const el = document.getElementById('recentList');
    try {
      const q = query(
        collection(db, 'events'),
        where('expiresAt', '>', Timestamp.now()),
        orderBy('expiresAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      const docs = snap.docs
        .filter(d => ${filterExpr})
        .slice(0, 8);
      if (docs.length === 0) {
        el.innerHTML = '<div class="recent-empty">${esc(c.recentEmptyText)}</div>';
        return;
      }
      el.innerHTML = docs.map(d => {
        const data = d.data();
        const created = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
        const desc = (data.description || data.title || '${cat.breadcrumbName}').toString();
        const city = data.cityName || '${esc(label)}';
        return \`<div class="recent-item">
          <div class="recent-emoji">${cat.recentEmoji}</div>
          <div class="recent-text">
            <div class="recent-desc">\${escapeHtml(desc)}</div>
            <div class="recent-city">\${escapeHtml(city)} — ${country.code}</div>
          </div>
          <div class="recent-time">\${timeAgo(created)}</div>
        </div>\`;
      }).join('');
    } catch (err) {
      el.innerHTML = '<div class="recent-empty">No se pudieron cargar los reportes ahora. Mira el mapa en vivo arriba.</div>';
    }
  }

  loadRecent();
</script>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-TSS9J9VDTC"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-TSS9J9VDTC');</script>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4349309505537394" crossorigin="anonymous"></script>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${esc(c.metaDescription)}" />
  <meta name="keywords" content="${esc(c.keywords)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${pageUrl}" />
  <link rel="alternate" hreflang="es" href="${pageUrl}" />
  <link rel="alternate" hreflang="x-default" href="${pageUrl}" />
  <meta property="og:title" content="${esc(c.ogTitle)}" />
  <meta property="og:description" content="${esc(c.ogDescription)}" />
  <meta property="og:image" content="https://alertoo.com.br/feature-graphic-1024x500.png" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Alertoo" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(c.twitterTitle)}" />
  <meta name="twitter:description" content="${esc(c.twitterDescription)}" />
  <meta name="twitter:image" content="https://alertoo.com.br/feature-graphic-1024x500.png" />
  <script type="application/ld+json">${faqJsonLd(c.faq)}</script>
  <script type="application/ld+json">${webPageJsonLd({ title: c.title, description: c.metaDescription, breadcrumbName: cat.breadcrumbName, breadcrumbUrl: hubUrl, label, pageUrl })}</script>
  <script type="application/ld+json">${softwareAppJsonLd()}</script>
  <title>${esc(c.title)}</title>
  <link rel="icon" href="/icon.png" type="image/png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>${buildCss(cat, alertBannerCss)}
  </style>
</head>
<body>

<nav>
  <a class="logo" href="/">Alertoo</a>
  <div class="nav-links">
    <a href="/eventos" data-i18n="seo.nav.live">Mapa en Vivo</a>
    <a href="https://play.google.com/store/apps/details?id=com.alertoo.app" target="_blank" rel="noopener" data-i18n="seo.nav.download">Descargar App</a>
  </div>
</nav>

<section class="hero">
  <div class="hero-badge">${cat.hero.badge}</div>
  <h1>${c.h1}</h1>
  <p>${esc(c.heroP)}</p>
  <div class="cta-group">
    <a class="btn-primary" href="/eventos" data-i18n="seo.btn.map">Ver Mapa Ahora</a>
    <a class="btn-secondary" href="https://play.google.com/store/apps/details?id=com.alertoo.app" target="_blank" rel="noopener" data-i18n="seo.btn.free">Descargar Gratis</a>
  </div>
</section>

<div class="ad-slot-wrap-full" id="adWrapTop">
  <span class="ad-label" data-i18n="seo.ad">Publicidad</span>
  <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-4349309505537394" data-ad-slot="${cat.adSlots.top}" data-ad-format="auto" data-full-width-responsive="true"></ins>
</div>

<section class="map-section">
  <h2>${esc(c.mapH2)}</h2>
  <div class="map-frame">
    <iframe src="/eventos" title="${esc(c.mapH2)} — Alertoo" loading="lazy" allow="geolocation"></iframe>
  </div>
  <p class="map-caption">${esc(c.mapCaption)}</p>
</section>
${recentSectionHtml}
<div class="stats">
  <div class="stat-card">
    <div class="stat-number">100%</div>
    <div class="stat-label" data-i18n="seo.stat.free">Gratuito</div>
  </div>
  <div class="stat-card">
    <div class="stat-number" data-i18n="seo.stat.live">En vivo</div>
    <div class="stat-label" data-i18n="seo.stat.liveAlerts">Alertas en tiempo real</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">Android<br/>+ iOS</div>
    <div class="stat-label" data-i18n="seo.stat.allPlatforms">Disponible para todos</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">1 toque</div>
    <div class="stat-label" data-i18n="seo.stat.report">Para reportar</div>
  </div>
</div>

<section class="info-section">
  <h2>${esc(c.infoH2)}</h2>
  <div class="info-grid">
${infoCardsHtml}
  </div>
</section>

<div class="ad-slot-wrap" id="adWrapMid">
  <span class="ad-label" data-i18n="seo.ad">Publicidad</span>
  <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-4349309505537394" data-ad-slot="${cat.adSlots.mid}" data-ad-format="auto" data-full-width-responsive="true"></ins>
</div>

<section class="faq-section">
  <h2 data-i18n="seo.faqH2">Preguntas Frecuentes</h2>
${faqHtml}
</section>

<section class="cities-section">
  <h2>${esc(c.citiesH2)}</h2>
  <div class="cities-grid">
${cityCardsGrid}
  </div>
</section>

<div class="ad-slot-wrap-full" id="adWrapBot">
  <span class="ad-label" data-i18n="seo.ad">Publicidad</span>
  <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-4349309505537394" data-ad-slot="${cat.adSlots.bot}" data-ad-format="auto" data-full-width-responsive="true"></ins>
</div>

<section class="download-cta">
  <h2 data-i18n="seo.ctaH2default">Descarga Gratis y Mantente Informado</h2>
  <p data-i18n="seo.ctaPdefault">Recibe alertas de tránsito en tiempo real cerca de ti.</p>
  <div class="store-badges">
    <a class="store-badge" href="https://play.google.com/store/apps/details?id=com.alertoo.app" target="_blank" rel="noopener" data-i18n="seo.btn.googlePlay">▶ Google Play</a>
    <a class="store-badge" href="https://apps.apple.com/br/app/alertoo/id6744862588" target="_blank" rel="noopener" data-i18n="seo.btn.appStore"> App Store</a>
  </div>
</section>

<footer>
  <p>
    <a href="/">Alertoo</a> &bull;
    <a href="/eventos" data-i18n="seo.nav.live">Mapa en Vivo</a> &bull;
    <a href="/privacidade.html" data-i18n="seo.footer.privacy">Privacidad</a> &bull;
    <a href="/deletar-conta.html" data-i18n="seo.footer.delete">Eliminar Cuenta</a>
  </p>
  <p style="margin-top:10px;"><span data-i18n="footer.rights">© 2025 Alertoo. Todos los derechos reservados.</span></p>
</footer>

<script>
  function initAds(){document.querySelectorAll('ins.adsbygoogle').forEach(function(ins){var s=ins.getAttribute('data-ad-slot')||'';if(s.startsWith('SLOT_'))return;try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(_){}});}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',initAds):initAds();
</script>

<script>
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.parentElement;
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
</script>

<!-- TAMBIÉN TE PUEDE INTERESAR -->
<section style="background:#1E293B;padding:40px 5%;margin-top:0;">
  <div style="max-width:780px;margin:0 auto;">
    <h3 style="font-size:16px;font-weight:700;color:rgba(255,255,255,0.5);letter-spacing:1px;text-transform:uppercase;margin-bottom:20px;" data-i18n="seo.seeAlso">También te puede interesar</h3>
    <div style="display:flex;flex-wrap:wrap;gap:12px;">
${seeAlsoLinks(ccKey, cat.dirSlug, slug, isHub)}
    </div>
  </div>
</section>

<!-- COOKIE BANNER -->
<div id="cookieBanner" style="display:none;position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#1E293B;border-top:1px solid rgba(255,255,255,0.1);padding:16px 5%;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
  <p style="font-size:13px;color:rgba(255,255,255,0.7);flex:1;min-width:220px;margin:0;">
    <span data-i18n="cookie.text">Usamos cookies para mejorar tu experiencia y mostrar anuncios relevantes.
    Al continuar, aceptas nuestra</span> <a href="/privacidade.html" style="color:#FF5722;" data-i18n="cookie.privacy">Política de Privacidad</a>.
  </p>
  <div style="display:flex;gap:8px;flex-shrink:0;">
    <button onclick="handleCookie(false)" style="background:transparent;border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.6);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;" data-i18n="cookie.decline">Rechazar</button>
    <button onclick="handleCookie(true)" style="background:#FF5722;border:none;color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;" data-i18n="cookie.accept">Aceptar</button>
  </div>
</div>
<script>
  (function() {
    var c = localStorage.getItem('cookieConsent');
    if (!c) document.getElementById('cookieBanner').style.display = 'flex';
  })();
  function handleCookie(accept) {
    localStorage.setItem('cookieConsent', accept ? 'accepted' : 'declined');
    document.getElementById('cookieBanner').style.display = 'none';
  }
</script>
<script>
  (function() {
    var urlLang = new URLSearchParams(location.search).get('lang');
    if (urlLang) {
      var supported = ['pt-BR','en','es','fr','pt-PT'];
      if (supported.indexOf(urlLang) !== -1) {
        localStorage.setItem('alertoo_lang', urlLang);
        var url = new URL(location.href);
        url.searchParams.delete('lang');
        history.replaceState({}, '', url.pathname + (url.search || ''));
      }
    } else if (!localStorage.getItem('alertoo_lang')) {
      localStorage.setItem('alertoo_lang', 'es');
    }
  })();
</script>
<script src="/i18n.js"></script>
<script src="/i18n-extra.js"></script>
<script src="/i18n-extra2.js"></script>
${recentScript}
</body>
</html>
`;
}

// ── Ejecución ───────────────────────────────────────────────────────────
let count = 0;
for (const ccKey of Object.keys(COUNTRIES)) {
  const country = COUNTRIES[ccKey];
  for (const catKey of Object.keys(CATEGORIES)) {
    const cat = CATEGORIES[catKey];

    // Hub del país: public/<cc>/<categoria>.html
    const ccDir = join(PUBLIC_DIR, ccKey);
    if (!existsSync(ccDir)) mkdirSync(ccDir, { recursive: true });
    writeFileSync(join(ccDir, `${cat.dirSlug}.html`), buildPage(catKey, ccKey, null), 'utf8');
    count++;

    // Subpáginas por ciudad: public/<cc>/<categoria>/<slug>/index.html
    for (const slug of Object.keys(country.locations)) {
      const outDir = join(ccDir, cat.dirSlug, slug);
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'index.html'), buildPage(catKey, ccKey, slug), 'utf8');
      count++;
    }
  }
}

console.log(`🎉 Concluído: ${count} páginas geradas (${Object.keys(COUNTRIES).length} países x ${Object.keys(CATEGORIES).length} categorias x (1 hub + ${Object.keys(COUNTRIES.ar.locations).length} cidades)).`);
