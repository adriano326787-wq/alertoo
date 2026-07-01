import { t, tf } from './i18n';

export const RATE_LIMIT_MS = 30_000;

/**
 * Lança erro se o rate limit ainda não expirou.
 * @param lastAt  timestamp da última ação (ou null)
 * @param limitMs janela em ms (padrão: 30s)
 * @param errorKey chave i18n para a mensagem (padrão: 'rate_limit_wait')
 */
export function checkRateLimit(
  lastAt: number | null,
  limitMs: number = RATE_LIMIT_MS,
  errorKey = 'rate_limit_wait',
): void {
  if (!lastAt) return;
  const elapsed = Date.now() - lastAt;
  if (elapsed < limitMs) {
    const remaining = Math.ceil((limitMs - elapsed) / 1000);
    throw new Error(tf(errorKey, { remaining }));
  }
}

/**
 * Lança erro se o usuário não estiver autenticado (uid ausente ou anônimo).
 * Retorna o uid validado.
 */
export function requireAuth(uid: string, errorKey = 'login_required'): string {
  if (!uid || uid === 'anonymous') throw new Error(t(errorKey));
  return uid;
}
