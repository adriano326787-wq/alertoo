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
import { EventCategory, EVENT_CATEGORIES, FALLBACK_EVENT_META } from '../types';
import { CategoryScore } from '../utils/contextScoring';

export interface QuickOption {
  category: EventCategory;
  emoji: string;
  label: string;
  color: string;
}

/**
 * Converte o resultado do Context Signal Engine (scoreCategories/topCategories)
 * em opções prontas pra UI. Filtra 'entertainment' — esse componente é só
 * pra eventos de estrada; entretenimento usa outro fluxo (AddEntertainmentModal).
 */
export function toQuickOptions(scores: CategoryScore[]): QuickOption[] {
  return scores
    .filter((s): s is CategoryScore & { category: EventCategory } => s.category !== 'entertainment')
    .map((s) => {
      const meta = EVENT_CATEGORIES[s.category] ?? FALLBACK_EVENT_META;
      return { category: s.category, emoji: meta.emoji, label: meta.label, color: meta.color };
    });
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
  /**
   * Cria o evento DIRETO (sem abrir modal) — toque normal nos botões/Sim.
   * Reverse geocode e criação ficam por conta de quem chama (MapScreen).
   */
  onQuickConfirm: (
    category: EventCategory,
    coordinate: { latitude: number; longitude: number },
  ) => void;
  /** Toque longo numa opção — abre o modal completo (foto, descrição) pra quem quer detalhar. */
  onReport: (
    category: EventCategory,
    coordinate: { latitude: number; longitude: number },
  ) => void;
  onDismiss: () => void;
  /** true enquanto onQuickConfirm está processando (geocode + write) — desabilita os botões. */
  creating?: boolean;
  /**
   * Opções calculadas pelo Context Signal Engine (contextScoring.ts), já
   * ordenadas por relevância. Quando ausente/vazio, cai no fallback fixo
   * (SLOW_OPTIONS/STOPPED_OPTIONS). Quando tem EXATAMENTE 1 opção (o motor
   * encontrou um vencedor claro), o prompt vira uma pergunta direta de
   * Sim/Não em vez do carrossel de categorias.
   */
  scoredOptions?: QuickOption[];
  /** Chamado quando o usuário fecha sem reportar nada (auto-dismiss ou X) — alimenta o cooldown adaptativo. */
  onIgnored?: () => void;
}

const AUTO_DISMISS_MS = 30_000;

export function TrafficDetectionPrompt({ alert, onQuickConfirm, onReport, onDismiss, creating = false, scoredOptions, onIgnored }: Props) {
  const slideY     = useRef(new Animated.Value(200)).current;
  const autoTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (alert) {
      Animated.spring(slideY, {
        toValue: 0, useNativeDriver: true,
        tension: 65, friction: 11,
      }).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      autoTimer.current = setTimeout(() => dismiss('auto'), AUTO_DISMISS_MS);
    } else {
      slideY.setValue(200);
    }
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert]);

  function dismiss(reason: 'auto' | 'manual' | 'reported') {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    if (reason !== 'reported') onIgnored?.();
    Animated.timing(slideY, {
      toValue: 200, duration: 220, useNativeDriver: true,
    }).start(onDismiss);
  }

  if (!alert) return null;

  const isStopped = alert.kind === 'stopped';
  const fallbackOptions = isStopped ? STOPPED_OPTIONS : SLOW_OPTIONS;
  const options = scoredOptions && scoredOptions.length > 0 ? scoredOptions : fallbackOptions;
  const coordinate = { latitude: alert.latitude, longitude: alert.longitude };

  // O Context Signal Engine só retorna 1 opção quando há um vencedor bem claro
  // (ex: feriado + madrugada de sexta = Lei Seca disparada na frente de tudo).
  // Nesse caso vale a pena simplificar pra uma pergunta direta de Sim/Não.
  const isBinaryMode = !!scoredOptions && scoredOptions.length === 1;
  const single = isBinaryMode ? options[0] : null;

  function handleQuickConfirm(category: EventCategory) {
    onQuickConfirm(category, coordinate);
    // Não chama dismiss() aqui — quem cria o evento (MapScreen) decide quando
    // fechar o prompt (após confirmar sucesso da escrita no Firestore).
    if (autoTimer.current) clearTimeout(autoTimer.current);
  }

  function handleLongPressDetail(category: EventCategory) {
    onReport(category, coordinate);
    dismiss('reported');
  }

  const headline = isBinaryMode
    ? `${single!.emoji} Há ${single!.label.toLowerCase()}?`
    : (isStopped ? 'Você está parado há um tempo.' : 'Trânsito lento detectado.');
  const sub = isBinaryMode
    ? 'Toque e mantenha pressionado pra adicionar foto/descrição'
    : (isStopped ? 'Tem acidente, interdição ou blitz?' : 'O que está acontecendo na via?');

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideY }] }]}>
      {/* Handle */}
      <View style={styles.handle} />

      {/* Cabeçalho */}
      <View style={styles.header}>
        {!isBinaryMode && <Text style={styles.icon}>{isStopped ? '🛑' : '🚦'}</Text>}
        <View style={styles.headerText}>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.sub}>{sub}</Text>
        </View>
        <TouchableOpacity onPress={() => dismiss('manual')} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {isBinaryMode ? (
        /* Pergunta direta — Sim cria o evento na hora, Não só fecha */
        <View style={styles.binaryRow}>
          <TouchableOpacity
            style={[styles.binaryBtn, styles.binaryNo]}
            activeOpacity={0.8}
            disabled={creating}
            onPress={() => dismiss('manual')}
          >
            <Text style={styles.binaryNoText}>Não</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.binaryBtn, styles.binaryYes, { backgroundColor: single!.color }]}
            activeOpacity={0.85}
            disabled={creating}
            onPress={() => handleQuickConfirm(single!.category)}
            onLongPress={() => handleLongPressDetail(single!.category)}
          >
            <Text style={styles.binaryYesText}>{creating ? 'Criando…' : 'Sim, confirmar'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Várias hipóteses plausíveis — carrossel, toque confirma direto */
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
              disabled={creating}
              onPress={() => handleQuickConfirm(opt.category)}
              onLongPress={() => handleLongPressDetail(opt.category)}
            >
              <View style={[styles.optIcon, { backgroundColor: opt.color + '22' }]}>
                <Text style={styles.optEmoji}>{opt.emoji}</Text>
              </View>
              <Text style={styles.optLabel}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Rodapé */}
      <Text style={styles.footer}>
        {isBinaryMode
          ? 'Seu report ajuda outros motoristas em tempo real'
          : 'Toque pra confirmar • toque e mantenha pressionado pra mais detalhes'}
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
  binaryRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  binaryBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 14,
  },
  binaryNo: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  binaryNoText: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  binaryYes: {},
  binaryYesText: { fontSize: 16, fontWeight: '800', color: '#fff' },
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
