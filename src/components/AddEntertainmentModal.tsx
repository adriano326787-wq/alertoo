import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { EntertainmentCategory, ENTERTAINMENT_CATEGORIES } from '../types/entertainment';
import { useEntertainmentStore } from '../store/entertainmentStore';
import { validateEventContent } from '../utils/contentFilter';
import { useT } from '../hooks/useT';
import { tEntCat } from '../utils/i18n';

interface Props {
  visible: boolean;
  coordinate: { latitude: number; longitude: number };
  stateUF?: string;
  cityName?: string;
  countryCode?: string;
  onClose: () => void;
}

export function AddEntertainmentModal({ visible, coordinate, stateUF, cityName, countryCode, onClose }: Props) {
  const t = useT();
  const [category, setCategory] = useState<EntertainmentCategory>('bar');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const addEvent = useEntertainmentStore((s) => s.addEvent);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria pra escolher a foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    const contentError = validateEventContent({ title, description, address });
    if (contentError) {
      Alert.alert('Conteúdo inadequado', contentError);
      return;
    }

    setSaving(true);
    try {
      await addEvent({
        category,
        title: title.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        stateUF,
        cityName,
        countryCode,
        photoUri: photoUri ?? undefined,
      });
      setTitle('');
      setDescription('');
      setAddress('');
      setPhotoUri(null);
      onClose();
    } catch (err: any) {
      Alert.alert('Não foi possível publicar', err?.message ?? 'Tente novamente.');
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
            <Text style={styles.title}>{t('add_event_title')}</Text>

            {(cityName || stateUF) && (
              <View style={styles.locationBadge}>
                <Text style={styles.locationBadgeText}>📌 {[cityName, stateUF].filter(Boolean).join(' — ')}</Text>
              </View>
            )}

            <Text style={styles.label}>{t('add_category')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {(Object.entries(ENTERTAINMENT_CATEGORIES) as [EntertainmentCategory, typeof ENTERTAINMENT_CATEGORIES[EntertainmentCategory]][]).map(([key, meta]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, { borderColor: meta.color }, category === key && { backgroundColor: meta.color }]}
                  onPress={() => setCategory(key)}
                >
                  <Text style={styles.chipEmoji}>{meta.emoji}</Text>
                  <Text style={[styles.chipLabel, category === key && styles.chipLabelSelected]}>{tEntCat(key)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>{t('add_event_name')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t('add_ent_name_ph')}
              placeholderTextColor="#aaa"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />

            <Text style={styles.label}>{t('add_description')}</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder={t('add_ent_desc_ph')}
              placeholderTextColor="#aaa"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={300}
            />

            <Text style={styles.label}>{t('add_address')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('add_ent_addr_ph')}
              placeholderTextColor="#aaa"
              value={address}
              onChangeText={setAddress}
              maxLength={150}
            />

            {/* Foto opcional */}
            <Text style={styles.label}>📷 Foto (opcional)</Text>
            {photoUri ? (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                <TouchableOpacity style={styles.photoRemove} onPress={() => setPhotoUri(null)}>
                  <Text style={styles.photoRemoveText}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoChange} onPress={handlePickPhoto}>
                  <Text style={styles.photoChangeText}>{t('change_photo') || 'Trocar foto'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.photoPickBtn} onPress={handlePickPhoto}>
                <Text style={styles.photoPickIcon}>📷</Text>
                <Text style={styles.photoPickText}>{t('add_photo') || 'Adicionar foto'}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>{t('filter_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (!title.trim() || saving) && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!title.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitText}>{t('add_publish')}</Text>
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
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: '90%' },
  handle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  locationBadge: { backgroundColor: '#F3E5F5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 16 },
  locationBadgeText: { fontSize: 13, color: '#6A1B9A', fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  chips: { gap: 8, paddingVertical: 2, marginBottom: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 2, backgroundColor: '#fff' },
  chipEmoji: { fontSize: 18 },
  chipLabel: { fontSize: 13, fontWeight: '600', color: '#333' },
  chipLabelSelected: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 14, color: '#1a1a1a', marginBottom: 16 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#666' },
  submitBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: '#6A1B9A', alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#ccc' },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Photo picker
  photoPickBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#ddd', borderStyle: 'dashed',
    backgroundColor: '#FAFAFA',
    marginBottom: 16, gap: 8,
  },
  photoPickIcon: { fontSize: 22 },
  photoPickText: { fontSize: 14, fontWeight: '600', color: '#666' },
  photoPreviewWrap: {
    position: 'relative',
    borderRadius: 12, overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#000',
  },
  photoPreview: { width: '100%', aspectRatio: 4/3 },
  photoRemove: {
    position: 'absolute', top: 8, right: 8,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  photoChange: {
    position: 'absolute', bottom: 8, right: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  photoChangeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
