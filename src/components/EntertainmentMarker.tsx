/**
 * EntertainmentMarker — círculos coloridos para eventos de entretenimento.
 *
 * Hierarquia visual (do mais ao menos destacado):
 *   - PremiumPin  → promovidos (ouro/prata/bronze) — halo pulsante colorido
 *   - LivePin     → populares (≥5 likes)           — badge LIVE animado
 *   - DropPin     → orgânicos                      — círculo limpo com ícone
 *
 * Tamanho varia por zoom: sm=40 | md=50 | lg=62
 *
 * tracksViewChanges: fica true até onLayout disparar (layout completo no nativo),
 * então false após 100ms — garante bitmap capturado após layout real.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Marker } from 'react-native-maps';
import { Dimensions } from 'react-native';
import { EntertainmentEvent, ENTERTAINMENT_CATEGORIES } from '../types/entertainment';
import { ZoomTier } from '../utils/mapZoom';
import { DropPin, PremiumPin, LivePin, PromotedMarkerCard } from './ui/Pin';
import { palette } from '../theme/tokens';

interface Props {
  event: EntertainmentEvent;
  onPress: (event: EntertainmentEvent) => void;
  zoomTier?: ZoomTier;
}

const FALLBACK_META = { color: '#607D8B', emoji: '📍' };
const ClusterMarker = Marker as any;

// #9 Ciclo 8 — threshold de likes para exibir badge LIVE; extraído para facilitar ajustes futuros
const LIVE_LIKE_THRESHOLD = 5;

type Tier = 'bronze' | 'prata' | 'ouro';

const TIER_RING: Record<Tier, string> = {
  bronze: palette.bronze[400],
  prata:  palette.silver[400],
  ouro:   palette.gold[400],
};

// ─── Hierarquia de tamanhos ───────────────────────────────────────────────────
//
//  Zoom:        distant   medium    close
//  ─────────────────────────────────────────
//  Orgânico:    ø40       ø50       ø62      ← círculo simples
//  Live:        ø40       ø50       ø62      ← círculo + badge LIVE
//  Bronze card: 80×67     112×89    140×107  ← 2.0× / 2.2× / 2.3× orgânico (largura)
//  Prata card:  90×73     124×95    154×117  ← 2.25× / 2.5× / 2.5× orgânico
//  Ouro card:   100×78    138×103   168×128  ← 2.5× / 2.8× / 2.7× orgânico
//
//  Princípio (promo-marketing skill §2): Size: Ouro > Prata > Bronze > Live = Orgânico

// Tamanho do círculo orgânico por nível de zoom
function pinSize(zoom: ZoomTier): number {
  return zoom === 'distant' ? 30 : zoom === 'medium' ? 38 : 46;
}

// Dimensões do card promovido por tier × zoom
// (cardW, photoH, nameH, tailH) → totalH = photoH + nameH + tailH
const PROMOTED_DIMS: Record<Tier, Record<ZoomTier, {
  cardW: number; photoH: number; nameH: number; tailH: number;
}>> = {
  bronze: {
    distant: { cardW: 64,  photoH: 34, nameH: 14, tailH: 6 },
    medium:  { cardW: 88,  photoH: 48, nameH: 16, tailH: 6 },
    close:   { cardW: 110, photoH: 60, nameH: 18, tailH: 7 },
  },
  prata: {
    distant: { cardW: 72,  photoH: 38, nameH: 14, tailH: 6 },
    medium:  { cardW: 98,  photoH: 52, nameH: 16, tailH: 6 },
    close:   { cardW: 122, photoH: 66, nameH: 20, tailH: 7 },
  },
  ouro: {
    distant: { cardW: 80,  photoH: 42, nameH: 15, tailH: 6 },
    medium:  { cardW: 108, photoH: 58, nameH: 18, tailH: 6 },
    close:   { cardW: 134, photoH: 72, nameH: 22, tailH: 7 },
  },
};

export function EntertainmentMarker({ event, onPress, zoomTier = 'close' }: Props) {
  const meta = ENTERTAINMENT_CATEGORIES[event.category] ?? FALLBACK_META;
  const [tracks, setTracks] = useState(true);
  const layoutDoneRef   = useRef(false);
  const imageLoadedRef  = useRef(false);
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Verifica se hoje é um dia ativo para a promoção por pacote
  const todayDow = new Date().getDay(); // 0=Dom … 6=Sáb
  const isActivePkgDay = !event.promotionActiveDays || event.promotionActiveDays.includes(todayDow);

  const isPromoted = !!(
    event.promotionTier &&
    event.promotionEndDate &&
    event.promotionEndDate > Date.now() &&
    isActivePkgDay
  );
  const tier = (event.promotionTier ?? 'bronze') as Tier;
  const isLive = !isPromoted && (event.likes?.length ?? 0) >= LIVE_LIKE_THRESHOLD;

  // URL da foto para o card promovido (prioridade: foto de promoção → foto do evento)
  const promoPhotoUrl = isPromoted
    ? (event.promotionPhotoUrl ?? event.promotionPhotoUrls?.[0] ?? event.photoUrl ?? null)
    : null;
  const hasPromoPhoto = !!promoPhotoUrl;

  // zoomTier excluído intencionalmente: incluí-lo causava reset de tracksViewChanges
  // em todos os markers simultaneamente a cada zoom/pan → freeze severo.
  const contentKey = [
    event.category,
    event.promotionTier ?? '',
    promoPhotoUrl ?? '',
    isLive ? 'L' : '',
  ].join('|');

  // Resetar tracking quando o conteúdo muda
  // Para cards com foto remota: fallback maior (5s) para aguardar carregamento de rede
  useEffect(() => {
    layoutDoneRef.current  = false;
    imageLoadedRef.current = false;
    setTracks(true);
    const fallbackMs = isPromoted && hasPromoPhoto ? 5000 : 1000;
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    fallbackRef.current = setTimeout(() => setTracks(false), fallbackMs);
    return () => {
      if (timerRef.current)  clearTimeout(timerRef.current);
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };
  }, [contentKey]);

  // Dispara setTracks(false) somente quando layout E imagem estiverem prontos
  const scheduleTrackOff = useCallback((delayMs: number) => {
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    if (timerRef.current)    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTracks(false), delayMs);
  }, []);

  // onLayout: layout nativo completo
  // Para card com foto: aguarda onImageLoad também antes de desligar
  const handleLayout = useCallback(() => {
    if (layoutDoneRef.current) return;
    layoutDoneRef.current = true;
    if (!hasPromoPhoto || imageLoadedRef.current) {
      scheduleTrackOff(500);
    }
    // Se tem foto remota e ainda não carregou → handleImageLoad vai disparar
  }, [hasPromoPhoto, scheduleTrackOff]);

  // onLoad da imagem do card: ambos layout+imagem prontos → pode congelar bitmap
  const handleImageLoad = useCallback(() => {
    imageLoadedRef.current = true;
    if (layoutDoneRef.current) {
      scheduleTrackOff(300);
    }
    // Se layout ainda não disparou → handleLayout vai disparar logo depois
  }, [scheduleTrackOff]);

  const size = pinSize(zoomTier);

  // ─── PROMOVIDO → PromotedMarkerCard (retângulo com foto + nome) ──────────────
  if (isPromoted) {
    // Dimensões pelo tier × zoom (hierarquia: Ouro > Prata > Bronze > orgânico)
    // Clamp defensivo: card promovido nunca deve ocupar mais de 50% da largura
    // da tela (map-marker-ux §3) — hoje nenhuma combinação tier×zoom excede isso
    // (máx. 134px), mas isto evita regressão se os tamanhos forem aumentados depois.
    const rawDims = PROMOTED_DIMS[tier][zoomTier];
    const maxCardW = Dimensions.get('window').width * 0.5;
    const cardDims = rawDims.cardW > maxCardW
      ? { ...rawDims, cardW: maxCardW }
      : rawDims;

    const borderColor    = TIER_RING[tier];
    const letterboxColor = borderColor + '28'; // ~16% opacidade

    return (
      <ClusterMarker
        coordinate={{ latitude: event.latitude, longitude: event.longitude }}
        // âncora na base central → cauda triangular aponta para a coordenada exata
        anchor={{ x: 0.5, y: 1.0 }}
        onPress={() => onPress(event)}
        tracksViewChanges={tracks}
        cluster={false}
        zIndex={tier === 'ouro' ? 22 : tier === 'prata' ? 21 : 20}
      >
        <PromotedMarkerCard
          {...cardDims}
          photoUrl={promoPhotoUrl}
          label={event.title}
          emoji={meta.emoji}
          tier={tier}
          borderColor={borderColor}
          letterboxColor={letterboxColor}
          onLayout={handleLayout}
          onImageLoad={handleImageLoad}
        />
      </ClusterMarker>
    );
  }

  // ─── LIVE → LivePin com badge LIVE animado ────────────────────────────────────
  if (isLive) {
    return (
      <Marker
        coordinate={{ latitude: event.latitude, longitude: event.longitude }}
        anchor={{ x: 0.5, y: 0.5 }}
        onPress={() => onPress(event)}
        tracksViewChanges={tracks}
        zIndex={5}
      >
        <LivePin
          size={size}
          color={meta.color}
          icon={meta.emoji}
          onLayout={handleLayout}
        />
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
      zIndex={2}
    >
      <DropPin
        size={size}
        color={meta.color}
        icon={meta.emoji}
        onLayout={handleLayout}
      />
    </Marker>
  );
}
