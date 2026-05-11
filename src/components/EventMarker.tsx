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

  // Permite renderizar o emoji e depois para de rastrear para economizar performance
  useEffect(() => {
    const t = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <Marker
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={() => onPress(event)}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={[styles.pin, { backgroundColor: meta.color }]}>
        <Text style={styles.emoji}>{meta.emoji}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 4, elevation: 6,
  },
  emoji: { fontSize: 22 },
});
