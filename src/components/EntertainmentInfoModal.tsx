/**
 * EntertainmentInfoModal — sheet inferior premium.
 *
 * Mantém o componente SEMPRE montado e controla o BottomSheetCard via
 * `visible={!!event}`, evitando que o desmonte imediato interrompa a
 * animação de saída quando o X é pressionado.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions } from 'react-native';
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

  // Galeria de fotos: usa promotionPhotoUrls se disponível, senão cai para fotos individuais
  const allPhotos: string[] = event
    ? (event.promotionPhotoUrls && event.promotionPhotoUrls.length > 0
        ? event.promotionPhotoUrls
        : [event.promotionPhotoUrl ?? event.photoUrl].filter(Boolean) as string[])
    : [];
  const hasMultiplePhotos = allPhotos.length > 1;

  // Deriva os dados do evento apenas quando disponível
  const meta = event
    ? ENTERTAINMENT_CATEGORIES[event.category] ?? { emoji: '📍', color: '#607D8B', label: event.category }
    : null;
  const myUid = getCurrentUserId() ?? '';
  const likes = event && Array.isArray(event.likes) ? event.likes : [];
  const liked = event ? likes.includes(myUid) : false;
  const isOwner = event ? event.userId === myUid : false;
  const isPromoted = !!(event?.promotionTier && event?.promotionEndDate && event.promotionEndDate > Date.now());
  const tierConfig = isPromoted && event?.promotionTier ? PROMOTION_TIERS[event.promotionTier] : null;
  const location = event ? [event.cityName, event.stateUF].filter(Boolean).join(' — ') : '';

  // Tag superior: tier promovido OU dono do evento
  const tag = !event || !meta ? undefined :
    isPromoted && tierConfig
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

  // Quick actions — só montadas quando event existe
  const quickActions: SheetAction[] = event && meta ? [
    {
      icon: liked ? '❤️' : '🤍',
      label: `${likes.length}`,
      onPress: () => { if (!isOwner) onLike(event.id); },
      disabled: isOwner,
    },
    {
      icon: '💬',
      label: `${event.commentCount}`,
      onPress: () => { onClose(); onComment(event); },
    },
    {
      icon: isFavorite ? '⭐' : '☆',
      label: isFavorite ? t('saved') || 'Salvo' : t('save') || 'Salvar',
      onPress: () => toggleFav({
        eventId: event.id,
        eventType: 'entertainment',
        title: event.title,
        emoji: meta.emoji,
      }),
    },
    {
      icon: '↗',
      label: t('share'),
      onPress: () => setShareVisible(true),
    },
    ...(onGoToMap ? [{
      icon: '🗺️',
      label: t('go_to_event'),
      onPress: () => { onClose(); onGoToMap(event); },
    }] : []),
  ] : [];

  return (
    <>
      {/* BottomSheetCard SEMPRE montado — visible controla abertura/fechamento */}
      <BottomSheetCard
        visible={!!event}
        onClose={onClose}
        imageUrl={allPhotos[0] ?? undefined}
        imageHeight={200}
        imageOverlay={heroOverlay}
        tag={tag}
        category={event && meta ? `${meta.emoji} ${tEntCat(event.category).toUpperCase()}` : ''}
        title={event?.title ?? ''}
        subtitle={location}
        meta={event ? timeAgo(event.createdAt) : ''}
        description={event?.description}
        primaryAction={event ? {
          icon: '🧭',
          label: t('navigate_gps') || 'Como chegar',
          onPress: () => setNavVisible(true),
        } : undefined}
        quickActions={quickActions}
        footer={hasMultiplePhotos ? (
          <View style={styles.galleryWrap}>
            <Text style={styles.galleryLabel}>📸 Mais fotos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryScroll}
            >
              {allPhotos.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={styles.galleryThumb}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        ) : undefined}
      />

      {/* Sub-modais — só renderizados quando event existe */}
      {event && meta && (
        <>
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
      )}
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
  galleryWrap: {
    marginTop: 8,
  },
  galleryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  galleryScroll: {
    gap: 8,
    paddingRight: 4,
  },
  galleryThumb: {
    width: 120,
    height: 80,
    borderRadius: 8,
  },
});
