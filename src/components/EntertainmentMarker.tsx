import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import { Marker } from 'react-native-maps';
import { EntertainmentEvent, ENTERTAINMENT_CATEGORIES } from '../types/entertainment';
import { TeardropPin, CountBadge } from './EventMarker';

interface Props {
  event: EntertainmentEvent;
  onPress: (event: EntertainmentEvent) => void;
}

const FALLBACK_META = { color: '#607D8B', emoji: '📍' };

const BRONZE = '#CD7F32';
const PRATA  = '#9EA3AE';
const OURO   = '#FFD700';
const OURO_DK = '#A67C00';

// ─── Normal ───────────────────────────────────────────────────────────────────
function NormalMarker({ event, meta, onPress, tracks }: any) {
  const likesCount = event.likes?.length ?? 0;
  return (
    <Marker
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={() => onPress(event)}
      tracksViewChanges={tracks}
      zIndex={1}
    >
      <View style={{ alignItems: 'center' }}>
        <TeardropPin color={meta.color} emoji={meta.emoji} size={44} />
        <CountBadge count={likesCount} color="#E91E63" />
      </View>
    </Marker>
  );
}

// ─── Promoted base: anel colorido + centro branco + emoji grande ──────────────
//
//   ┌──────────────────────────────────────────┐
//   │  [tier-ring]  [white-bg]  [emoji large]  │
//   │              [tier-badge bottom-right]   │
//   └──────────────────────────────────────────┘
//
// O emoji fica sobre fundo branco — sempre legível.
// O anel e o badge identificam o tier.

interface PromoPinProps {
  emoji: string;
  photoUrl?: string | null;  // foto do estabelecimento → substitui o emoji
  tierColor: string;
  tierLabel: string;
  tierBadge: string;      // ex: "🥉" "🥈" "🥇"
  size: number;           // diâmetro total do pin
  ringWidth: number;      // espessura do anel do tier
  labelColor: string;     // bg do label abaixo
  children?: React.ReactNode; // halos/animações extras (passados pelo wrapper)
  animated?: boolean;
  scaleAnim?: Animated.Value;
}

function PromoPin({
  emoji, photoUrl, tierColor, tierLabel, tierBadge,
  size, ringWidth, labelColor,
  children, animated, scaleAnim,
}: PromoPinProps) {
  const innerSize = size - ringWidth * 2;
  const tipW = size * 0.24;
  const tipH = size * 0.20;

  const BodyView = animated && scaleAnim ? Animated.View : View;
  const bodyStyle: any = animated && scaleAnim
    ? { transform: [{ scale: scaleAnim }] }
    : {};

  return (
    <View style={s.wrapper}>
      {/* Halos extras (anel de glow) ficam atrás do pin */}
      {children}

      {/* Anel de tier + corpo branco */}
      <BodyView style={[
        s.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tierColor,
          shadowColor: tierColor,
        },
        bodyStyle,
      ]}>
        {/* Centro branco onde o emoji/foto vai */}
        <View style={[
          s.inner,
          { width: innerSize, height: innerSize, borderRadius: innerSize / 2 },
        ]}>
          {photoUrl ? (
            <Image
              source={{ uri: photoUrl }}
              style={[
                s.innerPhoto,
                { width: innerSize - 4, height: innerSize - 4, borderRadius: (innerSize - 4) / 2 },
              ]}
            />
          ) : (
            <Text style={[s.emoji, { fontSize: innerSize * 0.52 }]}>{emoji}</Text>
          )}
        </View>

        {/* Badge do tier — canto inferior direito */}
        <View style={[s.badge, { borderColor: tierColor, backgroundColor: '#fff' }]}>
          <Text style={s.badgeEmoji}>{tierBadge}</Text>
        </View>
      </BodyView>

      {/* Ponta */}
      <View style={[s.tip, {
        borderLeftWidth: tipW / 2,
        borderRightWidth: tipW / 2,
        borderTopWidth: tipH,
        borderTopColor: tierColor,
        marginTop: -2,
      }]} />

      {/* Label do tier */}
      <View style={[s.label, { backgroundColor: labelColor }]}>
        <Text style={s.labelText}>{tierLabel}</Text>
      </View>

      {/* Sombra no chão */}
      <View style={[s.ground, { width: size * 0.55, backgroundColor: tierColor }]} />
    </View>
  );
}

// ─── Bronze ───────────────────────────────────────────────────────────────────
function BronzeMarker({ event, meta, onPress, tracks }: any) {
  const glow = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1,    duration: 1300, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.45, duration: 1300, useNativeDriver: true }),
    ])).start();
  }, []);

  const size = 58;
  const likesCount = event.likes?.length ?? 0;

  return (
    <Marker
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={() => onPress(event)}
      tracksViewChanges={tracks}
      zIndex={10}
    >
      <View style={{ alignItems: 'center' }}>
        <PromoPin
          emoji={meta.emoji}
          photoUrl={event.promotionPhotoUrl}
          tierColor={BRONZE}
          tierLabel="BRONZE"
          tierBadge="🥉"
          size={size}
          ringWidth={7}
          labelColor="#A0522D"
        >
          {/* Halo de glow simples */}
          <Animated.View style={[s.halo, {
            width: size + 18, height: size + 18,
            borderRadius: (size + 18) / 2,
            borderColor: BRONZE,
            opacity: glow,
            top: -9,
          }]} />
        </PromoPin>
        <CountBadge count={likesCount} color="#E91E63" />
      </View>
    </Marker>
  );
}

// ─── Prata ────────────────────────────────────────────────────────────────────
function PrataMarker({ event, meta, onPress, tracks }: any) {
  const h1 = useRef(new Animated.Value(0.65)).current;
  const h2 = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(h1, { toValue: 1,    duration: 950,  useNativeDriver: true }),
      Animated.timing(h1, { toValue: 0.65, duration: 950,  useNativeDriver: true }),
    ])).start();
    setTimeout(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(h2, { toValue: 0.75, duration: 1150, useNativeDriver: true }),
        Animated.timing(h2, { toValue: 0.25, duration: 1150, useNativeDriver: true }),
      ])).start();
    }, 475);
  }, []);

  const size = 68;
  const likesCount = event.likes?.length ?? 0;

  return (
    <Marker
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={() => onPress(event)}
      tracksViewChanges={tracks}
      zIndex={20}
    >
      <View style={{ alignItems: 'center' }}>
        <PromoPin
          emoji={meta.emoji}
          photoUrl={event.promotionPhotoUrl}
          tierColor={PRATA}
          tierLabel="✦ PRATA ✦"
          tierBadge="🥈"
          size={size}
          ringWidth={8}
          labelColor="#5A6070"
        >
          <Animated.View style={[s.halo, {
            width: size + 30, height: size + 30,
            borderRadius: (size + 30) / 2,
            borderColor: PRATA, opacity: h2, top: -15,
          }]} />
          <Animated.View style={[s.halo, {
            width: size + 16, height: size + 16,
            borderRadius: (size + 16) / 2,
            borderColor: PRATA, borderWidth: 2, opacity: h1, top: -8,
          }]} />
        </PromoPin>
        <CountBadge count={likesCount} color="#E91E63" />
      </View>
    </Marker>
  );
}

// ─── Ouro ─────────────────────────────────────────────────────────────────────
function OuroMarker({ event, meta, onPress, tracks }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const h1    = useRef(new Animated.Value(0.55)).current;
  const h2    = useRef(new Animated.Value(0.20)).current;
  const stars = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.09, duration: 650,
        easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.97, duration: 650,
        easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.timing(h1, { toValue: 1,    duration: 850, useNativeDriver: true }),
      Animated.timing(h1, { toValue: 0.55, duration: 850, useNativeDriver: true }),
    ])).start();
    setTimeout(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(h2, { toValue: 0.70, duration: 1050, useNativeDriver: true }),
        Animated.timing(h2, { toValue: 0.20, duration: 1050, useNativeDriver: true }),
      ])).start();
    }, 420);

    Animated.loop(Animated.sequence([
      Animated.timing(stars, { toValue: 0.15, duration: 550, useNativeDriver: true }),
      Animated.timing(stars, { toValue: 1,    duration: 550, useNativeDriver: true }),
    ])).start();
  }, []);

  const size = 78;
  const likesCount = event.likes?.length ?? 0;

  return (
    <Marker
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={() => onPress(event)}
      tracksViewChanges={tracks}
      zIndex={30}
    >
      <View style={{ alignItems: 'center' }}>
        <PromoPin
          emoji={meta.emoji}
          photoUrl={event.promotionPhotoUrl}
          tierColor={OURO}
          tierLabel="★ OURO ★"
          tierBadge="🥇"
          size={size}
          ringWidth={9}
          labelColor={OURO_DK}
          animated
          scaleAnim={scale}
        >
          {/* Halos dourados */}
          <Animated.View style={[s.halo, {
            width: size + 40, height: size + 40,
            borderRadius: (size + 40) / 2,
            borderColor: OURO, opacity: h2, top: -20,
          }]} />
          <Animated.View style={[s.halo, {
            width: size + 22, height: size + 22,
            borderRadius: (size + 22) / 2,
            borderColor: OURO, borderWidth: 2.5, opacity: h1, top: -11,
          }]} />

          {/* Estrelas piscando */}
          <Animated.Text style={[s.starL, { opacity: stars }]}>★</Animated.Text>
          <Animated.Text style={[s.starR, { opacity: stars }]}>★</Animated.Text>
        </PromoPin>
        <CountBadge count={likesCount} color="#E91E63" />
      </View>
    </Marker>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  wrapper: { alignItems: 'center' },

  // Anel colorido do tier (corpo externo)
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    // iOS
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    // Android
    elevation: 14,
    overflow: 'visible',
  },

  // Centro branco — onde o emoji vive
  inner: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    // Sombra suave interna
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },

  emoji: { lineHeight: undefined, textAlign: 'center' },

  innerPhoto: {
    resizeMode: 'cover',
  },

  badge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  badgeEmoji: { fontSize: 11, lineHeight: 14 },

  tip: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },

  label: {
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
  },
  labelText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.7,
  },

  ground: {
    height: 5,
    borderRadius: 50,
    opacity: 0.25,
    marginTop: 3,
  },

  // Halo animado (glow ring)
  halo: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },

  starL: {
    position: 'absolute',
    top: -8,
    left: -15,
    fontSize: 15,
    color: OURO,
    textShadowColor: 'rgba(255,200,0,0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  starR: {
    position: 'absolute',
    top: -8,
    right: -15,
    fontSize: 15,
    color: OURO,
    textShadowColor: 'rgba(255,200,0,0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
});

// ─── Export principal ─────────────────────────────────────────────────────────
export function EntertainmentMarker({ event, onPress }: Props) {
  const meta = ENTERTAINMENT_CATEGORIES[event.category] ?? FALLBACK_META;
  const [tracks, setTracks] = useState(true);

  const isPromoted = !!(
    event.promotionTier &&
    event.promotionEndDate &&
    event.promotionEndDate > Date.now()
  );
  const tier = event.promotionTier;

  useEffect(() => {
    if (tier === 'ouro') return; // ouro mantém tracking (escala animada)
    const t = setTimeout(() => setTracks(false), isPromoted ? 1200 : 500);
    return () => clearTimeout(t);
  }, [isPromoted, tier]);

  if (!isPromoted)    return <NormalMarker event={event} meta={meta} onPress={onPress} tracks={tracks} />;
  if (tier === 'bronze') return <BronzeMarker event={event} meta={meta} onPress={onPress} tracks={tracks} />;
  if (tier === 'prata')  return <PrataMarker  event={event} meta={meta} onPress={onPress} tracks={tracks} />;
  if (tier === 'ouro')   return <OuroMarker   event={event} meta={meta} onPress={onPress} tracks={tracks} />;
  return <NormalMarker event={event} meta={meta} onPress={onPress} tracks={tracks} />;
}
