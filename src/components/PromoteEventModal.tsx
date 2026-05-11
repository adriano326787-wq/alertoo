import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, SafeAreaView, Alert, ActivityIndicator, Image, Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  PROMOTION_TIERS,
  PromotionTier,
  CREDIT_PACKAGES,
} from '../types/promotion';
import {
  createPromotion,
  uploadPromotionPhoto,
  daysRemaining,
  getUserCredits,
} from '../services/promotionService';
import { getCurrentUserId } from '../services/authService';
import { EntertainmentEvent } from '../types/entertainment';
import { BuyCreditsScreen } from '../screens/BuyCreditsScreen';

interface Props {
  visible: boolean;
  event: EntertainmentEvent | null;
  userCredits: number;
  isAdmin?: boolean;
  onClose: () => void;
  onPromoted: () => void;
  onCreditsUpdated: (newCredits: number) => void;
}

export function PromoteEventModal({
  visible, event, userCredits, isAdmin = false, onClose, onPromoted, onCreditsUpdated,
}: Props) {
  const [selectedTier, setSelectedTier] = useState<PromotionTier>('bronze');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animação de pulso para o preview do pin Ouro
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const tierConfig = PROMOTION_TIERS[selectedTier];
  const canAfford = isAdmin || userCredits >= tierConfig.creditsRequired;
  const alreadyPromoted = !!(
    event?.promotionTier &&
    event.promotionEndDate &&
    event.promotionEndDate > Date.now()
  );

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para escolher a foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handlePromote() {
    if (!event) return;
    if (!canAfford) {
      setShowBuyCredits(true);
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const userId = getCurrentUserId();
      let photoUrl: string | null = null;

      // Upload da foto se selecionada
      if (photoUri) {
        photoUrl = await uploadPromotionPhoto(
          userId,
          event.id,
          photoUri,
          setUploadProgress,
        );
      }

      await createPromotion({
        userId,
        eventId: event.id,
        tier: selectedTier,
        photoUrl,
        skipCreditCheck: isAdmin,
      });

      // Atualiza créditos localmente (admin mantém ∞)
      if (!isAdmin) {
        const newCredits = await getUserCredits(userId);
        onCreditsUpdated(newCredits);
      }

      Alert.alert(
        '🎉 Evento promovido!',
        `Seu evento agora está destacado como ${tierConfig.emoji} ${tierConfig.label} por ${tierConfig.durationDays} dias!`,
        [{ text: 'Ótimo!', onPress: () => { onPromoted(); handleClose(); } }],
      );
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Não foi possível promover o evento.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSelectedTier('bronze');
    setPhotoUri(null);
    setUploadProgress(0);
    onClose();
  }

  if (!event) return null;

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
        <SafeAreaView style={styles.safe}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>🚀 Promover Evento</Text>
            <View style={styles.creditsChip}>
              <Text style={styles.creditsText}>🪙 {userCredits}</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Evento selecionado */}
            <View style={styles.eventCard}>
              <Text style={styles.eventCardLabel}>EVENTO A PROMOVER</Text>
              <Text style={styles.eventCardTitle} numberOfLines={2}>{event.title}</Text>
              {event.address && (
                <Text style={styles.eventCardAddress} numberOfLines={1}>📍 {event.address}</Text>
              )}
              {alreadyPromoted && (
                <View style={styles.alreadyBadge}>
                  <Text style={styles.alreadyBadgeText}>
                    {PROMOTION_TIERS[event.promotionTier!].emoji} Promovido — {daysRemaining(event.promotionEndDate!)}d restantes
                  </Text>
                </View>
              )}
            </View>

            {/* Seção 1: Foto */}
            <Text style={styles.sectionTitle}>1. FOTO DO EVENTO (OPCIONAL)</Text>
            <TouchableOpacity style={styles.photoBox} onPress={handlePickPhoto} activeOpacity={0.8}>
              {photoUri ? (
                <>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                  <View style={styles.photoOverlay}>
                    <Text style={styles.photoOverlayText}>✏️ Trocar foto</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.photoIcon}>📷</Text>
                  <Text style={styles.photoLabel}>Toque para adicionar uma foto</Text>
                  <Text style={styles.photoHint}>Recomendado: 16:9, máx. 5MB</Text>
                </>
              )}
            </TouchableOpacity>
            {photoUri && (
              <TouchableOpacity onPress={() => setPhotoUri(null)} style={styles.removePhoto}>
                <Text style={styles.removePhotoText}>🗑️ Remover foto</Text>
              </TouchableOpacity>
            )}

            {/* Seção 2: Tier */}
            <Text style={styles.sectionTitle}>2. NÍVEL DE DESTAQUE</Text>
            <View style={styles.tiers}>
              {(Object.values(PROMOTION_TIERS)).map((tier) => {
                const isSelected = selectedTier === tier.id;
                const affordable = userCredits >= tier.creditsRequired;
                return (
                  <TouchableOpacity
                    key={tier.id}
                    style={[
                      styles.tierCard,
                      isSelected && styles.tierCardSelected,
                      !affordable && styles.tierCardUnaffordable,
                    ]}
                    onPress={() => setSelectedTier(tier.id)}
                    activeOpacity={0.8}
                  >
                    {/* Pin preview */}
                    <Animated.View
                      style={[
                        styles.tierPin,
                        { backgroundColor: tier.pinColor, transform: [{ scale: isSelected && tier.animated ? pulseAnim : 1 }] },
                      ]}
                    >
                      <Text style={styles.tierPinEmoji}>{tier.emoji}</Text>
                    </Animated.View>

                    <Text style={[styles.tierLabel, isSelected && styles.tierLabelSelected]}>
                      {tier.label}
                    </Text>

                    <View style={styles.tierCredits}>
                      <Text style={styles.tierCreditsText}>
                        🪙 {tier.creditsRequired} {tier.creditsRequired === 1 ? 'crédito' : 'créditos'}
                      </Text>
                    </View>

                    <Text style={styles.tierDuration}>📅 {tier.durationDays} dias</Text>

                    {tier.description.map((d, i) => (
                      <Text key={i} style={styles.tierBenefit}>✓ {d}</Text>
                    ))}

                    {!affordable && (
                      <View style={styles.notAffordableTag}>
                        <Text style={styles.notAffordableText}>Créditos insuficientes</Text>
                      </View>
                    )}
                    {isSelected && (
                      <View style={styles.tierCheck}>
                        <Text style={styles.tierCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Seção 3: Pagamento */}
            <Text style={styles.sectionTitle}>3. USAR CRÉDITOS</Text>

            {canAfford ? (
              <View style={styles.creditSummary}>
                <Text style={styles.creditSummaryText}>
                  🪙 Saldo atual: <Text style={styles.bold}>{isAdmin ? '∞ (Admin)' : `${userCredits} créditos`}</Text>
                </Text>
                {!isAdmin && <>
                  <Text style={styles.creditSummaryText}>
                    💸 Custo: <Text style={styles.bold}>-{tierConfig.creditsRequired} {tierConfig.creditsRequired === 1 ? 'crédito' : 'créditos'}</Text>
                  </Text>
                  <View style={styles.divider} />
                  <Text style={styles.creditSummaryText}>
                    ✅ Restará: <Text style={styles.bold}>{userCredits - tierConfig.creditsRequired} créditos</Text>
                  </Text>
                </>}
              </View>
            ) : (
              <TouchableOpacity style={styles.buyMoreBtn} onPress={() => setShowBuyCredits(true)}>
                <Text style={styles.buyMoreIcon}>🪙</Text>
                <View>
                  <Text style={styles.buyMoreLabel}>Você precisa de mais créditos</Text>
                  <Text style={styles.buyMoreSub}>Toque para comprar um pacote</Text>
                </View>
                <Text style={styles.buyMoreArrow}>›</Text>
              </TouchableOpacity>
            )}

            {/* Botão promover */}
            <TouchableOpacity
              style={[styles.promoteBtn, (!canAfford || loading) && styles.promoteBtnDisabled]}
              onPress={handlePromote}
              disabled={!canAfford || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" />
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <Text style={styles.loadingText}>Enviando foto... {uploadProgress}%</Text>
                  )}
                  {(uploadProgress === 0 || uploadProgress === 100) && (
                    <Text style={styles.loadingText}>Promovendo evento...</Text>
                  )}
                </View>
              ) : (
                <Text style={styles.promoteBtnText}>
                  {canAfford
                    ? `${tierConfig.emoji} Promover como ${tierConfig.label}`
                    : '🪙 Comprar créditos primeiro'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal de compra de créditos */}
      <BuyCreditsScreen
        visible={showBuyCredits}
        onClose={() => setShowBuyCredits(false)}
        onPurchased={async (credits) => {
          const userId = getCurrentUserId();
          const newCredits = await getUserCredits(userId);
          onCreditsUpdated(newCredits);
          setShowBuyCredits(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { fontSize: 20, color: '#333', fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a1a' },
  creditsChip: {
    backgroundColor: '#FFF3E0', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#FFE0B2',
  },
  creditsText: { fontSize: 13, fontWeight: '800', color: '#E65100' },

  content: { padding: 20, paddingBottom: 48 },

  eventCard: {
    backgroundColor: '#F8F9FA', borderRadius: 14,
    padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#EBEBEB',
  },
  eventCardLabel: { fontSize: 10, fontWeight: '800', color: '#aaa', letterSpacing: 0.6, marginBottom: 6 },
  eventCardTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
  eventCardAddress: { fontSize: 13, color: '#888' },
  alreadyBadge: {
    marginTop: 8, backgroundColor: '#E8F5E9', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
  },
  alreadyBadgeText: { fontSize: 12, color: '#2E7D32', fontWeight: '700' },

  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: '#aaa',
    letterSpacing: 0.8, marginBottom: 12, marginTop: 4,
  },

  photoBox: {
    height: 160, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed',
    borderColor: '#ddd', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fafafa', marginBottom: 8, overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%', position: 'absolute' },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoOverlayText: { fontSize: 16, color: '#fff', fontWeight: '700' },
  photoIcon: { fontSize: 36, marginBottom: 8 },
  photoLabel: { fontSize: 14, fontWeight: '700', color: '#555' },
  photoHint: { fontSize: 11, color: '#aaa', marginTop: 4 },
  removePhoto: { alignSelf: 'flex-end', marginBottom: 16, paddingVertical: 4 },
  removePhotoText: { fontSize: 13, color: '#E53935' },

  tiers: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tierCard: {
    flex: 1, borderRadius: 16, borderWidth: 2, borderColor: '#e8e8e8',
    padding: 12, alignItems: 'center', backgroundColor: '#fafafa',
    position: 'relative',
  },
  tierCardSelected: { borderColor: '#FF5722', backgroundColor: '#FFF3F0' },
  tierCardUnaffordable: { opacity: 0.5 },

  tierPin: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
    marginBottom: 8,
  },
  tierPinEmoji: { fontSize: 22 },
  tierLabel: { fontSize: 15, fontWeight: '900', color: '#333', marginBottom: 4 },
  tierLabelSelected: { color: '#FF5722' },
  tierCredits: {
    backgroundColor: '#F3F8FF', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6,
  },
  tierCreditsText: { fontSize: 11, fontWeight: '700', color: '#1565C0' },
  tierDuration: { fontSize: 11, color: '#888', marginBottom: 6 },
  tierBenefit: { fontSize: 10, color: '#555', textAlign: 'center', marginBottom: 2 },

  notAffordableTag: {
    marginTop: 6, backgroundColor: '#FFEBEE', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  notAffordableText: { fontSize: 10, color: '#E53935', fontWeight: '700', textAlign: 'center' },

  tierCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FF5722', alignItems: 'center', justifyContent: 'center',
  },
  tierCheckText: { color: '#fff', fontSize: 12, fontWeight: '900' },

  creditSummary: {
    backgroundColor: '#F8F9FA', borderRadius: 14, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: '#EBEBEB',
  },
  creditSummaryText: { fontSize: 14, color: '#444', marginBottom: 6 },
  bold: { fontWeight: '800', color: '#1a1a1a' },
  divider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 8 },

  buyMoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF3E0', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#FFE0B2', marginBottom: 20,
  },
  buyMoreIcon: { fontSize: 28 },
  buyMoreLabel: { fontSize: 14, fontWeight: '800', color: '#E65100' },
  buyMoreSub: { fontSize: 12, color: '#888' },
  buyMoreArrow: { marginLeft: 'auto', fontSize: 24, color: '#E65100', fontWeight: '700' },

  promoteBtn: {
    backgroundColor: '#FF5722', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    elevation: 4, shadowColor: '#FF5722', shadowOpacity: 0.3, shadowRadius: 8,
  },
  promoteBtnDisabled: { backgroundColor: '#ccc', elevation: 0, shadowOpacity: 0 },
  promoteBtnText: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 14, color: '#fff', fontWeight: '700' },
});
