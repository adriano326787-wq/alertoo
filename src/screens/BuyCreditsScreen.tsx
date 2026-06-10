import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Alert, ActivityIndicator, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useT } from '../hooks/useT';
import { CREDIT_PACKAGES, CreditPackage } from '../types/promotion';
import { createMPPreferenceCloud, verifyMPPaymentCloud, awardAdCredit } from '../services/promotionService';
import { useRewardedAd } from '../hooks/useRewardedAd';
import { getCurrentUserId } from '../services/authService';
import { useAppStore } from '../store/appStore';
import { PixPaymentModal } from '../components/PixPaymentModal';
import { StripePaymentModal } from '../components/StripePaymentModal';

// Fallback: link genérico caso a Cloud Function falhe.
// Nesse caso a verificação automática não é possível — o usuário é orientado
// a entrar em contato para receber os créditos manualmente.
const MP_FALLBACK_URL = 'https://link.mercadopago.com.br/alertoo';

// Chave AsyncStorage para sobreviver ao remount do componente entre app ↔ checkout externo
const PENDING_PREF_KEY = '@alertoo_pending_mp_preference';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPurchased?: (credits: number) => void;
}

export function BuyCreditsScreen({ visible, onClose, onPurchased }: Props) {
  const t = useT();
  const [selected, setSelected] = useState<CreditPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [pixModalVisible, setPixModalVisible] = useState(false);
  const [stripeModalVisible, setStripeModalVisible] = useState(false);
  const { ready: adReady, cooldownActive, unavailable: adUnavailable, show: showRewardedAd } = useRewardedAd();
  const { mpPaymentReturn, setMPPaymentReturn } = useAppStore();

  async function handleWatchAd() {
    if (!adReady) return; // Guard extra — ad ainda não carregou
    setRewardLoading(true);
    try {
      await showRewardedAd(async () => {
        // Chamado apenas se o usuário assistiu até o fim
        const userId = getCurrentUserId();
        await awardAdCredit(userId);
        Alert.alert(
          t('buy_credits_ad_reward_title'),
          t('buy_credits_ad_reward_msg'),
          [{ text: t('buy_credits_ad_reward_btn'), onPress: () => onPurchased?.(1) }],
        );
      });
    } catch (err: any) {
      Alert.alert(t('error'), err.message ?? t('buy_credits_ad_failed'));
    } finally {
      setRewardLoading(false);
    }
  }

  // Aguardando verificação de pagamento
  const [pendingVerification, setPendingVerification] = useState<{
    preferenceId: string;
    pkg: CreditPackage;
  } | null>(null);

  // Restaura preferenceId pendente do AsyncStorage ao montar (sobrevive remount entre app ↔ checkout)
  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(PENDING_PREF_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved: { preferenceId: string; pkgId: string } = JSON.parse(raw);
        const pkg = CREDIT_PACKAGES.find((p) => p.id === saved.pkgId);
        if (pkg && saved.preferenceId) {
          setPendingVerification({ preferenceId: saved.preferenceId, pkg });
        }
      } catch {}
    }).catch(() => {});
  }, [visible]);

  // Reage ao retorno do checkout do Mercado Pago via deep link alertoo://payment/*
  useEffect(() => {
    if (!mpPaymentReturn || !visible) return;
    setMPPaymentReturn(null); // consome o evento

    if (mpPaymentReturn === 'success') {
      if (pendingVerification) {
        // Dispara verificação automática quando o MP redireciona de volta com sucesso
        handleVerifyPayment();
      }
    } else if (mpPaymentReturn === 'failure') {
      Alert.alert(
        t('buy_credits_payment_failed_title'),
        t('buy_credits_payment_failed_msg'),
        [{ text: 'OK', onPress: () => setPendingVerification(null) }],
      );
    }
    // 'pending': mantém a tela de verificação — usuário pode checar manualmente
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mpPaymentReturn, visible]);

  async function handleBuyMercadoPago() {
    if (!selected) return;
    setLoading(true);

    let url = '';
    let preferenceId = '';
    let usedFallback = false;
    let mpError = '';

    try {
      const result = await createMPPreferenceCloud(selected.id);
      url = result.initPoint;
      preferenceId = result.preferenceId;
      if (!url) throw new Error('URL de checkout não retornada pelo servidor.');
    } catch (e: any) {
      // Exibe o erro real para diagnóstico — não falha silenciosamente
      mpError = e?.message ?? 'Erro desconhecido ao criar preferência.';
      if (__DEV__) console.error('[MP] createMPPreference falhou:', mpError);
      url = MP_FALLBACK_URL;
      usedFallback = true;
    } finally {
      setLoading(false);
    }

    // Se a Cloud Function falhou, avisa o usuário com o erro real
    if (usedFallback && mpError) {
      Alert.alert(
        'Erro ao iniciar pagamento',
        `Não foi possível gerar o link de pagamento.\n\nDetalhe: ${mpError}\n\nVocê será redirecionado para o Mercado Pago onde poderá tentar novamente.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Continuar assim mesmo',
            onPress: async () => {
              try {
                await Linking.openURL(url);
                Alert.alert(
                  t('buy_credits_fallback_title'),
                  t('buy_credits_fallback_msg'),
                  [{ text: t('understood') }],
                );
              } catch {
                Alert.alert(t('error'), t('buy_credits_open_mp_failed'));
              }
            },
          },
        ]
      );
      return;
    }

    try {
      await Linking.openURL(url);

      if (!usedFallback && preferenceId) {
        // Fluxo normal: persiste no AsyncStorage (sobrevive remount) e entra em verificação
        AsyncStorage.setItem(PENDING_PREF_KEY, JSON.stringify({ preferenceId, pkgId: selected.id })).catch(() => {});
        setPendingVerification({ preferenceId, pkg: selected });
      }
    } catch {
      Alert.alert(t('error'), t('buy_credits_open_mp_failed'));
    }
  }

  async function handleVerifyPayment() {
    if (!pendingVerification) return;
    setLoading(true);
    try {
      const { preferenceId, pkg } = pendingVerification;
      const status = await verifyMPPaymentCloud(preferenceId);

      if (status === 'approved') {
        AsyncStorage.removeItem(PENDING_PREF_KEY).catch(() => {});
        Alert.alert(
          t('buy_credits_confirmed_title'),
          t('buy_credits_confirmed_msg').replace('{credits}', String(pkg.credits)),
          [{ text: 'OK', onPress: () => { onPurchased?.(pkg.credits); setPendingVerification(null); setSelected(null); onClose(); } }],
        );
      } else if (status === 'pending') {
        Alert.alert(t('buy_credits_pending_title'), t('buy_credits_pending_msg'), [{ text: 'OK' }]);
      } else {
        Alert.alert(
          t('buy_credits_rejected_title'),
          t('buy_credits_rejected_msg'),
          [{ text: t('try_again'), onPress: () => setPendingVerification(null) }, { text: t('close'), style: 'cancel' }],
        );
      }
    } catch (err: any) {
      Alert.alert(t('error'), err.message ?? t('buy_credits_verify_failed'));
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSelected(null);
    setPendingVerification(null);
    AsyncStorage.removeItem(PENDING_PREF_KEY).catch(() => {});
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('buy_credits_title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>🚀</Text>
            <Text style={styles.heroTitle}>{t('buy_credits_hero')}</Text>
            <Text style={styles.heroDesc}>{t('buy_credits_hero_desc')}</Text>
          </View>

          {/* ── Rewarded Ad — ganhar 1 crédito gratuito ── */}
          <TouchableOpacity
            style={[
              styles.rewardedCard,
              (cooldownActive || rewardLoading || !adReady || adUnavailable) && styles.rewardedCardDisabled,
            ]}
            onPress={handleWatchAd}
            disabled={cooldownActive || rewardLoading || !adReady || adUnavailable}
            activeOpacity={0.85}
          >
            <View style={styles.rewardedLeft}>
              <Text style={styles.rewardedEmoji}>📺</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rewardedTitle}>{t('buy_credits_watch_ad_title')}</Text>
                <Text style={styles.rewardedSub}>
                  {cooldownActive
                    ? t('buy_credits_ad_cooldown')
                    : adUnavailable
                      ? 'Anúncio indisponível no momento. Tente mais tarde.'
                      : adReady
                        ? t('buy_credits_ad_ready')
                        : t('buy_credits_ad_loading')}
                </Text>
              </View>
            </View>
            {rewardLoading ? (
              <ActivityIndicator color="#1565C0" />
            ) : !adReady && !cooldownActive && !adUnavailable ? (
              <ActivityIndicator color="#93C5FD" size="small" />
            ) : (
              <Text style={styles.rewardedArrow}>
                {cooldownActive ? '⏳' : adUnavailable ? '⚠️' : '▶'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('buy_credits_or_buy')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Pacotes */}
          <Text style={styles.sectionLabel}>{t('buy_credits_choose')}</Text>

          <View style={styles.packages}>
            {CREDIT_PACKAGES.map((pkg) => {
              const isSelected = selected?.id === pkg.id;
              const pricePerCredit = (pkg.price / pkg.credits).toFixed(2);
              return (
                <TouchableOpacity
                  key={pkg.id}
                  style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                  onPress={() => setSelected(pkg)}
                  activeOpacity={0.8}
                >
                  {pkg.highlight && (
                    <View style={styles.highlightBadge}>
                      <Text style={styles.highlightText}>{pkg.highlight}</Text>
                    </View>
                  )}
                  <View style={styles.packageTop}>
                    <Text style={styles.packageCredits}>🪙 {pkg.credits}</Text>
                    <Text style={styles.packageCreditLabel}>
                      {pkg.credits === 1 ? t('pkg_credits').replace('{n}', '').trim() : t('pkg_credits_pl').replace('{n}', '').trim()}
                    </Text>
                  </View>
                  <Text style={styles.packagePrice}>R$ {pkg.price.toFixed(2)}</Text>
                  <Text style={styles.packagePerCredit}>R$ {pricePerCredit}/crédito</Text>

                  {isSelected && (
                    <View style={styles.selectedCheck}>
                      <Text style={styles.selectedCheckText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* O que são créditos */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>{t('buy_credits_what')}</Text>
            <Text style={styles.infoText}>
              {'• 1 crédito = 1 promoção Bronze (7 dias)\n'}
              {'• 2 créditos = 1 promoção Prata (14 dias)\n'}
              {'• 3 créditos = 1 promoção Ouro (30 dias)\n'}
              {'• Créditos não expiram'}
            </Text>
          </View>

          {/* Pagamento */}
          <Text style={styles.sectionLabel}>{t('buy_credits_payment')}</Text>

          {/* Modal PIX nativo */}
          <PixPaymentModal
            visible={pixModalVisible}
            pkg={selected}
            onClose={() => setPixModalVisible(false)}
            onApproved={(credits) => {
              setPixModalVisible(false);
              Alert.alert(
                t('buy_credits_confirmed_title'),
                t('buy_credits_confirmed_msg').replace('{credits}', String(credits)),
                [{ text: 'OK', onPress: () => { onPurchased?.(credits); setSelected(null); onClose(); } }],
              );
            }}
          />

          {/* Modal Stripe — cartão internacional */}
          <StripePaymentModal
            visible={stripeModalVisible}
            pkg={selected}
            onClose={() => setStripeModalVisible(false)}
            onApproved={(credits) => {
              setStripeModalVisible(false);
              Alert.alert(
                t('buy_credits_confirmed_title'),
                t('buy_credits_confirmed_msg').replace('{credits}', String(credits)),
                [{ text: 'OK', onPress: () => { onPurchased?.(credits); setSelected(null); onClose(); } }],
              );
            }}
          />

          {pendingVerification ? (
            /* ── Estado: aguardando verificação ── */
            <View style={styles.pendingBox}>
              <Text style={styles.pendingEmoji}>⏳</Text>
              <Text style={styles.pendingTitle}>Aguardando confirmação</Text>
              <Text style={styles.pendingDesc}>
                Após concluir o pagamento no Mercado Pago, toque em{' '}
                <Text style={{ fontWeight: '800' }}>Verificar pagamento</Text> para
                receber seus créditos automaticamente.
              </Text>
              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={handleVerifyPayment}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.verifyBtnText}>🔍 Verificar pagamento</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPendingVerification(null)} style={styles.cancelVerify}>
                <Text style={styles.cancelVerifyText}>Cancelar e escolher outro pacote</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.payOptions}>
              {/* Botão PIX nativo */}
              <TouchableOpacity
                style={[styles.payBtn, styles.payBtnPix, !selected && styles.payBtnDisabled]}
                onPress={() => { if (selected) setPixModalVisible(true); }}
                disabled={!selected || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.payBtnIcon}>💚</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.payBtnLabel}>PIX</Text>
                      <Text style={styles.payBtnSub}>Instantâneo · QR Code no app</Text>
                    </View>
                    {selected && (
                      <Text style={styles.payBtnAmount}>R$ {selected.price.toFixed(2)}</Text>
                    )}
                  </>
                )}
              </TouchableOpacity>

              {/* Botão Cartão via Checkout Pro (Mercado Pago — Brasil) */}
              <TouchableOpacity
                style={[styles.payBtn, !selected && styles.payBtnDisabled]}
                onPress={handleBuyMercadoPago}
                disabled={!selected || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.payBtnIcon}>💳</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.payBtnLabel}>Cartão de crédito</Text>
                      <Text style={styles.payBtnSub}>via Mercado Pago · Brasil</Text>
                    </View>
                    {selected && (
                      <Text style={styles.payBtnAmount}>R$ {selected.price.toFixed(2)}</Text>
                    )}
                  </>
                )}
              </TouchableOpacity>

              {/* Botão Cartão Internacional via Stripe */}
              <TouchableOpacity
                style={[styles.payBtn, styles.payBtnStripe, !selected && styles.payBtnDisabled]}
                onPress={() => { if (selected) setStripeModalVisible(true); }}
                disabled={!selected || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.payBtnIcon}>🌍</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.payBtnLabel}>Cartão Internacional</Text>
                      <Text style={styles.payBtnSub}>Visa, Mastercard, Amex · Stripe</Text>
                    </View>
                    {selected && (
                      <Text style={styles.payBtnAmount}>R$ {selected.price.toFixed(2)}</Text>
                    )}
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.secureRow}>
            <Text style={styles.secureText}>{t('buy_credits_secure')}</Text>
          </View>
        </ScrollView>
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
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { fontSize: 20, color: '#333', fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a1a' },

  content: { padding: 20, paddingBottom: 48 },

  // ── Rewarded Ad card ──────────────────────────────────────────────────────
  rewardedCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#EFF6FF', borderRadius: 16,
    padding: 16, marginBottom: 8,
    borderWidth: 1.5, borderColor: '#BFDBFE',
  },
  rewardedCardDisabled: { opacity: 0.5 },
  rewardedLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rewardedEmoji: { fontSize: 32 },
  rewardedTitle: { fontSize: 14, fontWeight: '800', color: '#1E40AF', marginBottom: 2 },
  rewardedSub: { fontSize: 12, color: '#3B82F6', lineHeight: 16 },
  rewardedArrow: { fontSize: 20, color: '#1E40AF', fontWeight: '700', marginLeft: 8 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#CBD5E1' },
  dividerText: { fontSize: 11, color: '#94A3B8', fontWeight: '600', letterSpacing: 0.3 },

  hero: { alignItems: 'center', marginBottom: 28 },
  heroEmoji: { fontSize: 52, marginBottom: 10 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#1a1a1a', marginBottom: 6 },
  heroDesc: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 21 },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#aaa',
    letterSpacing: 0.8, marginBottom: 12, marginTop: 4,
  },

  packages: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },

  packageCard: {
    width: '47%', borderRadius: 16, borderWidth: 2, borderColor: '#e8e8e8',
    padding: 16, alignItems: 'center', backgroundColor: '#fafafa',
    position: 'relative',
  },
  packageCardSelected: {
    borderColor: '#FF5722', backgroundColor: '#FFF3F0',
  },

  highlightBadge: {
    position: 'absolute', top: -10, alignSelf: 'center',
    backgroundColor: '#FF5722', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  highlightText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  packageTop: { alignItems: 'center', marginBottom: 4, marginTop: 8 },
  packageCredits: { fontSize: 28, fontWeight: '900', color: '#1a1a1a' },
  packageCreditLabel: { fontSize: 12, color: '#888', fontWeight: '600' },
  packagePrice: { fontSize: 20, fontWeight: '900', color: '#FF5722', marginBottom: 2 },
  packagePerCredit: { fontSize: 11, color: '#aaa' },

  selectedCheck: {
    position: 'absolute', bottom: 8, right: 10,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#FF5722', alignItems: 'center', justifyContent: 'center',
  },
  selectedCheckText: { color: '#fff', fontSize: 13, fontWeight: '900' },

  infoBox: {
    backgroundColor: '#F3F8FF', borderRadius: 14, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: '#DDEEFF',
  },
  infoTitle: { fontSize: 13, fontWeight: '800', color: '#1565C0', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#444', lineHeight: 22 },

  payOptions: { gap: 10, marginBottom: 12 },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#009EE3', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 20,
  },
  payBtnPix: { backgroundColor: '#00B16A' },
  payBtnStripe: { backgroundColor: '#635BFF' },
  payBtnDisabled: { backgroundColor: '#ccc' },
  payBtnIcon: { fontSize: 24 },
  payBtnLabel: { fontSize: 15, fontWeight: '800', color: '#fff' },
  payBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  payBtnAmount: { marginLeft: 'auto', fontSize: 17, fontWeight: '900', color: '#fff' },

  secureRow: { alignItems: 'center' },
  secureText: { fontSize: 12, color: '#aaa' },

  // ─── Verificação pendente ─────────────────────────────────────────────────
  pendingBox: {
    backgroundColor: '#F0F9FF', borderRadius: 16, padding: 20, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#BAE6FD', alignItems: 'center',
  },
  pendingEmoji: { fontSize: 40, marginBottom: 10 },
  pendingTitle: { fontSize: 17, fontWeight: '800', color: '#0369A1', marginBottom: 8 },
  pendingDesc: { fontSize: 13, color: '#555', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  verifyBtn: {
    backgroundColor: '#0EA5E9', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32,
    width: '100%', alignItems: 'center', marginBottom: 10,
  },
  verifyBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  cancelVerify: { paddingVertical: 6 },
  cancelVerifyText: { fontSize: 13, color: '#94A3B8' },
});
