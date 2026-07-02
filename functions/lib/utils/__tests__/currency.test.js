"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const currency_1 = require("../currency");
describe('resolveCurrencyForCountry', () => {
    it('Brasil e país ausente cobram em BRL', () => {
        expect((0, currency_1.resolveCurrencyForCountry)('BR')).toBe('BRL');
        expect((0, currency_1.resolveCurrencyForCountry)(null)).toBe('BRL');
        expect((0, currency_1.resolveCurrencyForCountry)(undefined)).toBe('BRL');
        expect((0, currency_1.resolveCurrencyForCountry)('')).toBe('BRL');
    });
    it('outros países cobram em USD', () => {
        expect((0, currency_1.resolveCurrencyForCountry)('AR')).toBe('USD');
        expect((0, currency_1.resolveCurrencyForCountry)('cl')).toBe('USD');
    });
});
describe('isStripeOnlyCountry', () => {
    it('Brasil pode usar Pix/MP (não é stripe-only)', () => {
        expect((0, currency_1.isStripeOnlyCountry)('BR')).toBe(false);
    });
    it('outros países só podem usar Stripe', () => {
        expect((0, currency_1.isStripeOnlyCountry)('PE')).toBe(true);
        expect((0, currency_1.isStripeOnlyCountry)('UY')).toBe(true);
    });
});
//# sourceMappingURL=currency.test.js.map