import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
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
    const t = setTimeout(() => setTracksViewChanges(false), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <Marker
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={() => onPress(event)}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={{ alignItems: 'center' }}>
        <TeardropPin color={meta.color} emoji={meta.emoji} />
        <CountBadge count={event.confirmations} color="#22C55E" />
      </View>
    </Marker>
  );
}

// ─── TeardropPin: pino clássico em formato de gota ───────────────────────────
//
//   ◯  ← topo arredondado (corpo)
//    ▼ ← ponta inferior (formada pelo cantinho 0 + rotação 45°)
//
// Implementação: square rotacionado 45° com 3 cantos arredondados (radius=50%)
// e 1 canto sem arredondamento (bottom-right), que vira o "bico" da gota.
// O emoji/foto fica absoluto sobreposto (não rotaciona), sempre legível.
export function TeardropPin({
  color,
  emoji,
  photoUrl,
  size = 44,
}: {
  color: string;
  emoji: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const wrapperW = size * 1.05;
  const wrapperH = size * 1.32;
  return (
    <View style={[tp.wrapper, { width: wrapperW, height: wrapperH }]}>
      {/* Corpo da gota */}
      <View
        style={[
          tp.teardrop,
          {
            width: size,
            height: size,
            backgroundColor: color,
            borderTopLeftRadius: size / 2,
            borderTopRightRadius: size / 2,
            borderBottomLeftRadius: size / 2,
            borderBottomRightRadius: 0,
            shadowColor: color,
          },
        ]}
      />
      {/* Brilho/reflexo */}
      <View
        style={[
          tp.shine,
          {
            top: size * 0.18,
            left: wrapperW / 2 - size * 0.28,
            width: size * 0.22,
            height: size * 0.12,
            borderRadius: size * 0.06,
          },
        ]}
      />
      {/* Conteúdo: foto (se disponível) ou emoji */}
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={[
            tp.photo,
            {
              width: size * 0.62,
              height: size * 0.62,
              borderRadius: size * 0.31,
              top: size * 0.15,
            },
          ]}
        />
      ) : (
        <Text
          style={[
            tp.emoji,
            {
              fontSize: size * 0.44,
              top: size * 0.16,
            },
          ]}
        >
          {emoji}
        </Text>
      )}
    </View>
  );
}

// ─── CountBadge: contagem sobreposta no canto superior-direito ───────────────
export function CountBadge({
  count,
  color = '#FF5722',
}: {
  count: number;
  color?: string;
}) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  const wide = label.length > 1;
  return (
    <View
      style={[
        cb.badge,
        {
          backgroundColor: color,
          minWidth: wide ? 22 : 18,
          paddingHorizontal: wide ? 5 : 0,
        },
      ]}
    >
      <Text style={cb.text}>{label}</Text>
    </View>
  );
}

// ─── FloatingPin (mantido para compatibilidade) ──────────────────────────────
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
        <View style={fp.shine} />
        <Text style={[fp.emoji, { fontSize: size * 0.48 }]}>{emoji}</Text>
      </View>
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

// ─── Estilos do TeardropPin ──────────────────────────────────────────────────
const tp = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  teardrop: {
    position: 'absolute',
    top: 2,
    transform: [{ rotate: '45deg' }],
    borderWidth: 2,
    borderColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 10,
  },
  photo: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  emoji: {
    position: 'absolute',
    textAlign: 'center',
    lineHeight: undefined,
  },
  shine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
});

// ─── Estilos do CountBadge ───────────────────────────────────────────────────
const cb = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 8,
    zIndex: 10,
  },
  text: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 12,
  },
});

// ─── Estilos do FloatingPin (legado) ─────────────────────────────────────────
const fp = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  body: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
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
