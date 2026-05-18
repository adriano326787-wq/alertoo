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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { palette, radius, spacing, typography, shadow, platformShadow, motion } from '../../theme/tokens';

const { height: SCREEN_H } = Dimensions.get('window');

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

  imageUrl?: string | null;
  imageHeight?: number;
  imageOverlay?: React.ReactNode;

  category?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  status?: { label: string; color: string };
  tag?: { label: string; color: string; icon?: string };
  description?: string;
  stats?: Array<{ icon: string; value: string | number; label?: string }>;
  primaryAction?: SheetAction;
  quickActions?: SheetAction[];
  footer?: React.ReactNode;
}

export function BottomSheetCard({
  visible,
  onClose,
  imageUrl,
  imageHeight = 180,
  imageOverlay,
  category,
  title,
  subtitle,
  meta,
  status,
  tag,
  description,
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

  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdrop   = useRef(new Animated.Value(0)).current;

  // Abre quando visible muda para true
  useEffect(() => {
    if (visible) {
      isAnimatingClose.current = false;
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
          {/* TOP BAR FIXA — handle + close button SEMPRE visível */}
          <View style={styles.topBar}>
            <View style={styles.handleArea}>
              <View style={[styles.handle, { backgroundColor: theme.border.strong }]} />
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={14}
              style={({ pressed }) => [
                styles.closeBtnFixed,
                { backgroundColor: theme.bg.base, borderColor: theme.border.default },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.closeBtnText, { color: theme.text.primary }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces>
            {/* HERO IMAGE */}
            {imageUrl ? (
              <View style={[styles.heroWrap, { height: imageHeight, backgroundColor: theme.brand.surface }]}>
                <Image
                  source={{ uri: imageUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
                {imageOverlay ? (
                  <View style={styles.heroOverlay} pointerEvents="box-none">
                    {imageOverlay}
                  </View>
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
                  <Text style={styles.primaryBtnText}>{primaryAction.icon} {primaryAction.label}</Text>
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
  },

  // Top bar FIXA — handle no centro + close button no canto
  topBar: {
    height: 36,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  handleArea: { alignItems: 'center', justifyContent: 'center' },
  handle: { width: 38, height: 4, borderRadius: 2 },
  closeBtnFixed: {
    position: 'absolute',
    top: 6, right: 12,
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    zIndex: 100,
  },
  closeBtnText: { fontSize: 14, fontWeight: '900', lineHeight: 16, includeFontPadding: false },

  heroWrap: { width: '100%', backgroundColor: '#000', position: 'relative' },
  heroOverlay: {
    position: 'absolute',
    top: 12, left: 12, right: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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

  primaryBtn: {
    marginTop: spacing[4],
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
    ...platformShadow(shadow.md),
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3, includeFontPadding: false },

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
