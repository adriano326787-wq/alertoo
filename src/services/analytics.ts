/**
 * Analytics — PostHog para tracking de eventos e funis (resiliente).
 *
 * Setup:
 *   1. Crie conta em https://posthog.com (free tier 1M events/mês)
 *   2. Pegue a API Key do projeto (Project API Key)
 *   3. Adicione no .env: EXPO_PUBLIC_POSTHOG_API_KEY=phc_xxx
 *   4. (Opcional) EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com (default)
 *
 * Resiliência: se módulo nativo OU API key faltarem, tudo é no-op silencioso.
 */

import Constants from 'expo-constants';

// Dynamic require — não quebra se o nativo não estiver disponível
let PostHogClass: any = null;
try {
  const mod = require('posthog-react-native');
  PostHogClass = mod.PostHog ?? mod.default;
} catch {
  if (__DEV__) console.log('[Analytics] posthog-react-native indisponível — desabilitado');
}

const API_KEY: string =
  (process.env.EXPO_PUBLIC_POSTHOG_API_KEY as string) ||
  ((Constants.expoConfig?.extra as any)?.posthogApiKey as string) ||
  '';

const HOST: string =
  (process.env.EXPO_PUBLIC_POSTHOG_HOST as string) ||
  ((Constants.expoConfig?.extra as any)?.posthogHost as string) ||
  'https://us.i.posthog.com';

let client: any = null;

export async function initAnalytics() {
  if (!PostHogClass) return;
  if (!API_KEY) {
    if (__DEV__) console.log('[Analytics] API key não configurada — analytics desabilitado');
    return;
  }
  try {
    client = new PostHogClass(API_KEY, {
      host: HOST,
      flushAt: 20,
      flushInterval: 10_000,
      enableSessionReplay: false,
      captureAppLifecycleEvents: true,
    });
    if (__DEV__) console.log('[Analytics] Inicializado');
  } catch (e) {
    if (__DEV__) console.warn('[Analytics] Falha ao inicializar:', e);
  }
}

// ─── EVENT CATALOG ───────────────────────────────────────────────────────────

export type AnalyticsEvent =
  | 'app_opened'
  | 'app_backgrounded'
  | 'signed_up'
  | 'signed_in'
  | 'signed_out'
  | 'map_viewed'
  | 'map_pin_tapped'
  | 'map_filter_applied'
  | 'event_viewed'
  | 'event_created'
  | 'event_liked'
  | 'event_unliked'
  | 'event_commented'
  | 'event_shared'
  | 'event_confirmed'
  | 'event_denied'
  | 'navigation_previewed'
  | 'navigation_started'
  | 'navigation_completed'
  | 'navigation_cancelled'
  | 'route_recalculated'
  | 'promote_clicked'
  | 'promote_tier_selected'
  | 'promote_purchased'
  | 'credits_purchased'
  | 'error_shown';

export function track(event: AnalyticsEvent, props?: Record<string, any>) {
  if (!client) return;
  try {
    client.capture(event, props);
  } catch (e) {
    if (__DEV__) console.warn('[Analytics] track failed:', event, e);
  }
}

export function identify(userId: string, traits?: Record<string, any>) {
  if (!client) return;
  try { client.identify(userId, traits); } catch {}
}

export function resetAnalytics() {
  if (!client) return;
  try { client.reset(); } catch {}
}

export function isFeatureEnabled(flag: string): boolean {
  if (!client) return false;
  try { return client.isFeatureEnabled(flag) === true; } catch { return false; }
}

export function setUserProperty(key: string, value: any) {
  if (!client) return;
  try { client.register({ [key]: value }); } catch {}
}
