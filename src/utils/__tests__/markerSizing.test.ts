import { hitPadding, MIN_HIT_SIZE } from '../markerSizing';

describe('hitPadding', () => {
  it('retorna 0 quando o pin já atinge o tamanho mínimo de toque', () => {
    expect(hitPadding(MIN_HIT_SIZE)).toBe(0);
  });

  it('retorna 0 para pins maiores que o mínimo', () => {
    expect(hitPadding(MIN_HIT_SIZE + 20)).toBe(0);
  });

  it('calcula o padding necessário para pins menores que o mínimo', () => {
    // pin de 36px precisa de (52-36)/2 = 8px de padding de cada lado
    expect(hitPadding(36)).toBe(8);
  });

  it('arredonda para cima quando a diferença é ímpar', () => {
    // (52-37)/2 = 7.5 → arredonda para 8
    expect(hitPadding(37)).toBe(8);
  });

  it('garante que (visibleSize + padding*2) >= MIN_HIT_SIZE para qualquer tamanho', () => {
    for (const size of [10, 24, 36, 44, 51, 52, 60]) {
      const padding = hitPadding(size);
      expect(size + padding * 2).toBeGreaterThanOrEqual(MIN_HIT_SIZE);
    }
  });
});
