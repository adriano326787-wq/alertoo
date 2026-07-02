import { resolveCurrencyForCountry, isStripeOnlyCountry, formatPrice } from '../currency';

describe('resolveCurrencyForCountry', () => {
  it('Brasil cobra em BRL', () => {
    expect(resolveCurrencyForCountry('BR')).toBe('BRL');
    expect(resolveCurrencyForCountry('br')).toBe('BRL');
  });

  it('país ausente/vazio trata como Brasil (compatibilidade com usuários antigos)', () => {
    expect(resolveCurrencyForCountry(null)).toBe('BRL');
    expect(resolveCurrencyForCountry(undefined)).toBe('BRL');
    expect(resolveCurrencyForCountry('')).toBe('BRL');
  });

  it('outros países cobram em USD', () => {
    expect(resolveCurrencyForCountry('AR')).toBe('USD');
    expect(resolveCurrencyForCountry('CL')).toBe('USD');
    expect(resolveCurrencyForCountry('CO')).toBe('USD');
    expect(resolveCurrencyForCountry('PE')).toBe('USD');
    expect(resolveCurrencyForCountry('UY')).toBe('USD');
    expect(resolveCurrencyForCountry('US')).toBe('USD');
  });
});

describe('isStripeOnlyCountry', () => {
  it('Brasil não é stripe-only (tem Pix/MP)', () => {
    expect(isStripeOnlyCountry('BR')).toBe(false);
    expect(isStripeOnlyCountry(null)).toBe(false);
  });

  it('outros países são stripe-only', () => {
    expect(isStripeOnlyCountry('AR')).toBe(true);
  });
});

describe('formatPrice', () => {
  it('formata BRL com vírgula decimal', () => {
    expect(formatPrice(4.99, 'BRL')).toBe('R$ 4,99');
    expect(formatPrice(19.9, 'BRL')).toBe('R$ 19,90');
  });

  it('formata USD com ponto decimal', () => {
    expect(formatPrice(0.99, 'USD')).toBe('US$ 0.99');
    expect(formatPrice(11.99, 'USD')).toBe('US$ 11.99');
  });
});
