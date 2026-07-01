/**
 * Motor de decisão do Context Signal Engine — combina os sinais coletados
 * (velocidade/parada, frenagem, chuva, corroboração multi-usuário, horário,
 * calendário, black-spot histórico) e decide QUAL categoria sugerir no
 * próximo pop-up de reporte, em vez da lista fixa de botões que existia em
 * TrafficDetectionPrompt.
 *
 * Função pura — não lê Firestore, não sabe de GPS. Quem chama monta o objeto
 * ContextSignals (MapScreen / hooks) a partir do que já está disponível.
 */

import { EventCategory } from '../types';

export type ScoredCategory = EventCategory | 'entertainment';

export interface ContextSignals {
  /** Quantos usuários distintos pararam/reduziram na mesma célula geográfica nos últimos minutos. */
  stoppedUsers: number;
  /** Velocidade atual do usuário (km/h). */
  speedKmh: number;
  /** Há quantos segundos o usuário está parado (0 se não está parado). */
  stoppedSeconds: number;
  /** Frenagem brusca detectada via acelerômetro nos últimos segundos. */
  hardBrake: boolean;
  /** Chuva na última 1h, em mm — null se não há dado de clima disponível. */
  rainMm1h: number | null;
  /** Horário de rush (7-9h/17-19h, dia de semana) — ver utils/rushHour.ts */
  isRushHour: boolean;
  /** Janela de vida noturna (sex/sáb noite, madrugada de domingo) — ver utils/rushHour.ts */
  isNightlifeWindow: boolean;
  /** Feriado nacional — ver utils/brazilCalendar.ts */
  isHoliday: boolean;
  /** Véspera de feriado nacional */
  isHolidayEve: boolean;
  /** Dia 5 ou 20 (quinzena de pagamento) */
  isPayday: boolean;
  /** Próximo a um local com tag de entretenimento (bar/balada/casa de show) */
  nearEntertainmentVenue: boolean;
  /** Contagem histórica de reports confirmados por categoria nesse ponto (últimos 90 dias), se disponível */
  blackspotCategory: Partial<Record<ScoredCategory, number>> | null;
}

export interface CategoryScore {
  category: ScoredCategory;
  score: number;
  /** Motivos que contribuíram para o score — útil pra UI/debug, não obrigatório usar */
  reasons: string[];
}

const CORROBORATION_BONUS = 25;
const CORROBORATION_THRESHOLD = 3;
const BLACKSPOT_MAX_BONUS = 20;

/** Bônus de black-spot: escala suavemente, capado, pra não deixar 1 categoria sempre dominante num ponto com muito histórico. */
function blackspotBonus(blackspot: ContextSignals['blackspotCategory'], category: ScoredCategory): number {
  const count = blackspot?.[category] ?? 0;
  if (count <= 0) return 0;
  return Math.min(BLACKSPOT_MAX_BONUS, count * 2);
}

/**
 * Calcula o score de cada categoria a partir dos sinais de contexto.
 * Retorna ordenado por score decrescente — o chamador decide o threshold
 * mínimo pra exibir pop-up (recomendado: 50) e quantas opções mostrar.
 */
export function scoreCategories(s: ContextSignals): CategoryScore[] {
  const corroboration = s.stoppedUsers >= CORROBORATION_THRESHOLD ? CORROBORATION_BONUS : 0;
  const rain = s.rainMm1h ?? 0;

  const entries: CategoryScore[] = [
    {
      category: 'drunkcheck',
      score: 0,
      reasons: [],
    },
    { category: 'policeblitz', score: 0, reasons: [] },
    { category: 'accident', score: 0, reasons: [] },
    { category: 'hazard', score: 0, reasons: [] },
    { category: 'flood', score: 0, reasons: [] },
    { category: 'closure', score: 0, reasons: [] },
    { category: 'roadwork', score: 0, reasons: [] },
    { category: 'traffic', score: 0, reasons: [] },
    { category: 'entertainment', score: 0, reasons: [] },
  ];

  const byCat: Record<ScoredCategory, CategoryScore> = Object.fromEntries(
    entries.map((e) => [e.category, e])
  ) as Record<ScoredCategory, CategoryScore>;

  function add(category: ScoredCategory, points: number, reason: string) {
    if (points <= 0) return;
    byCat[category].score += points;
    byCat[category].reasons.push(reason);
  }

  // ── Lei Seca ────────────────────────────────────────────────────────────
  if (s.isHoliday || s.isHolidayEve) add('drunkcheck', 30, 'feriado/véspera');
  if (s.isNightlifeWindow) add('drunkcheck', 25, 'janela de vida noturna');
  if (s.isPayday) add('drunkcheck', 10, 'quinzena de pagamento');
  if (s.nearEntertainmentVenue) add('drunkcheck', 15, 'próximo a área de bares/baladas');

  // ── Blitz policial (mais ampla que Lei Seca, sem exigir álcool) ──────────
  if (s.isNightlifeWindow) add('policeblitz', 15, 'janela de vida noturna');
  if (s.isHoliday || s.isHolidayEve) add('policeblitz', 15, 'feriado/véspera');
  if (s.stoppedSeconds > 60 && !s.isRushHour) add('policeblitz', 10, 'parado fora do rush');

  // ── Acidente ──────────────────────────────────────────────────────────────
  if (s.hardBrake) add('accident', 35, 'frenagem brusca');
  if (s.stoppedSeconds > 60 && !s.isRushHour) add('accident', 20, 'parado fora do horário de rush');
  if (rain > 10) add('accident', 15, 'pista molhada (chuva > 10mm/h)');

  // ── Perigo na via ─────────────────────────────────────────────────────────
  if (rain > 15) add('hazard', 20, 'chuva forte (visibilidade)');
  if (s.hardBrake) add('hazard', 10, 'frenagem/desvio brusco');

  // ── Alagamento ────────────────────────────────────────────────────────────
  if (rain > 0) add('flood', Math.min(40, rain * 4), `chuva de ${rain}mm/h`);

  // ── Interdição ────────────────────────────────────────────────────────────
  if (s.stoppedSeconds > 60 && !s.isRushHour && rain < 2) {
    add('closure', 20, 'parado fora do rush, sem chuva relevante');
  }

  // ── Obras ─────────────────────────────────────────────────────────────────
  if (s.stoppedSeconds > 60 && s.isRushHour) add('roadwork', 10, 'parado durante o rush (baseline)');

  // ── Congestionamento ──────────────────────────────────────────────────────
  if (s.isRushHour && (s.stoppedSeconds > 0 || (s.speedKmh > 0 && s.speedKmh < 15))) {
    add('traffic', 25, 'lento/parado durante o rush');
  }

  // ── Entretenimento ────────────────────────────────────────────────────────
  if (s.nearEntertainmentVenue && s.isNightlifeWindow) add('entertainment', 25, 'área de entretenimento + horário noturno de fim de semana');
  if (s.nearEntertainmentVenue && s.speedKmh > 0 && s.speedKmh < 10) add('entertainment', 15, 'velocidade baixa perto de local de entretenimento (pode estar estacionando/chegando)');

  // ── Bônus universais (aplicados a todas as categorias) ───────────────────
  for (const entry of entries) {
    if (corroboration > 0) add(entry.category, corroboration, `${s.stoppedUsers} usuários pararam no mesmo ponto`);
    const bb = blackspotBonus(s.blackspotCategory, entry.category);
    if (bb > 0) add(entry.category, bb, 'histórico de reports nesse ponto');
  }

  return entries.sort((a, b) => b.score - a.score);
}

/** Threshold mínimo recomendado para considerar a hipótese forte o bastante pra interromper o usuário com um pop-up. */
export const SCORE_THRESHOLD = 50;

/** Retorna só as categorias acima do threshold, já ordenadas — pronto para alimentar os botões da UI. */
export function topCategories(s: ContextSignals, threshold = SCORE_THRESHOLD, max = 4): CategoryScore[] {
  return scoreCategories(s).filter((c) => c.score >= threshold).slice(0, max);
}
