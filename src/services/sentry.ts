/**
 * Sentry — crash reporting + error tracking (resiliente).
 *
 * Setup:
 *   1. Crie projeto em https://sentry.io (free tier 5k errors/mês)
 *   2. Copie a DSN do projeto
 *   3. Adicione no .env:  EXPO_PUBLIC_SENTRY_DSN=https://xxx@oxxx.ingest.sentry.io/xxx
 *   4. Reinicie o app
 *
 * Resiliência: se o módulo nativo não estiver instalado OU a DSN não estiver
 * configurada, tudo vira no-op silencioso.
 */

import Constants from 'expo-constants';

// Dynamic require — se o módulo nativo não existir, não quebra o app
let Sentry: any = null;
try {
  Sentry = require('@sentry/react-native');
} catch {
  if (__DEV__) console.log('[Sentry] Módulo nativo indisponível — desabilitado');
}

const DSN: string =
  (process.env.EXPO_PUBLIC_SENTRY_DSN as string) ||
  ((Constants.expoConfig?.extra as any)?.sentryDsn as string) ||
  '';

const HAS_NATIVE = !!Sentry && typeof Sentry.init === 'function';
const ENABLED = HAS_NATIVE && !!DSN && !__DEV__;

export function initSentry() {
  if (!HAS_NATIVE) return;
  if (!DSN) {
    if (__DEV__) console.log('[Sentry] DSN não configurada — crash reporting desabilitado');
    return;
  }
  if (__DEV__) {
    console.log('[Sentry] Pulando init em DEV');
    return;
  }
  try {
    Sentry.init({
      dsn: DSN,
      tracesSampleRate: 0.2,
      replaysOnErrorSampleRate: 1.0,
      replaysSessionSampleRate: 0.05,
      attachStacktrace: true,
      enableNative: true,
      ignoreErrors: ['Network request failed', 'AbortError'],
      environment: __DEV__ ? 'development' : 'production',
    });
  } catch (e) {
    console.warn('[Sentry] Falha ao inicializar:', e);
  }
}

export function captureError(error: unknown, context?: Record<string, any>) {
  if (!ENABLED) return;
  try {
    if (context) Sentry.setContext('extra', context);
    Sentry.captureException(error);
  } catch {}
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!ENABLED) return;
  try { Sentry.captureMessage(message, level); } catch {}
}

export function setSentryUser(user: { id: string; email?: string } | null) {
  if (!ENABLED) return;
  try {
    if (user) Sentry.setUser({ id: user.id, email: user.email });
    else Sentry.setUser(null);
  } catch {}
}

/** ErrorBoundary do Sentry (ou fallback que só renderiza children) */
export const ErrorBoundary: any = HAS_NATIVE && Sentry.ErrorBoundary
  ? Sentry.ErrorBoundary
  : ({ children }: any) => children;
