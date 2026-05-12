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
  price: number;           // BRL
  label: string;
  highlight?: string;      // ex: "Mais popular"
  googleProductId: string; // ID no Google Play Billing
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pkg_1',
    credits: 1,
    price: 4.99,
    label: '1 crédito',
    googleProductId: 'promo_credits_1',
  },
  {
    id: 'pkg_5',
    credits: 5,
    price: 19.99,
    label: '5 créditos',
    googleProductId: 'promo_credits_5',
  },
  {
    id: 'pkg_10',
    credits: 10,
    price: 34.99,
    label: '10 créditos',
    highlight: '⭐ Mais popular',
    googleProductId: 'promo_credits_10',
  },
  {
    id: 'pkg_20',
    credits: 20,
    price: 59.99,
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
