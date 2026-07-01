/**
 * Feriados nacionais brasileiros + heurísticas de calendário, usados pelo
 * motor de scoring de contexto (contextScoring.ts) para a hipótese de
 * Lei Seca/Blitz (mais fiscalização em véspera/feriado e quinzena de pagamento).
 *
 * Calcula tudo via matemática de data (sem Firestore, sem API, sem tabela
 * que precise de manutenção anual) — inclusive feriados móveis (Carnaval,
 * Sexta-feira Santa, Corpus Christi), derivados da Páscoa.
 */

/** Domingo de Páscoa do ano (algoritmo de Gauss/anônimo gregoriano). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=março, 4=abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const _holidaysCache = new Map<number, Set<string>>();

/** Feriados nacionais fixos + móveis do ano informado (cacheado em memória por ano). */
function holidaysForYear(year: number): Set<string> {
  let cached = _holidaysCache.get(year);
  if (cached) return cached;

  const easter = easterSunday(year);
  const dates = [
    new Date(year, 0, 1),               // Confraternização Universal
    addDays(easter, -47),                // Carnaval (terça) — segunda também costuma ter ponto facultativo, mas contamos só a terça como feriado nacional
    addDays(easter, -2),                 // Sexta-feira Santa
    addDays(easter, 60),                 // Corpus Christi (ponto facultativo na maioria dos estados — incluído por relevância de movimento)
    new Date(year, 3, 21),                // Tiradentes
    new Date(year, 4, 1),                 // Dia do Trabalho
    new Date(year, 8, 7),                 // Independência
    new Date(year, 9, 12),                // Nossa Senhora Aparecida
    new Date(year, 10, 2),                // Finados
    new Date(year, 10, 15),               // Proclamação da República
    new Date(year, 10, 20),               // Consciência Negra (feriado nacional desde 2024)
    new Date(year, 11, 25),               // Natal
  ];

  cached = new Set(dates.map(dateKey));
  _holidaysCache.set(year, cached);
  return cached;
}

export function isHoliday(date: Date = new Date()): boolean {
  return holidaysForYear(date.getFullYear()).has(dateKey(date));
}

/** true se a data informada for a véspera de algum feriado nacional. */
export function isHolidayEve(date: Date = new Date()): boolean {
  return isHoliday(addDays(date, 1));
}
