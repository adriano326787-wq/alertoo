import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, useColorScheme } from 'react-native';
import { rw, rh } from '../utils/responsive';

/**
 * Skeleton de loading para listas de eventos (Road/Entertainment).
 * Substitui o ActivityIndicator genérico — evita o "flash" de tela em branco
 * enquanto o primeiro snapshot do Firestore / GPS ainda não chegou.
 */
function SkeletonCard({ withPhoto = false }: { withPhoto?: boolean }) {
  const isDark = useColorScheme() === 'dark';
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const baseColor = isDark ? '#1E293B' : '#fff';
  const blockColor = isDark ? '#334155' : '#E2E8F0';

  return (
    <Animated.View style={[styles.card, { backgroundColor: baseColor, opacity: pulse }]}>
      {withPhoto && <View style={[styles.photo, { backgroundColor: blockColor }]} />}
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: blockColor }]} />
        <View style={styles.info}>
          <View style={[styles.line, { backgroundColor: blockColor, width: '60%' }]} />
          <View style={[styles.lineSmall, { backgroundColor: blockColor, width: '40%' }]} />
        </View>
      </View>
      <View style={[styles.lineSmall, { backgroundColor: blockColor, width: '90%', marginTop: rh(10) }]} />
      <View style={[styles.lineSmall, { backgroundColor: blockColor, width: '70%' }]} />
    </Animated.View>
  );
}

/** Lista de skeleton cards — use no lugar do ActivityIndicator de loading inicial. */
export function SkeletonList({ count = 5, withPhoto = false }: { count?: number; withPhoto?: boolean }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} withPhoto={withPhoto} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: rw(12), gap: rh(12) },
  card: {
    borderRadius: rw(16), padding: rw(14), overflow: 'hidden',
  },
  photo: { height: rh(180), borderRadius: rw(12), marginBottom: rh(10) },
  row: { flexDirection: 'row', alignItems: 'center', gap: rw(10) },
  badge: { width: rw(44), height: rw(44), borderRadius: rw(22) },
  info: { flex: 1, gap: rh(6) },
  line: { height: rh(14), borderRadius: rw(4) },
  lineSmall: { height: rh(11), borderRadius: rw(4), marginTop: rh(6) },
});
