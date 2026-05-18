/**
 * EntertainmentMarker — agora 100% baseado em cards (sem drops).
 *
 * Hierarquia:
 *   - PremiumCard  → eventos promovidos (tier)
 *   - LiveCard     → eventos populares (featured ou ≥5 likes)
 *   - StandardCard → eventos orgânicos
 *
 * Tamanho do card varia por zoom (sm/md/lg).
 */

import React, { useEffect, useState } from 'react';
import { Marker } from 'react-native-maps';
import { EntertainmentEvent, ENTERTAINMENT_CATEGORIES } from '../types/entertainment';
import { ZoomTier } from '../utils/mapZoom';
import { StandardCard, PremiumCard, LiveCard } from './ui/PinCard';

interface Props {
  event: EntertainmentEvent;
  onPress: (event: EntertainmentEvent) => void;
  zoomTier?: ZoomTier;
}

const FALLBACK_META = { color: '#607D8B', emoji: '📍' };
const ClusterMarker = Marker as any;

type Tier = 'bronze' | 'prata' | 'ouro';

// Mapeia zoom tier do app → size do card
function cardSize(zoom: ZoomTier): 'sm' | 'md' | 'lg' {
  return zoom === 'distant' ? 'sm' : zoom === 'medium' ? 'md' : 'lg';
}

export function EntertainmentMarker({ event, onPress, zoomTier = 'close' }: Props) {
  const meta = ENTERTAINMENT_CATEGORIES[event.category] ?? FALLBACK_META;
  const [tracks, setTracks] = useState(true);

  const isPromoted = !!(
    event.promotionTier &&
    event.promotionEndDate &&
    event.promotionEndDate > Date.now()
  );
  const tier = (event.promotionTier ?? 'bronze') as Tier;
  // "Live" = evento popular (≥5 likes, sem ser promovido pago)
  const isLive = !isPromoted && (event.likes?.length ?? 0) >= 5;

  const contentKey = [
    event.category,
    event.promotionPhotoUrl ?? '',
    event.promotionTier ?? '',
    event.title,
    zoomTier,
  ].join('|');

  useEffect(() => {
    setTracks(true);
    const delay = isPromoted ? 3500 : 800;
    const t = setTimeout(() => setTracks(false), delay);
    return () => clearTimeout(t);
  }, [contentKey, isPromoted]);

  const size = cardSize(zoomTier);

  // ─── PROMOVIDO → PremiumCard com foto
  if (isPromoted) {
    return (
      <ClusterMarker
        coordinate={{ latitude: event.latitude, longitude: event.longitude }}
        anchor={{ x: 0.5, y: 0.5 }}
        onPress={() => onPress(event)}
        tracksViewChanges={tracks}
        cluster={false}
        zIndex={tier === 'ouro' ? 30 : tier === 'prata' ? 20 : 10}
      >
        <PremiumCard
          tier={tier}
          color={meta.color}
          icon={meta.emoji}
          photoUrl={event.promotionPhotoUrl}
          title={event.title}
          size={size}
          onPhotoLoad={() => {/* re-render — tracks handle it */}}
        />
      </ClusterMarker>
    );
  }

  // ─── LIVE → LiveCard
  if (isLive) {
    return (
      <Marker
        coordinate={{ latitude: event.latitude, longitude: event.longitude }}
        anchor={{ x: 0.5, y: 0.5 }}
        onPress={() => onPress(event)}
        tracksViewChanges={tracks}
        zIndex={5}
      >
        <LiveCard color={meta.color} icon={meta.emoji} label={event.title} size={size} />
      </Marker>
    );
  }

  // ─── PADRÃO → StandardCard
  return (
    <Marker
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={() => onPress(event)}
      tracksViewChanges={tracks}
      zIndex={2}
    >
      <StandardCard color={meta.color} icon={meta.emoji} label={event.title} size={size} />
    </Marker>
  );
}
