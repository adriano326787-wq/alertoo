/**
 * TrafficDetectionPrompt
 *
 * Banner bottom-sheet que aparece quando o hook useTrafficSpeedDetection
 * detecta trânsito lento ou parada prolongada.
 *
 * Oferece atalhos de reporte rápido pré-categorizados:
 *   SLOW    → Congestionamento, Acidente, Obras, Perigo
 *   STOPPED → Acidente, Interdição, Blitz, Alagamento
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { TrafficAlert } from '../hooks/useTrafficSpeedDetection';
import { EventCategory } from '../types';

interface QuickOption {
  category: EventCategory;
  emoji: string;
  label: string;
  color: string;
}

const SLOW_OPTIONS: QuickOption[] = [
  { category: 'traffic',     emoji: '🐢', label: 'Congestionamento', color: '#F4511E' },
  { category: 'accident',    emoji: '🚗', label: 'Acidente',          color: '#E53935' },
  { category: 'roadwork',    emoji: '🚧', label: 'Obras',             color: '#FB8C00' },
  { category: 'hazard',      emoji: '⚠️', label: 'Perigo na via',    color: '#FFB300' },
];

const STOPPED_OPTIONS: QuickOption[] = [
  { category: 'accident',    emoji: '🚗', label: 'Acidente',     color: '#E53935' },
  { category: 'closure',     emoji: '🚫', label: 'Interdição',   color: '#8E24AA' },
  { category: 'policeblitz', emoji: '👮', label: 'Blitz',        color: '#3949AB' },
  { category: 'flood',       emoji: '🌊', label: 'Alagamento',   color: '#1E88E5' },
];

interface Props {
  alert: TrafficAlert | null;
  onReport: (
    category: EventCategory,
    coordinate: { latitude: number; longitude: number },
  ) => void;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 30_000;

export function TrafficDetectionPrompt({ alert, onReport, onDismiss }: Props) {
  const slideY     = useRef(new Animated.Value(200)).current;
  const autoTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (alert) {
      Animated.spring(slideY, {
        toValue: 0, useNativeDriver: true,
        tension: 65, friction: 11,
      }).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      autoTimer.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    } else {
      slideY.setValue(200);
    }
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert]);

  function dismiss() {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    Animated.timing(slideY, {
      toValue: 200, duration: 220, useNativeDriver: true,
    }).start(onDismiss);
  }

  if (!alert) return null;

  const isStopped = alert.kind === 'stopped';
  const options   = isStopped ? STOPPED_OPTIONS : SLOW_OPTIONS;

  const headline = isStopped
    ? 'Você está parado há um tempo.'
    : 'Trânsito lento detectado.';
  const sub = isStopped
    ? 'Tem acidente, interdição ou blitz?'
    : 'O que está acontecendo na via?';

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideY }] }]}>
      {/* Handle */}
      <View style={styles.handle} />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.icon}>{isStopped ? '🛑' : '🚦'}</Text>
        <View style={styles.headerText}>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.sub}>{sub}</Text>
        </View>
        <TouchableOpacity onPress={dismiss} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Opções de reporte rápido */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.optionsRow}
      >
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.category}
            style={[styles.optBtn, { borderColor: opt.color + '55' }]}
            activeOpacity={0.75}
            onPress={() => {
              onReport(opt.category, { latitude: alert.latitude, longitude: alert.longitude });
              dismiss();
            }}
          >
            <View style={[styles.optIcon, { backgroundColor: opt.color + '22' }]}>
              <Text style={styles.optEmoji}>{opt.emoji}</Text>
            </View>
            <Text style={styles.optLabel}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Rodapé */}
      <Text style={styles.footer}>
        Seus reportes ajudam outros motoristas em tempo real
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
    zIndex: 300,
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  icon: { fontSize: 30 },
  headerText: { flex: 1 },
  headline: {
    fontSize: 15, fontWeight: '800', color: '#fff',
  },
  sub: {
    fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2,
  },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeIcon: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  optionsRow: {
    paddingHorizontal: 14, gap: 10, paddingVertical: 4,
  },
  optBtn: {
    alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    minWidth: 90,
  },
  optIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  optEmoji: { fontSize: 24 },
  optLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  footer: {
    fontSize: 10, color: 'rgba(255,255,255,0.25)',
    textAlign: 'center', marginTop: 12, paddingHorizontal: 20,
  },
});
