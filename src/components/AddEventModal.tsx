import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { EventCategory, EVENT_CATEGORIES } from '../types';
import { useEventsStore } from '../store/eventsStore';
import { validateEventContent } from '../utils/contentFilter';
import { useT } from '../hooks/useT';
import { tRoadCat } from '../utils/i18n';
import { useTick } from '../hooks/useTick';

interface Props {
  visible: boolean;
  coordinate: { latitude: number; longitude: number };
  stateUF?: string;
  cityName?: string;
  countryCode?: string;
  onClose: () => void;
  /** Chamado APÓS o evento ser criado com sucesso (antes de onClose) */
  onEventCreated?: () => void;
}

export function AddEventModal({ visible, coordinate, stateUF, cityName, countryCode, onClose, onEventCreated }: Props) {
  const t = useT();
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('drunkcheck');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const addEvent = useEventsStore((s) => s.addEvent);
  const _lastEventAt = useEventsStore((s) => s._lastEventAt);
  const RATE_LIMIT_MS = 30_000;
  // #31 — only tick every second when actually rate-limited (avoids wasted re-renders)
  const isRateLimitedInitial = !!_lastEventAt && (Date.now() - _lastEventAt < RATE_LIMIT_MS);
  useTick(isRateLimitedInitial ? 1000 : 0);
  const rateLimitSecondsLeft = _lastEventAt
    ? Math.max(0, Math.ceil((RATE_LIMIT_MS - (Date.now() - _lastEventAt)) / 1000))
    : 0;
  const isRateLimited = rateLimitSecondsLeft > 0;

  // #28 — Reset category and description when modal closes
  useEffect(() => {
    if (!visible) {
      setSelectedCategory('drunkcheck');
      setDescription('');
    }
  }, [visible]);

  // Confirma descarte se o usuário digitou algo na descrição (item 19)
  const handleRequestClose = () => {
    if (description.trim()) {
      Alert.alert(
        t('discard_draft_title'),
        t('discard_draft_msg'),
        [
          { text: t('keep_editing'), style: 'cancel' },
          { text: t('discard'), style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  const handleSubmit = async () => {
    // #3 — validate coordinates before submitting (guards against NaN from bad map tap)
    if (!isFinite(coordinate.latitude) || !isFinite(coordinate.longitude)) {
      Alert.alert(t('error') || 'Erro', t('invalid_location') || 'Localização inválida. Tente novamente.');
      return;
    }

    const contentError = validateEventContent({ description });
    if (contentError) {
      Alert.alert(t('inappropriate_content'), contentError);
      return;
    }

    Keyboard.dismiss(); // #17 — fecha teclado antes do spinner aparecer
    setSaving(true);
    try {
      const meta = EVENT_CATEGORIES[selectedCategory];
      await addEvent({
        category: selectedCategory,
        title: meta.label,
        description: description.trim() || undefined,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        stateUF,
        cityName,
        countryCode,
      });
      setDescription('');
      onEventCreated?.();
      onClose();
    } catch (err: any) {
      Alert.alert(t('report_failed'), err?.message ?? t('error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleRequestClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{t('add_road_title')}</Text>

            {(cityName || stateUF) && (
              <View style={styles.locationBadge}>
                <Text style={styles.locationBadgeText}>
                  📌 {[cityName, stateUF].filter(Boolean).join(' — ')}
                </Text>
              </View>
            )}

            <Text style={styles.label}>{t('add_road_type')}</Text>
            <View style={styles.chips}>
              {(Object.entries(EVENT_CATEGORIES) as [EventCategory, typeof EVENT_CATEGORIES[EventCategory]][]).map(
                ([key, meta]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.chip,
                      { borderColor: meta.color },
                      selectedCategory === key && { backgroundColor: meta.color },
                    ]}
                    onPress={() => setSelectedCategory(key)}
                  >
                    <Text style={styles.chipEmoji}>{meta.emoji}</Text>
                    <Text style={[styles.chipLabel, selectedCategory === key && styles.chipLabelSelected]}>
                      {tRoadCat(key)}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <Text style={styles.label}>{t('add_description')}</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder={t('add_road_desc_ph')}
              placeholderTextColor="#aaa"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={200}
            />

            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleRequestClose} disabled={saving}>
                <Text style={styles.cancelText}>{t('filter_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (saving || isRateLimited) && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={saving || isRateLimited}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : isRateLimited ? (
                  <Text style={styles.submitText}>⏳ {rateLimitSecondsLeft}s</Text>
                ) : (
                  <Text style={styles.submitText}>{t('add_road_report')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36, maxHeight: '90%',
  },
  handle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  locationBadge: {
    backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 16,
  },
  locationBadgeText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  chips: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 2, backgroundColor: '#fff',
  },
  chipEmoji: { fontSize: 16 },
  chipLabel: { fontSize: 13, fontWeight: '600', color: '#333' },
  chipLabelSelected: { color: '#fff' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#1a1a1a', marginBottom: 16,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#666' },
  submitBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: '#E53935', alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#ccc' },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
