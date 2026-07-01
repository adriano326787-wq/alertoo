import { formatDistance } from '../distance';

describe('formatDistance', () => {
  it('formata distâncias abaixo de 1km em metros', () => {
    expect(formatDistance(0.35)).toBe('350 m');
    expect(formatDistance(0.05)).toBe('50 m');
  });

  it('arredonda metros para o inteiro mais próximo', () => {
    expect(formatDistance(0.1234)).toBe('123 m');
  });

  it('formata distâncias entre 1 e 10km com 1 decimal e vírgula (pt-BR)', () => {
    expect(formatDistance(2.3)).toBe('2,3 km');
    expect(formatDistance(1)).toBe('1,0 km');
    expect(formatDistance(9.99)).toBe('10,0 km');
  });

  it('formata distâncias de 10km ou mais como inteiro, sem decimal', () => {
    expect(formatDistance(10)).toBe('10 km');
    expect(formatDistance(18.4)).toBe('18 km');
    expect(formatDistance(123.6)).toBe('124 km');
  });

  it('trata 0 como metros', () => {
    expect(formatDistance(0)).toBe('0 m');
  });
});
