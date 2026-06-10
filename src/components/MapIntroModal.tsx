/**
 * MapIntroModal — apresentação interativa do mapa para novos usuários.
 *
 * 5 slides:
 *   1. Boas-vindas + como criar eventos (toque no mapa)
 *   2. Mapa ao vivo — 3 eventos de demonstração animados no mapa
 *   3. Alertas de trânsito (todas as categorias)
 *   4. Eventos & Entretenimento (todas as categorias)
 *   5. Dicas rápidas + CTA "Explorar"
 *
 * Aparece apenas uma vez (flag @alertoo:map_intro_v2 no AsyncStorage).
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
export const MAP_INTRO_KEY = '@alertoo:map_intro_v2';

export async function shouldShowMapIntro(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(MAP_INTRO_KEY);
    return v !== '1';
  } catch {
    return true;
  }
}

// ─── Cores de fundo por slide ─────────────────────────────────────────────────
const BG_COLORS = ['#FF5722', '#1A237E', '#B71C1C', '#4A148C', '#0F172A'];

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
      <Animated.View style={[slide.circle, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={slide.bigEmoji}>🗺️</Text>
      </Animated.View>

      <Text style={slide.title}>Bem-vindo ao{'\n'}Alertoo!</Text>
      <Text style={slide.subtitle}>
        Fique por dentro do trânsito e descubra os melhores eventos perto de você — em tempo real.
      </Text>

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

// ─── Slide 2 — Mapa ao vivo com eventos de demonstração ──────────────────────
const DEMO_EVENTS: Array<{
  emoji: string;
  label: string;
  location: string;
  detail: string;
  color: string;
  bg: string;
  border: string;
  top: `${number}%`;
  left: `${number}%`;
}> = [
  {
    emoji: '🚗',
    label: 'Acidente',
    location: 'Av. Paulista, 1578',
    detail: '3 confirmações · há 5 min',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.18)',
    border: 'rgba(239,68,68,0.6)',
    top: '18%',
    left: '8%',
  },
  {
    emoji: '📷',
    label: 'Radar',
    location: 'BR-116, km 45',
    detail: 'Velocidade: 60 km/h',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.18)',
    border: 'rgba(245,158,11,0.6)',
    top: '44%',
    left: '55%',
  },
  {
    emoji: '🎉',
    label: 'Show ao vivo',
    location: 'Bar da Lapa · Centro',
    detail: '❤️ 28 curtidas · Hoje',
    color: '#A855F7',
    bg: 'rgba(168,85,247,0.18)',
    border: 'rgba(168,85,247,0.6)',
    top: '66%',
    left: '12%',
  },
];

function SlideMapDemo() {
  const anims = useRef(DEMO_EVENTS.map(() => new Animated.Value(0))).current;
  const pulseAnims = useRef(DEMO_EVENTS.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    // Staggered fade-in
    const fadeIns = anims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: i * 350,
        useNativeDriver: true,
      })
    );

    // Pulse loop for each pin
    const pulses = pulseAnims.map((anim) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.18, duration: 700, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ])
      )
    );

    Animated.stagger(350, fadeIns).start(() => {
      pulses.forEach((p) => p.start());
    });

    return () => {
      pulses.forEach((p) => p.stop());
    };
  }, []);

  return (
    <View style={slide.root}>
      <Text style={slide.title}>Veja como{'\n'}funciona</Text>
      <Text style={slide.subtitle}>
        Esses são exemplos de eventos que aparecem no mapa em tempo real.
      </Text>

      {/* Mapa simulado */}
      <View style={mapDemo.mapContainer}>
        {/* Grade de ruas estilizadas */}
        <View style={mapDemo.road1} />
        <View style={mapDemo.road2} />
        <View style={mapDemo.road3} />
        <View style={mapDemo.road4} />
        <View style={mapDemo.road5} />

        {/* Cursor de localização do usuário */}
        <View style={mapDemo.userPin}>
          <View style={mapDemo.userDot} />
          <View style={mapDemo.userRing} />
        </View>

        {/* Eventos de demonstração */}
        {DEMO_EVENTS.map((event, i) => (
          <Animated.View
            key={i}
            style={[
              mapDemo.eventCard,
              {
                top: event.top,
                left: event.left,
                opacity: anims[i],
                transform: [
                  { scale: anims[i] },
                ],
                backgroundColor: event.bg,
                borderColor: event.border,
              },
            ]}
          >
            {/* Pin pulsante */}
            <Animated.View style={[
              mapDemo.pin,
              { backgroundColor: event.color, transform: [{ scale: pulseAnims[i] }] },
            ]}>
              <Text style={mapDemo.pinEmoji}>{event.emoji}</Text>
            </Animated.View>

            {/* Info do evento */}
            <View style={mapDemo.cardInfo}>
              <Text style={[mapDemo.cardLabel, { color: event.color }]}>{event.label}</Text>
              <Text style={mapDemo.cardLocation} numberOfLines={1}>{event.location}</Text>
              <Text style={mapDemo.cardDetail} numberOfLines={1}>{event.detail}</Text>
            </View>
          </Animated.View>
        ))}

        {/* Label do mapa */}
        <View style={mapDemo.mapLabel}>
          <Text style={mapDemo.mapLabelText}>🗺️ Mapa ao vivo</Text>
        </View>
      </View>

      <Text style={slide.footnote}>
        👆 Toque em qualquer ponto do mapa para criar um novo evento
      </Text>
    </View>
  );
}

const mapDemo = StyleSheet.create({
  mapContainer: {
    width: SCREEN_W - rw(40),
    height: rh(240),
    backgroundColor: '#1B2A3B',
    borderRadius: rw(20),
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: rh(14),
  },
  // Ruas simuladas (linhas)
  road1: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#2D4A63',
  },
  road2: {
    position: 'absolute',
    top: '65%',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#243B52',
  },
  road3: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '38%',
    width: 6,
    backgroundColor: '#2D4A63',
  },
  road4: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '70%',
    width: 4,
    backgroundColor: '#243B52',
  },
  road5: {
    position: 'absolute',
    top: '15%',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#1E3347',
  },
  // Pin do usuário
  userPin: {
    position: 'absolute',
    top: '52%',
    left: '42%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDot: {
    width: rw(12),
    height: rw(12),
    borderRadius: rw(6),
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userRing: {
    position: 'absolute',
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    backgroundColor: 'rgba(59,130,246,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.5)',
  },
  // Evento card
  eventCard: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: rw(12),
    borderWidth: 1.5,
    padding: rw(7),
    gap: rw(7),
    maxWidth: rw(155),
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  pin: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  pinEmoji: { fontSize: rf(16) },
  cardInfo: { flex: 1 },
  cardLabel: { fontSize: rf(10), fontWeight: '800', letterSpacing: 0.3 },
  cardLocation: { fontSize: rf(9), color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 1 },
  cardDetail: { fontSize: rf(9), color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  // Label
  mapLabel: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mapLabelText: { fontSize: rf(10), color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
});

// ─── Slide 3 — Alertas de trânsito ───────────────────────────────────────────
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

// ─── Slide 4 — Entretenimento ─────────────────────────────────────────────────
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

// ─── Slide 5 — Pronto! ────────────────────────────────────────────────────────
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
const SLIDES = [SlideWelcome, SlideMapDemo, SlideRoadEvents, SlideEntertainment, SlideReady];
const SLIDE_LABELS = ['Bem-vindo', 'No Mapa', 'Trânsito', 'Eventos', 'Pronto!'];

export function MapIntroModal({ visible, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
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

        {/* Indicador de slide */}
        <View style={[styles.slideLabel, { top: insets.top + 14 }]}>
          <Text style={styles.slideLabelText}>
            {SLIDE_LABELS[index]}
          </Text>
        </View>

        {/* Conteúdo */}
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
