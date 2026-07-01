/**
 * BottomSheetCard — sheet inferior premium.
 *
 * - Close button SEMPRE visível no topo (fora do ScrollView)
 * - Animação de saída antes de chamar onClose
 * - Backdrop tap fecha com animação
 * - Fix: estado interno "isClosing" evita desmontagem prematura durante animação
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Dimensions,
  Pressable,
  TouchableOpacity,
  Linking,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { palette, radius, spacing, typography, shadow, platformShadow, motion } from '../../theme/tokens';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

export interface SheetAction {
  icon: string;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;

  /** Uma foto — mantido para compatibilidade retroativa */
  imageUrl?: string | null;
  /** Múltiplas fotos — habilita carousel com swipe e dots. Tem prioridade sobre imageUrl */
  imageUrls?: string[];
  imageHeight?: number;
  imageOverlay?: React.ReactNode;
  onImagePress?: (uri: string) => void;

  category?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  status?: { label: string; color: string };
  tag?: { label: string; color: string; icon?: string };
  description?: string;
  link?: string;
  stats?: Array<{ icon: string; value: string | number; label?: string }>;
  primaryAction?: SheetAction;
  quickActions?: SheetAction[];
  footer?: React.ReactNode;
}

export function BottomSheetCard({
  visible,
  onClose,
  imageUrl,
  imageUrls,
  imageHeight = 180,
  imageOverlay,
  onImagePress,
  category,
  title,
  subtitle,
  meta,
  status,
  tag,
  description,
  link,
  stats,
  primaryAction,
  quickActions,
  footer,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Estado interno para manter o Modal montado durante a animação de saída
  const [modalVisible, setModalVisible] = useState(false);
  const isAnimatingClose = useRef(false);

  // Carousel state
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [outerScrollEnabled, setOuterScrollEnabled] = useState(true);
  const carouselRef = useRef<ScrollView>(null);
  // Resolve lista de fotos: imageUrls tem prioridade
  const photos = (imageUrls && imageUrls.length > 0)
    ? imageUrls
    : imageUrl ? [imageUrl] : [];

  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdrop   = useRef(new Animated.Value(0)).current;

  // Abre quando visible muda para true
  useEffect(() => {
    if (visible) {
      isAnimatingClose.current = false;
      setCarouselIndex(0);
      carouselRef.current?.scrollTo({ x: 0, animated: false });
      setModalVisible(true);
      // Pequeno delay para garantir que o Modal está montado antes da animação
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(translateY, { toValue: 0, ...motion.spring, useNativeDriver: true }),
          Animated.timing(backdrop, { toValue: 1, duration: motion.duration.base, useNativeDriver: true }),
        ]).start();
      });
    } else if (!isAnimatingClose.current) {
      // visible=false sem animação de fechamento (ex: fechar por outro modal)
      translateY.setValue(SCREEN_H);
      backdrop.setValue(0);
      setModalVisible(false);
    }
  }, [visible]);

  // Close com animação — mantém Modal visível até animação terminar
  const handleClose = () => {
    if (isAnimatingClose.current) return; // evita double-tap
    isAnimatingClose.current = true;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_H,
        duration: motion.duration.base,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: 0,
        duration: motion.duration.base,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      isAnimatingClose.current = false;
      onClose(); // notifica o pai SÓ após a animação terminar
    });
  };

  // Permite fechar o sheet arrastando a barra superior (handle) para baixo
  const dragPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 100 || gesture.vy > 0.8) {
          handleClose();
        } else {
          Animated.spring(translateY, { toValue: 0, ...motion.spring, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={modalVisible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg.overlay, opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheetWrap, { transform: [{ translateY }] }]}>
        <View style={[
          styles.sheet,
          {
            backgroundColor: theme.bg.surface,
            paddingBottom: insets.bottom + spacing[4],
            maxHeight: SCREEN_H * 0.88,
          },
          platformShadow(shadow.xl),
        ]}>
          {/* TOP BAR FIXA — handle centralizado + botão X no fluxo normal (sem absolute) */}
          <View style={styles.topBar} {...dragPanResponder.panHandlers}>
            {/* Espaçador esquerdo para simetria */}
            <View style={styles.topBarSpacer} />
            {/* Handle centralizado */}
            <View style={styles.handleArea}>
              <View style={[styles.handle, { backgroundColor: theme.border.strong }]} />
            </View>
            {/* Botão fechar — no fluxo normal: touch area sempre correta */}
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={12}
              activeOpacity={0.7}
              style={[styles.closeBtn, { backgroundColor: theme.bg.base, borderColor: theme.border.default }]}
            >
              <Text style={[styles.closeBtnText, { color: theme.text.primary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces
            scrollEnabled={outerScrollEnabled}
          >
            {/* HERO / CAROUSEL */}
            {photos.length > 0 ? (
              <View style={[styles.heroWrap, { height: imageHeight, backgroundColor: theme.brand.surface }]}>
                {/* Scroll horizontal de fotos */}
                <ScrollView
                  ref={carouselRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  scrollEventThrottle={16}
                  nestedScrollEnabled
                  decelerationRate="fast"
                  disableIntervalMomentum
                  onScrollBeginDrag={() => setOuterScrollEnabled(false)}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                    setCarouselIndex(idx);
                    setOuterScrollEnabled(true);
                  }}
                  onScrollEndDrag={() => setOuterScrollEnabled(true)}
                  style={{ width: SCREEN_W, height: imageHeight }}
                >
                  {photos.map((uri, i) => (
                    <Pressable
                      key={i}
                      onPress={() => onImagePress?.(uri)}
                      style={{ width: SCREEN_W, height: imageHeight }}
                    >
                      <Image
                        source={{ uri }}
                        style={{ width: SCREEN_W, height: imageHeight }}
                        resizeMode="contain" // #2 — promo-marketing: never crop paid photos
                      />
                    </Pressable>
                  ))}
                </ScrollView>

                {/* Overlay do tier (badge) */}
                {imageOverlay ? (
                  <View style={styles.heroOverlay} pointerEvents="box-none">
                    {imageOverlay}
                  </View>
                ) : null}

                {/* Setas + dots — só quando há mais de 1 foto */}
                {photos.length > 1 ? (
                  <>
                    {/* Seta esquerda */}
                    {carouselIndex > 0 && (
                      <Pressable
                        style={[styles.carouselArrow, styles.carouselArrowLeft]}
                        onPress={() => {
                          const next = carouselIndex - 1;
                          carouselRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
                          setCarouselIndex(next);
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.carouselArrowText}>‹</Text>
                      </Pressable>
                    )}
                    {/* Seta direita */}
                    {carouselIndex < photos.length - 1 && (
                      <Pressable
                        style={[styles.carouselArrow, styles.carouselArrowRight]}
                        onPress={() => {
                          const next = carouselIndex + 1;
                          carouselRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
                          setCarouselIndex(next);
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.carouselArrowText}>›</Text>
                      </Pressable>
                    )}
                    {/* Contador + dots */}
                    <View style={styles.dotsRow}>
                      {photos.map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.dot,
                            i === carouselIndex ? styles.dotActive : styles.dotInactive,
                          ]}
                        />
                      ))}
                    </View>
                    {/* Contador numérico */}
                    <View style={styles.photoCounter}>
                      <Text style={styles.photoCounterText}>{carouselIndex + 1}/{photos.length}</Text>
                    </View>
                  </>
                ) : null}
              </View>
            ) : null}

            {/* CONTENT */}
            <View style={styles.body}>
              {tag ? (
                <View style={[styles.tag, { backgroundColor: tag.color + '20', borderColor: tag.color + '40' }]}>
                  <Text style={[styles.tagText, { color: tag.color }]}>
                    {tag.icon ? `${tag.icon} ` : ''}{tag.label}
                  </Text>
                </View>
              ) : null}

              {category ? (
                <Text style={[typography.overline, { color: theme.text.tertiary, marginBottom: spacing[1] }]}>
                  {category}
                </Text>
              ) : null}

              <Text style={[typography.displayMd, { color: theme.text.primary, marginBottom: spacing[1] }]} numberOfLines={2}>
                {title}
              </Text>

              <View style={styles.metaRow}>
                {status ? (
                  <View style={[styles.statusDot, { backgroundColor: status.color }]}>
                    <Text style={[typography.labelSm, { color: status.color, marginLeft: 12 }]}>
                      {status.label}
                    </Text>
                  </View>
                ) : null}
                {subtitle ? (
                  <Text style={[typography.bodySm, { color: theme.text.secondary, flex: 1 }]} numberOfLines={1}>
                    {status ? '  ·  ' : ''}{subtitle}
                  </Text>
                ) : null}
              </View>

              {meta ? (
                <Text style={[typography.caption, { color: theme.text.tertiary, marginTop: spacing[1] }]}>
                  {meta}
                </Text>
              ) : null}

              {description ? (
                <Text style={[typography.bodyMd, { color: theme.text.secondary, marginTop: spacing[3] }]}>
                  {description}
                </Text>
              ) : null}

              {link ? (
                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => Linking.openURL(link).catch(() => {})}
                  activeOpacity={0.7}
                >
                  <Text style={styles.linkBtnText}>🔗 {link.replace(/^https?:\/\//, '')}</Text>
                </TouchableOpacity>
              ) : null}

              {stats && stats.length > 0 ? (
                <View style={[styles.statsRow, { backgroundColor: theme.bg.base, borderColor: theme.border.subtle }]}>
                  {stats.map((s, i) => (
                    <View key={i} style={styles.statCell}>
                      <Text style={styles.statIcon}>{s.icon}</Text>
                      <Text style={[typography.titleSm, { color: theme.text.primary }]}>{s.value}</Text>
                      {s.label ? (
                        <Text style={[typography.caption, { color: theme.text.tertiary }]}>{s.label}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}

              {primaryAction ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: theme.brand.primary, opacity: primaryAction.disabled ? 0.5 : pressed ? 0.85 : 1 },
                  ]}
                  onPress={primaryAction.onPress}
                  disabled={primaryAction.disabled}
                >
                  {/* Emoji e label em Text separados — evita clipping no Android com emoji + bold */}
                  <View style={styles.primaryBtnInner}>
                    <Text style={styles.primaryBtnIcon}>{primaryAction.icon}</Text>
                    <Text style={styles.primaryBtnText} numberOfLines={1}>{primaryAction.label}</Text>
                  </View>
                </Pressable>
              ) : null}

              {quickActions && quickActions.length > 0 ? (
                <View style={styles.quickRow}>
                  {quickActions.map((a, i) => (
                    <Pressable
                      key={i}
                      style={({ pressed }) => [
                        styles.quickBtn,
                        {
                          backgroundColor:
                            a.variant === 'primary' ? theme.brand.primary :
                            a.variant === 'danger'  ? palette.alert + '15' :
                                                      theme.bg.base,
                          borderColor:
                            a.variant === 'primary' ? theme.brand.primary :
                            a.variant === 'danger'  ? palette.alert + '40' :
                                                      theme.border.default,
                          opacity: a.disabled ? 0.45 : pressed ? 0.8 : 1,
                        },
                      ]}
                      onPress={a.onPress}
                      disabled={a.disabled}
                    >
                      <Text style={styles.quickBtnIcon}>{a.icon}</Text>
                      <Text style={[
                        styles.quickBtnText,
                        {
                          color:
                            a.variant === 'primary' ? '#fff' :
                            a.variant === 'danger'  ? palette.alert :
                                                      theme.text.primary,
                        },
                      ]}>
                        {a.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {footer ? <View style={{ marginTop: spacing[3] }}>{footer}</View> : null}
            </View>
          </ScrollView>
        </View>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheet: {
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    overflow: 'hidden',
    // Em tablets/telas largas, evita que o sheet fique esticado de ponta a ponta
    width: '100%', maxWidth: 480, alignSelf: 'center',
  },

  // Top bar — row: [spacer | handle | closeBtn]
  topBar: {
    height: 48,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarSpacer: { width: 44 },
  handleArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 38, height: 4, borderRadius: 2 },
  // Botão fechar no fluxo normal — sem position:absolute, touch area sempre correta
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  closeBtnText: { fontSize: 14, fontWeight: '900', lineHeight: 16, includeFontPadding: false },

  heroWrap: { width: '100%', backgroundColor: '#000', overflow: 'hidden' },
  heroOverlay: {
    position: 'absolute',
    top: 12, left: 12, right: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    pointerEvents: 'box-none',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7, height: 7, borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 20,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  carouselArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 36, height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  carouselArrowLeft:  { left: 8 },
  carouselArrowRight: { right: 8 },
  carouselArrowText: {
    color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32, includeFontPadding: false,
  },
  photoCounter: {
    position: 'absolute',
    top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  photoCounterText: {
    color: '#fff', fontSize: 11, fontWeight: '700',
  },

  body: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
  },
  tag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: spacing[2],
  },
  tagText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3, includeFontPadding: false },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexDirection: 'row', alignItems: 'center' },

  statsRow: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    marginTop: spacing[4],
    borderWidth: 1,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 2 },
  statIcon: { fontSize: 18 },

  linkBtn: {
    marginTop: spacing[3],
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#1565C0',
    backgroundColor: '#E3F2FD',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  linkBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1565C0',
  },

  primaryBtn: {
    marginTop: spacing[4],
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
    ...platformShadow(shadow.md),
  },
  // Emoji e label separados — evita clipping Android (emoji misturado com bold)
  primaryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  primaryBtnIcon: { fontSize: 17, includeFontPadding: false },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3, includeFontPadding: false, flexShrink: 1 },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing[3] },
  quickBtn: {
    flexGrow: 1, flexBasis: '47%',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 11, paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: 6,
  },
  quickBtnIcon: { fontSize: 15 },
  quickBtnText: { fontSize: 13, fontWeight: '700', includeFontPadding: false },
});
