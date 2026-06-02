/**
 * MapIntroModal — apresentação interativa do mapa para novos usuários.
 *
 * 4 slides:
 *   1. Boas-vindas + como criar eventos (toque no mapa)
 *   2. Alertas de trânsito (todas as categorias)
 *   3. Eventos & Entretenimento (todas as categorias)
 *   4. Dicas rápidas + CTA "Explorar"
 *
 * Aparece apenas uma vez (flag @alertoo:map_intro_v1 no AsyncStorage).
 * Skipável a qualquer momento.
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EVENT_CATEGORIES, EventCategory } from '../types';
import { ENTERTAINMENT_CATEGORIES, EntertainmentCategory } from '../types/entertainment';
import { rw, rh, rf } from '../utils/responsive';

const { width: SCREEN_W } = Dimensions.get('window');
export const MAP_INTRO_KEY = '@alertoo:map_intro_v1';

export async function shouldShowMapIntro(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(MAP_INTRO_KEY);
    return v !== '1';
  } catch {
    // Em caso de falha no AsyncStorage (ex: dispositivo sem espaço),
    // retorna true para garantir que novos usuários vejam a introdução.
    return true;
  }
}

// ─── Cores de fundo por slide ─────────────────────────────────────────────────
const BG_COLORS = ['#FF5722', '#B71C1C', '#4A148C', '#0F172A'];

interface Props {
  visible: boolean;
  onDone: () => void;
}

// ─── Componente de categoria (grid) ──────────────────────────────────────────
function CatCard({ emoji, label, color }: { emoji: string; label: string; color: string }) {
  return (
    <View style={[catStyles.card, { borderColor: color + 'AA' }]}>
      <View style={[catStyles.iconWrap, { backgroundColor: color + '30' }]}>
        <Text style={catStyles.emoji}>{emoji}</Text>
      </View>
      <Text style={catStyles.label} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const catStyles = StyleSheet.create({
  card: {
    width: (SCREEN_W - rw(48) - rw(12)) / 2,
    borderRadius: rw(14),
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.10)',
    padding: rw(12),
    alignItems: 'center',
    gap: rh(6),
  },
  iconWrap: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: rf(26) },
  label: {
    fontSize: rf(11),
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: rf(15),
  },
});

// ─── Slide 1 — Boas-vindas ────────────────────────────────────────────────────
function SlideWelcome() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.14, duration: 750, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 750, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={slide.root}>
      {/* Círculo animado com emoji do mapa */}
      <Animated.View style={[slide.circle, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={slide.bigEmoji}>🗺️</Text>
      </Animated.View>

      <Text style={slide.title}>Bem-vindo ao{'\n'}Alertoo!</Text>
      <Text style={slide.subtitle}>
        Fique por dentro do trânsito e descubra os melhores eventos perto de você — em tempo real.
      </Text>

      {/* Steps */}
      <View style={slide.stepsCard}>
        <Text style={slide.stepsTitle}>Como criar um evento</Text>
        {[
          { icon: '👆', text: 'Toque em qualquer ponto no mapa' },
          { icon: '📋', text: 'Escolha o tipo de alerta ou evento' },
          { icon: '✅', text: 'A comunidade confirma ou nega' },
          { icon: '🏆', text: 'Ganhe pontos e suba no ranking!' },
        ].map(({ icon, text }, i) => (
          <View key={i} style={slide.step}>
            <Text style={slide.stepIcon}>{icon}</Text>
            <Text style={slide.stepText}>{text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Slide 2 — Alertas de trânsito ───────────────────────────────────────────
function SlideRoadEvents() {
  const roadCats = Object.entries(EVENT_CATEGORIES) as [EventCategory, typeof EVENT_CATEGORIES[EventCategory]][];

  return (
    <View style={slide.root}>
      <View style={slide.circleSmall}>
        <Text style={slide.bigEmoji}>🚗</Text>
      </View>
      <Text style={slide.title}>Alertas de Trânsito</Text>
      <Text style={slide.subtitle}>
        Reporte ocorrências em tempo real e ajude outros motoristas a chegarem mais rápido.
      </Text>

      <View style={slide.grid}>
        {roadCats.map(([key, meta]) => (
          <CatCard key={key} emoji={meta.emoji} label={meta.label} color={meta.color} />
        ))}
      </View>

      <Text style={slide.footnote}>
        ⏱ Cada alerta expira automaticamente depois de algum tempo
      </Text>
    </View>
  );
}

// ─── Slide 3 — Entretenimento ─────────────────────────────────────────────────
function SlideEntertainment() {
  const entCats = Object.entries(ENTERTAINMENT_CATEGORIES) as [EntertainmentCategory, typeof ENTERTAINMENT_CATEGORIES[EntertainmentCategory]][];

  return (
    <View style={slide.root}>
      <View style={slide.circleSmall}>
        <Text style={slide.bigEmoji}>🎉</Text>
      </View>
      <Text style={slide.title}>Eventos &{'\n'}Entretenimento</Text>
      <Text style={slide.subtitle}>
        Descubra bares, festas e shows próximos. Salve seus favoritos para não perder nada.
      </Text>

      <View style={[slide.grid, slide.gridCenter]}>
        {entCats.map(([key, meta]) => (
          <CatCard key={key} emoji={meta.emoji} label={meta.label} color={meta.color} />
        ))}
      </View>

      <Text style={slide.footnote}>
        💡 Somente usuários cadastrados podem criar eventos de entretenimento
      </Text>
    </View>
  );
}

// ─── Slide 4 — Pronto! ────────────────────────────────────────────────────────
function SlideReady() {
  return (
    <View style={slide.root}>
      <View style={slide.circleSmall}>
        <Text style={slide.bigEmoji}>🚀</Text>
      </View>
      <Text style={slide.title}>Tudo pronto!</Text>
      <Text style={slide.subtitle}>
        Explore o mapa e comece a usar o Alertoo agora mesmo.
      </Text>

      <View style={slide.tipsCard}>
        <Text style={slide.stepsTitle}>💡 Dicas rápidas</Text>
        {[
          'Eventos só podem ser criados a até 1 km de onde você está',
          'Confirme alertas de outros usuários para ganhar pontos extras',
          'Use o filtro ⚙ para ver eventos apenas da sua cidade',
          'Alertas com 10 ou mais negações são removidos automaticamente',
          'Salve seus eventos favoritos com ❤️ para ser notificado',
        ].map((tip, i) => (
          <View key={i} style={slide.tipRow}>
            <Text style={slide.tipBullet}>•</Text>
            <Text style={slide.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const slide = StyleSheet.create({
  root: {
    width: SCREEN_W,
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: rw(20),
    paddingTop: rh(8),
  },
  circle: {
    width: rw(110),
    height: rw(110),
    borderRadius: rw(55),
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    marginBottom: rh(18),
  },
  circleSmall: {
    width: rw(80),
    height: rw(80),
    borderRadius: rw(40),
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    marginBottom: rh(12),
  },
  bigEmoji: { fontSize: rf(52) },
  title: {
    fontSize: rf(26),
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: rh(8),
    lineHeight: rf(32),
  },
  subtitle: {
    fontSize: rf(14),
    fontWeight: '500',
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: rf(20),
    marginBottom: rh(18),
    maxWidth: SCREEN_W - rw(48),
  },
  stepsCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: rw(18),
    padding: rw(16),
    gap: rh(10),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  tipsCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: rw(18),
    padding: rw(16),
    gap: rh(8),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  stepsTitle: {
    fontSize: rf(13),
    fontWeight: '800',
    color: 'rgba(255,255,255,0.70)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: rh(2),
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: rw(10) },
  stepIcon: { fontSize: rf(20), width: rw(28) },
  stepText: { fontSize: rf(14), color: '#fff', fontWeight: '600', flex: 1, lineHeight: rf(19) },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rw(10),
    justifyContent: 'flex-start',
    width: '100%',
    marginBottom: rh(12),
  },
  gridCenter: { justifyContent: 'center' },
  footnote: {
    fontSize: rf(11),
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: rf(16),
    paddingHorizontal: rw(8),
  },
  tipRow: { flexDirection: 'row', gap: rw(8), alignItems: 'flex-start' },
  tipBullet: { fontSize: rf(14), color: '#FF9800', fontWeight: '900', marginTop: rh(1) },
  tipText: { fontSize: rf(13), color: '#fff', fontWeight: '500', flex: 1, lineHeight: rf(18) },
});

// ─── Modal principal ──────────────────────────────────────────────────────────
const SLIDES = [SlideWelcome, SlideRoadEvents, SlideEntertainment, SlideReady];
const SLIDE_LABELS = ['Bem-vindo', 'Trânsito', 'Eventos', 'Pronto!'];

export function MapIntroModal({ visible, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  // Fade-in do modal ao aparecer
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setIndex(0);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    }
  }, [visible]);

  const isLast = index === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleDone();
    } else {
      const next = index + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    }
  };

  const handleDone = async () => {
    try { await AsyncStorage.setItem(MAP_INTRO_KEY, '1'); } catch {}
    onDone();
  };

  const bgColor = BG_COLORS[index];

  const renderSlide = ({ item: SlideComponent }: { item: typeof SLIDES[number] }) => (
    <SlideComponent />
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={false}
      statusBarTranslucent
    >
      <Animated.View style={[styles.root, { backgroundColor: bgColor, opacity: fadeAnim }]}>

        {/* Botão Pular */}
        {!isLast && (
          <Pressable
            style={[styles.skipBtn, { top: insets.top + 12 }]}
            onPress={handleDone}
            hitSlop={12}
          >
            <Text style={styles.skipText}>Pular</Text>
          </Pressable>
        )}

        {/* Indicador de slide (label) */}
        <View style={[styles.slideLabel, { top: insets.top + 14 }]}>
          <Text style={styles.slideLabelText}>
            {SLIDE_LABELS[index]}
          </Text>
        </View>

        {/* Conteúdo das slides */}
        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(_, i) => `intro-${i}`}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          scrollEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
            setIndex(i);
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          contentContainerStyle={styles.flatContent}
          style={{ flex: 1, marginTop: insets.top + 48 }}
          getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
        />

        {/* Painel inferior: dots + botão */}
        <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 20 }]}>
          {/* Dots animados */}
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => {
              const inputRange = [(i - 1) * SCREEN_W, i * SCREEN_W, (i + 1) * SCREEN_W];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 28, 8],
                extrapolate: 'clamp',
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.35, 1, 0.35],
                extrapolate: 'clamp',
              });
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    listRef.current?.scrollToIndex({ index: i, animated: true });
                    setIndex(i);
                  }}
                  hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
                >
                  <Animated.View style={[styles.dot, { width: dotWidth, opacity }]} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [
              styles.cta,
              isLast && styles.ctaLast,
              pressed && { opacity: 0.82 },
            ]}
            onPress={handleNext}
          >
            <Text style={[styles.ctaText, isLast && styles.ctaTextLast]}>
              {isLast ? '🗺️  Explorar o mapa' : 'Próximo →'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flatContent: {},
  slideLabel: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 1,
    pointerEvents: 'none',
  } as any,
  slideLabelText: {
    fontSize: rf(12),
    fontWeight: '800',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  skipBtn: {
    position: 'absolute',
    right: rw(16),
    zIndex: 10,
    paddingHorizontal: rw(14),
    paddingVertical: rh(7),
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  skipText: { color: '#fff', fontSize: rf(13), fontWeight: '700' },
  bottomPanel: {
    paddingHorizontal: rw(20),
    paddingTop: rh(12),
    alignItems: 'center',
    gap: rh(16),
  },
  dotsRow: { flexDirection: 'row', gap: rw(8), alignItems: 'center' },
  dot: { height: 8, borderRadius: 4, backgroundColor: '#ffffff' },
  cta: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingVertical: rh(15),
    paddingHorizontal: rw(32),
    borderRadius: 30,
    alignSelf: 'stretch',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.40)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  ctaLast: {
    backgroundColor: '#ffffff',
    borderColor: 'transparent',
  },
  ctaText: {
    fontSize: rf(16),
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.2,
  },
  ctaTextLast: {
    color: '#0F172A',
  },
});
