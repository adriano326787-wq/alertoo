/**
 * Lógica pura do streak diário (dias consecutivos com pelo menos 1 ação
 * relevante: criar evento, confirmar, comentar). Separada do I/O
 * (AsyncStorage/Firestore fica em src/services/userService.ts) pra ser
 * testável sem mockar nada — mesmo padrão de promptEngagementScoring.ts.
 */

/** Formata uma data como 'YYYY-MM-DD' (dia local do dispositivo, não UTC). */
export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayKeyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isYesterday(lastActiveDate: string, today: string): boolean {
  const todayDate = dayKeyToDate(today);
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);
  return lastActiveDate === localDayKey(yesterday);
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

export interface StreakUpdateResult extends StreakState {
  /** false quando a ação de hoje já tinha sido registrada — não houve mudança real. */
  changed: boolean;
}

/**
 * Calcula o novo estado do streak a partir de uma ação feita "hoje".
 * - Mesma data de hoje já registrada → não muda nada (changed: false)
 * - Última ação foi ontem → incrementa o streak
 * - Qualquer outra coisa (nunca usou, ou ficou mais de 1 dia sem usar) → reseta pra 1
 */
export function computeStreakUpdate(state: StreakState, today: string): StreakUpdateResult {
  if (state.lastActiveDate === today) {
    return { ...state, changed: false };
  }

  const isConsecutive = state.lastActiveDate != null && isYesterday(state.lastActiveDate, today);
  const nextStreak = isConsecutive ? state.currentStreak + 1 : 1;

  return {
    currentStreak: nextStreak,
    longestStreak: Math.max(state.longestStreak, nextStreak),
    lastActiveDate: today,
    changed: true,
  };
}

/** true se lastActiveDate é "ontem" em relação a hoje — usado pelo lembrete de streak (risco de quebrar à meia-noite). */
export function isStreakAtRisk(lastActiveDate: string | null, today: string): boolean {
  if (!lastActiveDate) return false;
  return isYesterday(lastActiveDate, today);
}
