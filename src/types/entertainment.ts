export type EntertainmentCategory = 'bar' | 'restaurant' | 'party' | 'show' | 'festival' | 'club';

export const ENTERTAINMENT_TTL_HOURS = 4;

export interface EntertainmentEvent {
  id: string;
  category: EntertainmentCategory;
  title: string;
  description?: string;
  address?: string;
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
  isFeatured?: boolean; // destaque pago — aparece fixado no topo
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
};
