import { calcPackageCredits, PROMOTION_PRICING } from '../promotion';

describe('calcPackageCredits', () => {
  it('calcula créditos para tier bronze + pacote semana completa (2 créditos/semana)', () => {
    expect(calcPackageCredits('bronze', 'full', 1)).toBe(2);
    expect(calcPackageCredits('bronze', 'full', 3)).toBe(6);
  });

  it('calcula créditos para tier prata + dias úteis (3 créditos/semana)', () => {
    expect(calcPackageCredits('prata', 'weekdays', 2)).toBe(6);
  });

  it('calcula créditos para tier ouro + fim de semana (4 créditos/semana)', () => {
    expect(calcPackageCredits('ouro', 'weekend', 1)).toBe(4);
  });

  it('calcula créditos para pacote dia único em cada tier', () => {
    expect(calcPackageCredits('bronze', 'single', 1)).toBe(1);
    expect(calcPackageCredits('prata', 'single', 1)).toBe(1);
    expect(calcPackageCredits('ouro', 'single', 1)).toBe(2);
  });

  it('multiplica corretamente por número de semanas', () => {
    expect(calcPackageCredits('ouro', 'full', 4)).toBe(28); // 7 * 4
  });

  it('usa fallback de 1 crédito/semana para tier desconhecido', () => {
    expect(calcPackageCredits('inexistente', 'full', 2)).toBe(2); // 1 * 2
  });

  it('retorna 0 quando semanas é 0 (sem cobrança)', () => {
    expect(calcPackageCredits('ouro', 'full', 0)).toBe(0);
  });

  it('hierarquia de preço é consistente: ouro >= prata >= bronze em todos os pacotes', () => {
    for (const pkg of ['full', 'weekdays', 'weekend', 'single'] as const) {
      expect(PROMOTION_PRICING.ouro[pkg]).toBeGreaterThanOrEqual(PROMOTION_PRICING.prata[pkg]);
      expect(PROMOTION_PRICING.prata[pkg]).toBeGreaterThanOrEqual(PROMOTION_PRICING.bronze[pkg]);
    }
  });
});
