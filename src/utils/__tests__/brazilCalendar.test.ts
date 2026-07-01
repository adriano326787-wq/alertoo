import { isHoliday, isHolidayEve } from '../brazilCalendar';

describe('isHoliday', () => {
  it('reconhece feriados fixos', () => {
    expect(isHoliday(new Date(2026, 0, 1))).toBe(true);  // Confraternização
    expect(isHoliday(new Date(2026, 3, 21))).toBe(true); // Tiradentes
    expect(isHoliday(new Date(2026, 4, 1))).toBe(true);  // Trabalho
    expect(isHoliday(new Date(2026, 8, 7))).toBe(true);  // Independência
    expect(isHoliday(new Date(2026, 9, 12))).toBe(true); // Aparecida
    expect(isHoliday(new Date(2026, 10, 2))).toBe(true); // Finados
    expect(isHoliday(new Date(2026, 10, 15))).toBe(true);// República
    expect(isHoliday(new Date(2026, 10, 20))).toBe(true);// Consciência Negra
    expect(isHoliday(new Date(2026, 11, 25))).toBe(true);// Natal
  });

  it('calcula corretamente o Carnaval (terça) de 2026 — 17/02', () => {
    expect(isHoliday(new Date(2026, 1, 17))).toBe(true);
  });

  it('calcula corretamente a Sexta-feira Santa de 2026 — 03/04', () => {
    expect(isHoliday(new Date(2026, 3, 3))).toBe(true);
  });

  it('calcula corretamente o Corpus Christi de 2026 — 04/06', () => {
    expect(isHoliday(new Date(2026, 5, 4))).toBe(true);
  });

  it('calcula o Carnaval de outro ano corretamente (2027 — 09/02)', () => {
    expect(isHoliday(new Date(2027, 1, 9))).toBe(true);
  });

  it('retorna false para um dia comum', () => {
    expect(isHoliday(new Date(2026, 5, 24))).toBe(false); // quarta qualquer
  });

  it('usa cache entre chamadas do mesmo ano sem afetar o resultado', () => {
    expect(isHoliday(new Date(2026, 0, 1))).toBe(true);
    expect(isHoliday(new Date(2026, 5, 15))).toBe(false);
    expect(isHoliday(new Date(2026, 11, 25))).toBe(true);
  });
});

describe('isHolidayEve', () => {
  it('reconhece a véspera de Natal', () => {
    expect(isHolidayEve(new Date(2026, 11, 24))).toBe(true);
  });

  it('reconhece a véspera de Ano Novo (31/12 é véspera de 01/01)', () => {
    expect(isHolidayEve(new Date(2026, 11, 31))).toBe(true);
  });

  it('retorna false dois dias antes de um feriado', () => {
    expect(isHolidayEve(new Date(2026, 11, 23))).toBe(false);
  });

  it('retorna false no próprio dia do feriado (não é véspera de si mesmo)', () => {
    expect(isHolidayEve(new Date(2026, 11, 25))).toBe(false);
  });
});
