/**
 * PinCard — cards de mapa com ícones completos e visíveis.
 *
 * Correções v2:
 *   - Removido overflow:hidden que cortava emojis no Android
 *   - IconBox agora tem padding próprio ao invés de height:'100%'
 *   - AlertCard outer wrapper corretamente dimensionado para o pulse
 *   - Emojis maiores e com lineHeight explícito para não serem clipped
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Animated, Easing, ImageSourcePropType, StyleSheet } from 'react-native';
import { palette, shadow, platformShadow } from '../../theme/tokens';

// ═══════════════════════════════════════════════════════════════════════════════
//  StandardCard — pill branco com ícone colorido + label
//
//   ╭──────────────────────╮
//   │ 🟠  Congestionamento  │
//   ╰──────────────────────╯
// ═══════════════════════════════════════════════════════════════════════════════

interface StandardCardProps {
  color: string;
  icon: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StandardCard({ color, icon, label, size = 'md' }: StandardCardProps) {
  const config = {
    //             iconBox   cardH  iconFs  labelFs  padH  gap  br
    sm: { iconBoxW: 32, h: 38, iconFs: 17, fontSize: 11, padH: 8,  gap: 0, br: 19 },
    md: { iconBoxW: 38, h: 44, iconFs: 20, fontSize: 12, padH: 10, gap: 0, br: 22 },
    lg: { iconBoxW: 46, h: 52, iconFs: 24, fontSize: 13, padH: 12, gap: 0, br: 26 },
  }[size];

  const showLabel = !!label;
  const displayLabel = label && label.length > 18 ? label.slice(0, 16) + '…' : label;

  // Largura total: iconBox + padding esquerda do label + texto estimado + padding direita
  const approxLabelW = showLabel ? (displayLabel!.length * config.fontSize * 0.62) + config.padH * 2 : 0;
  const totalW = config.iconBoxW + (showLabel ? approxLabelW : 0);

  return (
    <View style={{
      height: config.h,
      minWidth: config.iconBoxW,
      maxWidth: showLabel ? 175 : config.iconBoxW,
      backgroundColor: '#ffffff',
      borderWidth: 1.5,
      borderColor: color,
      borderRadius: config.br,
      flexDirection: 'row',
      alignItems: 'center',
      // SEM overflow:hidden — permite emoji completo no Android
      ...platformShadow(shadow.lg),
    }}>
      {/* Bloco do ícone — círculo colorido à esquerda */}
      <View style={{
        width: config.iconBoxW,
        height: config.h,
        borderRadius: config.br,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        // Garante que o bloco colorido tem cantos arredondados corretos
        borderTopRightRadius: showLabel ? 0 : config.br,
        borderBottomRightRadius: showLabel ? 0 : config.br,
      }}>
        <Text style={{
          fontSize: config.iconFs,
          lineHeight: config.iconFs + 6,  // evita clipping vertical no Android
          includeFontPadding: false,
          textAlignVertical: 'center',
        }}>
          {icon}
        </Text>
      </View>

      {/* Label */}
      {showLabel ? (
        <View style={{ flex: 1, paddingHorizontal: config.padH, paddingRight: config.padH + 2 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: config.fontSize,
              fontWeight: '800',
              color: '#0F172A',
              includeFontPadding: false,
              letterSpacing: -0.2,
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
//  PremiumCard — retângulo com foto + overlays de tier
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
            <Text style={{ fontSize: dim.h * 0.45, lineHeight: dim.h * 0.52, includeFontPadding: false }}>{icon}</Text>
          </View>
        )}

        {/* Tier chip top-left */}
        <View style={{
          position: 'absolute',
          top: 6, left: 6,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 6,
          paddingVertical: 3,
          backgroundColor: tm.color,
          borderRadius: 6,
          ...platformShadow(shadow.sm),
        }}>
          <Text style={{ fontSize: dim.badgeFs + 1, marginRight: 3, lineHeight: dim.badgeFs + 4 }}>{tm.emoji}</Text>
          <Text style={{
            fontSize: dim.badgeFs,
            fontWeight: '900',
            color: '#fff',
            letterSpacing: 0.4,
            includeFontPadding: false,
          }}>{tm.label}</Text>
        </View>

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

        {showPhoto ? (
          <View style={{
            position: 'absolute',
            bottom: 28, right: 6,
            width: 26, height: 26,
            borderRadius: 13,
            backgroundColor: '#fff',
            borderWidth: 1.5, borderColor: tm.color,
            alignItems: 'center', justifyContent: 'center',
            ...platformShadow(shadow.sm),
          }}>
            <Text style={{ fontSize: 14, lineHeight: 18, includeFontPadding: false }}>{icon}</Text>
          </View>
        ) : null}

        <View style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          paddingHorizontal: 8,
          paddingVertical: 5,
        }}>
          <Text numberOfLines={1} style={{
            fontSize: dim.fs,
            fontWeight: '800',
            color: '#fff',
            includeFontPadding: false,
          }}>
            {displayTitle}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AlertCard — pill colorido sólido com ícone GRANDE + pulse
//
//   ╭─────────────────────╮
//   │  ⚠️  Acidente grave  │  ← pulse atrás
//   ╰─────────────────────╯
// ═══════════════════════════════════════════════════════════════════════════════

export function AlertCard({
  color = palette.alert, icon = '⚠️', label, size = 'md',
}: { color?: string; icon?: string; label?: string; size?: 'sm' | 'md' | 'lg' }) {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.7, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.3, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);

  const dim = {
    //        cardH  iconFs  fontSize  padH   br    pulse
    sm: { h: 38, iconFs: 18, fontSize: 11, padH: 10, br: 19, pulseExtra: 12 },
    md: { h: 44, iconFs: 22, fontSize: 12, padH: 12, br: 22, pulseExtra: 14 },
    lg: { h: 52, iconFs: 26, fontSize: 13, padH: 14, br: 26, pulseExtra: 16 },
  }[size];

  const displayLabel = label && label.length > 18 ? label.slice(0, 16) + '…' : label;

  // Estima a largura do card para dimensionar o container do pulse corretamente
  const approxLabelChars = displayLabel ? displayLabel.length : 0;
  const approxW = 50 + (approxLabelChars * dim.fontSize * 0.62) + dim.padH * 2;
  const cardW = Math.min(Math.max(approxW, dim.h * 1.2), 185); // mínimo arredondado, máximo 185

  const outerW = cardW + dim.pulseExtra;
  const outerH = dim.h + dim.pulseExtra;
  const pulseOffset = dim.pulseExtra / 2;

  return (
    // Wrapper com tamanho EXPLÍCITO para o pulse não ser clippado pelo mapa
    <View style={{ width: outerW, height: outerH, alignItems: 'center', justifyContent: 'center' }}>
      {/* Pulse externo */}
      <Animated.View style={{
        position: 'absolute',
        width: outerW,
        height: outerH,
        borderRadius: dim.br + pulseOffset,
        backgroundColor: color,
        opacity: pulse,
      }} />

      {/* Card pill sólido */}
      <View style={{
        width: cardW,
        height: dim.h,
        borderRadius: dim.br,
        backgroundColor: color,
        borderWidth: 2.5,
        borderColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: dim.padH,
        ...platformShadow(shadow.glow(color)),
      }}>
        {/* Ícone GRANDE — sem overflow:hidden para não cortar emoji */}
        <Text style={{
          fontSize: dim.iconFs,
          lineHeight: dim.iconFs + 6,
          includeFontPadding: false,
          marginRight: displayLabel ? 8 : 0,
        }}>
          {icon}
        </Text>
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
    // Wrapper com espaço para o badge LIVE não ser clippado
    <View style={{ paddingTop: 10, paddingRight: 10 }}>
      <StandardCard color={color} icon={icon} label={label} size={size} />
      <View style={{
        position: 'absolute',
        top: 2, right: 2,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2.5,
        backgroundColor: palette.live,
        borderRadius: 8,
        ...platformShadow(shadow.sm),
      }}>
        <Animated.View style={{
          width: 5, height: 5,
          borderRadius: 2.5,
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
      borderRadius: 10,
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
