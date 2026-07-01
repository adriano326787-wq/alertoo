import { deltaToZoom, getZoomTier } from '../mapZoom';

describe('deltaToZoom', () => {
  it('retorna zoom alto (~20) para delta muito pequeno (rua)', () => {
    const zoom = deltaToZoom(360 / Math.pow(2, 20));
    expect(zoom).toBe(20);
  });

  it('retorna zoom baixo (~0) para delta máximo (mundo)', () => {
    expect(deltaToZoom(360)).toBe(0);
  });

  it('é o inverso de "360 / 2^zoom" (round-trip)', () => {
    for (const zoom of [5, 10, 15, 18]) {
      const delta = 360 / Math.pow(2, zoom);
      expect(deltaToZoom(delta)).toBe(zoom);
    }
  });
});

describe('getZoomTier', () => {
  it('classifica como "distant" para zoom < 12', () => {
    expect(getZoomTier(360 / Math.pow(2, 5))).toBe('distant');
    expect(getZoomTier(360 / Math.pow(2, 11))).toBe('distant');
  });

  it('classifica como "medium" para zoom entre 12 e 14', () => {
    expect(getZoomTier(360 / Math.pow(2, 12))).toBe('medium');
    expect(getZoomTier(360 / Math.pow(2, 14))).toBe('medium');
  });

  it('classifica como "close" para zoom >= 15', () => {
    expect(getZoomTier(360 / Math.pow(2, 15))).toBe('close');
    expect(getZoomTier(360 / Math.pow(2, 20))).toBe('close');
  });
});
