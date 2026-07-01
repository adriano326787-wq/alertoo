/**
 * DriverModeOverlay — modo motorista simplificado.
 *
 * - Overlay sobre o mapa com botões grandes e display de alertas próximos
 * - Lê novos alertas em voz alta via expo-speech
 * - Atualiza automaticamente conforme novos eventos chegam do store
 * - Interface mínima: não distrai o motorista
 */

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEventsStore } from '../store/eventsStore';
import { useAppStore } from '../store/appStore';
import { haversineDistance } from '../utils/geo';
import { EVENT_CATEGORIES, FALLBACK_EVENT_META, RoadEvent } from '../types';
import { rw, rh, rf } from '../utils/responsive';
import { useT } from '../hooks/useT';

/** Formata distância em metros ou km de forma consistente. */
function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/** Formata distância por extenso para TTS. */
function formatDistanceSpeech(km: number): string {
  return km < 1 ? `a ${Math.round(km * 1000)} metros` : `a ${km.toFixed(1)} quilômetros`;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

const NEARBY_KM = 2; // alertas dentro de 2 km

export function DriverModeOverlay({ visible, onClose }: Props) {
  const t = useT();
  const { bottom } = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const spokenIds = useRef(new Set<string>());

  // Eventos e localização do usuário
  const events = useEventsStore((s) => s.events);
  const userLat = useAppStore((s) => s.userLat);
  const userLon = useAppStore((s) => s.userLon);

  // Anima entrada/saída
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 400,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
    if (!visible) {
      try { Speech.stop(); } catch {}
      spokenIds.current.clear();
    }
  }, [visible]);

  // Filtra e ordena alertas próximos — memoizado para evitar recálculo em cada render
  const nearby: RoadEvent[] = useMemo(() => {
    if (userLat == null || userLon == null) return [];
    return events
      .filter((e) => haversineDistance(userLat, userLon, e.latitude, e.longitude) <= NEARBY_KM)
      .sort((a, b) => {
        const dA = haversineDistance(userLat, userLon, a.latitude, a.longitude);
        const dB = haversineDistance(userLat, userLon, b.latitude, b.longitude);
        return dA - dB;
      });
  }, [events, userLat, userLon]);

  // Fala novos alertas e vibra quando chegam
  useEffect(() => {
    if (!visible) return;
    let hasNew = false;
    nearby.forEach((ev) => {
      if (!spokenIds.current.has(ev.id)) {
        spokenIds.current.add(ev.id);
        hasNew = true;
        const meta = EVENT_CATEGORIES[ev.category] ?? FALLBACK_EVENT_META;
        const dist = userLat != null && userLon != null
          ? haversineDistance(userLat, userLon, ev.latitude, ev.longitude)
          : null;
        const distText = dist != null ? formatDistanceSpeech(dist) : '';
        const msg = `${meta.label} ${distText}. ${ev.title}.`;
        Speech.speak(msg, { language: 'pt-BR', rate: 0.88 });
      }
    });
    // Vibração tátil para novos alertas — importante se som estiver mudo
    if (hasNew) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  }, [visible, nearby.length]);

  const handleClose = useCallback(() => {
    try { Speech.stop(); } catch {}
    onClose();
  }, [onClose]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.overlay, { transform: [{ translateY: slideAnim }] }]}
      pointerEvents="box-none"
    >
      {/* Handle */}
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🚘</Text>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{t('driver_mode_title') || 'Modo Motorista'}</Text>
          <Text style={styles.headerSub}>
            {nearby.length > 0
              ? `${nearby.length} alerta${nearby.length > 1 ? 's' : ''} próximo${nearby.length > 1 ? 's' : ''}`
              : t('driver_no_alerts') || 'Nenhum alerta próximo'}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose} hitSlop={12}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de alertas próximos */}
      {nearby.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>✅</Text>
          <Text style={styles.emptyText}>{t('driver_clear_road') || `Via livre — nenhum alerta nos próximos ${NEARBY_KM} km`}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          scrollEnabled={nearby.length > 2}
        >
          {nearby.map((ev) => {
            const meta = EVENT_CATEGORIES[ev.category] ?? FALLBACK_EVENT_META;
            const dist = userLat != null && userLon != null
              ? haversineDistance(userLat, userLon, ev.latitude, ev.longitude)
              : null;
            const distText = dist != null ? formatDistance(dist) : '';
            return (
              <View key={ev.id} style={[styles.alertCard, { borderLeftColor: meta.color }]}>
                <View style={[styles.alertIcon, { backgroundColor: meta.color + '22' }]}>
                  <Text style={styles.alertEmoji}>{meta.emoji}</Text>
                </View>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertTitle} numberOfLines={1}>{ev.title}</Text>
                  <Text style={styles.alertMeta}>{meta.label}</Text>
                </View>
                {distText !== '' && (
                  <View style={[styles.distBadge, { backgroundColor: meta.color + '20' }]}>
                    <Text style={[styles.distText, { color: meta.color }]}>{distText}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Botão de fechar (grande para dirigindo) */}
      <TouchableOpacity
        style={[styles.exitBtn, { marginBottom: bottom + rh(8) }]}
        onPress={handleClose}
        activeOpacity={0.85}
      >
        <Text style={styles.exitBtnText}>{t('driver_exit') || 'Sair do modo motorista'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0F172A',
    borderTopLeftRadius: rw(24), borderTopRightRadius: rw(24),
    paddingHorizontal: rw(16), paddingTop: rh(8),
    maxHeight: '55%', // 65% cobria os FABs do mapa
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 20,
  },
  handle: {
    alignSelf: 'center', width: rw(40), height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, marginBottom: rh(12),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: rw(10), marginBottom: rh(12),
  },
  headerEmoji: { fontSize: rf(28) },
  headerText: { flex: 1 },
  headerTitle: { fontSize: rf(17), fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: rf(12), color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  closeBtn: {
    width: rw(34), height: rw(34), borderRadius: rw(17),
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: rf(14), fontWeight: '800' },
  list: { flexGrow: 0, marginBottom: rh(12) },
  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: rw(10),
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: rw(14), borderLeftWidth: 4,
    padding: rw(12), marginBottom: rh(8),
  },
  alertIcon: {
    width: rw(44), height: rw(44), borderRadius: rw(22),
    alignItems: 'center', justifyContent: 'center',
  },
  alertEmoji: { fontSize: rf(22) },
  alertInfo: { flex: 1 },
  alertTitle: { fontSize: rf(15), fontWeight: '700', color: '#fff' },
  alertMeta: { fontSize: rf(11), color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  distBadge: {
    paddingHorizontal: rw(10), paddingVertical: rh(5), borderRadius: rw(10),
  },
  distText: { fontSize: rf(13), fontWeight: '800' },
  emptyWrap: {
    alignItems: 'center', paddingVertical: rh(20), gap: rh(8),
  },
  emptyEmoji: { fontSize: rf(40) },
  emptyText: {
    fontSize: rf(14), color: 'rgba(255,255,255,0.55)',
    textAlign: 'center', lineHeight: rf(20),
  },
  exitBtn: {
    backgroundColor: '#FF5722', borderRadius: rw(16),
    paddingVertical: rh(16), alignItems: 'center', marginTop: rh(4),
  },
  exitBtnText: { fontSize: rf(16), fontWeight: '900', color: '#fff' },
});
