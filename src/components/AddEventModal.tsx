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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.sheet}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Reportar evento</Text>

          {(cityName || stateUF) && (
            <View style={styles.locationBadge}>
              <Text style={styles.locationBadgeText}>
                📌 {[cityName, stateUF].filter(Boolean).join(' — ')}
              </Text>
            </View>
          )}

          <Text style={styles.subtitle}>Selecione o tipo de ocorrência</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categories}
          >
            {(Object.entries(EVENT_CATEGORIES) as [EventCategory, typeof EVENT_CATEGORIES[EventCategory]][]).map(
              ([key, meta]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryChip,
                    { borderColor: meta.color },
                    selectedCategory === key && { backgroundColor: meta.color },
                  ]}
                  onPress={() => setSelectedCategory(key)}
                >
                  <Text style={styles.categoryEmoji}>{meta.emoji}</Text>
                  <Text style={[styles.categoryLabel, selectedCategory === key && styles.categoryLabelSelected]}>
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </ScrollView>

          <Text style={styles.inputLabel}>Descrição (opcional)</Text>
          <TextInput
            style={styles.input}
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36, flexGrow: 1,
  },
  handle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  locationBadge: {
    backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 12,
  },
  locationBadgeText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  categoriesScroll: { marginBottom: 16 },
  categories: { gap: 10, paddingVertical: 4 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 2, backgroundColor: '#fff',
  },
  categoryEmoji: { fontSize: 18 },
  categoryLabel: { fontSize: 13, fontWeight: '600', color: '#333' },
  categoryLabelSelected: { color: '#fff' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#1a1a1a', minHeight: 80, textAlignVertical: 'top', marginBottom: 20,
  },
  footer: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#666' },
  submitBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: '#1565C0', alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#90CAF9' },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
