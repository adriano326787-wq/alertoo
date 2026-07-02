export type SupportedCurrency = 'BRL' | 'USD';

/**
 * Resolve a moeda de cobrança a partir do país do usuário (mesma lógica do
 * servidor em functions/src/utils/currency.ts — duplicada de propósito,
 * client e Cloud Functions são bundles separados). Brasil (ou país
 * desconhecido — usuário ainda sem detecção de GPS) cobra em BRL; qualquer
 * outro país cobra em USD via Stripe.
 */
export function resolveCurrencyForCountry(countryCode: string | null | undefined): SupportedCurrency {
  const cc = (countryCode ?? '').trim().toUpperCase();
  return !cc || cc === 'BR' ? 'BRL' : 'USD';
}

/** true se o país só pode pagar via Stripe (Mercado Pago/Pix são Brasil-only). */
export function isStripeOnlyCountry(countryCode: string | null | undefined): boolean {
  return resolveCurrencyForCountry(countryCode) === 'USD';
}

const CURRENCY_SYMBOL: Record<SupportedCurrency, string> = { BRL: 'R$', USD: 'US$' };

/** Formata um preço com o símbolo da moeda (ex: "R$ 4,99" ou "US$ 0.99"). */
export function formatPrice(price: number, currency: SupportedCurrency): string {
  const decimals = currency === 'BRL' ? price.toFixed(2).replace('.', ',') : price.toFixed(2);
  return `${CURRENCY_SYMBOL[currency]} ${decimals}`;
}
