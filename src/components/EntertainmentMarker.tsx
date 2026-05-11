import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Marker } from 'react-native-maps';
import { EntertainmentEvent, ENTERTAINMENT_CATEGORIES } from '../types/entertainment';
import { PROMOTION_TIERS } from '../types/promotion';

interface Props {
  event: EntertainmentEvent;
  onPress: (event: EntertainmentEvent) => void;
}

const FALLBACK_META = { color: '#607D8B', emoji: '📍' };

export function EntertainmentMarker({ event, onPress }: Props) {
  const meta = ENTERTAINMENT_CATEGORIES[event.category] ?? FALLBACK_META;
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isPromoted = !!(
    event.promotionTier &&
    event.promotionEndDate &&
    event.promotionEndDate > Date.now()
  );
  const tierConfig = isPromoted ? PROMOTION_TIERS[event.promotionTier!] : null;

  // Para o Ouro: anima o pin
  useEffect(() => {
    if (!tierConfig?.animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.9, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [tierConfig?.animated]);

  // Para de rastrear mudanças de view após 1s (performance)
  useEffect(() => {
    if (!isPromoted) {
      // Pins normais: parar tracking rápido
      const t = setTimeout(() => setTracksViewChanges(false), 500);
      return () => clearTimeout(t);
    }
    // Pins promovidos animados: manter tracking (necessário para animação)
    if (!tierConfig?.animated) {
      const t = setTimeout(() => setTracksViewChanges(false), 1000);
      return () => clearTimeout(t);
    }
  }, [isPromoted, tierConfig?.animated]);

  const pinSize = isPromoted ? 42 * (tierConfig!.pinScale) : 42;
  const pinColor = isPromoted ? tierConfig!.pinColor : meta.color;
  const pinBorderColor = isPromoted ? '#fff' : '#fff';
  const pinBorderWidth = isPromoted ? 3 : 2.5;

  const pinView = (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.pin,
          {
            backgroundColor: pinColor,
            width: pinSize,
            height: pinSize,
            borderRadius: pinSize / 2,
            borderWidth: pinBorderWidth,
            borderColor: pinBorderColor,
            transform: [{ scale: tierConfig?.animated ? pulseAnim : 1 }],
          },
          isPromoted && styles.pinPromoted,
        ]}
      >
        <Text style={[styles.emoji, { fontSize: isPromoted ? 20 + (tierConfig!.pinScale - 1) * 10 : 22 }]}>
          {meta.emoji}
        </Text>
      </Animated.View>

      {/* Badge do tier */}
      {isPromoted && (
        <View style={[styles.tierBadge, { backgroundColor: tierConfig!.pinColor }]}>
          <Text style={styles.tierBadgeText}>{tierConfig!.emoji}</Text>
        </View>
      )}

      {/* Ponteiro do pin */}
      <View style={[styles.pointer, { borderTopColor: pinColor }]} />
    </View>
  );

  return (
    <Marker
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={() => onPress(event)}
      tracksViewChanges={tracksViewChanges}
      zIndex={isPromoted ? (tierConfig!.pinScale * 10) : 1}
    >
      {pinView}
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  pinPromoted: {
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  emoji: { textAlign: 'center' },
  tierBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    zIndex: 10,
  },
  tierBadgeText: { fontSize: 10 },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
});
