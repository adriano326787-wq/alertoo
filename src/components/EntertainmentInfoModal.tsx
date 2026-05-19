/**
 * EntertainmentInfoModal — sheet inferior premium.
 *
 * Apenas eventos promovidos (via PromoteEventModal) recebem destaque.
 * Removida toda a estrutura de "featured" admin.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EntertainmentEvent, ENTERTAINMENT_CATEGORIES } from '../types/entertainment';
import { getCurrentUserId } from '../services/authService';
import { timeAgo } from '../utils/time';
import { PROMOTION_TIERS } from '../types/promotion';
import { ShareSheet } from './ShareSheet';
import { NavigationModal } from './NavigationModal';
import { BottomSheetCard, SheetAction } from './ui/BottomSheetCard';
import { useT } from '../hooks/useT';
import { tEntCat, tTier } from '../utils/i18n';
import { palette } from '../theme/tokens';
import { useFavoritesStore } from '../store/favoritesStore';

interface Props {
  event: EntertainmentEvent | null;
  onLike: (id: string) => void;
  onComment: (event: EntertainmentEvent) => void;
  onGoToMap?: (event: EntertainmentEvent) => void;
  onClose: () => void;
}

export function EntertainmentInfoModal({
  event, onLike, onComment, onGoToMap, onClose,
}: Props) {
  const t = useT();
  const [shareVisible, setShareVisible] = useState(false);
  const [navVisible, setNavVisible] = useState(false);
  const isFavorite = useFavoritesStore((s) => event ? s.isFavorite(event.id) : false);
  const toggleFav = useFavoritesStore((s) => s.toggle);

  if (!event) return null;

  const meta = ENTERTAINMENT_CATEGORIES[event.category] ?? { emoji: '📍', color: '#607D8B', label: event.category };
  const myUid = getCurrentUserId() ?? '';
  const likes = Array.isArray(event.likes) ? event.likes : [];
  const liked = likes.includes(myUid);
  const isOwner = event.userId === myUid;
  const isPromoted = !!(event.promotionTier && event.promotionEndDate && event.promotionEndDate > Date.now());
  const tierConfig = isPromoted && event.promotionTier ? PROMOTION_TIERS[event.promotionTier] : null;
  const location = [event.cityName, event.stateUF].filter(Boolean).join(' — ');

  // Tag superior: tier promovido OU dono do evento
  const tag = isPromoted && tierConfig
    ? { label: `${tierConfig.emoji} ${tTier(tierConfig.id).toUpperCase()}`, color: tierConfig.pinColor }
    : isOwner
      ? { label: `📌 ${t('own_event').toUpperCase()}`, color: palette.brand[500] }
      : undefined;

  // Overlay sobre a imagem hero (chip do tier flutuante)
  const heroOverlay = isPromoted && tierConfig ? (
    <View style={[styles.heroChip, { backgroundColor: tierConfig.pinColor }]}>
      <Text style={styles.heroChipText}>{tierConfig.emoji} {tTier(tierConfig.id).toUpperCase()}</Text>
    </View>
  ) : null;

  // Quick actions
  const quickActions: SheetAction[] = [];
  quickActions.push({
    icon: liked ? '❤️' : '🤍',
    label: `${likes.length}`,
    onPress: () => { if (!isOwner) { onLike(event.id); onClose(); } },
    disabled: isOwner,
  });
  quickActions.push({
    icon: '💬',
    label: `${event.commentCount}`,
    onPress: () => { onClose(); onComment(event); },
  });
  quickActions.push({
    icon: isFavorite ? '⭐' : '☆',
    label: isFavorite ? t('saved') || 'Salvo' : t('save') || 'Salvar',
    onPress: () => toggleFav({
      eventId: event.id,
      eventType: 'entertainment',
      title: event.title,
      emoji: meta.emoji,
    }),
  });
  quickActions.push({
    icon: '↗',
    label: t('share'),
    onPress: () => setShareVisible(true),
  });
  if (onGoToMap) {
    quickActions.push({
      icon: '🗺️',
      label: t('go_to_event'),
      onPress: () => { onClose(); onGoToMap(event); },
    });
  }

  return (
    <>
      <BottomSheetCard
        visible
        onClose={onClose}
        imageUrl={event.promotionPhotoUrl ?? event.photoUrl ?? undefined}
        imageHeight={200}
        imageOverlay={heroOverlay}
        tag={tag}
        category={`${meta.emoji} ${tEntCat(event.category).toUpperCase()}`}
        title={event.title}
        subtitle={location}
        meta={timeAgo(event.createdAt)}
        description={event.description}
        primaryAction={{
          icon: '🧭',
          label: t('navigate_gps') || 'Como chegar',
          onPress: () => setNavVisible(true),
        }}
        quickActions={quickActions}
      />

      <ShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        title={event.title}
        description={event.description}
        category={`${meta.emoji} ${tEntCat(event.category)}`}
        location={location}
        eventId={event.id}
        eventType="entertainment"
      />

      <NavigationModal
        visible={navVisible}
        destination={{ latitude: event.latitude, longitude: event.longitude }}
        destinationLabel={event.title}
        destinationEmoji={meta.emoji}
        onClose={() => setNavVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  heroChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroChipText: {
    color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.4,
  },
});
