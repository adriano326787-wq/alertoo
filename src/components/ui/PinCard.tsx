/**
 * PinCard — retângulos PUROS no mapa (sem cantos arredondados, sem tail).
 *
 * Estilo:
 *   - Retângulos retos (border-radius 0)
 *   - Sem ponta/tail (anchor 0.5, 0.5 — centrado na coordenada)
 *   - Imagem/conteúdo centralizado no meio do card
 *   - Borda fina + sombra suave
 *
 * Tipos:
 *   - StandardCard: ícone + nome centralizados
 *   - PremiumCard:  foto cobrindo todo o card + overlays (tier + nome)
 *   - AlertCard:    bg colorido sólido + ícone + label
 *   - LiveCard:     standard + badge LIVE
 *   - PartnerCard:  branco com logo
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Animated, Easing, ImageSourcePropType, StyleSheet } from 'react-native';
import { palette, shadow, platformShadow } from '../../theme/tokens';

// ═══════════════════════════════════════════════════════════════════════════════
//  StandardCard — retângulo branco, ícone + nome centralizados
//
//   ┌───────────────┐
//   │               │
//   │  🍔  Festival │   ← centralizado vertical e horizontal
//   │               │
//   └───────────────┘
// ═══════════════════════════════════════════════════════════════════════════════

interface StandardCardProps {
  color: string;
  icon: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StandardCard({ color, icon, label, size = 'md' }: StandardCardProps) {
  const config = {
    sm: { w: 110, h: 36, iconFs: 16, fontSize: 11, padH: 8, iconBoxW: 30 },
    md: { w: 138, h: 42, iconFs: 18, fontSize: 12, padH: 10, iconBoxW: 34 },
    lg: { w: 165, h: 50, iconFs: 21, fontSize: 13, padH: 12, iconBoxW: 40 },
  }[size];

  const showLabel = !!label;
  const displayLabel = label && label.length > 18 ? label.slice(0, 16) + '…' : label;

  return (
    <View style={{
      width: config.w,
      height: config.h,
      backgroundColor: '#ffffff',
      borderWidth: 1.5,
      borderColor: color,
      borderRadius: 10, // cantos arredondados sutis (estilo Google Maps card)
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
      ...platformShadow(shadow.lg),
    }}>
      {/* Bloco do ícone — bg colorido categoria */}
      <View style={{
        width: config.iconBoxW,
        height: '100%',
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{ fontSize: config.iconFs, includeFontPadding: false }}>{icon}</Text>
      </View>
      {/* Label */}
      {showLabel ? (
        <View style={{ flex: 1, paddingHorizontal: config.padH }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: config.fontSize,
              fontWeight: '800',
              color: '#0F172A',
              includeFontPadding: false,
              letterSpacing: -0.1,
            }}
          >
            {displayLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PremiumCard — retângulo grande com foto centralizada + overlays
//
//   ┌────────────────┐
//   │ 🥇 OURO        │  ← chip tier overlay top
//   │                │
//   │  [FOTO COVER]  │  ← foto preenche todo o card
//   │   centralizada │
//   │           🎤   │  ← mini-badge overlay bottom-right
//   ├────────────────┤
//   │  Nome evento   │  ← faixa de nome bg semi-transparente
//   └────────────────┘
// ═══════════════════════════════════════════════════════════════════════════════

interface PremiumCardProps {
  tier: 'bronze' | 'prata' | 'ouro';
  color: string;
  icon: string;
  photoUrl?: string | null;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  onPhotoLoad?: () => void;
}

const TIER_META = {
  bronze: { color: palette.bronze[400], label: 'BRONZE', emoji: '🥉', borderW: 2 },
  prata:  { color: palette.silver[400], label: 'PRATA',  emoji: '🥈', borderW: 2.5 },
  ouro:   { color: palette.gold[400],   label: 'OURO',   emoji: '🥇', borderW: 3 },
} as const;

export function PremiumCard({
  tier, color, icon, photoUrl, title, size = 'md', onPhotoLoad,
}: PremiumCardProps) {
  const tm = TIER_META[tier];
  const ring = useRef(new Animated.Value(0.45)).current;
  const isAnim = tier === 'ouro' || tier === 'prata';

  useEffect(() => {
    if (!isAnim) return;
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(ring, { toValue: 0.85, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(ring, { toValue: 0.45, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [isAnim]);

  const dim = {
    sm: { w: 110, h: 110, fs: 11, badgeFs: 9 },
    md: { w: 150, h: 150, fs: 12, badgeFs: 10 },
    lg: { w: 180, h: 180, fs: 13, badgeFs: 10 },
  }[size];

  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = !!photoUrl && !photoFailed;
  const displayTitle = title.length > 22 ? title.slice(0, 20) + '…' : title;

  return (
    <View style={{ position: 'relative', padding: 6 }}>
      {/* Anel pulsante (Prata/Ouro) */}
      {isAnim ? (
        <Animated.View style={{
          position: 'absolute',
          top: 0, left: 0,
          width: dim.w + 12,
          height: dim.h + 12,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: tm.color,
          backgroundColor: 'transparent',
          opacity: ring,
        }} />
      ) : null}

      {/* Card retangular com cantos arredondados sutis */}
      <View style={{
        width: dim.w,
        height: dim.h,
        borderRadius: 12,
        backgroundColor: tm.color + '15',
        borderWidth: tm.borderW,
        borderColor: tm.color,
        overflow: 'hidden',
        ...platformShadow(shadow.glow(tm.color)),
      }}>
        {/* Foto cover centralizada (preenche todo o card) */}
        {showPhoto ? (
          <Image
            source={{ uri: photoUrl! }}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
            onLoad={() => onPhotoLoad?.()}
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: dim.h * 0.45, includeFontPadding: false }}>{icon}</Text>
          </View>
        )}

        {/* OVERLAYS */}
        {/* Tier chip top-left */}
        <View style={{
          position: 'absolute',
          top: 6, left: 6,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 6,
          paddingVertical: 3,
          backgroundColor: tm.color,
          ...platformShadow(shadow.sm),
        }}>
          <Text style={{ fontSize: dim.badgeFs + 1, marginRight: 3, lineHeight: dim.badgeFs + 3 }}>{tm.emoji}</Text>
          <Text style={{
            fontSize: dim.badgeFs,
            fontWeight: '900',
            color: '#fff',
            letterSpacing: 0.4,
            includeFontPadding: false,
          }}>{tm.label}</Text>
        </View>

        {/* Estrela Ouro top-right */}
        {tier === 'ouro' ? (
          <Text style={{
            position: 'absolute',
            top: 4, right: 6,
            fontSize: 16, color: palette.gold[400],
            textShadowColor: 'rgba(120,80,0,0.9)',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 4,
          }}>★</Text>
        ) : null}

        {/* Mini-badge categoria (bottom-right, só quando há foto) */}
        {showPhoto ? (
          <View style={{
            position: 'absolute',
            bottom: 28, right: 6,
            width: 24, height: 24,
            backgroundColor: '#fff',
            borderWidth: 1.5, borderColor: tm.color,
            alignItems: 'center', justifyContent: 'center',
            ...platformShadow(shadow.sm),
          }}>
            <Text style={{ fontSize: 13, includeFontPadding: false }}>{icon}</Text>
          </View>
        ) : null}

        {/* Faixa do nome (bottom, bg semi-transparente preto p/ legibilidade) */}
        <View style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          paddingHorizontal: 8,
          paddingVertical: 5,
        }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: dim.fs,
              fontWeight: '800',
              color: '#fff',
              includeFontPadding: false,
            }}
          >
            {displayTitle}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AlertCard — retângulo colorido sólido + pulse
//
//   ┌────────────────┐
//   │  ⚠️  Acidente  │  ← centralizado
//   └────────────────┘
// ═══════════════════════════════════════════════════════════════════════════════

export function AlertCard({
  color = palette.alert, icon = '⚠️', label, size = 'md',
}: { color?: string; icon?: string; label?: string; size?: 'sm' | 'md' | 'lg' }) {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.75, duration: 850, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.35, duration: 850, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);

  const dim = {
    sm: { w: 120, h: 36, iconFs: 14, fontSize: 11, padH: 8, br: 10 },
    md: { w: 150, h: 42, iconFs: 16, fontSize: 12, padH: 10, br: 11 },
    lg: { w: 180, h: 50, iconFs: 19, fontSize: 13, padH: 12, br: 12 },
  }[size];

  const displayLabel = label && label.length > 18 ? label.slice(0, 16) + '…' : label;

  return (
    <View style={{ position: 'relative', padding: 5 }}>
      {/* Pulse externo */}
      <Animated.View style={{
        position: 'absolute',
        top: 0, left: 0,
        width: dim.w + 10,
        height: dim.h + 10,
        borderRadius: dim.br + 4,
        backgroundColor: color,
        opacity: pulse,
      }} />
      {/* Card sólido */}
      <View style={{
        width: dim.w,
        height: dim.h,
        borderRadius: dim.br,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: dim.padH,
        ...platformShadow(shadow.glow(color)),
      }}>
        <Text style={{
          fontSize: dim.iconFs,
          marginRight: displayLabel ? 8 : 0,
          includeFontPadding: false,
        }}>{icon}</Text>
        {displayLabel ? (
          <Text
            numberOfLines={1}
            style={{
              fontSize: dim.fontSize,
              fontWeight: '900',
              color: '#fff',
              letterSpacing: 0.3,
              includeFontPadding: false,
              flexShrink: 1,
            }}
          >
            {displayLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LiveCard — StandardCard + badge LIVE flutuante
// ═══════════════════════════════════════════════════════════════════════════════

export function LiveCard({
  color, icon, label, size = 'md',
}: { color: string; icon: string; label?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dot = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(dot, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(dot, { toValue: 0.4, duration: 600, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={{ position: 'relative' }}>
      <StandardCard color={color} icon={icon} label={label} size={size} />
      <View style={{
        position: 'absolute',
        top: -6, right: -8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 5,
        paddingVertical: 2,
        backgroundColor: palette.live,
        ...platformShadow(shadow.sm),
      }}>
        <Animated.View style={{
          width: 5, height: 5,
          backgroundColor: '#fff',
          marginRight: 3,
          opacity: dot,
        }} />
        <Text style={{ fontSize: 8, fontWeight: '900', color: '#fff', letterSpacing: 0.5, includeFontPadding: false }}>
          LIVE
        </Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PartnerCard — retângulo branco com logo
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerCard({
  logo, label, color = palette.brand[500],
}: { logo?: ImageSourcePropType; label?: string; color?: string }) {
  return (
    <View style={{
      paddingHorizontal: 10, paddingVertical: 7,
      backgroundColor: '#fff',
      borderWidth: 1.5,
      borderColor: color,
      flexDirection: 'row', alignItems: 'center',
      ...platformShadow(shadow.lg),
    }}>
      {logo ? (
        <Image source={logo} style={{ width: 20, height: 20, marginRight: label ? 6 : 0 }} resizeMode="contain" />
      ) : null}
      {label ? (
        <Text style={{ fontSize: 12, fontWeight: '800', color, includeFontPadding: false }}>{label}</Text>
      ) : null}
    </View>
  );
}
