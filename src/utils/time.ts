import { t, tf } from './i18n';

export function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('time_just_now');
  if (minutes < 60) return tf('time_ago_min', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return tf('time_ago_h', { n: hours });
  return tf('time_ago_d', { n: Math.floor(hours / 24) });
}

export function timeLeft(expiresAt: number): string {
  // #19 — add ~10s buffer to absorb client clock skew; avoids "expired" flash on valid events
  const diff = expiresAt - Date.now() + 10_000;
  if (diff <= 0) return t('time_expired');
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return tf('time_expires_min', { n: minutes });
  const hours = Math.floor(minutes / 60);
  // Acima de 24h: exibe em dias para melhor legibilidade (ex: "expira em 33 dias")
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return days === 1
      ? tf('time_expires_d',  { n: days })
      : tf('time_expires_dp', { n: days });
  }
  const mins = minutes % 60;
  if (mins === 0) return tf('time_expires_h', { n: hours });
  return tf('time_expires_hm', { n: hours, m: mins });
}

/**
 * Versão compacta do tempo restante para espaços reduzidos (cards, stats).
 * Exemplos: "45min" | "3h" | "3h 59min" | "2d 4h"
 */
export function timeLeftShort(expiresAt: number): string {
  // #19 — same 10s clock-skew buffer as timeLeft()
  const diff = expiresAt - Date.now() + 10_000;
  if (diff <= 0) return t('time_expired');
  const totalMin = Math.floor(diff / 60000);
  if (totalMin < 60) return `${totalMin}min`;
  const hours = Math.floor(totalMin / 60);
  const mins  = totalMin % 60;
  if (hours >= 48) {
    const days = Math.floor(hours / 24);
    const remH = hours % 24;
    return remH > 0 ? `${days}d ${remH}h` : `${days}d`;
  }
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}
