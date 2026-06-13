/**
 * Alertoo Service Worker — Cache-first para assets estáticos
 */
const CACHE_NAME = 'alertoo-v2';
const STATIC_ASSETS = [
  '/',
  '/main.css',
  '/i18n.js',
  '/lib/leaflet.css',
  '/lib/leaflet.js',
  '/icon.webp',
  '/manifest.json',
  '/screenshots/01-mapa.webp',
  '/screenshots/02-reportar.webp',
  '/screenshots/03-eventos.webp',
  '/screenshots/04-comunidade.webp',
  '/screenshots/05-promover.webp',
  '/feature-graphic-1024x500.webp',
];

// Instala e pré-cacheia assets estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia: cache-first para assets, network-first para páginas HTML e Firebase
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-GET e externas (Firebase, Analytics, AdSense)
  if (request.method !== 'GET') return;
  if (!url.origin.includes('alertoo.com.br') && !url.origin.includes('localhost')) return;
  if (url.pathname.startsWith('/__/')) return; // Firebase internals

  // HTML: network-first (sempre conteúdo fresco)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Assets estáticos: cache-first
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
