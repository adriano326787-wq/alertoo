/**
 * RoadEventInfoModal — refeito com BottomSheetCard.
 *
 * Mantém o componente SEMPRE montado e controla o BottomSheetCard via
 * `visible={!!event}`, evitando que o desmonte imediato interrompa a
 * animação de saída quando o X é pressionado.
 */

import React, { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { RoadEvent, EVENT_CATEGORIES } from '../types';
import { getCurrentUserId } from '../services/authService';
import { timeAgo, timeLeft, timeLeftShort } from '../utils/time';
import { ShareSheet } from './ShareSheet';
import { NavigationModal } from './NavigationModal';
import { BottomSheetCard, SheetAction } from './ui/BottomSheetCard';
import { useT } from '../hooks/useT';
import { tRoadCat } from '../utils/i18n';
import { palette } from '../theme/tokens';
import { useFavoritesStore } from '../store/favoritesStore';
import { useUserStore } from '../store/userStore';
import { useEventsStore } from '../store/eventsStore';

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
  const isFavorite = useFavoritesStore((s) => event ? s.favoriteIds.has(event.id) : false);
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const isAdmin = useUserStore((s) => s.isAdmin);
  const deleteEvent = useEventsStore((s) => s.deleteEvent);

  const meta = event ? EVENT_CATEGORIES[event.category] : null;
  const myUid = getCurrentUserId();
  const isAnonymous = !myUid || myUid === 'anonymous';
  const alreadyVoted = event && !isAnonymous ? event.voters.includes(myUid) : false;
  const isOwner = event && !isAnonymous ? event.userId === myUid : false;
  const blocked = alreadyVoted || isOwner;
  const location = event ? [event.cityName, event.stateUF].filter(Boolean).join(' — ') : '';

  // Tag — owner ou já votou
  // Abre Google Maps ou Waze mostrando o ponto do alerta
  async function handleOpenInMaps() {
    if (!event) return;
    const { latitude, longitude } = event;
    const wazeUrl = `waze://?ll=${latitude},${longitude}&navigate=yes`;
    const gMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    try {
      const canWaze = await Linking.canOpenURL(wazeUrl);
      if (canWaze) {
        Alert.alert('Abrir no mapa', 'Escolha o aplicativo', [
          { text: 'Waze', onPress: () => Linking.openURL(wazeUrl) },
          { text: 'Google Maps', onPress: () => Linking.openURL(gMapsUrl) },
          { text: 'Cancelar', style: 'cancel' },
        ]);
      } else {
        Linking.openURL(gMapsUrl);
      }
    } catch {
      Linking.openURL(gMapsUrl);
    }
  }

  const tag = !event ? undefined :
    isOwner
      ? { label: `📌 ${t('own_event').toUpperCase()}`, color: palette.brand[500] }
      : alreadyVoted
        ? { label: `✓ ${t('road_voted').toUpperCase()}`, color: palette.live }
        : undefined;

  // Stats: limite de velocidade (radar) + confirmações + negações + tempo restante
  const stats = event ? [
    ...(event.category === 'radar' && event.speedLimit
      ? [{ icon: '📷', value: `${event.speedLimit} km/h`, label: t('speed_limit_stat') }]
      : []),
    { icon: '✓', value: event.confirmations, label: t('confirm') ?? 'Confirma' },
    { icon: '✗', value: event.denials, label: t('deny') ?? 'Nega' },
    { icon: '⏱', value: timeLeftShort(event.expiresAt), label: t('time_left_label') },
  ] : undefined;

  // Quick actions: confirmar, negar, navegar, compartilhar
  const quickActions: SheetAction[] = event && meta ? [
    {
      icon: '✓',
      label: t('road_confirm_action'),
      onPress: () => { if (!blocked) { onConfirm(event.id); onClose(); } },
      disabled: blocked,
      variant: 'primary',
    },
    {
      icon: '✗',
      label: t('road_deny_action'),
      onPress: () => { if (!blocked) { onDeny(event.id); onClose(); } },
      disabled: blocked,
      variant: 'danger',
    },
    {
      icon: isFavorite ? '⭐' : '☆',
      label: isFavorite ? t('saved') || 'Salvo' : t('save') || 'Salvar',
      onPress: () => {
        if (isAnonymous) {
          Alert.alert(t('login_required'), t('login_required_ent'));
          return;
        }
        toggleFav({
          eventId: event.id,
          eventType: 'road',
          title: event.title,
          emoji: meta.emoji,
        }).catch(() => {
          Alert.alert('Erro', 'Não foi possível atualizar o favorito. Tente novamente.');
        });
      },
    },
    {
      icon: '↗',
      label: t('share'),
      onPress: () => setShareVisible(true),
    },
    {
      icon: '🔗',
      label: 'Ver no Maps',
      onPress: handleOpenInMaps,
    },
    // Exclusão — somente admin
    ...(isAdmin && event ? [{
      icon: '🗑️',
      label: 'Excluir evento',
      variant: 'danger' as const,
      onPress: () => {
        Alert.alert(
          '🗑️ Excluir evento',
          `Tem certeza que deseja excluir "${event.title}"? Esta ação não pode ser desfeita.`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Excluir',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteEvent(event.id);
                  onClose();
                } catch {
                  Alert.alert('Erro', 'Não foi possível excluir o evento. Tente novamente.');
                }
              },
            },
          ]
        );
      },
    }] : []),
  ] : [];

  return (
    <>
      {/* BottomSheetCard SEMPRE montado — visible controla abertura/fechamento */}
      <BottomSheetCard
        visible={!!event}
        onClose={onClose}
        tag={tag}
        category={event && meta ? `${meta.emoji} ${tRoadCat(event.category).toUpperCase()}` : ''}
        title={event?.title ?? ''}
        subtitle={location}
        meta={event ? `${timeAgo(event.createdAt)}  ·  ${timeLeft(event.expiresAt)}` : ''}
        description={event?.description}
        stats={stats}
        primaryAction={event ? {
          icon: '🧭',
          label: t('navigate_gps') || 'Como chegar',
          onPress: () => setNavVisible(true),
        } : undefined}
        quickActions={quickActions}
      />

      {event && meta && (
        <>
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
      )}
    </>
  );
}
