import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Alert, ActivityIndicator, Image, Animated, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useT } from '../hooks/useT';
import { tf, tTier } from '../utils/i18n';

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
  const t = useT();
  const { top } = useSafeAreaInsets();
  const [selectedTier, setSelectedTier] = useState<PromotionTier>('bronze');
  const [photoUris, setPhotoUris] = useState<string[]>([]); // até maxPhotos por tier
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

  const maxPhotos = PROMOTION_TIERS[selectedTier].maxPhotos;

  // Ao mudar o tier, trunca fotos extras se o novo tier tiver menos slots
  useEffect(() => {
    setPhotoUris((prev) => prev.slice(0, PROMOTION_TIERS[selectedTier].maxPhotos));
  }, [selectedTier]);

  async function handlePickPhoto(index: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para escolher a foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUris((prev) => {
        const next = [...prev];
        next[index] = result.assets[0].uri;
        return next;
      });
    }
  }

  function handleRemovePhoto(index: number) {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
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
      const uploadedUrls: string[] = [];

      // Upload de cada foto sequencialmente com progresso total
      for (let i = 0; i < photoUris.length; i++) {
        const url = await uploadPromotionPhoto(
          userId,
          event.id,
          photoUris[i],
          (pct) => setUploadProgress(Math.round(((i + pct / 100) / photoUris.length) * 100)),
        );
        uploadedUrls.push(url);
      }

      await createPromotion({
        userId,
        eventId: event.id,
        tier: selectedTier,
        photoUrl: uploadedUrls[0] ?? null,
        photoUrls: uploadedUrls,
        skipCreditCheck: isAdmin,
      });

      // Atualiza créditos localmente (admin mantém ∞)
      if (!isAdmin) {
        const newCredits = await getUserCredits(userId);
        onCreditsUpdated(newCredits);
      }

      Alert.alert(
        t('promo_success_title'),
        tf('promo_success_msg', { tier: `${tierConfig.emoji} ${tTier(tierConfig.id)}`, days: tierConfig.durationDays }),
        [{ text: t('promo_great'), onPress: () => { onPromoted(); handleClose(); } }],
      );
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Não foi possível promover o evento.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSelectedTier('bronze');
    setPhotoUris([]);
    setUploadProgress(0);
    onClose();
  }

  if (!event) return null;

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
        <SafeAreaView style={styles.safe}>
          {/* Header com padding para status bar */}
          <View style={[styles.header, { paddingTop: Math.max(top, 16) }]}>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('promo_header')}</Text>
            <View style={styles.creditsChip}>
              <Text style={styles.creditsText}>🪙 {userCredits}</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Evento selecionado */}
            <View style={styles.eventCard}>
              <Text style={styles.eventCardLabel}>{t('promo_event_label')}</Text>
              <Text style={styles.eventCardTitle} numberOfLines={2}>{event.title}</Text>
              {event.address && (
                <Text style={styles.eventCardAddress} numberOfLines={1}>📍 {event.address}</Text>
              )}
              {alreadyPromoted && (
                <View style={styles.alreadyBadge}>
                  <Text style={styles.alreadyBadgeText}>
                    {PROMOTION_TIERS[event.promotionTier!].emoji} {tf('promo_already', { n: daysRemaining(event.promotionEndDate!) })}
                  </Text>
                </View>
              )}
            </View>

            {/* Seção 1: Fotos (até maxPhotos por tier) */}
            <View style={styles.photoSectionHeader}>
              <Text style={styles.sectionTitle}>{t('promo_photo_section')}</Text>
              <View style={[styles.photoCountChip, { backgroundColor: tierConfig.pinColor + '33', borderColor: tierConfig.pinColor }]}>
                <Text style={[styles.photoCountText, { color: tierConfig.pinColor }]}>
                  {tierConfig.emoji} {photoUris.length}/{maxPhotos} foto{maxPhotos !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            <View style={styles.photoGrid}>
              {Array.from({ length: maxPhotos }).map((_, i) => {
                const uri = photoUris[i];
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.photoSlot, uri && styles.photoSlotFilled]}
                    onPress={() => handlePickPhoto(i)}
                    activeOpacity={0.8}
                  >
                    {uri ? (
                      <>
                        <Image source={{ uri }} style={styles.photoSlotImage} />
                        <TouchableOpacity
                          style={styles.photoSlotRemove}
                          onPress={() => handleRemovePhoto(i)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.photoSlotRemoveText}>✕</Text>
                        </TouchableOpacity>
                        {i === 0 && (
                          <View style={styles.photoSlotPrimaryBadge}>
                            <Text style={styles.photoSlotPrimaryText}>Capa</Text>
                          </View>
                        )}
                      </>
                    ) : (
                      <>
                        <Text style={styles.photoSlotIcon}>📷</Text>
                        <Text style={styles.photoSlotLabel}>
                          {i === 0 ? 'Foto capa' : `Foto ${i + 1}`}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Seção 2: Tier */}
            <Text style={styles.sectionTitle}>{t('promo_tier_section')}</Text>
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
                      {tTier(tier.id)}
                    </Text>

                    <View style={styles.tierCredits}>
                      <Text style={styles.tierCreditsText}>
                        🪙 {tier.creditsRequired} {tier.creditsRequired === 1 ? t('promo_credit') : t('promo_credits')}
                      </Text>
                    </View>

                    <Text style={styles.tierDuration}>📅 {tier.durationDays} {t('promo_days')}</Text>

                    {tier.description.map((d, i) => (
                      <Text key={i} style={styles.tierBenefit}>✓ {t(d)}</Text>
                    ))}

                    {!affordable && (
                      <View style={styles.notAffordableTag}>
                        <Text style={styles.notAffordableText}>{t('promo_insufficient')}</Text>
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
            <Text style={styles.sectionTitle}>{t('promo_credits_section')}</Text>

            {canAfford ? (
              <View style={styles.creditSummary}>
                <Text style={styles.creditSummaryText}>
                  {t('promo_balance')} <Text style={styles.bold}>{isAdmin ? '∞ (Admin)' : `${userCredits} ${t('promo_credits')}`}</Text>
                </Text>
                {!isAdmin && <>
                  <Text style={styles.creditSummaryText}>
                    {t('promo_cost')} <Text style={styles.bold}>-{tierConfig.creditsRequired} {tierConfig.creditsRequired === 1 ? t('promo_credit') : t('promo_credits')}</Text>
                  </Text>
                  <View style={styles.divider} />
                  <Text style={styles.creditSummaryText}>
                    {t('promo_remaining_bal')} <Text style={styles.bold}>{userCredits - tierConfig.creditsRequired} {t('promo_credits')}</Text>
                  </Text>
                </>}
              </View>
            ) : (
              <TouchableOpacity style={styles.buyMoreBtn} onPress={() => setShowBuyCredits(true)}>
                <Text style={styles.buyMoreIcon}>🪙</Text>
                <View>
                  <Text style={styles.buyMoreLabel}>{t('promo_need_more')}</Text>
                  <Text style={styles.buyMoreSub}>{t('promo_buy_package')}</Text>
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
                    <Text style={styles.loadingText}>{tf('promo_uploading', { n: uploadProgress })}</Text>
                  )}
                  {(uploadProgress === 0 || uploadProgress === 100) && (
                    <Text style={styles.loadingText}>{t('promo_promoting')}</Text>
                  )}
                </View>
              ) : (
                <Text style={styles.promoteBtnText}>
                  {canAfford
                    ? tf('promo_btn_promote', { emoji: tierConfig.emoji, tier: tTier(tierConfig.id) })
                    : t('promo_btn_buy')}
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

  // ─── Fotos múltiplas ──────────────────────────────────────────────────────────
  photoSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  photoCountChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1.5,
  },
  photoCountText: { fontSize: 12, fontWeight: '800' },
  photoGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16,
  },
  photoSlot: {
    width: '47%', aspectRatio: 16 / 9,
    borderRadius: 10, borderWidth: 2, borderStyle: 'dashed',
    borderColor: '#ddd', backgroundColor: '#fafafa',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  photoSlotFilled: { borderStyle: 'solid', borderColor: 'transparent' },
  photoSlotImage: { width: '100%', height: '100%', position: 'absolute' },
  photoSlotRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoSlotRemoveText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  photoSlotPrimaryBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  photoSlotPrimaryText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  photoSlotIcon: { fontSize: 24, marginBottom: 4 },
  photoSlotLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },

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
