/**
 * Pin primitives — formas reutilizáveis para os marcadores do mapa.
 *
 * Tipos:
 *   - DropPin: gota moderna (padrão)
 *   - PremiumPin: gota premium com glow + borda gold
 *   - AlertPin: alerta com pulse animação
 *   - LivePin: círculo com badge LIVE
 *   - PartnerPin: retângulo arredondado para parceiros
 *
 * Todos respondem a `size`, `color`, `icon` (emoji ou texto).
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, Image, ImageSourcePropType } from 'react-native';
import { palette, shadow, platformShadow } from '../../theme/tokens';

interface BasePinProps {
  size: number;
  color: string;
  icon?: string;          // emoji
  iconColor?: string;     // cor do glifo
  logo?: ImageSourcePropType;
  ringColor?: string;     // halo externo
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DropPin — gota moderna minimalista (padrão)
//
//   ╭───╮
//   │ ◉ │  ← círculo com ícone branco
//   ╰─┬─╯
//     ▼     ← ponta sutil
// ═══════════════════════════════════════════════════════════════════════════════

export function DropPin({ size, color, icon, iconColor = '#fff', logo }: BasePinProps) {
  const bodyR = size * 0.5;
  const tipW  = size * 0.32;
  const tipH  = size * 0.20;
  const innerSize = size - 6;
  const iconFontSize = size * 0.46;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{
        width: size,
        height: size,
        borderRadius: bodyR,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.95)',
        alignItems: 'center',
        justifyContent: 'center',
        ...platformShadow(shadow.lg),
      }}>
        {/* Subtle shine no topo (não cobre o ícone) */}
        <View pointerEvents="none" style={{
          position: 'absolute',
          top: 2, left: 2,
          width: innerSize, height: innerSize * 0.28,
          borderTopLeftRadius: bodyR - 2,
          borderTopRightRadius: bodyR - 2,
          backgroundColor: 'rgba(255,255,255,0.22)',
        }} />
        {logo ? (
          <Image
            source={logo}
            style={{ width: innerSize * 0.8, height: innerSize * 0.8, borderRadius: innerSize * 0.4 }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ fontSize: iconFontSize, color: iconColor, includeFontPadding: false }}>
            {icon}
          </Text>
        )}
      </View>
      {/* Tip — pequena gota para baixo */}
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: tipW / 2,
        borderRightWidth: tipW / 2,
        borderTopWidth: tipH,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: color,
        marginTop: -2,
      }} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PremiumPin — versão premium com halo gold sutil
// ═══════════════════════════════════════════════════════════════════════════════

export function PremiumPin({
  size, color, icon, iconColor = '#fff', logo, ringColor = palette.gold[400],
}: BasePinProps) {
  const ring = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(ring, { toValue: 0.9, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(ring, { toValue: 0.5, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);

  const bodyR = size * 0.5;
  const innerSize = size - 8;
  const iconFontSize = size * 0.44;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size + 18, height: size + 22 }}>
      {/* Halo gold pulsante */}
      <Animated.View style={{
        position: 'absolute',
        top: (size + 22 - (size + 14)) / 2,
        width: size + 14,
        height: size + 14,
        borderRadius: (size + 14) / 2,
        borderWidth: 2,
        borderColor: ringColor,
        backgroundColor: 'transparent',
        opacity: ring,
      }} />
      {/* Corpo do pin */}
      <View style={{
        width: size, height: size,
        borderRadius: bodyR,
        backgroundColor: color,
        borderWidth: 2.5,
        borderColor: ringColor,
        alignItems: 'center', justifyContent: 'center',
        ...platformShadow(shadow.glow(ringColor)),
      }}>
        {/* Shine sutil */}
        <View pointerEvents="none" style={{
          position: 'absolute',
          top: 2, left: 2,
          width: innerSize, height: innerSize * 0.28,
          borderTopLeftRadius: bodyR - 2,
          borderTopRightRadius: bodyR - 2,
          backgroundColor: 'rgba(255,255,255,0.24)',
        }} />
        {logo ? (
          <Image
            source={logo}
            style={{ width: innerSize * 0.78, height: innerSize * 0.78, borderRadius: innerSize * 0.39 }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ fontSize: iconFontSize, color: iconColor, includeFontPadding: false }}>
            {icon}
          </Text>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AlertPin — vermelho/laranja, animação pulse (urgência)
// ═══════════════════════════════════════════════════════════════════════════════

export function AlertPin({ size, color = palette.alert, icon }: { size: number; color?: string; icon?: string }) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.9, duration: 850, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.4, duration: 850, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);

  const bodyR = size * 0.5;
  const iconFontSize = size * 0.5;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size + 20, height: size + 20 }}>
      {/* Pulse externo */}
      <Animated.View style={{
        position: 'absolute',
        width: size + 16,
        height: size + 16,
        borderRadius: (size + 16) / 2,
        backgroundColor: color,
        opacity: pulse,
      }} />
      {/* Corpo */}
      <View style={{
        width: size, height: size,
        borderRadius: bodyR,
        backgroundColor: color,
        borderWidth: 2.5,
        borderColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        ...platformShadow(shadow.glow(color)),
      }}>
        <Text style={{ fontSize: iconFontSize, color: '#fff', fontWeight: '900', includeFontPadding: false }}>
          {icon ?? '!'}
        </Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LivePin — badge LIVE pequeno (eventos em tempo real)
// ═══════════════════════════════════════════════════════════════════════════════

export function LivePin({ size, color, icon }: { size: number; color: string; icon?: string }) {
  const dot = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(dot, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(dot, { toValue: 0.4, duration: 600, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);

  const bodyR = size * 0.5;
  const iconFontSize = size * 0.46;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{
        width: size, height: size,
        borderRadius: bodyR,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        ...platformShadow(shadow.lg),
      }}>
        <Text style={{ fontSize: iconFontSize, color: '#fff', includeFontPadding: false }}>{icon}</Text>
        {/* Badge LIVE */}
        <View style={{
          position: 'absolute',
          top: -6, right: -10,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 5,
          paddingVertical: 1.5,
          borderRadius: 8,
          backgroundColor: palette.live,
          ...platformShadow(shadow.sm),
        }}>
          <Animated.View style={{
            width: 5, height: 5,
            borderRadius: 2.5,
            backgroundColor: '#fff',
            marginRight: 3,
            opacity: dot,
          }} />
          <Text style={{ fontSize: 8, fontWeight: '900', color: '#fff', letterSpacing: 0.5 }}>LIVE</Text>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PartnerPin — retângulo corporativo elegante
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerPin({ size, color, logo, label }: { size: number; color: string; logo?: ImageSourcePropType; label?: string }) {
  return (
    <View style={{
      paddingHorizontal: 8, paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: '#fff',
      borderWidth: 1.5,
      borderColor: color,
      flexDirection: 'row', alignItems: 'center',
      ...platformShadow(shadow.lg),
    }}>
      {logo ? (
        <Image source={logo} style={{ width: 22, height: 22, borderRadius: 4, marginRight: 6 }} resizeMode="contain" />
      ) : null}
      {label ? (
        <Text style={{ fontSize: 12, fontWeight: '800', color, includeFontPadding: false }}>{label}</Text>
      ) : null}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ClusterPin — círculo com contador
// ═══════════════════════════════════════════════════════════════════════════════

export function ClusterPin({ size, count, color = palette.brand[500] }: { size: number; count: number; color?: string }) {
  const label = count > 99 ? '99+' : String(count);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size + 12, height: size + 12 }}>
      {/* Halo externo translúcido */}
      <View style={{
        position: 'absolute',
        width: size + 10,
        height: size + 10,
        borderRadius: (size + 10) / 2,
        backgroundColor: color + '30',
      }} />
      {/* Corpo */}
      <View style={{
        width: size, height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        ...platformShadow(shadow.lg),
      }}>
        <Text style={{
          fontSize: Math.max(13, size * 0.36),
          fontWeight: '900',
          color: '#fff',
          includeFontPadding: false,
        }}>
          {label}
        </Text>
      </View>
    </View>
  );
}
