/**
 * Pin primitives — círculos para os marcadores do mapa.
 *
 * REGRAS ANDROID (react-native-maps custom markers, Old Architecture):
 *   1. O wrapper externo DEVE ter width e height explícitos
 *   2. O wrapper externo DEVE ter collapsable={false}
 *      (sem isso, o Android colapsa o nó e o bitmap é capturado parcialmente)
 *   3. NÃO usar elevation/shadow nos filhos do marcador
 *      (elevation desloca o bitmap capturado pelo mapa)
 *   4. Animações: useNativeDriver={false}
 *      (useNativeDriver:true pode causar estado inconsistente no bitmap capture)
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, Image, ImageSourcePropType } from 'react-native';
import { palette } from '../../theme/tokens';

// ═══════════════════════════════════════════════════════════════════════════════
//  BasePinProps
// ═══════════════════════════════════════════════════════════════════════════════

interface BasePinProps {
  size: number;
  color: string;
  icon?: string;
  iconColor?: string;
  logo?: ImageSourcePropType;
  ringColor?: string;
  onLayout?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DropPin — círculo simples com ícone
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Dimensões do pin retangular ─────────────────────────────────────────────
// width = size * 1.6  height = size  borderRadius = 7
// Mantém proporção legível de pílula/crachá em todos os níveis de zoom.

export function DropPin({ size, color, icon, iconColor = '#fff', logo, onLayout }: BasePinProps) {
  const pinW = Math.round(size * 1.6);
  const pinH = size;
  const iconFontSize = Math.round(size * 0.46);

  return (
    <View
      collapsable={false}
      onLayout={onLayout}
      style={{ width: pinW, height: pinH, overflow: 'hidden' }}
    >
      <View style={{
        width: pinW,
        height: pinH,
        borderRadius: 7,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {logo ? (
          <Image
            source={logo}
            style={{ width: pinH * 0.6, height: pinH * 0.6, borderRadius: 4 }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{
            fontSize: iconFontSize,
            lineHeight: iconFontSize + 4,
            color: iconColor,
            includeFontPadding: false,
            textAlignVertical: 'center',
          }}>
            {icon}
          </Text>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PremiumPin — círculo com halo colorido pulsante (promovidos)
// ═══════════════════════════════════════════════════════════════════════════════

export function PremiumPin({
  size, color, icon, iconColor = '#fff', logo, ringColor = palette.gold[400], onLayout,
}: BasePinProps) {
  const ring = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(ring, { toValue: 0.9, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      Animated.timing(ring, { toValue: 0.4, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);

  const pinW = Math.round(size * 1.6);
  const pinH = size;
  const halo = 12;
  const outer = pinW + halo;
  const outerH = pinH + halo;
  const iconFontSize = Math.round(size * 0.44);

  return (
    <View
      collapsable={false}
      onLayout={onLayout}
      style={{ width: outer, height: outerH, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      {/* Halo pulsante */}
      <Animated.View style={{
        position: 'absolute',
        top: 0, left: 0,
        width: outer,
        height: outerH,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: ringColor,
        opacity: ring,
      }} />
      {/* Retângulo principal */}
      <View style={{
        width: pinW,
        height: pinH,
        borderRadius: 7,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: ringColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {logo ? (
          <Image
            source={logo}
            style={{ width: pinH * 0.6, height: pinH * 0.6, borderRadius: 4 }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{
            fontSize: iconFontSize,
            lineHeight: iconFontSize + 4,
            color: iconColor,
            includeFontPadding: false,
            textAlignVertical: 'center',
          }}>
            {icon}
          </Text>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LeiSecaPin — marcador de destaque máximo para Lei Seca
//
//  Design: escudo verde vibrante com "LEI SECA" em negrito, duplo anel pulsante,
//  maior que todos os outros pins — identificável à primeira vista.
// ═══════════════════════════════════════════════════════════════════════════════

const LSC = '#00C853'; // verde Lei Seca

// Dimensões equilibradas — visível em qualquer zoom, sem ocupar demais o mapa
const LS_PIN  = 40;              // corpo do pin (quadrado verde)
const LS_RING = LS_PIN + 10;    // anel pulsante ao redor
const LS_W    = LS_RING + 4;    // largura total (margem para anel)
const LS_H    = LS_RING + 4;    // altura total
const LS_TAIL = 8;               // cauda triangular
const LS_LBL  = 16;             // altura da label

export function LeiSecaPin({ onLayout }: { size?: number; onLayout?: () => void }) {
  const ring = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(ring, { toValue: 1.0,  duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(ring, { toValue: 0.4,  duration: 900, easing: Easing.in(Easing.quad),  useNativeDriver: false }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);

  const totalH = LS_H + LS_TAIL + LS_LBL + 2;
  const bodyOffset = (LS_W - LS_PIN) / 2;

  return (
    <View
      collapsable={false}
      onLayout={onLayout}
      style={{ width: LS_W, height: totalH, alignItems: 'center' }}
    >
      {/* Anel pulsante */}
      <Animated.View style={{
        position: 'absolute',
        top: (LS_H - LS_RING) / 2,
        left: (LS_W - LS_RING) / 2,
        width: LS_RING,
        height: LS_RING,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: LSC,
        opacity: ring,
      }} />

      {/* Corpo do pin */}
      <View style={{
        position: 'absolute',
        top: bodyOffset,
        left: bodyOffset,
        width: LS_PIN,
        height: LS_PIN,
        borderRadius: 10,
        backgroundColor: LSC,
        borderWidth: 2.5,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 17, includeFontPadding: false, lineHeight: 20 }}>🍺</Text>
        <Text style={{
          fontSize: 8, fontWeight: '900', color: '#fff',
          letterSpacing: 0.8, includeFontPadding: false, marginTop: 1,
        }}>LEI SECA</Text>
      </View>

      {/* Cauda triangular */}
      <View style={{
        position: 'absolute',
        top: LS_H,
        width: 0, height: 0,
        borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: LS_TAIL,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderTopColor: LSC,
      }} />

      {/* Label abaixo — sempre visível em qualquer zoom */}
      <View style={{
        position: 'absolute',
        top: LS_H + LS_TAIL + 2,
        backgroundColor: LSC,
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderWidth: 1,
        borderColor: '#fff',
      }}>
        <Text style={{
          fontSize: 8, fontWeight: '900', color: '#fff',
          letterSpacing: 0.8, includeFontPadding: false,
        }}>LEI SECA</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AlertPin — círculo com pulse de urgência
// ═══════════════════════════════════════════════════════════════════════════════

export function AlertPin({ size, color = palette.alert, icon, onLayout }: { size: number; color?: string; icon?: string; onLayout?: () => void }) {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.8,  duration: 850, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.35, duration: 850, easing: Easing.in(Easing.quad),  useNativeDriver: false }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);

  const pinW = Math.round(size * 1.6);
  const pinH = size;
  const extra = 14;
  const outer  = pinW + extra;
  const outerH = pinH + extra;
  const iconFontSize = Math.round(size * 0.48);

  return (
    <View
      collapsable={false}
      onLayout={onLayout}
      style={{ width: outer, height: outerH, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      {/* Pulse */}
      <Animated.View style={{
        position: 'absolute',
        top: 0, left: 0,
        width: outer,
        height: outerH,
        borderRadius: 10,
        backgroundColor: color,
        opacity: pulse,
      }} />
      {/* Retângulo */}
      <View style={{
        width: pinW,
        height: pinH,
        borderRadius: 7,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{
          fontSize: iconFontSize,
          lineHeight: iconFontSize + 4,
          color: '#fff',
          fontWeight: '900',
          includeFontPadding: false,
          textAlignVertical: 'center',
        }}>
          {icon ?? '!'}
        </Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LivePin — círculo com badge LIVE animado
// ═══════════════════════════════════════════════════════════════════════════════

export function LivePin({ size, color, icon, onLayout }: { size: number; color: string; icon?: string; onLayout?: () => void }) {
  const dot = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(dot, { toValue: 1,   duration: 600, useNativeDriver: false }),
      Animated.timing(dot, { toValue: 0.4, duration: 600, useNativeDriver: false }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);

  const pinW = Math.round(size * 1.6);
  const pinH = size;
  const iconFontSize = Math.round(size * 0.46);
  const outerW = pinW + 20;
  const outerH = pinH + 12;

  return (
    <View
      collapsable={false}
      onLayout={onLayout}
      style={{ width: outerW, height: outerH, overflow: 'hidden' }}
    >
      {/* Retângulo principal — na base esquerda */}
      <View style={{
        position: 'absolute',
        bottom: 0, left: 0,
        width: pinW,
        height: pinH,
        borderRadius: 7,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{
          fontSize: iconFontSize,
          lineHeight: iconFontSize + 4,
          color: '#fff',
          includeFontPadding: false,
          textAlignVertical: 'center',
        }}>
          {icon}
        </Text>
      </View>
      {/* Badge LIVE — canto superior direito */}
      <View style={{
        position: 'absolute',
        top: 0, right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 8,
        backgroundColor: palette.live,
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
//  ClusterPin — círculo com contador
// ═══════════════════════════════════════════════════════════════════════════════

export function ClusterPin({ size, count, color = palette.brand[500] }: { size: number; count: number; color?: string }) {
  const label = count > 99 ? '99+' : String(count);
  const outer = size + 10;

  return (
    <View
      collapsable={false}
      style={{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      {/* Halo translúcido */}
      <View style={{
        position: 'absolute',
        top: 0, left: 0,
        width: outer, height: outer,
        borderRadius: outer / 2,
        backgroundColor: color + '30',
      }} />
      {/* Corpo */}
      <View style={{
        width: size, height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#fff',
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

// ═══════════════════════════════════════════════════════════════════════════════
//  PromotedMarkerCard — retângulo de card para eventos promovidos no mapa
//
//  Layout:
//    ┌──────────────────────────┐ ← borda colorida por tier (2-3 px)
//    │ [foto do evento]  [🥇]  │ ← foto em contain + badge tier no canto
//    │                          │
//    ├──────────────────────────┤
//    │ Nome do Evento Truncado   │ ← faixa de nome (branco, bold)
//    └────────────┬─────────────┘
//                 ▼  ← cauda triangular apontando para a coordenada
//
//  Regras (promo-marketing skill):
//    - Foto em `contain` (nunca `cover`) — o organizador pagou para ser visto inteiro
//    - Letterbox na cor do tier quando a foto não preenche a área
//    - Animação de halo pulsante SOMENTE no tier Ouro
//    - Âncora (0.5, 1.0) → cauda aponta para a coordenada exata do evento
// ═══════════════════════════════════════════════════════════════════════════════

interface PromotedCardProps {
  /** Largura total do card (px) */
  cardW: number;
  /** Altura da área de foto (px) */
  photoH: number;
  /** Altura da faixa de nome (px) */
  nameH: number;
  /** Altura da cauda triangular (px). Default: 8 */
  tailH?: number;
  /** URL da foto de promoção do evento */
  photoUrl?: string | null;
  /** Título do evento (exibido na faixa inferior) */
  label: string;
  /** Emoji da categoria (fallback quando não há foto) */
  emoji: string;
  /** Tier de promoção */
  tier: 'bronze' | 'prata' | 'ouro';
  /** Cor da borda e cauda (palette.bronze/silver/gold) */
  borderColor: string;
  /** Cor de fundo da letterbox (tier colorida, semi-transparente) */
  letterboxColor: string;
  onLayout?: () => void;
  onImageLoad?: () => void;
}

const TIER_BADGE_EMOJI: Record<string, string> = {
  bronze: '🥉',
  prata:  '🥈',
  ouro:   '🥇',
};

export function PromotedMarkerCard({
  cardW,
  photoH,
  nameH,
  tailH = 8,
  photoUrl,
  label,
  emoji,
  tier,
  borderColor,
  letterboxColor,
  onLayout,
  onImageLoad,
}: PromotedCardProps) {
  const cardH   = photoH + nameH;
  const totalH  = cardH + tailH;
  const borderW = tier === 'ouro' ? 3 : tier === 'prata' ? 2.5 : 2;
  const nameFontSize  = nameH >= 28 ? 12 : 10;
  const badgeFontSize = photoH >= 70 ? 14 : 11;
  const emojiFontSize = Math.round(photoH * 0.44);

  // Halo pulsante — somente tier Ouro (recurso visual escasso = percepção de premium)
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    if (tier !== 'ouro') return;
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1,    duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.35, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [tier]);

  return (
    <View
      collapsable={false}
      onLayout={onLayout}
      style={{ width: cardW, height: totalH }}
    >
      {/* Halo pulsante Ouro (posicionado atrás do card) */}
      {tier === 'ouro' && (
        <Animated.View style={{
          position: 'absolute',
          top: -4, left: -4,
          width: cardW + 8,
          height: cardH + 8,
          borderRadius: 14,
          borderWidth: 2,
          borderColor,
          opacity: pulse,
        }} />
      )}

      {/* Card principal */}
      <View style={{
        width: cardW,
        height: cardH,
        borderRadius: 10,
        borderWidth: borderW,
        borderColor,
        backgroundColor: '#fff',
      }}>

        {/* ── Área de foto ─────────────────────────────────────────────── */}
        <View style={{
          width: '100%',
          height: photoH,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          backgroundColor: letterboxColor,
          overflow: 'hidden',          // innermost — clip da foto (promo-marketing rule §9)
        }}>
          {photoUrl ? (
            <Image
              source={{ uri: photoUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"     // nunca cover — organizer pagou pra ver a foto inteira
              onLoad={onImageLoad}
            />
          ) : (
            // Fallback sem foto: emoji da categoria centralizado na letterbox
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: emojiFontSize, includeFontPadding: false }}>
                {emoji}
              </Text>
            </View>
          )}
        </View>

        {/* ── Badge de tier (sobre a foto, canto superior direito) ─────── */}
        <View style={{
          position: 'absolute',
          top: 4,
          right: 4,
          paddingHorizontal: 5,
          paddingVertical: 2,
          borderRadius: 6,
          backgroundColor: 'rgba(0,0,0,0.52)',
        }}>
          <Text style={{ fontSize: badgeFontSize, includeFontPadding: false }}>
            {TIER_BADGE_EMOJI[tier]}
          </Text>
        </View>

        {/* ── Faixa de nome ────────────────────────────────────────────── */}
        <View style={{
          width: '100%',
          height: nameH,
          paddingHorizontal: 6,
          justifyContent: 'center',
          borderTopWidth: 1,
          borderTopColor: borderColor + '50',
        }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: nameFontSize,
              fontWeight: '800',
              color: '#111',
              includeFontPadding: false,
            }}
          >
            {label}
          </Text>
        </View>
      </View>

      {/* ── Cauda triangular → aponta para a coordenada do evento ─────── */}
      <View style={{
        width: 0,
        height: 0,
        borderLeftWidth: 7,
        borderRightWidth: 7,
        borderTopWidth: tailH,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: borderColor,
        alignSelf: 'center',
      }} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  NotifPin — card estilo notificação (ícone circular + nome + info)
//
//  Layout:
//    ┌─────────────────────────────────────────┐
//    │  ●  │  Acidente          (negrito)       │
//    │ icon│  Av. Paulista, 1578 (cinza)        │
//    │     │  3 confirmações · há 5 min (micro)  │
//    └─────────────────────────────────────────┘
//               ▼  cauda apontando para o evento
// ═══════════════════════════════════════════════════════════════════════════════

interface NotifPinProps {
  color: string;
  icon: string;
  label: string;       // nome da categoria ex: "Acidente"
  subtitle?: string;   // cidade ou endereço resumido
  confirms?: number;   // número de confirmações
  timeAgo?: string;    // ex: "há 5 min"
  urgent?: boolean;    // borda vermelha pulsante quando urgente
  onLayout?: () => void;
}

const CARD_W = 170;
const CARD_H = 56;
const ICON_SIZE = 38;
const TAIL_H = 8;

export function NotifPin({ color, icon, label, subtitle, confirms = 0, timeAgo, urgent = false, onLayout }: NotifPinProps) {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (!urgent) return;
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.85, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.35, duration: 900, easing: Easing.in(Easing.quad),  useNativeDriver: false }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [urgent]);

  const confirmText = confirms > 0
    ? `${confirms} confirmação${confirms > 1 ? 'ões' : ''}`
    : null;
  const meta = [confirmText, timeAgo].filter(Boolean).join(' · ');

  return (
    <View
      collapsable={false}
      onLayout={onLayout}
      style={{ width: CARD_W, height: CARD_H + TAIL_H }}
    >
      {/* Halo pulsante urgente */}
      {urgent && (
        <Animated.View style={{
          position: 'absolute',
          top: -3, left: -3,
          width: CARD_W + 6,
          height: CARD_H + 6,
          borderRadius: 15,
          borderWidth: 2,
          borderColor: color,
          opacity: pulse,
        }} />
      )}

      {/* Card principal */}
      <View style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 12,
        backgroundColor: '#1C1C1E',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderWidth: urgent ? 1.5 : 0,
        borderColor: urgent ? color : 'transparent',
      }}>
        {/* Ícone circular */}
        <View style={{
          width: ICON_SIZE,
          height: ICON_SIZE,
          borderRadius: ICON_SIZE / 2,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
          flexShrink: 0,
        }}>
          <Text style={{ fontSize: 20, includeFontPadding: false, textAlignVertical: 'center' }}>
            {icon}
          </Text>
        </View>

        {/* Textos */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text numberOfLines={1} style={{
            fontSize: 13,
            fontWeight: '700',
            color: '#FFFFFF',
            includeFontPadding: false,
          }}>
            {label}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={{
              fontSize: 11,
              fontWeight: '400',
              color: '#AEAEB2',
              includeFontPadding: false,
              marginTop: 1,
            }}>
              {subtitle}
            </Text>
          ) : null}
          {meta ? (
            <Text numberOfLines={1} style={{
              fontSize: 10,
              color: '#636366',
              includeFontPadding: false,
              marginTop: 1,
            }}>
              {meta}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Cauda triangular */}
      <View style={{
        width: 0,
        height: 0,
        borderLeftWidth: 7,
        borderRightWidth: 7,
        borderTopWidth: TAIL_H,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#1C1C1E',
        alignSelf: 'center',
      }} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PartnerPin — retângulo corporativo elegante
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerPin({ size, color, logo, label }: { size: number; color: string; logo?: ImageSourcePropType; label?: string }) {
  return (
    <View
      collapsable={false}
      style={{
        paddingHorizontal: 8, paddingVertical: 5,
        borderRadius: 10,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: color,
        flexDirection: 'row', alignItems: 'center',
      }}
    >
      {logo ? (
        <Image source={logo} style={{ width: 22, height: 22, borderRadius: 4, marginRight: 6 }} resizeMode="contain" />
      ) : null}
      {label ? (
        <Text style={{ fontSize: 12, fontWeight: '800', color, includeFontPadding: false }}>{label}</Text>
      ) : null}
    </View>
  );
}
