/**
 * EditEntertainmentModal — edição de título, descrição, endereço e recorrência (#3).
 * Apenas o dono do evento pode editar.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EntertainmentEvent } from '../types/entertainment';
import { useEntertainmentStore } from '../store/entertainmentStore';
import { useT } from '../hooks/useT';

interface Props {
  visible: boolean;
  event: EntertainmentEvent | null;
  onClose: () => void;
}

export function EditEntertainmentModal({ visible, event, onClose }: Props) {
  const t = useT();
  const { bottom } = useSafeAreaInsets();
  const updateEvent = useEntertainmentStore((s) => s.updateEvent);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event && visible) {
      setTitle(event.title ?? '');
      setDescription(event.description ?? '');
      setAddress(event.address ?? '');
      setIsRecurring(event.isRecurring ?? false);
    }
  }, [event, visible]);

  const handleSave = async () => {
    if (!event) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed.length < 3) {
      Alert.alert(t('invalid_name') || 'Nome inválido', t('title_too_short') || 'O título deve ter pelo menos 3 caracteres.');
      return;
    }

    setSaving(true);
    try {
      await updateEvent(event.id, {
        title: trimmed,
        description: description.trim(),
        address: address.trim(),
        isRecurring,
      });
      Alert.alert('✅', t('event_updated') || 'Evento atualizado com sucesso!', [{ text: 'OK', onPress: onClose }]);
    } catch (err: any) {
      Alert.alert(t('error') || 'Erro', (err?.message ?? t('save_error')) || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.sheet, { paddingBottom: Math.max(bottom, 16) }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>✏️ {t('edit_event') || 'Editar evento'}</Text>
            <TouchableOpacity onPress={onClose} disabled={saving}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>{t('event_title_label') || 'Título *'}</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('event_title_placeholder') || 'Nome do evento'}
              placeholderTextColor="#bbb"
              maxLength={80}
            />

            <Text style={styles.label}>{t('event_desc_label') || 'Descrição'}</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('event_desc_placeholder') || 'Descreva o evento...'}
              placeholderTextColor="#bbb"
              multiline
              maxLength={500}
              textAlignVertical="top"
            />

            <Text style={styles.label}>{t('event_address_label') || 'Endereço'}</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder={t('event_address_placeholder') || 'Rua, número, bairro...'}
              placeholderTextColor="#bbb"
              maxLength={200}
            />

            {/* Evento recorrente (#12) */}
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>🔁 {t('recurring_event') || 'Evento recorrente'}</Text>
                <Text style={styles.switchSub}>{t('recurring_event_sub') || 'Acontece toda semana ou regularmente'}</Text>
              </View>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: '#ddd', true: '#FF5722' }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveBtnText}>{t('save') || 'Salvar alterações'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: '90%',
  },
  handle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 17, fontWeight: '800', color: '#1a1a1a' },
  closeBtn: { fontSize: 18, color: '#888', padding: 4 },
  label: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1a1a1a', marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  inputMulti: { minHeight: 80, maxHeight: 120 },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF8F0', borderRadius: 14, padding: 14, marginBottom: 20,
    borderWidth: 1.5, borderColor: '#FFE0B2',
  },
  switchInfo: { flex: 1, marginRight: 12 },
  switchLabel: { fontSize: 14, fontWeight: '700', color: '#E65100' },
  switchSub: { fontSize: 12, color: '#BF360C', marginTop: 2 },
  saveBtn: {
    backgroundColor: '#FF5722', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 8,
  },
  saveBtnDisabled: { backgroundColor: '#ccc' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
