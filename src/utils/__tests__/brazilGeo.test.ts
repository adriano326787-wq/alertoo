import { resolveStateUF, resolveRegion, getStateByUF, getStateCentroid, BRAZIL_UFS, BRAZIL_STATES } from '../brazilGeo';

describe('resolveStateUF', () => {
  it('retorna undefined para entrada vazia/nula', () => {
    expect(resolveStateUF(null)).toBeUndefined();
    expect(resolveStateUF(undefined)).toBeUndefined();
    expect(resolveStateUF('')).toBeUndefined();
  });

  it('aceita sigla de 2 letras e normaliza para maiúsculas', () => {
    expect(resolveStateUF('rj')).toBe('RJ');
    expect(resolveStateUF('SP')).toBe('SP');
  });

  it('resolve nome completo do estado (case-insensitive)', () => {
    expect(resolveStateUF('Rio de Janeiro')).toBe('RJ');
    expect(resolveStateUF('rio de janeiro')).toBe('RJ');
    expect(resolveStateUF('Acre')).toBe('AC');
  });

  it('resolve variações com e sem acento via STATE_ALIASES', () => {
    expect(resolveStateUF('Espírito Santo')).toBe('ES');
    expect(resolveStateUF('Espirito Santo')).toBe('ES');
    expect(resolveStateUF('Pará')).toBe('PA');
    expect(resolveStateUF('Para')).toBe('PA');
  });

  it('retorna undefined para texto desconhecido', () => {
    expect(resolveStateUF('Narnia')).toBeUndefined();
  });

  it('ignora espaços nas pontas', () => {
    expect(resolveStateUF('  Bahia  ')).toBe('BA');
  });
});

describe('resolveRegion', () => {
  it('Brasil: delega para resolveStateUF (sigla UF)', () => {
    expect(resolveRegion('São Paulo', 'BR')).toBe('SP');
    expect(resolveRegion('rj', 'BR')).toBe('RJ');
    expect(resolveRegion('Narnia', 'BR')).toBeUndefined();
  });

  it('país ausente: trata como Brasil (compatibilidade)', () => {
    expect(resolveRegion('Bahia')).toBe('BA');
    expect(resolveRegion('Bahia', null)).toBe('BA');
    expect(resolveRegion('Bahia', '')).toBe('BA');
  });

  it('outros países: usa o nome da região como identificador estável', () => {
    expect(resolveRegion('Buenos Aires', 'AR')).toBe('Buenos Aires');
    expect(resolveRegion('Región Metropolitana', 'CL')).toBe('Región Metropolitana');
    expect(resolveRegion('Antioquia', 'CO')).toBe('Antioquia');
    expect(resolveRegion('Lima', 'PE')).toBe('Lima');
    expect(resolveRegion('Montevideo', 'UY')).toBe('Montevideo');
  });

  it('outros países: normaliza espaços internos e nas pontas', () => {
    expect(resolveRegion('  Buenos   Aires  ', 'AR')).toBe('Buenos Aires');
  });

  it('outros países: o mesmo lugar gera o mesmo id (criação == detecção)', () => {
    const naCriacao = resolveRegion('Córdoba', 'AR');
    const naDeteccao = resolveRegion('Córdoba', 'ar'); // countryCode case-insensitive
    expect(naCriacao).toBe(naDeteccao);
  });

  it('entrada vazia/curta retorna undefined', () => {
    expect(resolveRegion(null, 'AR')).toBeUndefined();
    expect(resolveRegion('', 'AR')).toBeUndefined();
    expect(resolveRegion('x', 'AR')).toBeUndefined();
  });
});

describe('getStateByUF', () => {
  it('encontra o estado pela sigla', () => {
    expect(getStateByUF('RJ')?.name).toBe('Rio de Janeiro');
  });

  it('retorna undefined para sigla inexistente', () => {
    expect(getStateByUF('XX')).toBeUndefined();
  });

  it('cobre todas as 27 UFs do Brasil', () => {
    expect(BRAZIL_UFS).toHaveLength(27);
    expect(new Set(BRAZIL_UFS).size).toBe(27); // sem duplicatas
  });
});

describe('getStateCentroid', () => {
  it('retorna undefined para UF inexistente', () => {
    expect(getStateCentroid('XX')).toBeUndefined();
  });

  it('calcula a média das coordenadas das cidades cadastradas', () => {
    const centroid = getStateCentroid('RR'); // Roraima tem só 1 cidade (Boa Vista)
    const roraima = BRAZIL_STATES.find((s) => s.uf === 'RR')!;
    expect(centroid).toEqual({
      latitude: roraima.cities[0].latitude,
      longitude: roraima.cities[0].longitude,
    });
  });

  it('retorna coordenadas plausíveis para o Brasil (latitude/longitude no range)', () => {
    for (const uf of BRAZIL_UFS) {
      const centroid = getStateCentroid(uf);
      expect(centroid).toBeDefined();
      expect(centroid!.latitude).toBeGreaterThanOrEqual(-35);
      expect(centroid!.latitude).toBeLessThanOrEqual(6);
      expect(centroid!.longitude).toBeGreaterThanOrEqual(-75);
      expect(centroid!.longitude).toBeLessThanOrEqual(-28);
    }
  });
});
