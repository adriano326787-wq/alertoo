/**
 * RadarConfirmBanner — confirmação passiva de radares.
 *
 * Quando o usuário passa a ≤300 m de um radar cadastrado cuja última
 * confirmação tem mais de 7 dias, mostra um banner discreto perguntando
 * "esse radar ainda está aí?". Alimenta a base colaborativa sem esforço.
 *
 * Anti-fadiga:
 *   - máx. 1 pergunta por dia (persistido em AsyncStorage)
 *   - nunca pergunta sobre radar em que o usuário já votou na janela de 30d
 *   - some sozinho após 20 s sem interação
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Radar, RADAR_REVOTE_WINDOW_MS } from '../types/radar';
import { useRadarsStore } from '../store/radarsStore';
import { getCurrentUserId } from '../services/authService';
import { haversineDistance } from '../utils/geo';
import { useT } from '../hooks/useT';

const PROMPT_RADIUS_KM   = 0.3;
const MIN_STALENESS_MS   = 7 * 24 * 60 * 60 * 1000; // só pergunta se ≥7d sem confirmação
const LAST_PROMPT_KEY    = '@alertoo_radar_prompt_at';
const AUTO_DISMISS_MS    = 20_000;

interface Props {
  userLat: number | null;
  userLon: number | null;
  /** Suprime o banner (ex.: outro modal aberto) */
  paused?: boolean;
}

export function RadarConfirmBanner({ userLat, userLon, paused = false }: Props) {
  const t = useT();
  const radars = useRadarsStore((s) => s.radars);
  const confirmRadar = useRadarsStore((s) => s.confirmRadar);
  const denyRadar = useRadarsStore((s) => s.denyRadar);
  const [candidate, setCandidate] = useState<Radar | null>(null);
  const checkedRef = useRef(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (paused || candidate || checkedRef.current) return;
    if (userLat == null || userLon == null || radars.length === 0) return;

    const uid = getCurrentUserId();
    if (!uid || uid === 'anonymous') return;

    (async () => {
      try {
        const lastPrompt = Number(await AsyncStorage.getItem(LAST_PROMPT_KEY)) || 0;
        const now = Date.now();
        // 1 pergunta por dia
        if (now - lastPrompt < 24 * 60 * 60 * 1000) { checkedRef.current = true; return; }

        const near = radars.find((r) =>
          r.status === 'active' &&
          now - r.lastConfirmedAt >= MIN_STALENESS_MS &&
          (now - (r.voterStamps[uid] ?? 0)) >= RADAR_REVOTE_WINDOW_MS &&
          haversineDistance(userLat, userLon, r.latitude, r.longitude) <= PROMPT_RADIUS_KM,
        );
        if (!near) return;

        checkedRef.current = true;
        await AsyncStorage.setItem(LAST_PROMPT_KEY, String(now));
        setCandidate(near);
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      } catch (_) {}
    })();
  }, [paused, candidate, userLat, userLon, radars, opacity]);

  // Auto-dismiss após 20 s
  useEffect(() => {
    if (!candidate) return;
    const timer = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate]);

  function dismiss() {
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true })
      .start(() => setCandidate(null));
  }

  async function vote(action: 'confirm' | 'deny') {
    if (!candidate) return;
    const fn = action === 'confirm' ? confirmRadar : denyRadar;
    fn(candidate.id).catch(() => {});
    dismiss();
  }

  if (!candidate || paused) return null;

  return (
    <Animated.View style={[styles.banner, { opacity }]} pointerEvents="box-none">
      <View style={styles.card}>
        <Text style={styles.title}>📷 {t('radar_confirm_prompt_title')}</Text>
        <Text style={styles.msg}>
          {t('radar_confirm_prompt_msg')}
          {candidate.speedLimit ? ` (${candidate.speedLimit} km/h)` : ''}
        </Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, styles.btnYes]} onPress={() => vote('confirm')}>
            <Text style={styles.btnYesText}>👍 {t('radar_still_there')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnNo]} onPress={() => vote('deny')}>
            <Text style={styles.btnNoText}>👎 {t('radar_gone')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnClose} onPress={dismiss}>
            <Text style={styles.btnCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 140,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 2 },
  msg: { fontSize: 13, color: '#555', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnYes: { backgroundColor: '#E8F5E9' },
  btnYesText: { fontSize: 13, fontWeight: '700', color: '#2E7D32' },
  btnNo: { backgroundColor: '#FFEBEE' },
  btnNoText: { fontSize: 13, fontWeight: '700', color: '#C62828' },
  btnClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCloseText: { fontSize: 14, color: '#666', fontWeight: '700' },
});
