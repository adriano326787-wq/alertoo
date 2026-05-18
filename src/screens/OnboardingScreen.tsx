/**
 * OnboardingScreen — 3 slides explicando o app + CTA pra começar.
 *
 * Aparece apenas na PRIMEIRA abertura (controlado por AsyncStorage flag).
 * Skipável a qualquer momento.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import { palette, radius, spacing, typography, shadow, platformShadow } from '../theme/tokens';
import { useT } from '../hooks/useT';

const { width: SCREEN_W } = Dimensions.get('window');
const ONBOARDING_KEY = '@alertoo:onboarding_v1';

interface Slide {
  emoji: string;
  title: string;
  subtitle: string;
  bg: string;
}

const SLIDES_PT: Slide[] = [
  {
    emoji: '🗺️',
    title: 'Tudo que acontece perto de você',
    subtitle: 'Eventos, alertas de trânsito e o que está bombando agora — em tempo real no mapa.',
    bg: '#FF5722',
  },
  {
    emoji: '🎉',
    title: 'Descubra rolês incríveis',
    subtitle: 'Festas, shows, restaurantes e festivais. Salve os seus preferidos pra voltar depois.',
    bg: '#6A1B9A',
  },
  {
    emoji: '🚦',
    title: 'Chegue mais rápido',
    subtitle: 'Navegação GPS com instruções por voz e alertas da comunidade pra evitar engarrafamentos.',
    bg: '#1E88E5',
  },
];

interface Props {
  onDone: () => void;
}

export function OnboardingScreen({ onDone }: Props) {
  const t = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const slides = SLIDES_PT;
  const isLast = index === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleDone();
    } else {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    }
  };

  const handleDone = async () => {
    try { await AsyncStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
    onDone();
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={[styles.slide, { width: SCREEN_W, backgroundColor: item.bg }]}>
      <View style={styles.emojiCircle}>
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: slides[index].bg }}>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(_, i) => `slide-${i}`}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
          setIndex(i);
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />

      {/* Skip button (top right) */}
      <Pressable
        style={[styles.skipBtn, { top: insets.top + 12 }]}
        onPress={handleDone}
        hitSlop={12}
      >
        <Text style={styles.skipText}>{t('onboarding_skip')}</Text>
      </Pressable>

      {/* Bottom panel: dots + CTA */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dotsRow}>
          {slides.map((_, i) => {
            const inputRange = [(i - 1) * SCREEN_W, i * SCREEN_W, (i + 1) * SCREEN_W];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View key={i} style={[styles.dot, { width: dotWidth, opacity }]} />
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
          onPress={handleNext}
        >
          <Text style={styles.ctaText}>
            {isLast ? t('onboarding_done') : t('onboarding_next')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Verifica se o onboarding já foi feito.
 * Retorna `true` se for primeira abertura (mostrar onboarding).
 */
export async function shouldShowOnboarding(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(ONBOARDING_KEY);
    return v !== '1';
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emojiCircle: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 36,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  emoji: { fontSize: 80 },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 320,
  },
  skipBtn: {
    position: 'absolute',
    right: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  skipText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  bottomPanel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dot: { height: 8, borderRadius: 4, backgroundColor: '#ffffff' },
  cta: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    alignSelf: 'stretch',
    alignItems: 'center',
    ...platformShadow(shadow.lg),
  },
  ctaText: { fontSize: 16, fontWeight: '900', color: '#1F2937', letterSpacing: 0.3 },
});
