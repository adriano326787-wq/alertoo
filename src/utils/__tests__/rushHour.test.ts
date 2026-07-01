import { isRushHour, isNightlifeWindow, isPayday } from '../rushHour';

describe('isRushHour', () => {
  it('retorna true na manhã de um dia de semana (8h, quarta)', () => {
    expect(isRushHour(new Date(2026, 5, 24, 8, 0))).toBe(true); // 24/06/2026 é quarta
  });

  it('retorna true no fim de tarde de um dia de semana (18h)', () => {
    expect(isRushHour(new Date(2026, 5, 24, 18, 30))).toBe(true);
  });

  it('retorna false fora das faixas de horário (meio-dia)', () => {
    expect(isRushHour(new Date(2026, 5, 24, 12, 0))).toBe(false);
  });

  it('retorna false no fim de semana mesmo no horário de rush', () => {
    expect(isRushHour(new Date(2026, 5, 27, 8, 0))).toBe(false); // sábado
    expect(isRushHour(new Date(2026, 5, 28, 18, 0))).toBe(false); // domingo
  });

  it('é exclusivo no limite superior (9h não é mais rush da manhã)', () => {
    expect(isRushHour(new Date(2026, 5, 24, 9, 0))).toBe(false);
  });
});

describe('isNightlifeWindow', () => {
  it('retorna true numa sexta à noite (23h)', () => {
    expect(isNightlifeWindow(new Date(2026, 5, 26, 23, 0))).toBe(true); // sexta
  });

  it('retorna true num sábado de madrugada (2h)', () => {
    expect(isNightlifeWindow(new Date(2026, 5, 27, 2, 0))).toBe(true); // sábado
  });

  it('retorna true numa madrugada de domingo (3h, saída de sábado)', () => {
    expect(isNightlifeWindow(new Date(2026, 5, 28, 3, 0))).toBe(true); // domingo
  });

  it('retorna false numa terça à noite', () => {
    expect(isNightlifeWindow(new Date(2026, 5, 23, 23, 0))).toBe(false); // terça
  });

  it('retorna false durante o dia numa sexta', () => {
    expect(isNightlifeWindow(new Date(2026, 5, 26, 15, 0))).toBe(false);
  });
});

describe('isPayday', () => {
  it('retorna true nos dias 5 e 20', () => {
    expect(isPayday(new Date(2026, 5, 5))).toBe(true);
    expect(isPayday(new Date(2026, 5, 20))).toBe(true);
  });

  it('retorna false em outros dias', () => {
    expect(isPayday(new Date(2026, 5, 6))).toBe(false);
    expect(isPayday(new Date(2026, 5, 19))).toBe(false);
    expect(isPayday(new Date(2026, 5, 1))).toBe(false);
  });
});
