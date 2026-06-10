/**
 * NearbyEventPrompt — banner contextual de reporte rápido.
 *
 * Aparece quando o usuário está a ≤300 m de um evento ativo de trânsito.
 * Pergunta se ele está passando pelo evento e oferece:
 *   • Confirmar — incrementa confirmations no evento existente
 *   • Reportar outro — abre AddEventModal pré-preenchido com a categoria do evento próximo
 *
 * Regras:
 *   - Só exibe uma vez por evento por sessão (dismissedIds)
 *   - Não exibe se o usuário já votou nesse evento (voters array)
 *   - Auto-dispensa após AUTO_DISMISS_MS
 *   - Não exibe quando há outro modal visível (passa `blocked` prop)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { RoadEvent, EVENT_CATEGORIES } from '../types';
import { haversineDistance } from '../utils/geo';
import { getCurrentUserId } from '../services/authService';

const PROMPT_RADIUS_KM = 0.3;   // 300 m
const AUTO_DISMISS_MS  = 25_000; // 25 s

interface Props {
  userLat: number | null;
  userLon: number | null;
  events: RoadEvent[];
  blocked?: boolean;
  onConfirm:     (eventId: string) => void;
  onQuickReport: (
    category: string,
    coordinate: { latitude: number; longitude: number },
    stateUF?: string,
    cityName?: string,
    countryCode?: string,
  ) => void;
}

export function NearbyEventPrompt({
  userLat, userLon, events, blocked = false,
  onConfirm, onQuickReport,
}: Props) {
  const [promptEvent, setPromptEvent] = useState<RoadEvent | null>(null);
  const dismissedIds = useRef<Set<string>>(new Set());
  const autoTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideY       = useRef(new Animated.Value(120)).current;
  const uid          = getCurrentUserId();

  // Recalcula evento próximo sempre que posição ou eventos mudam
  useEffect(() => {
    if (blocked || userLat == null || userLon == null) return;

    // Categorias relevantes para prompt (trânsito crítico)
    const PROMPT_CATS = new Set([
      'accident', 'policeblitz', 'drunkcheck', 'flood', 'closure', 'hazard', 'radar',
    ]);

    let closest: RoadEvent | null = null;
    let closestDist = Infinity;

    for (const ev of events) {
      if (!PROMPT_CATS.has(ev.category))         continue;
      if (dismissedIds.current.has(ev.id))       continue;
      if (uid && ev.voters?.includes(uid))        continue; // já votou

      const dist = haversineDistance(
        userLat, userLon,
        ev.latitude, ev.longitude,
      );
      if (dist < PROMPT_RADIUS_KM && dist < closestDist) {
        closest = ev;
        closestDist = dist;
      }
    }

    if (closest?.id === promptEvent?.id) return; // sem mudança

    if (closest) {
      setPromptEvent(closest);
    } else if (promptEvent) {
      // saiu do raio — dispensar silenciosamente
      dismiss(promptEvent.id, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLat, userLon, events, blocked]);

  // Anima entrada/saída e inicia timer de auto-dismiss
  useEffect(() => {
    if (promptEvent) {
      Animated.spring(slideY, {
        toValue: 0, useNativeDriver: true,
        tension: 68, friction: 11,
      }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      autoTimer.current = setTimeout(() => dismiss(promptEvent.id, false), AUTO_DISMISS_MS);
    }
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptEvent?.id]);

  function dismiss(id: string, animate = true) {
    dismissedIds.current.add(id);
    if (animate) {
      Animated.timing(slideY, {
        toValue: 120, duration: 220, useNativeDriver: true,
      }).start(() => setPromptEvent(null));
    } else {
      slideY.setValue(120);
      setPromptEvent(null);
    }
    if (autoTimer.current) clearTimeout(autoTimer.current);
  }

  if (!promptEvent) return null;

  const meta  = EVENT_CATEGORIES[promptEvent.category] ?? { emoji: '📍', color: '#607D8B', label: promptEvent.category };
  const label = meta.label ?? promptEvent.category;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideY }] }]}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: (meta.color ?? '#607D8B') + '30' }]}>
          <Text style={styles.iconEmoji}>{meta.emoji}</Text>
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.question} numberOfLines={2}>
            Você está passando por um {label}?
          </Text>
          {(promptEvent.cityName || promptEvent.stateUF) && (
            <Text style={styles.location} numberOfLines={1}>
              📍 {[promptEvent.cityName, promptEvent.stateUF].filter(Boolean).join(', ')}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => dismiss(promptEvent.id)} hitSlop={10} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Ações */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.btnConfirm]}
          activeOpacity={0.8}
          onPress={() => {
            onConfirm(promptEvent.id);
            dismiss(promptEvent.id);
          }}
        >
          <Text style={styles.btnText}>✓  Confirmar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnReport]}
          activeOpacity={0.8}
          onPress={() => {
            onQuickReport(
              promptEvent.category,
              { latitude: promptEvent.latitude, longitude: promptEvent.longitude },
              promptEvent.stateUF,
              promptEvent.cityName,
              promptEvent.countryCode,
            );
            dismiss(promptEvent.id);
          }}
        >
          <Text style={styles.btnText}>🆕  Reportar outro</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100, left: 12, right: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
    zIndex: 200,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  iconEmoji: { fontSize: 22 },
  textBlock: { flex: 1, minWidth: 0 },
  question: {
    fontSize: 14, fontWeight: '700', color: '#fff', lineHeight: 19,
  },
  location: {
    fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3,
  },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  closeText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  actions: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, paddingVertical: 11, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  btnConfirm: { backgroundColor: '#2E7D32' },
  btnReport:  { backgroundColor: '#FF5722' },
  btnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});
