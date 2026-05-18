/**
 * EventMarker — sistema de cards para eventos de estrada.
 *
 * Hierarquia:
 *   - AlertCard    → eventos com ≥3 confirmações líquidas (urgência)
 *   - StandardCard → eventos orgânicos
 *
 * Compat: exporta GlassPin (alias StandardCard) e CountBadge.
 */

import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { RoadEvent, EVENT_CATEGORIES } from '../types';
import { ZoomTier } from '../utils/mapZoom';
import { palette, shadow, platformShadow } from '../theme/tokens';
import { StandardCard, AlertCard } from './ui/PinCard';

interface Props {
  event: RoadEvent;
  onPress: (event: RoadEvent) => void;
  zoomTier?: ZoomTier;
}

const FALLBACK_META = { color: '#607D8B', emoji: '📍' };

function cardSize(zoom: ZoomTier): 'sm' | 'md' | 'lg' {
  return zoom === 'distant' ? 'sm' : zoom === 'medium' ? 'md' : 'lg';
}

export function EventMarker({ event, onPress, zoomTier = 'close' }: Props) {
  const meta = EVENT_CATEGORIES[event.category] ?? FALLBACK_META;
  const [tracks, setTracks] = useState(true);

  const netConfirms = (event.confirmations ?? 0) - (event.denials ?? 0);
  const isAlert = netConfirms >= 3;

  const contentKey = [
    event.category,
    event.title,
    isAlert ? 'A' : 'S',
    zoomTier,
  ].join('|');

  useEffect(() => {
    setTracks(true);
    const t = setTimeout(() => setTracks(false), isAlert ? 2500 : 800);
    return () => clearTimeout(t);
  }, [contentKey, isAlert]);

  const size = cardSize(zoomTier);

  if (isAlert) {
    return (
      <Marker
        coordinate={{ latitude: event.latitude, longitude: event.longitude }}
        anchor={{ x: 0.5, y: 0.5 }}
        onPress={() => onPress(event)}
        tracksViewChanges={tracks}
        zIndex={40}
      >
        <AlertCard
          color={meta.color || palette.alert}
          icon={meta.emoji}
          label={event.title}
          size={size}
        />
      </Marker>
    );
  }

  return (
    <Marker
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={() => onPress(event)}
      tracksViewChanges={tracks}
      zIndex={1}
    >
      <StandardCard color={meta.color} icon={meta.emoji} label={event.title} size={size} />
    </Marker>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPAT — exports antigos mantidos como wrappers
// ═══════════════════════════════════════════════════════════════════════════════

interface GlassPinProps {
  color: string;
  emoji: string;
  photoUrl?: string | null;
  size?: number;
}

/** Alias retrocompatível — agora renderiza um StandardCard sem label. */
export function GlassPin({ color, emoji, size }: GlassPinProps) {
  const cardSz: 'sm' | 'md' | 'lg' = size && size < 40 ? 'sm' : size && size < 50 ? 'md' : 'lg';
  return <StandardCard color={color} icon={emoji} size={cardSz} />;
}

/** Badge de contagem compacto — sem mudanças */
export function CountBadge({ count, color = palette.brand[500] }: { count: number; color?: string }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  const wide = label.length > 1;
  return (
    <View style={{
      position: 'absolute',
      top: -4, right: -6,
      height: 18,
      minWidth: wide ? 22 : 18,
      paddingHorizontal: wide ? 5 : 0,
      borderRadius: 9,
      backgroundColor: color,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#fff',
      ...platformShadow(shadow.sm),
    }}>
      <Text style={{ fontSize: 10, fontWeight: '900', color: '#fff', includeFontPadding: false, lineHeight: 12 }}>
        {label}
      </Text>
    </View>
  );
}

// Aliases retro
export const TeardropPin = GlassPin;
export const SquarePin = GlassPin;
export const FloatingPin = GlassPin;
