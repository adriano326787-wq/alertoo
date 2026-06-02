/**
 * badgesService — define e calcula conquistas do usuário.
 *
 * Badges são calculados puramente a partir do perfil local (sem round-trip
 * ao Firestore), portanto são instantâneos e funcionam offline.
 */

export interface Badge {
  id: string;
  emoji: string;
  label: string;
  description: string;
  unlocked: boolean;
}

interface BadgeInput {
  eventsReported: number;
  commentsPosted: number;
  points: number;
  favoritesCount: number;
}

const BADGE_DEFS: Array<{
  id: string;
  emoji: string;
  label: string;
  description: string;
  check: (i: BadgeInput) => boolean;
}> = [
  {
    id: 'first_alert',
    emoji: '🌱',
    label: 'Primeiro Alerta',
    description: 'Criou seu primeiro evento no mapa.',
    check: (i) => i.eventsReported >= 1,
  },
  {
    id: 'alerter',
    emoji: '🚨',
    label: 'Alertador',
    description: 'Criou 10 ou mais eventos.',
    check: (i) => i.eventsReported >= 10,
  },
  {
    id: 'guardian',
    emoji: '🛡️',
    label: 'Guardião',
    description: 'Criou 50 ou mais eventos — referência da comunidade!',
    check: (i) => i.eventsReported >= 50,
  },
  {
    id: 'commenter',
    emoji: '💬',
    label: 'Comentarista',
    description: 'Postou 10 ou mais comentários e tem pelo menos 50 pontos.',
    // Requer 50 pontos mínimos para evitar farm com spam de comentários
    check: (i) => i.commentsPosted >= 10 && i.points >= 50,
  },
  {
    id: 'collector',
    emoji: '⭐',
    label: 'Colecionador',
    description: 'Salvou 10 ou mais eventos favoritos.',
    check: (i) => i.favoritesCount >= 10,
  },
  {
    id: 'veteran',
    emoji: '👑',
    label: 'Veterano',
    description: 'Acumulou 1.000 pontos ou mais.',
    check: (i) => i.points >= 1000,
  },
  {
    id: 'master',
    emoji: '💎',
    label: 'Mestre',
    description: 'Acumulou 5.000 pontos — elite do Alertoo!',
    check: (i) => i.points >= 5000,
  },
  {
    id: 'legend',
    emoji: '🔥',
    label: 'Lenda',
    description: 'Acumulou 10.000 pontos. Lendário!',
    check: (i) => i.points >= 10000,
  },
];

export function computeBadges(input: BadgeInput): Badge[] {
  return BADGE_DEFS.map((def) => ({
    id: def.id,
    emoji: def.emoji,
    label: def.label,
    description: def.description,
    unlocked: def.check(input),
  }));
}
