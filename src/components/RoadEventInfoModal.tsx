/**
 * RoadEventInfoModal — refeito com BottomSheetCard.
 *
 * Para eventos de estrada (alertas), trata como notification card
 * com botões de confirmar/negar bem destacados.
 */

import React, { useState } from 'react';
import { RoadEvent, EVENT_CATEGORIES } from '../types';
import { getCurrentUserId } from '../services/authService';
import { timeAgo, timeLeft } from '../utils/time';
import { ShareSheet } from './ShareSheet';
import { NavigationModal } from './NavigationModal';
import { BottomSheetCard, SheetAction } from './ui/BottomSheetCard';
import { useT } from '../hooks/useT';
import { tRoadCat } from '../utils/i18n';
import { palette } from '../theme/tokens';
import { useFavoritesStore } from '../store/favoritesStore';

interface Props {
  event: RoadEvent | null;
  onConfirm: (id: string) => void;
  onDeny: (id: string) => void;
  onClose: () => void;
}

export function RoadEventInfoModal({ event, onConfirm, onDeny, onClose }: Props) {
  const t = useT();
  const [shareVisible, setShareVisible] = useState(false);
  const [navVisible, setNavVisible] = useState(false);
  const isFavorite = useFavoritesStore((s) => event ? s.isFavorite(event.id) : false);
  const toggleFav = useFavoritesStore((s) => s.toggle);

  if (!event) return null;

  const meta = EVENT_CATEGORIES[event.category];
  const myUid = getCurrentUserId();
  const alreadyVoted = event.voters.includes(myUid);
  const isOwner = event.userId === myUid;
  const blocked = alreadyVoted || isOwner;
  const location = [event.cityName, event.stateUF].filter(Boolean).join(' — ');

  // Tag — owner ou já votou
  const tag = isOwner
    ? { label: `📌 ${t('own_event').toUpperCase()}`, color: palette.brand[500] }
    : alreadyVoted
      ? { label: `✓ ${t('road_voted').toUpperCase()}`, color: palette.live }
      : undefined;

  // Stats: confirmações + negações + tempo restante
  const stats = [
    { icon: '✓', value: event.confirmations, label: t('confirm') ?? 'Confirma' },
    { icon: '✗', value: event.denials, label: t('deny') ?? 'Nega' },
    { icon: '⏱', value: timeLeft(event.expiresAt).replace(/[^0-9hm]/g, '') || '—', label: 'Resta' },
  ];

  // Quick actions: confirmar, negar, navegar, compartilhar
  const quickActions: SheetAction[] = [
    {
      icon: '✓',
      label: 'Confirmar',
      onPress: () => { if (!blocked) { onConfirm(event.id); onClose(); } },
      disabled: blocked,
      variant: 'primary',
    },
    {
      icon: '✗',
      label: 'Negar',
      onPress: () => { if (!blocked) { onDeny(event.id); onClose(); } },
      disabled: blocked,
      variant: 'danger',
    },
    {
      icon: isFavorite ? '⭐' : '☆',
      label: isFavorite ? t('saved') || 'Salvo' : t('save') || 'Salvar',
      onPress: () => toggleFav({
        eventId: event.id,
        eventType: 'road',
        title: event.title,
        emoji: meta.emoji,
      }),
    },
    {
      icon: '↗',
      label: t('share'),
      onPress: () => setShareVisible(true),
    },
  ];

  return (
    <>
      <BottomSheetCard
        visible
        onClose={onClose}
        tag={tag}
        category={`${meta.emoji} ${tRoadCat(event.category).toUpperCase()}`}
        title={event.title}
        subtitle={location}
        meta={`${timeAgo(event.createdAt)}  ·  ${timeLeft(event.expiresAt)}`}
        description={event.description}
        stats={stats}
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
        category={`${meta.emoji} ${tRoadCat(event.category)}`}
        location={location}
        eventId={event.id}
        eventType="road"
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
