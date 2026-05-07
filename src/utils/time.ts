export function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

export function timeLeft(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'expirado';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `expira em ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `expira em ${hours}h${minutes % 60 > 0 ? ` ${minutes % 60}min` : ''}`;
}
