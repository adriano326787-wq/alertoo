import React, { useState } from 'react';
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
} from 'react-native';
import { EventCategory, EVENT_CATEGORIES } from '../types';
import { useEventsStore } from '../store/eventsStore';

interface Props {
  visible: boolean;
  coordinate: { latitude: number; longitude: number };
  stateUF?: string;
  cityName?: string;
  countryCode?: string;
  onClose: () => void;
}

export function AddEventModal({ visible, coordinate, stateUF, cityName, countryCode, onClose }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('drunkcheck');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const addEvent = useEventsStore((s) => s.addEvent);

  const handleSubmit = async () => {
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
      onClose();
    } catch (err: any) {
      Alert.alert('Não foi possível reportar', err?.message ?? 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Reportar alerta</Text>

            {(cityName || stateUF) && (
              <View style={styles.locationBadge}>
                <Text style={styles.locationBadgeText}>
                  📌 {[cityName, stateUF].filter(Boolean).join(' — ')}
                </Text>
              </View>
            )}

            <Text style={styles.label}>Tipo de ocorrência</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
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
                      {meta.label}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>

            <Text style={styles.label}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Ex: faixa da direita bloqueada..."
              placeholderTextColor="#aaa"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={200}
            />

            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Reportar</Text>
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
  chips: { gap: 8, paddingVertical: 2, marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 2, backgroundColor: '#fff',
  },
  chipEmoji: { fontSize: 18 },
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
