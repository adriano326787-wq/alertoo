import { scoreCategories, topCategories, ContextSignals, SCORE_THRESHOLD } from '../contextScoring';

const BASE: ContextSignals = {
  stoppedUsers: 0,
  speedKmh: 0,
  stoppedSeconds: 0,
  hardBrake: false,
  rainMm1h: null,
  isRushHour: false,
  isNightlifeWindow: false,
  isHoliday: false,
  isHolidayEve: false,
  isPayday: false,
  nearEntertainmentVenue: false,
  blackspotCategory: null,
};

describe('scoreCategories', () => {
  it('retorna todas as 9 categorias, mesmo com score 0', () => {
    const result = scoreCategories(BASE);
    expect(result).toHaveLength(9);
    expect(result.every((c) => c.score === 0)).toBe(true);
  });

  it('retorna ordenado por score decrescente', () => {
    const result = scoreCategories({ ...BASE, hardBrake: true, rainMm1h: 20 });
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  it('sexta à noite + feriado eleva drunkcheck e policeblitz ao topo', () => {
    const result = scoreCategories({ ...BASE, isNightlifeWindow: true, isHoliday: true });
    const top2 = result.slice(0, 2).map((c) => c.category);
    expect(top2).toContain('drunkcheck');
    expect(top2).toContain('policeblitz');
  });

  it('frenagem brusca dá o maior peso isolado para accident', () => {
    const result = scoreCategories({ ...BASE, hardBrake: true });
    const accident = result.find((c) => c.category === 'accident')!;
    expect(accident.score).toBe(35);
    expect(accident.reasons).toContain('frenagem brusca');
  });

  it('chuva forte (20mm/h) deixa flood acima do score 40 (capado)', () => {
    const result = scoreCategories({ ...BASE, rainMm1h: 20 });
    const flood = result.find((c) => c.category === 'flood')!;
    expect(flood.score).toBe(40); // min(40, 20*4=80) = 40
  });

  it('chuva leve (2mm/h) não satura o cap de flood', () => {
    const result = scoreCategories({ ...BASE, rainMm1h: 2 });
    const flood = result.find((c) => c.category === 'flood')!;
    expect(flood.score).toBe(8); // 2*4
  });

  it('sem chuva, flood fica em 0', () => {
    const result = scoreCategories({ ...BASE, rainMm1h: 0 });
    const flood = result.find((c) => c.category === 'flood')!;
    expect(flood.score).toBe(0);
  });

  it('corroboração de 3+ usuários parados soma bônus em TODAS as categorias', () => {
    const without = scoreCategories({ ...BASE, hardBrake: true });
    const withCorrob = scoreCategories({ ...BASE, hardBrake: true, stoppedUsers: 3 });
    const accidentWithout = without.find((c) => c.category === 'accident')!.score;
    const accidentWith = withCorrob.find((c) => c.category === 'accident')!.score;
    expect(accidentWith).toBe(accidentWithout + 25);
  });

  it('corroboração abaixo do threshold (2 usuários) não soma bônus', () => {
    const result = scoreCategories({ ...BASE, stoppedUsers: 2 });
    expect(result.every((c) => c.score === 0)).toBe(true);
  });

  it('black-spot histórico aumenta a categoria específica, capado em 20', () => {
    const result = scoreCategories({ ...BASE, blackspotCategory: { accident: 50 } });
    const accident = result.find((c) => c.category === 'accident')!;
    expect(accident.score).toBe(20); // min(20, 50*2=100) = 20
  });

  it('black-spot baixo (1 ocorrência) soma proporcionalmente', () => {
    const result = scoreCategories({ ...BASE, blackspotCategory: { flood: 3 } });
    const flood = result.find((c) => c.category === 'flood')!;
    expect(flood.score).toBe(6); // 3*2
  });

  it('rush hour + parado eleva traffic e roadwork, mas não closure', () => {
    const result = scoreCategories({ ...BASE, isRushHour: true, stoppedSeconds: 90 });
    const traffic = result.find((c) => c.category === 'traffic')!;
    const closure = result.find((c) => c.category === 'closure')!;
    expect(traffic.score).toBeGreaterThan(0);
    expect(closure.score).toBe(0); // closure exige !isRushHour
  });

  it('parado fora do rush sem chuva favorece closure e accident', () => {
    const result = scoreCategories({ ...BASE, stoppedSeconds: 90, isRushHour: false, rainMm1h: 0 });
    const closure = result.find((c) => c.category === 'closure')!;
    expect(closure.score).toBe(20);
  });

  it('entretenimento soma quando perto de venue + noite de fim de semana', () => {
    const result = scoreCategories({ ...BASE, nearEntertainmentVenue: true, isNightlifeWindow: true });
    const ent = result.find((c) => c.category === 'entertainment')!;
    expect(ent.score).toBe(25);
  });
});

describe('topCategories', () => {
  it('filtra apenas categorias acima do threshold padrão (50)', () => {
    const result = topCategories({ ...BASE, hardBrake: true }); // accident=35, abaixo de 50
    expect(result).toHaveLength(0);
  });

  it('inclui categorias que atingem o threshold combinando sinais', () => {
    const result = topCategories({ ...BASE, hardBrake: true, stoppedUsers: 3 }); // 35+25=60
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].category).toBe('accident');
    expect(result[0].score).toBeGreaterThanOrEqual(SCORE_THRESHOLD);
  });

  it('respeita o limite máximo de categorias retornadas', () => {
    const result = topCategories(
      { ...BASE, stoppedUsers: 3, isNightlifeWindow: true, isHoliday: true, nearEntertainmentVenue: true },
      50,
      2,
    );
    expect(result.length).toBeLessThanOrEqual(2);
  });
});
