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
  const diff = expiresAt - Date.now();
  if (diff <= 0) return t('time_expired');
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return tf('time_expires_min', { n: minutes });
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return tf('time_expires_h', { n: hours });
  return tf('time_expires_hm', { n: hours, m: mins });
}
