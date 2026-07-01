/**
 * RadarMarker — pin de radar no mapa.
 *
 * Radares são infraestrutura (não eventos temporários): pin circular discreto
 * com o emoji do tipo. Radar pendente (aguardando confirmações) aparece
 * semi-transparente — visível apenas para o criador.
 *
 * Segue a mesma disciplina de tracksViewChanges do EventMarker.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { Radar, RADAR_TYPES } from '../types/radar';
import { ZoomTier } from '../utils/mapZoom';
import { DropPin } from './ui/Pin';

interface Props {
  radar: Radar;
  onPress: (radar: Radar) => void;
  zoomTier?: ZoomTier;
  /** Nível de zoom contínuo (0-20) — encolhe o pin gradualmente dentro do tier 'distant' */
  zoomLevel?: number;
}

// Dentro do tier 'distant' (zoom < 12), o pin encolhe continuamente conforme o
// usuário afasta o mapa — evita "spam" visual em visões de estado/região, onde
// dezenas de radares ficam visualmente próximos.
function pinSize(zoom: ZoomTier, zoomLevel: number): number {
  if (zoom === 'medium') return 34;
  if (zoom === 'close') return 42;
  return Math.round(Math.min(10, Math.max(5, 5 + (zoomLevel - 6) * 1.0)));
}

export function RadarMarker({ radar, onPress, zoomTier = 'close', zoomLevel = 12 }: Props) {
  const meta = RADAR_TYPES[radar.type] ?? RADAR_TYPES.fixed;
  const [tracks, setTracks] = useState(true);
  const layoutDoneRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const size = pinSize(zoomTier, zoomLevel);
  const contentKey = [radar.type, radar.status, zoomTier, size].join('|');

  useEffect(() => {
    layoutDoneRef.current = false;
    setTracks(true);
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    fallbackRef.current = setTimeout(() => setTracks(false), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };
  }, [contentKey]);

  const handleLayout = useCallback(() => {
    if (layoutDoneRef.current) return;
    layoutDoneRef.current = true;
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTracks(false), 500);
  }, []);

  const isPending = radar.status === 'pending';

  return (
    <Marker
      coordinate={{ latitude: radar.latitude, longitude: radar.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={() => onPress(radar)}
      tracksViewChanges={tracks}
      zIndex={1}
      opacity={isPending ? 0.55 : 1}
    >
      <View collapsable={false}>
        <DropPin
          size={size}
          color={meta.color}
          icon={meta.emoji}
          onLayout={handleLayout}
        />
        {radar.speedLimit != null && zoomTier !== 'distant' && (
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -8,
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#fff',
              borderWidth: 2,
              borderColor: '#E53935',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 2,
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: '900', color: '#1a1a1a', includeFontPadding: false }}>
              {radar.speedLimit}
            </Text>
          </View>
        )}
      </View>
    </Marker>
  );
}
