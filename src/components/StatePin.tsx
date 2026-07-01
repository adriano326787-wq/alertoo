import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

interface Props {
  uf: string;
  count: number;
  latitude: number;
  longitude: number;
  highlight?: boolean;
  onPress: (uf: string) => void;
}

function pillColor(count: number): string {
  if (count > 500) return '#E53935';
  if (count > 100) return '#FB8C00';
  return '#43A047';
}

function countLabel(count: number): string {
  if (count >= 10000) return '9k+';
  if (count >= 1000) return `${Math.floor(count / 1000)}k`;
  return String(count);
}

export function StatePin({ uf, count, latitude, longitude, onPress }: Props) {
  const [tracks, setTracks] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const color = pillColor(count);
  const label = countLabel(count);

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={() => onPress(uf)}
      tracksViewChanges={tracks}
      zIndex={50}
    >
      <View
        collapsable={false}
        onLayout={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setTracks(false), 400);
        }}
        style={[styles.pill, { backgroundColor: color }]}
      >
        <Text style={styles.count}>{label}</Text>
        <View style={styles.sep} />
        <Text style={styles.uf}>{uf}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    gap: 4,
  },
  count: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  sep: {
    width: 1,
    height: 11,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 1,
  },
  uf: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
});
