/**
 * EventMarker — círculos coloridos para eventos de trânsito.
 *
 * Hierarquia visual:
 *   - AlertPin  → eventos com ≥3 confirmações líquidas — pulse vermelho de urgência
 *   - DropPin   → eventos orgânicos                    — círculo limpo com ícone
 *
 * Tamanho varia por zoom: sm=40 | md=50 | lg=62
 *
 * tracksViewChanges: fica true até onLayout disparar (layout completo no nativo),
 * então false após 100ms — garante bitmap capturado após layout real.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { RoadEvent, EVENT_CATEGORIES } from '../types';
import { ZoomTier } from '../utils/mapZoom';
import { palette, shadow, platformShadow } from '../theme/tokens';
import { DropPin, AlertPin } from './ui/Pin';

interface Props {
  event: RoadEvent;
  onPress: (event: RoadEvent) => void;
  zoomTier?: ZoomTier;
}

const FALLBACK_META = { color: '#607D8B', emoji: '📍' };

function pinSize(zoom: ZoomTier): number {
  return zoom === 'distant' ? 30 : zoom === 'medium' ? 38 : 46;
}

export function EventMarker({ event, onPress, zoomTier = 'close' }: Props) {
  const meta = EVENT_CATEGORIES[event.category] ?? FALLBACK_META;
  const [tracks, setTracks] = useState(true);
  const layoutDoneRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const netConfirms = (event.confirmations ?? 0) - (event.denials ?? 0);
  const isAlert = netConfirms >= 3;

  const contentKey = [event.category, isAlert ? 'A' : 'S', zoomTier].join('|');

  // Resetar tracking quando o conteúdo muda
  // fallbackRef garante que tracksViewChanges vira false mesmo se onLayout não disparar
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    layoutDoneRef.current = false;
    setTracks(true);
    // Fallback: 1000ms sem onLayout → força false (New Architecture às vezes atrasa onLayout)
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    fallbackRef.current = setTimeout(() => setTracks(false), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };
  }, [contentKey]);

  // onLayout: disparado após o layout nativo estar completo
  // Aguarda 500ms — Fabric é assíncrono e 100ms é curto demais para captura de bitmap
  const handleLayout = useCallback(() => {
    if (layoutDoneRef.current) return;
    layoutDoneRef.current = true;
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTracks(false), 500);
  }, []);

  const size = pinSize(zoomTier);

  const confirmations = event.confirmations ?? 0;
  // #18 — mostra badge de confirmações quando há pelo menos 1 (estilo Waze)
  const showBadge = confirmations > 0 && zoomTier !== 'distant';

  // ─── ALERTA → AlertPin com pulse de urgência ──────────────────────────────────
  if (isAlert) {
    return (
      <Marker
        coordinate={{ latitude: event.latitude, longitude: event.longitude }}
        anchor={{ x: 0.5, y: 0.5 }}
        onPress={() => onPress(event)}
        tracksViewChanges={tracks}
        zIndex={40}
      >
        <View collapsable={false}>
          <AlertPin
            size={size}
            color={meta.color || palette.alert}
            icon={meta.emoji}
            onLayout={handleLayout}
          />
          {showBadge && <CountBadge count={confirmations} color="#43A047" />}
        </View>
      </Marker>
    );
  }

  // ─── PADRÃO → DropPin simples ─────────────────────────────────────────────────
  return (
    <Marker
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={() => onPress(event)}
      tracksViewChanges={tracks}
      zIndex={1}
    >
      <View collapsable={false}>
        <DropPin
          size={size}
          color={meta.color}
          icon={meta.emoji}
          onLayout={handleLayout}
        />
        {showBadge && <CountBadge count={confirmations} color="#43A047" />}
      </View>
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

/** Alias retrocompatível — agora renderiza um DropPin circular. */
export function GlassPin({ color, emoji, size = 50 }: GlassPinProps) {
  return <DropPin size={size} color={color} icon={emoji} />;
}

/** Badge de contagem compacto */
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
