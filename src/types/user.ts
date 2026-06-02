export type RankId = 'iniciante' | 'explorador' | 'colaborador' | 'especialista' | 'mestre';

export interface RankInfo {
  id: RankId;
  label: string;
  emoji: string;
  color: string;
  minPoints: number;
}

export const RANKS: RankInfo[] = [
  { id: 'iniciante',   label: 'Iniciante',   emoji: '🌱', color: '#78909C', minPoints: 0 },
  { id: 'explorador',  label: 'Explorador',  emoji: '🔭', color: '#42A5F5', minPoints: 100 },
  { id: 'colaborador', label: 'Colaborador', emoji: '⭐', color: '#FFA726', minPoints: 300 },
  { id: 'especialista',label: 'Especialista',emoji: '🏆', color: '#EF5350', minPoints: 700 },
  { id: 'mestre',      label: 'Mestre',      emoji: '👑', color: '#AB47BC', minPoints: 1500 },
];

export function getRank(points: number): RankInfo {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (points >= RANKS[i].minPoints) return RANKS[i];
  }
  return RANKS[0];
}

export function getNextRank(points: number): RankInfo | null {
  for (const rank of RANKS) {
    if (points < rank.minPoints) return rank;
  }
  return null;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  photoURL?: string | null;
  points: number;
  eventsReported: number;
  commentsPosted: number;
  createdAt: number;
  promotionCredits?: number; // #8 — real-time credits from Firestore
}

export const POINTS = {
  ROAD_EVENT_CREATED: 10,
  ENTERTAINMENT_EVENT_CREATED: 8,
  CONFIRMATION_RECEIVED: 5,
  DENIAL_RECEIVED: -2,
  LIKE_RECEIVED: 2,
  COMMENT_POSTED: 3,
} as const;
