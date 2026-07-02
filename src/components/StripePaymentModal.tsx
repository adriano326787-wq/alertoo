/**
 * StripePaymentModal — Payment Sheet nativo do Stripe para cartões internacionais.
 *
 * Fluxo:
 *  1. Usuário seleciona pacote → `createStripePaymentIntent` Cloud Function cria o PaymentIntent
 *  2. initPaymentSheet configura o sheet com o clientSecret
 *  3. presentPaymentSheet abre a UI nativa do Stripe (coleta cartão de forma segura)
 *  4. Após confirmação, `verifyStripePayment` credita automaticamente na conta
 */

import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../hooks/useT';
import { createStripePaymentIntentCloud, verifyStripePaymentCloud } from '../services/promotionService';
import { CreditPackage } from '../types/promotion';
import { useAppStore } from '../store/appStore';
import { resolveCurrencyForCountry, formatPrice, type SupportedCurrency } from '../utils/currency';

interface Props {
  visible: boolean;
  pkg: CreditPackage | null;
  onClose: () => void;
  onApproved: (credits: number) => void;
}

export function StripePaymentModal({ visible, pkg, onClose, onApproved }: Props) {
  const t = useT();
  const { bottom } = useSafeAreaInsets();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'idle' | 'ready' | 'verifying'>('idle');
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  // Preço exibido ANTES da criação do PaymentIntent — estimativa local pelo
  // país detectado. Depois de criar o PaymentIntent, usamos o valor/moeda
  // REAIS confirmados pelo servidor (fonte da verdade — nunca diverge do que
  // será cobrado de fato).
  const userCountryCode = useAppStore((s) => s.userCountryCode);
  const localCurrency = resolveCurrencyForCountry(userCountryCode);
  const [confirmedPrice, setConfirmedPrice] = useState<{ amount: number; currency: SupportedCurrency } | null>(null);

  // Inicia quando o modal abre com um pacote selecionado
  async function handleOpen() {
    if (!pkg || loading) return;
    setLoading(true);
    setStep('idle');
    setPaymentIntentId(null);
    setConfirmedPrice(null);

    try {
      // 1. Cria PaymentIntent no backend
      const { clientSecret, paymentIntentId: pid, amount, currency } = await createStripePaymentIntentCloud(pkg.id);
      setPaymentIntentId(pid);
      setConfirmedPrice({ amount, currency: currency as SupportedCurrency });

      // 2. Inicializa o Payment Sheet do Stripe
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Alertoo',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {},
        // returnURL obrigatório para alguns métodos de pagamento
        returnURL: 'alertoo://stripe-return',
        appearance: {
          colors: {
            primary: '#FF5722',
          },
        },
      });

      if (initError) {
        Alert.alert('Erro', initError.message);
        return;
      }

      setStep('ready');

      // 3. Apresenta a UI nativa do Stripe
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          // Usuário fechou voluntariamente — não é erro
          setStep('idle');
          return;
        }
        Alert.alert('Pagamento recusado', presentError.message);
        setStep('idle');
        return;
      }

      // 4. Pagamento concluído no Stripe — verifica e credita
      setStep('verifying');
      const result = await verifyStripePaymentCloud(pid);

      if (result.status === 'approved') {
        onApproved(result.credits ?? pkg.credits);
        onClose();
      } else {
        Alert.alert(
          'Verificando pagamento',
          'Seu pagamento foi recebido e está sendo processado. Os créditos serão adicionados em instantes.',
          [{ text: 'OK', onPress: onClose }],
        );
      }
    } catch (err: any) {
      Alert.alert(t('error'), err.message ?? 'Não foi possível processar o pagamento.');
    } finally {
      setLoading(false);
      setStep('idle');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: Math.max(bottom, 20) }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>💳 Cartão Internacional</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={loading}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {pkg && (
            <Text style={styles.subtitle}>
              {pkg.credits} crédito{pkg.credits !== 1 ? 's' : ''} · <Text style={styles.price}>
                {confirmedPrice
                  ? formatPrice(confirmedPrice.amount, confirmedPrice.currency)
                  : formatPrice(localCurrency === 'USD' ? pkg.priceUSD : pkg.price, localCurrency)}
              </Text>
            </Text>
          )}

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Info sobre o método */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>🌍 Aceita cartões do mundo todo</Text>
              <Text style={styles.infoText}>
                {'• Visa, Mastercard, Amex, Elo, Hipercard\n'}
                {'• Pagamento processado pelo Stripe\n'}
                {'• Dados do cartão protegidos (PCI DSS)\n'}
                {'• Créditos adicionados automaticamente ✅'}
              </Text>
            </View>

            {/* Status */}
            {step === 'verifying' ? (
              <View style={styles.verifyingBox}>
                <ActivityIndicator size="large" color="#FF5722" />
                <Text style={styles.verifyingText}>Confirmando pagamento...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.payBtn, (!pkg || loading) && styles.payBtnDisabled]}
                onPress={handleOpen}
                disabled={!pkg || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.payBtnIcon}>💳</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.payBtnLabel}>Pagar com cartão</Text>
                      <Text style={styles.payBtnSub}>Powered by Stripe</Text>
                    </View>
                    {pkg && (
                      <Text style={styles.payBtnAmount}>
                        {formatPrice(localCurrency === 'USD' ? pkg.priceUSD : pkg.price, localCurrency)}
                      </Text>
                    )}
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={styles.secureRow}>
              <Text style={styles.secureText}>🔒 Pagamento seguro · Stripe · PCI DSS Level 1</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 20, maxHeight: '80%',
  },
  handle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { fontSize: 18, color: '#888', fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  price: { color: '#FF5722', fontWeight: '800' },

  content: { paddingBottom: 8 },

  infoBox: {
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20,
  },
  infoTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 10 },
  infoText: { fontSize: 13, color: '#555', lineHeight: 22 },

  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#635BFF', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 20, marginBottom: 12,
  },
  payBtnDisabled: { backgroundColor: '#ccc' },
  payBtnIcon: { fontSize: 24 },
  payBtnLabel: { fontSize: 15, fontWeight: '800', color: '#fff' },
  payBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  payBtnAmount: { marginLeft: 'auto', fontSize: 17, fontWeight: '900', color: '#fff' },

  verifyingBox: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  verifyingText: { fontSize: 14, color: '#666' },

  secureRow: { alignItems: 'center', paddingVertical: 8 },
  secureText: { fontSize: 11, color: '#aaa' },
});
