export type EntertainmentCategory = 'bar' | 'restaurant' | 'party' | 'show' | 'festival' | 'club' | 'cultural' | 'sports';

/**
 * TTL por categoria de entretenimento (em horas).
 *
 * Eventos de curta duração (show, party, club) expiram mais rápido
 * para manter o mapa limpo. Festivais duram mais. Bar/restaurante
 * exibem promoções/destaque do dia por ~36 h.
 *
 * Eventos promovidos têm expiresAt estendido até o fim da promoção
 * (ver promotionService.createPromotion).
 */
export const ENTERTAINMENT_TTL_HOURS: Record<EntertainmentCategory, number> = {
  show:       18, // noite do show + manhã seguinte
  party:      20, // noite da festa + início da manhã
  club:       20, // mesma lógica de party
  bar:        36, // destaque de hoje e amanhã
  restaurant: 36, // idem
  festival:   72, // cobre fins de semana completos
  cultural:   72, // exposições e eventos culturais duram o fim de semana
  sports:     48, // eventos esportivos — dia do jogo + dia seguinte
};

export interface EntertainmentEvent {
  id: string;
  category: EntertainmentCategory;
  title: string;
  description?: string;
  address?: string;
  link?: string;        // URL opcional fornecida pelo criador do evento
  latitude: number;
  longitude: number;
  createdAt: number;
  expiresAt: number;
  userId: string;
  likes: string[];       // array de userIds
  commentCount: number;
  stateUF?: string;
  cityName?: string;
  countryCode?: string; // ex: 'BR', 'US', 'PT'
  isFeatured?: boolean;           // legacy — não usado mais
  /** Foto opcional adicionada pelo criador (qualquer evento, não só promovido) */
  photoUrl?: string | null;
  promotionTier?: 'bronze' | 'prata' | 'ouro' | null;
  promotionEndDate?: number | null; // unix ms
  promotionPhotoUrl?: string | null;  // primeira foto (legacy + compatibilidade com pins/cards)
  promotionPhotoUrls?: string[] | null; // todas as fotos da promoção (bronze≤2, prata≤3, ouro≤5)
  /** Pacote de dias da semana (null = promoção avulsa, ativa todos os dias) */
  promotionPackage?: import('./promotion').PromotionPackageId | null;
  /** Semanas contratadas no pacote */
  promotionWeeks?: number | null;
  /** Dias ativos (0=Dom … 6=Sáb). Null = todos os dias */
  promotionActiveDays?: number[] | null;
  /** Contador de visualizações únicas do evento (#8) */
  viewCount?: number;
  /** Evento recorrente — exibe badge especial e pode ser re-publicado (#12) */
  isRecurring?: boolean;
  /** IDs dos usuários que confirmaram presença ("Vou lá") */
  attendees?: string[];
  /** Média de avaliações 1–5 estrelas */
  avgRating?: number;
  /** Quantidade de avaliações */
  ratingCount?: number;
  /** Última leitura de métricas de engajamento usada para notificar o criador */
  engagementSnapshot?: {
    viewCount: number;
    likeCount: number;
    commentCount: number;
    lastNotifiedAt: number; // unix ms
  };
}

export interface EventComment {
  id: string;
  eventId: string;
  userId: string;
  displayName: string;   // nome do usuário no momento do comentário
  text: string;
  createdAt: number;
}

export interface EntertainmentCategoryMeta {
  label: string;
  emoji: string;
  color: string;
}

export const ENTERTAINMENT_CATEGORIES: Record<EntertainmentCategory, EntertainmentCategoryMeta> = {
  bar:        { label: 'Bar',        emoji: '🍻', color: '#E65100' },
  restaurant: { label: 'Restaurante', emoji: '🍽️', color: '#2E7D32' },
  party:      { label: 'Festa',      emoji: '🎉', color: '#6A1B9A' },
  show:       { label: 'Show',       emoji: '🎸', color: '#1565C0' },
  festival:   { label: 'Festival',   emoji: '🎪', color: '#AD1457' },
  club:       { label: 'Balada',     emoji: '🪩', color: '#4527A0' },
  cultural:   { label: 'Cultural',   emoji: '🎭', color: '#00838F' },
  sports:     { label: 'Esportes',   emoji: '⚽', color: '#F9A825' }, // âmbar — distinto de restaurant (#2E7D32)
};
