import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { RoadEvent, EVENT_CATEGORIES } from '../types';

interface Props {
  event: RoadEvent;
  onPress: (event: RoadEvent) => void;
}

const FALLBACK_META = { color: '#607D8B', emoji: '📍' };

export function EventMarker({ event, onPress }: Props) {
  const meta = EVENT_CATEGORIES[event.category] ?? FALLBACK_META;
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <Marker
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={() => onPress(event)}
      tracksViewChanges={tracksViewChanges}
    >
      <FloatingPin color={meta.color} emoji={meta.emoji} />
    </Marker>
  );
}

// ─── Floating Pin base ────────────────────────────────────────────────────────
export function FloatingPin({
  color,
  emoji,
  size = 44,
}: {
  color: string;
  emoji: string;
  size?: number;
}) {
  const radius = size / 2;
  const tipW = size * 0.28;
  const tipH = size * 0.22;
  const shadowW = size * 0.55;

  return (
    <View style={fp.wrapper}>
      {/* Corpo flutuante */}
      <View
        style={[
          fp.body,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: color,
            shadowColor: color,
          },
        ]}
      >
        {/* Reflexo de luz */}
        <View style={fp.shine} />
        <Text style={[fp.emoji, { fontSize: size * 0.48 }]}>{emoji}</Text>
      </View>

      {/* Ponta inferior */}
      <View
        style={[
          fp.tip,
          {
            borderLeftWidth: tipW / 2,
            borderRightWidth: tipW / 2,
            borderTopWidth: tipH,
            borderTopColor: color,
            marginTop: -2,
          },
        ]}
      />

      {/* Sombra no chão — efeito flutuante */}
      <View
        style={[
          fp.groundShadow,
          {
            width: shadowW,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const fp = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  body: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    // iOS shadow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    // Android
    elevation: 10,
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: '15%',
    left: '18%',
    width: '32%',
    height: '22%',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.38)',
    transform: [{ rotate: '-20deg' }],
  },
  emoji: { lineHeight: undefined },
  tip: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  groundShadow: {
    height: 5,
    borderRadius: 50,
    opacity: 0.22,
    marginTop: 3,
  },
});
