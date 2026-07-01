import {
  nextEngagementScore,
  cooldownMultiplier,
  adaptiveCooldownMs,
  DEFAULT_ENGAGEMENT_SCORE,
} from '../promptEngagementScoring';

describe('nextEngagementScore', () => {
  it('aumenta o score em confirmação', () => {
    expect(nextEngagementScore(50, 'confirmed')).toBe(60);
  });

  it('aumenta o score igualmente ao reportar outra categoria', () => {
    expect(nextEngagementScore(50, 'reported')).toBe(60);
  });

  it('diminui pouco ao só fechar (dismissed)', () => {
    expect(nextEngagementScore(50, 'dismissed')).toBe(48);
  });

  it('diminui mais ao ignorar completamente (auto-dismiss)', () => {
    expect(nextEngagementScore(50, 'ignored')).toBe(42);
  });

  it('nunca passa de 100', () => {
    expect(nextEngagementScore(95, 'confirmed')).toBe(100);
  });

  it('nunca fica negativo', () => {
    expect(nextEngagementScore(3, 'ignored')).toBe(0);
  });

  it('score padrão inicial é neutro (50)', () => {
    expect(DEFAULT_ENGAGEMENT_SCORE).toBe(50);
  });
});

describe('cooldownMultiplier', () => {
  it('usuário muito engajado (>=70) mantém cooldown padrão (1x)', () => {
    expect(cooldownMultiplier(70)).toBe(1);
    expect(cooldownMultiplier(100)).toBe(1);
  });

  it('usuário neutro (40-69) tem cooldown 1.5x', () => {
    expect(cooldownMultiplier(40)).toBe(1.5);
    expect(cooldownMultiplier(69)).toBe(1.5);
  });

  it('usuário desengajado (20-39) tem cooldown 3x', () => {
    expect(cooldownMultiplier(20)).toBe(3);
    expect(cooldownMultiplier(39)).toBe(3);
  });

  it('usuário muito desengajado (<20) tem cooldown 6x, mas nunca infinito', () => {
    expect(cooldownMultiplier(0)).toBe(6);
    expect(Number.isFinite(cooldownMultiplier(0))).toBe(true);
  });
});

describe('adaptiveCooldownMs', () => {
  it('aplica o multiplicador sobre o cooldown base', () => {
    expect(adaptiveCooldownMs(5 * 60_000, 70)).toBe(5 * 60_000);
    expect(adaptiveCooldownMs(5 * 60_000, 0)).toBe(5 * 60_000 * 6);
  });
});
