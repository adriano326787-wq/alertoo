import { resolveCurrencyForCountry, isStripeOnlyCountry } from '../currency';

describe('resolveCurrencyForCountry', () => {
  it('Brasil e país ausente cobram em BRL', () => {
    expect(resolveCurrencyForCountry('BR')).toBe('BRL');
    expect(resolveCurrencyForCountry(null)).toBe('BRL');
    expect(resolveCurrencyForCountry(undefined)).toBe('BRL');
    expect(resolveCurrencyForCountry('')).toBe('BRL');
  });

  it('outros países cobram em USD', () => {
    expect(resolveCurrencyForCountry('AR')).toBe('USD');
    expect(resolveCurrencyForCountry('cl')).toBe('USD');
  });
});

describe('isStripeOnlyCountry', () => {
  it('Brasil pode usar Pix/MP (não é stripe-only)', () => {
    expect(isStripeOnlyCountry('BR')).toBe(false);
  });

  it('outros países só podem usar Stripe', () => {
    expect(isStripeOnlyCountry('PE')).toBe(true);
    expect(isStripeOnlyCountry('UY')).toBe(true);
  });
});
