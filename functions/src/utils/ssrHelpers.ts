import { Timestamp } from 'firebase-admin/firestore';

/**
 * Helpers de SSR extraídos de web.ts para serem testáveis sem disparar o
 * initializeApp() do firebase-admin (que roda no top-level de shared.ts,
 * importado por web.ts).
 */

export function escapeHtmlSSR(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function jsStringLiteralSSR(s: string): string {
  return JSON.stringify(s).replace(/<\//g, '<\\/');
}

/** Converte Timestamp do Firestore (ou número/objeto {_seconds}) para milissegundos. */
export function tsToMs(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object' && '_seconds' in v) return (v as any)._seconds * 1000;
  if (v instanceof Timestamp) return v.toMillis();
  return 0;
}
