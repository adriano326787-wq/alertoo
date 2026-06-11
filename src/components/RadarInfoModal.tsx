/**
 * RadarInfoModal — detalhes do radar com confirmar ("ainda está aí") e
 * negar ("não existe mais"). Mesmo padrão do RoadEventInfoModal:
 * BottomSheetCard sempre montado, controlado por visible.
 */

import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Radar, RADAR_TYPES, RADAR_REVOTE_WINDOW_MS } from '../types/radar';
import { getCurrentUserId } from '../services/authService';
import { timeAgo } from '../utils/time';
import { NavigationModal } from './NavigationModal';
import { BottomSheetCard, SheetAction } from './ui/BottomSheetCard';
import { useT } from '../hooks/useT';
import { tRadarType } from '../utils/i18n';
import { palette } from '../theme/tokens';
import { useUserStore } from '../store/userStore';
import { useRadarsStore } from '../store/radarsStore';

interface Props {
  radar: Radar | null;
  onClose: () => void;
}

export function RadarInfoModal({ radar, onClose }: Props) {
  const t = useT();
  const [navVisible, setNavVisible] = useState(false);
  const isAdmin = useUserStore((s) => s.isAdmin);
  const confirmRadar = useRadarsStore((s) => s.confirmRadar);
  const denyRadar = useRadarsStore((s) => s.denyRadar);
  const deleteRadar = useRadarsStore((s) => s.deleteRadar);

  const meta = radar ? RADAR_TYPES[radar.type] : null;
  const myUid = getCurrentUserId();
  const isAnonymous = !myUid || myUid === 'anonymous';
  const lastVote = radar && !isAnonymous ? (radar.voterStamps[myUid] ?? 0) : 0;
  const alreadyVoted = lastVote > 0 && Date.now() - lastVote < RADAR_REVOTE_WINDOW_MS;
  const isOwner = radar && !isAnonymous ? radar.createdBy === myUid : false;
  const blocked = alreadyVoted || isAnonymous;
  const location = radar ? [radar.cityName, radar.stateUF].filter(Boolean).join(' — ') : '';

  async function handleVote(action: 'confirm' | 'deny') {
    if (!radar) return;
    try {
      if (action === 'confirm') await confirmRadar(radar.id);
      else await denyRadar(radar.id);
      onClose();
    } catch (err: any) {
      Alert.alert(t('error'), err?.message ?? t('error'));
    }
  }

  const tag = !radar ? undefined :
    radar.status === 'pending'
      ? { label: `⏳ ${t('radar_pending_tag').toUpperCase()}`, color: '#FB8C00' }
      : isOwner
        ? { label: `📌 ${t('own_event').toUpperCase()}`, color: palette.brand[500] }
        : alreadyVoted
          ? { label: `✓ ${t('road_voted').toUpperCase()}`, color: palette.live }
          : undefined;

  const stats = radar ? [
    ...(radar.speedLimit
      ? [{ icon: '📷', value: `${radar.speedLimit} km/h`, label: t('speed_limit_stat') }]
      : []),
    { icon: '✓', value: radar.confirmations, label: t('confirm') ?? 'Confirma' },
    { icon: '✗', value: radar.denials, label: t('deny') ?? 'Nega' },
  ] : undefined;

  const quickActions: SheetAction[] = radar && meta ? [
    {
      icon: '✓',
      label: t('radar_still_there'),
      onPress: () => { if (!blocked) handleVote('confirm'); },
      disabled: blocked,
      variant: 'primary',
    },
    {
      icon: '✗',
      label: t('radar_gone'),
      onPress: () => { if (!blocked) handleVote('deny'); },
      disabled: blocked,
      variant: 'danger',
    },
    // Exclusão — criador ou admin
    ...((isOwner || isAdmin) ? [{
      icon: '🗑️',
      label: t('radar_delete'),
      variant: 'danger' as const,
      onPress: () => {
        Alert.alert(
          t('radar_delete'),
          t('radar_delete_confirm'),
          [
            { text: t('filter_cancel'), style: 'cancel' },
            {
              text: t('radar_delete'),
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteRadar(radar.id);
                  onClose();
                } catch {
                  Alert.alert(t('error'), t('error'));
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
      <BottomSheetCard
        visible={!!radar}
        onClose={onClose}
        tag={tag}
        category={radar && meta ? `${meta.emoji} ${tRadarType(radar.type).toUpperCase()}` : ''}
        title={radar ? `${t('radar_title')}${radar.speedLimit ? ` — ${radar.speedLimit} km/h` : ''}` : ''}
        subtitle={location}
        meta={radar
          ? `${t('radar_last_confirmed')}: ${timeAgo(radar.lastConfirmedAt)}`
          : ''}
        stats={stats}
        primaryAction={radar ? {
          icon: '🧭',
          label: t('navigate_gps') || 'Como chegar',
          onPress: () => setNavVisible(true),
        } : undefined}
        quickActions={quickActions}
      />

      {radar && meta && (
        <NavigationModal
          visible={navVisible}
          destination={{ latitude: radar.latitude, longitude: radar.longitude }}
          destinationLabel={t('radar_title')}
          destinationEmoji={meta.emoji}
          onClose={() => setNavVisible(false)}
        />
      )}
    </>
  );
}
