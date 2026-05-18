/**
 * Deep links do app — formato unificado:
 *   alertoo://evento/{type}/{id}
 *
 * type: 'road' | 'entertainment'
 * id:   ID do documento no Firestore
 */

export type DeepLinkEventType = 'road' | 'entertainment';

export interface ParsedDeepLink {
  type: DeepLinkEventType;
  id: string;
}

const SCHEME = 'alertoo';
const HOST   = 'evento';

/**
 * URL pública pra compartilhamento — funciona como universal/applink:
 *
 *   • Android com app instalado → abre o app direto no evento
 *   • Android sem o app         → abre a Play Store (id=com.alertoo.app)
 *   • iOS sem o app             → abre App Store (placeholder)
 *   • Desktop                   → mostra página de preview/redirecionamento
 *
 * Para funcionar como App Link nativo, é preciso:
 *   1. Hospedar uma página web em `WEB_BASE_URL` com smart redirect
 *   2. Subir `assetlinks.json` (Android) e `apple-app-site-association` (iOS)
 *   3. Adicionar intent-filter no AndroidManifest.xml com autoVerify
 *
 * Enquanto o domínio próprio não existe, o fallback usa:
 *   https://play.google.com/store/apps/details?id=com.alertoo.app&referrer={link}
 */
const WEB_BASE_URL = 'https://alertoo.app';
const ANDROID_PACKAGE = 'com.alertoo.app';

/**
 * Constrói uma URL deep link para um evento.
 *   buildEventDeepLink('road', 'abc123')
 *     → 'alertoo://evento/road/abc123'
 */
export function buildEventDeepLink(type: DeepLinkEventType, id: string): string {
  return `${SCHEME}://${HOST}/${type}/${id}`;
}

/**
 * URL HTTPS pública — pode ser tappada em qualquer mensageiro/navegador.
 * Ex: https://alertoo.app/evento/road/abc123
 *
 * Quando a página estiver hospedada com smart redirect, fará:
 *   - Android com app → abre alertoo://evento/...
 *   - Android sem app → Play Store
 *   - iOS sem app     → App Store
 *   - Desktop         → mostra preview do evento
 */
export function buildEventWebLink(type: DeepLinkEventType, id: string): string {
  return `${WEB_BASE_URL}/evento/${type}/${id}`;
}

/**
 * Link DIRETO para a Play Store com referrer (mantém contexto do evento
 * pra deep-link assim que o usuário instalar — Google Play Install Referrer API).
 */
export function buildPlayStoreInstallLink(type: DeepLinkEventType, id: string): string {
  const referrer = encodeURIComponent(`evento_${type}_${id}`);
  return `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}&referrer=${referrer}`;
}

/**
 * Conjunto completo de links pra compartilhamento — escolhe o melhor formato
 * dependendo de onde o link vai ser colado.
 */
export function buildShareLinks(type: DeepLinkEventType, id: string) {
  return {
    /** Para usar dentro do app/QR — abre só se tiver Alertoo instalado */
    deepLink: buildEventDeepLink(type, id),
    /** Para colar em WhatsApp/Insta/web — funciona em qualquer dispositivo */
    webLink: buildEventWebLink(type, id),
    /** Para CTA "Instalar Alertoo" */
    storeLink: buildPlayStoreInstallLink(type, id),
  };
}

/**
 * Tenta extrair {type, id} de uma URL deep link.
 * Retorna null se não for um deep link válido do app.
 *
 * Aceita formatos:
 *   alertoo://evento/road/abc123
 *   alertoo://evento/entertainment/xyz789
 *   https://alertoo.app/evento/road/abc123     (universal link futuro)
 */
export function parseEventDeepLink(url: string | null | undefined): ParsedDeepLink | null {
  if (!url) return null;

  // Remove scheme + host, deixa só o path
  // Casos:
  //   "alertoo://evento/road/abc"    → "evento/road/abc"
  //   "https://alertoo.app/evento/road/abc" → "evento/road/abc"
  const m = url.match(/(?:alertoo:\/\/|alertoo\.app\/)([^?#]+)/i);
  if (!m) return null;

  const parts = m[1].split('/').filter(Boolean);
  if (parts.length < 3) return null;

  const [host, rawType, id] = parts;
  if (host.toLowerCase() !== HOST) return null;
  if (!id) return null;

  const type = rawType.toLowerCase();
  if (type !== 'road' && type !== 'entertainment') return null;

  return { type, id };
}
