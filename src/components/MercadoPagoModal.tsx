import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Linking, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useT } from '../hooks/useT';

// ─── Cloud Function para criar preferência de doação ──────────────────────────
// O valor exato é pré-preenchido no checkout do Mercado Pago.
const functions = getFunctions(undefined, 'us-central1');

// Link genérico de fallback caso a Cloud Function falhe
const MP_FALLBACK_URL = 'https://link.mercadopago.com.br/alertoo';

export const DONATE_OPTIONS = [
  { labelKey: 'donate_tier_cafe_label',     descKey: 'donate_tier_cafe_desc',     emoji: '☕', amount: 5,  color: '#795548' },
  { labelKey: 'donate_tier_apoio_label',    descKey: 'donate_tier_apoio_desc',    emoji: '🙌', amount: 10, color: '#1976D2' },
  { labelKey: 'donate_tier_parceiro_label', descKey: 'donate_tier_parceiro_desc', emoji: '🚀', amount: 25, color: '#7B1FA2' },
  { labelKey: 'donate_tier_heroi_label',    descKey: 'donate_tier_heroi_desc',    emoji: '🏆', amount: 50, color: '#F9A825' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function MercadoPagoModal({ visible, onClose }: Props) {
  const t = useT();
  const [loadingAmount, setLoadingAmount] = useState<number | null>(null);

  async function handleSelect(amount: number) {
    if (loadingAmount) return; // evita duplo toque
    setLoadingAmount(amount);
    try {
      const call = httpsCallable<{ amount: number }, { initPoint: string }>(
        functions,
        'createDonationPreference',
      );
      const res = await call({ amount });
      onClose();
      await Linking.openURL(res.data.initPoint);
    } catch {
      // Fallback: abre link genérico sem valor pré-preenchido
      onClose();
      Linking.openURL(MP_FALLBACK_URL).catch(() =>
        Alert.alert(t('error'), t('donate_mp_failed')),
      );
    } finally {
      setLoadingAmount(null);
    }
  }

  function handleBack() {
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleBack}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('support_modal_title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Tela de escolha do valor ── */}
        <View style={styles.content}>
            <View style={styles.heroSection}>
              <Text style={styles.heroEmoji}>💛</Text>
              <Text style={styles.heroTitle}>{t('support_modal_hero')}</Text>
              <Text style={styles.heroDesc}>{t('support_modal_body')}</Text>
              <View style={styles.mpBadge}>
                <Text style={styles.mpBadgeText}>{t('support_modal_secure')}</Text>
              </View>
            </View>

            <Text style={styles.chooseLabel}>{t('support_choose_value')}</Text>

            <View style={styles.grid}>
              {DONATE_OPTIONS.map((opt) => {
                const isLoading = loadingAmount === opt.amount;
                const isDisabled = loadingAmount !== null;
                return (
                  <TouchableOpacity
                    key={opt.amount}
                    style={[styles.option, { borderColor: opt.color }, isDisabled && styles.optionDisabled]}
                    onPress={() => handleSelect(opt.amount)}
                    activeOpacity={0.7}
                    disabled={isDisabled}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={opt.color} style={{ marginVertical: 16 }} />
                    ) : (
                      <>
                        <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                        <Text style={[styles.optionAmount, { color: opt.color }]}>R$ {opt.amount}</Text>
                        <Text style={styles.optionLabel}>{t(opt.labelKey)}</Text>
                        <Text style={styles.optionDesc}>{t(opt.descKey)}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>{t('support_not_now')}</Text>
            </TouchableOpacity>
          </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 20, color: '#333', fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', flex: 1, textAlign: 'center' },

  // Escolha de valor
  content: { flex: 1, padding: 20 },
  heroSection: { alignItems: 'center', marginBottom: 24 },
  heroEmoji: { fontSize: 56, marginBottom: 12 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#1a1a1a', textAlign: 'center', marginBottom: 8 },
  heroDesc: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  mpBadge: {
    backgroundColor: '#E8F5E9', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  mpBadgeText: { fontSize: 12, color: '#2E7D32', fontWeight: '600' },

  chooseLabel: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  option: {
    width: '47%', borderRadius: 16, borderWidth: 2,
    padding: 16, alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  optionDisabled: { opacity: 0.5 },
  optionEmoji: { fontSize: 28, marginBottom: 6 },
  optionAmount: { fontSize: 22, fontWeight: '900', marginBottom: 2 },
  optionLabel: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 2 },
  optionDesc: { fontSize: 11, color: '#999', textAlign: 'center' },

  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { fontSize: 14, color: '#bbb' },
});
