// ─── Pacotes de promoção por dias da semana ───────────────────────────────────

export type PromotionPackageId = 'full' | 'weekend' | 'weekdays' | 'single';

export interface PromotionPackage {
  id: PromotionPackageId;
  label: string;
  emoji: string;
  /** Dias ativos por padrão: 0=Dom, 1=Seg, ..., 6=Sáb. Vazio para 'single' (usuário escolhe). */
  defaultActiveDays: number[];
  description: string;
}

export const PROMOTION_PACKAGES: Record<PromotionPackageId, PromotionPackage> = {
  full: {
    id: 'full',
    label: 'Semana Completa',
    emoji: '📅',
    defaultActiveDays: [0, 1, 2, 3, 4, 5, 6],
    description: 'Todos os dias da semana',
  },
  weekdays: {
    id: 'weekdays',
    label: 'Dias Úteis',
    emoji: '💼',
    defaultActiveDays: [1, 2, 3, 4, 5],  // Seg–Sex
    description: 'Segunda a Sexta',
  },
  weekend: {
    id: 'weekend',
    label: 'Final de Semana',
    emoji: '🗓️',
    defaultActiveDays: [5, 6, 0],         // Sex, Sáb, Dom
    description: 'Sexta, Sábado e Domingo',
  },
  single: {
    id: 'single',
    label: 'Dia Único',
    emoji: '📌',
    defaultActiveDays: [],                // usuário seleciona 1 dia
    description: '1 dia à sua escolha',
  },
};

/** Dias da semana abreviados (0=Dom ... 6=Sáb) */
export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ─── Matriz de preços: créditos por semana (tier × pacote) ───────────────────
//
//  Tier \ Pacote  │ Semana Completa │ Dias Úteis │ Final de Semana │ Dia Único
//  ───────────────┼─────────────────┼────────────┼─────────────────┼──────────
//  Bronze  🥉     │       2         │     2      │        1        │    1
//  Prata   🥈     │       4         │     3      │        2        │    1
//  Ouro    🥇     │       7         │     5      │        4        │    2
//
//  Total = creditsPerWeek × semanas contratadas.

export const PROMOTION_PRICING: Record<string, Record<PromotionPackageId, number>> = {
  bronze: { full: 2, weekdays: 2, weekend: 1, single: 1 },
  prata:  { full: 4, weekdays: 3, weekend: 2, single: 1 },
  ouro:   { full: 7, weekdays: 5, weekend: 4, single: 2 },
};

/** Retorna os créditos totais para tier + pacote + semanas. */
export function calcPackageCredits(
  tier: string,
  packageId: PromotionPackageId,
  weeks: number,
): number {
  return (PROMOTION_PRICING[tier]?.[packageId] ?? 1) * weeks;
}

// ─── Tiers de promoção ───────────────────────────────────────────────────────
export type PromotionTier = 'bronze' | 'prata' | 'ouro';

export interface PromotionTierConfig {
  id: PromotionTier;
  label: string;
  emoji: string;
  creditsRequired: number;
  durationDays: number;
  pinColor: string;
  pinScale: number;       // multiplicador do tamanho do pin
  animated: boolean;      // pin pulsante (Ouro)
  showFeatured: boolean;  // seção destaque no topo da lista
  maxPhotos: number;      // quantas fotos o tier permite (bronze=2, prata=3, ouro=5)
  description: string[];  // lista de benefícios
}

export const PROMOTION_TIERS: Record<PromotionTier, PromotionTierConfig> = {
  bronze: {
    id: 'bronze',
    label: 'Bronze',
    emoji: '🥉',
    creditsRequired: 1,
    durationDays: 7,
    pinColor: '#CD7F32',
    pinScale: 1.2,
    animated: false,
    showFeatured: false,
    maxPhotos: 2,
    description: [
      'promo_bronze_desc_1',
      'promo_bronze_desc_2',
      'promo_bronze_desc_3',
    ],
  },
  prata: {
    id: 'prata',
    label: 'Prata',
    emoji: '🥈',
    creditsRequired: 2,
    durationDays: 14,
    pinColor: '#A8A9AD',
    pinScale: 1.4,
    animated: false,
    showFeatured: true,
    maxPhotos: 3,
    description: [
      'promo_prata_desc_1',
      'promo_prata_desc_2',
      'promo_prata_desc_3',
      'promo_prata_desc_4',
    ],
  },
  ouro: {
    id: 'ouro',
    label: 'Ouro',
    emoji: '🥇',
    creditsRequired: 3,
    durationDays: 30,
    pinColor: '#FFD700',
    pinScale: 1.6,
    animated: true,
    showFeatured: true,
    maxPhotos: 5,
    description: [
      'promo_ouro_desc_1',
      'promo_ouro_desc_2',
      'promo_ouro_desc_3',
      'promo_ouro_desc_4',
      'promo_ouro_desc_5',
    ],
  },
};

// ─── Pacotes de créditos ─────────────────────────────────────────────────────
export type CreditPackageId = 'pkg_1' | 'pkg_5' | 'pkg_10' | 'pkg_20';

export interface CreditPackage {
  id: CreditPackageId;
  credits: number;
  price: number;           // BRL — Mercado Pago/Pix (Brasil)
  priceUSD: number;        // USD — Stripe (fora do Brasil)
  label: string;
  highlight?: string;      // ex: "Mais popular"
  googleProductId: string; // ID no Google Play Billing
}

// priceUSD mantém a mesma proporção entre pacotes que o BRL (não é conversão
// cambial exata — são preços "redondos" comuns em compra dentro de app).
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pkg_1',
    credits: 1,
    price: 4.99,
    priceUSD: 0.99,
    label: '1 crédito',
    googleProductId: 'promo_credits_1',
  },
  {
    id: 'pkg_5',
    credits: 5,
    price: 19.99,
    priceUSD: 3.99,
    label: '5 créditos',
    googleProductId: 'promo_credits_5',
  },
  {
    id: 'pkg_10',
    credits: 10,
    price: 34.99,
    priceUSD: 6.99,
    label: '10 créditos',
    highlight: '⭐ Mais popular',
    googleProductId: 'promo_credits_10',
  },
  {
    id: 'pkg_20',
    credits: 20,
    price: 59.99,
    priceUSD: 11.99,
    label: '20 créditos',
    highlight: '🔥 Melhor valor',
    googleProductId: 'promo_credits_20',
  },
];

// ─── Documento de promoção ativa ─────────────────────────────────────────────
export interface ActivePromotion {
  id: string;
  eventId: string;
  userId: string;
  tier: PromotionTier;
  photoUrl: string | null;   // foto de destaque (Firebase Storage)
  startDate: number;         // unix ms
  endDate: number;           // unix ms
  status: 'active' | 'expired';
  creditsUsed: number;
  /** Pacote de dias — opcional (null = promoção avulsa sem restrição de dia) */
  packageId?: PromotionPackageId | null;
  /** Quantidade de semanas contratadas */
  weeks?: number | null;
  /** Dias ativos (0=Dom … 6=Sáb). Null = todos os dias (promoção avulsa) */
  activeDays?: number[] | null;
}

// ─── Compra de créditos ───────────────────────────────────────────────────────
export interface CreditPurchase {
  id: string;
  userId: string;
  packageId: CreditPackageId;
  credits: number;
  price: number;
  paymentMethod: 'mercadopago' | 'google_pay';
  paymentRef: string;       // ID da transação externa
  createdAt: number;
}
