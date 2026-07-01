import { localDayKey, computeStreakUpdate, isStreakAtRisk, StreakState } from '../streakLogic';

describe('localDayKey', () => {
  it('formata como YYYY-MM-DD com zero-padding', () => {
    expect(localDayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(localDayKey(new Date(2026, 10, 22))).toBe('2026-11-22');
  });
});

const BASE: StreakState = { currentStreak: 0, longestStreak: 0, lastActiveDate: null };

describe('computeStreakUpdate', () => {
  it('primeira ação (nunca usou antes) começa o streak em 1', () => {
    const result = computeStreakUpdate(BASE, '2026-06-24');
    expect(result).toEqual({ currentStreak: 1, longestStreak: 1, lastActiveDate: '2026-06-24', changed: true });
  });

  it('ação no mesmo dia não muda nada (changed: false)', () => {
    const state: StreakState = { currentStreak: 3, longestStreak: 5, lastActiveDate: '2026-06-24' };
    const result = computeStreakUpdate(state, '2026-06-24');
    expect(result).toEqual({ ...state, changed: false });
  });

  it('ação no dia seguinte (consecutivo) incrementa o streak', () => {
    const state: StreakState = { currentStreak: 3, longestStreak: 5, lastActiveDate: '2026-06-24' };
    const result = computeStreakUpdate(state, '2026-06-25');
    expect(result.currentStreak).toBe(4);
    expect(result.changed).toBe(true);
  });

  it('atualiza longestStreak quando o streak atual supera o recorde', () => {
    const state: StreakState = { currentStreak: 5, longestStreak: 5, lastActiveDate: '2026-06-24' };
    const result = computeStreakUpdate(state, '2026-06-25');
    expect(result.currentStreak).toBe(6);
    expect(result.longestStreak).toBe(6);
  });

  it('mantém longestStreak quando o streak atual ainda não supera o recorde', () => {
    const state: StreakState = { currentStreak: 2, longestStreak: 10, lastActiveDate: '2026-06-24' };
    const result = computeStreakUpdate(state, '2026-06-25');
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(10);
  });

  it('pulou 1 dia ou mais (streak quebrado) reseta para 1', () => {
    const state: StreakState = { currentStreak: 7, longestStreak: 7, lastActiveDate: '2026-06-20' };
    const result = computeStreakUpdate(state, '2026-06-25'); // 5 dias depois
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(7); // recorde anterior preservado
  });

  it('lida corretamente com troca de mês (31/05 -> 01/06)', () => {
    const state: StreakState = { currentStreak: 4, longestStreak: 4, lastActiveDate: '2026-05-31' };
    const result = computeStreakUpdate(state, '2026-06-01');
    expect(result.currentStreak).toBe(5);
  });

  it('lida corretamente com troca de ano (31/12 -> 01/01)', () => {
    const state: StreakState = { currentStreak: 10, longestStreak: 10, lastActiveDate: '2025-12-31' };
    const result = computeStreakUpdate(state, '2026-01-01');
    expect(result.currentStreak).toBe(11);
  });
});

describe('isStreakAtRisk', () => {
  it('retorna true quando a última ação foi ontem (streak ativo, ainda não usado hoje)', () => {
    expect(isStreakAtRisk('2026-06-24', '2026-06-25')).toBe(true);
  });

  it('retorna false quando já usou hoje', () => {
    expect(isStreakAtRisk('2026-06-25', '2026-06-25')).toBe(false);
  });

  it('retorna false quando o streak já quebrou (mais de 1 dia sem usar)', () => {
    expect(isStreakAtRisk('2026-06-20', '2026-06-25')).toBe(false);
  });

  it('retorna false quando nunca usou (lastActiveDate null)', () => {
    expect(isStreakAtRisk(null, '2026-06-25')).toBe(false);
  });
});
