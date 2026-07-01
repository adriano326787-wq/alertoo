/**
 * Detecção de horário de rush — usado pelo motor de scoring de contexto
 * (src/utils/contextScoring.ts) para reduzir a confiança de hipóteses como
 * "acidente"/"interdição" quando o trânsito parado é só o rush normal, e
 * aumentar a de "congestionamento" no mesmo cenário.
 *
 * Faixas fixas (hora local do dispositivo): 7h-9h e 17h-19h, dias de semana.
 * Não usa Firestore/API — é só matemática de data, fácil de testar.
 */
export function isRushHour(date: Date = new Date()): boolean {
  const day = date.getDay(); // 0=Dom ... 6=Sáb
  if (day === 0 || day === 6) return false;
  const hour = date.getHours();
  return (hour >= 7 && hour < 9) || (hour >= 17 && hour < 19);
}

/** true para noites de sexta/sábado, ou madrugada de domingo (saída de sábado) — janela de maior risco de Lei Seca. */
export function isNightlifeWindow(date: Date = new Date()): boolean {
  const day = date.getDay();
  const hour = date.getHours();
  const isLateNight = hour >= 22 || hour < 4;
  const isFridayOrSaturdayNight = (day === 5 || day === 6) && isLateNight;
  const isSundayDawn = day === 0 && hour < 4; // madrugada de domingo = saída de sábado
  return isFridayOrSaturdayNight || isSundayDawn;
}

/** Dias 5 e 20 (regra clássica de pagamento de salário/benefício no Brasil) — proxy de mais movimento noturno. */
export function isPayday(date: Date = new Date()): boolean {
  const d = date.getDate();
  return d === 5 || d === 20;
}
