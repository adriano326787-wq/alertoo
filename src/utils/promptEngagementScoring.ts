/**
 * Lógica pura do score de engajamento com pop-ups — separada do I/O
 * (AsyncStorage/Firestore fica em src/services/promptEngagement.ts) para
 * ser testável sem mockar nada.
 */

export type PromptOutcome = 'confirmed' | 'reported' | 'dismissed' | 'ignored';

export const DEFAULT_ENGAGEMENT_SCORE = 50;
const MIN_SCORE = 0;
const MAX_SCORE = 100;

const DELTA: Record<PromptOutcome, number> = {
  confirmed: 10,
  reported: 10,
  dismissed: -2,
  ignored: -8,
};

/** Próximo score (0-100) a partir do resultado de uma interação com um pop-up. */
export function nextEngagementScore(current: number, outcome: PromptOutcome): number {
  const next = current + DELTA[outcome];
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, next));
}

/**
 * Multiplicador de cooldown — usuário muito engajado mantém o cooldown padrão;
 * usuário que sempre ignora vai sendo perguntado com cada vez menos frequência,
 * até um piso (não some completamente, só fica bem mais raro).
 */
export function cooldownMultiplier(score: number): number {
  if (score >= 70) return 1;
  if (score >= 40) return 1.5;
  if (score >= 20) return 3;
  return 6;
}

export function adaptiveCooldownMs(baseCooldownMs: number, score: number): number {
  return Math.round(baseCooldownMs * cooldownMultiplier(score));
}
