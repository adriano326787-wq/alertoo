export type SupportedCurrency = 'BRL' | 'USD';

/**
 * Resolve a moeda de cobrança a partir do país do usuário.
 * Brasil (ou país desconhecido/ausente — mantém o comportamento histórico
 * pra usuários já existentes sem countryCode salvo) cobra em BRL.
 * Qualquer outro país (AR/CL/CO/PE/UY etc.) cobra em USD via Stripe —
 * Mercado Pago e Pix são exclusivos do Brasil e não devem ser oferecidos.
 */
export function resolveCurrencyForCountry(countryCode: string | null | undefined): SupportedCurrency {
  const cc = (countryCode ?? '').trim().toUpperCase();
  return !cc || cc === 'BR' ? 'BRL' : 'USD';
}

/** true se o país só pode pagar via Stripe (Mercado Pago/Pix são Brasil-only). */
export function isStripeOnlyCountry(countryCode: string | null | undefined): boolean {
  return resolveCurrencyForCountry(countryCode) === 'USD';
}
