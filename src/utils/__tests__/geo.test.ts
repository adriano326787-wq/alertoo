import { haversineDistance, bearing, angleDiff } from '../geo';

describe('haversineDistance', () => {
  it('retorna 0 para o mesmo ponto', () => {
    expect(haversineDistance(-22.9068, -43.1729, -22.9068, -43.1729)).toBeCloseTo(0, 5);
  });

  it('calcula a distância aproximada entre Rio de Janeiro e São Paulo (~360km)', () => {
    const km = haversineDistance(-22.9068, -43.1729, -23.5505, -46.6333);
    expect(km).toBeGreaterThan(340);
    expect(km).toBeLessThan(380);
  });

  it('é simétrica (A→B === B→A)', () => {
    const ab = haversineDistance(-22.9068, -43.1729, -23.5505, -46.6333);
    const ba = haversineDistance(-23.5505, -46.6333, -22.9068, -43.1729);
    expect(ab).toBeCloseTo(ba, 10);
  });

  it('calcula distâncias curtas corretamente (~1.1km)', () => {
    // ~0.01 grau de latitude ≈ 1.11km
    const km = haversineDistance(-22.9068, -43.1729, -22.9168, -43.1729);
    expect(km).toBeCloseTo(1.11, 1);
  });
});

describe('bearing', () => {
  it('retorna ~0 (Norte) quando o destino está diretamente ao norte', () => {
    const deg = bearing(-22.90, -43.17, -22.80, -43.17);
    expect(deg).toBeCloseTo(0, 0);
  });

  it('retorna ~180 (Sul) quando o destino está diretamente ao sul', () => {
    const deg = bearing(-22.80, -43.17, -22.90, -43.17);
    expect(deg).toBeCloseTo(180, 0);
  });

  it('retorna valor entre 0 e 360', () => {
    const deg = bearing(-22.9068, -43.1729, -23.5505, -46.6333);
    expect(deg).toBeGreaterThanOrEqual(0);
    expect(deg).toBeLessThan(360);
  });
});

describe('angleDiff', () => {
  it('retorna 0 para ângulos iguais', () => {
    expect(angleDiff(90, 90)).toBe(0);
  });

  it('calcula a menor diferença sem cruzar 0/360', () => {
    expect(angleDiff(10, 30)).toBe(20);
  });

  it('calcula a menor diferença cruzando 0/360 (350 vs 10 = 20, não 340)', () => {
    expect(angleDiff(350, 10)).toBe(20);
  });

  it('nunca retorna mais que 180', () => {
    expect(angleDiff(0, 180)).toBe(180);
    expect(angleDiff(0, 200)).toBeLessThanOrEqual(180);
  });
});
