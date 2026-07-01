import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from '../services/safeImagePicker';
import * as Location from 'expo-location';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { EntertainmentCategory, ENTERTAINMENT_CATEGORIES } from '../types/entertainment';
import { useEntertainmentStore } from '../store/entertainmentStore';
import { useUserStore } from '../store/userStore';
import { getCurrentUser } from '../services/authService';
import { validateEventContent } from '../utils/contentFilter';
import { useT } from '../hooks/useT';
import { tEntCat, tf } from '../utils/i18n';
import { useTick } from '../hooks/useTick';
import { EntertainmentBenefitsBanner } from './EntertainmentBenefitsBanner';

// Tutorial passo a passo de criação do primeiro evento
const TOUR_STEPS: { key: string; target: 'category' | 'title' | 'address' | 'photo' | 'publish' }[] = [
  { key: 'tour_step_category', target: 'category' },
  { key: 'tour_step_title', target: 'title' },
  { key: 'tour_step_address', target: 'address' },
  { key: 'tour_step_photo', target: 'photo' },
  { key: 'tour_step_publish', target: 'publish' },
];

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

export function AddEntertainmentModal({ visible, coordinate, stateUF, cityName, countryCode, onClose, onEventCreated }: Props) {
  const t = useT();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const [category, setCategory] = useState<EntertainmentCategory>('bar');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [geocodedStreet, setGeocodedStreet] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const geocodedRef = useRef<string | null>(null);
  const profile = useUserStore((s) => s.profile);
  const scrollRef = useRef<ScrollView>(null);
  const sectionYRef = useRef<Record<string, number>>({});
  const tourPromptedRef = useRef(false);
  const [showTourIntro, setShowTourIntro] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const addEvent = useEntertainmentStore((s) => s.addEvent);
  const _lastEventAt = useEntertainmentStore((s) => s._lastEventAt);
  const RATE_LIMIT_MS = 30_000;
  // #31 — only tick every second when actually rate-limited (avoids wasted re-renders)
  const isRateLimitedInitial = !!_lastEventAt && (Date.now() - _lastEventAt < RATE_LIMIT_MS);
  useTick(isRateLimitedInitial ? 1000 : 0);
  const rateLimitSecondsLeft = _lastEventAt
    ? Math.max(0, Math.ceil((RATE_LIMIT_MS - (Date.now() - _lastEventAt)) / 1000))
    : 0;
  const isRateLimited = rateLimitSecondsLeft > 0;

  // #10 — Reseta campos ao fechar (evita que valores anteriores persistam na próxima abertura)
  useEffect(() => {
    if (!visible) {
      setTitle('');
      setDescription('');
      setCategory('bar');
      setPhotoUri(null);
      // address e geocodedStreet são resetados no useEffect de geocoding abaixo
    }
  }, [visible]);

  // Ao abrir o modal, faz reverse geocoding da coordenada e pré-preenche o endereço
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setGeocodedStreet(null);
    setAddress('');
    geocodedRef.current = null;
    setGeocoding(true);
    Location.reverseGeocodeAsync({ latitude: coordinate.latitude, longitude: coordinate.longitude })
      .then(([place]) => {
        if (cancelled || !place) return;
        // Monta string: "Rua do Catete, 456 — Botafogo"
        const parts: string[] = [];
        if (place.street) parts.push(place.street);
        if (place.streetNumber) parts[0] = (parts[0] ?? '') + ', ' + place.streetNumber;
        if (place.district || place.subregion) parts.push(place.district ?? place.subregion ?? '');
        const suggested = parts.filter(Boolean).join(' — ');
        setGeocodedStreet(suggested || null);
        geocodedRef.current = suggested || null;
        setAddress(suggested);
      })
      .catch(() => { /* sem internet ou permissão — campo fica livre, não é bug (sem captureError de propósito) */ })
      // #32 — check `cancelled` in finally so unmounted component doesn't setState
      .finally(() => { if (!cancelled) setGeocoding(false); });
    return () => { cancelled = true; };
  }, [visible, coordinate.latitude, coordinate.longitude]);

  // Tutorial — sugere o tour passo a passo para usuários cadastrados que nunca o viram
  useEffect(() => {
    if (!visible) {
      tourPromptedRef.current = false;
      setTourActive(false);
      setShowTourIntro(false);
      return;
    }
    if (tourPromptedRef.current) return;
    if (!profile) return; // espera o perfil carregar
    const user = getCurrentUser();
    if (!user || user.isAnonymous) return;
    if (profile.onboarding?.firstEventTourSeen) return;
    tourPromptedRef.current = true;
    const timer = setTimeout(() => setShowTourIntro(true), 500);
    return () => clearTimeout(timer);
  }, [visible, profile]);

  // Rola o formulário para destacar o campo do passo atual do tour
  useEffect(() => {
    if (!tourActive) return;
    const target = TOUR_STEPS[tourStep]?.target;
    const y = target ? sectionYRef.current[target] : undefined;
    if (y !== undefined) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    }
  }, [tourActive, tourStep]);

  const markTourSeen = () => {
    const user = getCurrentUser();
    if (!user || user.isAnonymous) return;
    updateDoc(doc(db, 'users', user.uid), { 'onboarding.firstEventTourSeen': true }).catch(() => {});
  };

  const startTour = () => {
    setShowTourIntro(false);
    setTourStep(0);
    setTourActive(true);
  };
  const skipTourIntro = () => {
    setShowTourIntro(false);
    markTourSeen();
  };
  const endTour = () => {
    setTourActive(false);
    markTourSeen();
  };
  const goNextStep = () => {
    if (tourStep >= TOUR_STEPS.length - 1) { endTour(); return; }
    setTourStep((s) => s + 1);
  };
  const goPrevStep = () => setTourStep((s) => Math.max(0, s - 1));
  const handleSectionLayout = (key: string) => (e: { nativeEvent: { layout: { y: number } } }) => {
    sectionYRef.current[key] = e.nativeEvent.layout.y;
  };

  // Confirma descarte se o usuário preencheu algum campo (item 19)
  const handleRequestClose = () => {
    const hasContent = title.trim() || description.trim() || photoUri;
    if (hasContent) {
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

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status === 'unavailable') {
      Alert.alert('Indisponível nesta versão', 'A seleção de fotos não está disponível nesta versão do app. Atualize o Alertoo e tente novamente.');
      return;
    }
    if (status !== 'granted') {
      Alert.alert(t('permission_required'), t('gallery_permission_msg'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // #19 — rejeita fotos maiores que 8 MB para evitar uploads lentos e erros de Storage
      if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) {
        Alert.alert(t('photo_too_large'), t('photo_too_large_msg'));
        return;
      }
      setPhotoUri(asset.uri);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    // #3 — validate coordinates before submitting (guards against NaN from bad map tap)
    if (!isFinite(coordinate.latitude) || !isFinite(coordinate.longitude)) {
      Alert.alert(t('error') || 'Erro', t('invalid_location') || 'Localização inválida. Tente novamente.');
      return;
    }

    // Endereço obrigatório
    if (!address.trim()) {
      Alert.alert(t('address_required'), t('address_required_msg'));
      return;
    }
    // Validação de endereço: ≥2 tokens E ≥5 chars E pelo menos uma letra OU dígito
    // Aceita "Rua 123", "Av. 9 de Julho", "123 Main St" etc.
    const trimmedAddress = address.trim();
    if (
      trimmedAddress.split(/\s+/).filter(Boolean).length < 2 ||
      trimmedAddress.length < 5 ||
      !/[a-zA-ZÀ-ú0-9]/.test(trimmedAddress)
    ) {
      Alert.alert(t('address_incomplete'), t('address_incomplete_msg'));
      return;
    }

    const contentError = validateEventContent({ title, description, address });
    if (contentError) {
      Alert.alert(t('inappropriate_content'), contentError);
      return;
    }

    Keyboard.dismiss(); // #17 — fecha teclado antes do spinner aparecer
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
      setGeocodedStreet(null);
      geocodedRef.current = null;
      onEventCreated?.();
      onClose();
    } catch (err: any) {
      Alert.alert(t('publish_failed'), err?.message ?? t('error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleRequestClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <View style={[styles.sheet, { paddingBottom: Math.max(bottomInset, 16) + 20 }]}>
          <View style={styles.handle} />
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            contentContainerStyle={tourActive ? styles.scrollContentTour : undefined}
          >
            <View style={styles.titleRow}>
              <Text style={styles.title}>{t('add_event_title')}</Text>
              {(() => {
                const user = getCurrentUser();
                if (!user || user.isAnonymous) return null;
                return (
                  <TouchableOpacity onPress={startTour}>
                    <Text style={styles.tourLink}>{t('tour_replay')}</Text>
                  </TouchableOpacity>
                );
              })()}
            </View>

            <EntertainmentBenefitsBanner />

            {(cityName || stateUF) && (
              <View style={styles.locationBadge}>
                <Text style={styles.locationBadgeText}>📌 {[cityName, stateUF].filter(Boolean).join(' — ')}</Text>
              </View>
            )}

            <View
              onLayout={handleSectionLayout('category')}
              style={[styles.tourSection, tourActive && tourStep === 0 && styles.tourHighlight]}
            >
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
            </View>

            <View
              onLayout={handleSectionLayout('title')}
              style={[styles.tourSection, tourActive && tourStep === 1 && styles.tourHighlight]}
            >
              <View style={styles.labelRow}>
                <Text style={styles.label}>{t('add_event_name')} *</Text>
                <Text style={styles.charCount}>{title.length}/80</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('add_ent_name_ph')}
                placeholderTextColor="#aaa"
                value={title}
                onChangeText={setTitle}
                maxLength={80}
              />

              <View style={styles.labelRow}>
                <Text style={styles.label}>{t('add_description')}</Text>
                <Text style={styles.charCount}>{description.length}/300</Text>
              </View>
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder={t('add_ent_desc_ph')}
                placeholderTextColor="#aaa"
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={300}
              />
            </View>

            <View
              onLayout={handleSectionLayout('address')}
              style={[styles.tourSection, tourActive && tourStep === 2 && styles.tourHighlight]}
            >
              <Text style={styles.label}>
                {t('add_address')} *{' '}
                {geocoding && <Text style={styles.labelHint}>{t('geocoding_searching')}</Text>}
              </Text>
              {geocodedStreet && (
                <View style={styles.geocodeBadge}>
                  <Text style={styles.geocodeBadgeText} numberOfLines={1}>
                    📍 {t('geocode_suggestion')}: {geocodedStreet}
                  </Text>
                </View>
              )}
              <TextInput
                style={[styles.input, !address.trim() && styles.inputError]}
                placeholder={geocoding ? t('geocoding_detecting') : t('address_placeholder')}
                placeholderTextColor="#aaa"
                value={address}
                onChangeText={setAddress}
                maxLength={150}
                autoCorrect={false}
              />
              {!address.trim() && !geocoding && (
                <Text style={styles.fieldRequired}>{t('field_required_address')}</Text>
              )}
            </View>

            {/* Foto opcional */}
            <View
              onLayout={handleSectionLayout('photo')}
              style={[styles.tourSection, tourActive && tourStep === 3 && styles.tourHighlight]}
            >
              <Text style={styles.label}>{t('photo_optional')}</Text>
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
            </View>

            <View
              onLayout={handleSectionLayout('publish')}
              style={[styles.tourSection, tourActive && tourStep === 4 && styles.tourHighlight]}
            >
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleRequestClose}>
                <Text style={styles.cancelText}>{t('filter_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (!title.trim() || !address.trim() || saving || isRateLimited) && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!title.trim() || !address.trim() || saving || isRateLimited}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : isRateLimited ? (
                  <Text style={styles.submitText}>⏳ {rateLimitSecondsLeft}s</Text>
                ) : (
                  <Text style={styles.submitText}>{t('add_publish')}</Text>
                )}
              </TouchableOpacity>
            </View>
            </View>
          </ScrollView>

          {tourActive && (
            <View style={styles.tourBar}>
              <Text style={styles.tourProgress}>
                {tf('tour_progress', { current: tourStep + 1, total: TOUR_STEPS.length })}
              </Text>
              <Text style={styles.tourText}>{t(TOUR_STEPS[tourStep].key)}</Text>
              <View style={styles.tourBarActions}>
                <TouchableOpacity onPress={endTour}>
                  <Text style={styles.tourSkip}>{t('tour_intro_skip')}</Text>
                </TouchableOpacity>
                <View style={styles.tourNavGroup}>
                  {tourStep > 0 && (
                    <TouchableOpacity style={styles.tourNavBtn} onPress={goPrevStep}>
                      <Text style={styles.tourNavBtnText}>{t('tour_prev')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.tourNavBtn, styles.tourNavBtnPrimary]} onPress={goNextStep}>
                    <Text style={styles.tourNavBtnTextPrimary}>
                      {tourStep === TOUR_STEPS.length - 1 ? t('tour_finish') : t('tour_next')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        {showTourIntro && (
          <View style={styles.tourIntroOverlay}>
            <View style={styles.tourIntroCard}>
              <Text style={styles.tourIntroTitle}>{t('tour_intro_title')}</Text>
              <Text style={styles.tourIntroMsg}>{t('tour_intro_msg')}</Text>
              <View style={styles.tourIntroActions}>
                <TouchableOpacity style={styles.tourIntroSkipBtn} onPress={skipTourIntro}>
                  <Text style={styles.tourIntroSkipText}>{t('tour_intro_skip')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tourIntroStartBtn} onPress={startTour}>
                  <Text style={styles.tourIntroStartText}>{t('tour_intro_start')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%',
    // Em tablets/telas largas, evita que o sheet fique esticado de ponta a ponta
    width: '100%', maxWidth: 480, alignSelf: 'center',
  },
  handle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tourLink: { fontSize: 13, fontWeight: '600', color: '#6A1B9A', textDecorationLine: 'underline' },

  // Tutorial — destaque de seção e barra de passos
  tourSection: { borderRadius: 12 },
  tourHighlight: {
    borderWidth: 2,
    borderColor: '#6A1B9A',
    backgroundColor: '#F3E5F5',
    padding: 8,
    marginHorizontal: -8,
  },
  scrollContentTour: { paddingBottom: 180 },
  tourBar: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 14,
    gap: 8,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  tourProgress: { fontSize: 11, fontWeight: '700', color: '#6A1B9A', textTransform: 'uppercase', letterSpacing: 0.5 },
  tourText: { fontSize: 14, color: '#333', lineHeight: 20 },
  tourBarActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  tourSkip: { fontSize: 13, fontWeight: '600', color: '#999' },
  tourNavGroup: { flexDirection: 'row', gap: 8 },
  tourNavBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  tourNavBtnText: { fontSize: 13, fontWeight: '600', color: '#666' },
  tourNavBtnPrimary: { backgroundColor: '#6A1B9A', borderColor: '#6A1B9A' },
  tourNavBtnTextPrimary: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Tutorial — modal de introdução
  tourIntroOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  tourIntroCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    width: '100%', maxWidth: 360,
  },
  tourIntroTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 8, textAlign: 'center' },
  tourIntroMsg: { fontSize: 14, color: '#555', lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  tourIntroActions: { flexDirection: 'row', gap: 12 },
  tourIntroSkipBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  tourIntroSkipText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tourIntroStartBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#6A1B9A', alignItems: 'center' },
  tourIntroStartText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  locationBadge: { backgroundColor: '#F3E5F5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 16 },
  locationBadgeText: { fontSize: 13, color: '#6A1B9A', fontWeight: '600' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#333' },
  charCount: { fontSize: 12, color: '#aaa' },
  chips: { gap: 8, paddingVertical: 2, marginBottom: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 2, backgroundColor: '#fff' },
  chipEmoji: { fontSize: 18 },
  chipLabel: { fontSize: 13, fontWeight: '600', color: '#333' },
  chipLabelSelected: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 14, color: '#1a1a1a', marginBottom: 4 },
  inputError: { borderColor: '#FF7043' },
  fieldRequired: { fontSize: 12, color: '#FF7043', marginBottom: 12, marginLeft: 2 },
  labelHint: { fontSize: 12, color: '#999', fontWeight: '400' },
  geocodeBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 6,
    flexDirection: 'row',
  },
  geocodeBadgeText: { fontSize: 12, color: '#2E7D32', flex: 1 },
  multiline: { minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
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
