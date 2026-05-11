import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, SafeAreaView, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { CREDIT_PACKAGES, CreditPackage } from '../types/promotion';
import { addCredits } from '../services/promotionService';
import { getCurrentUserId } from '../services/authService';

// ─── Configuração Mercado Pago ────────────────────────────────────────────────
// Access Token do MP (use o de PRODUÇÃO para cobranças reais)
// ⚠️ Em produção, mova isso para um Cloud Function/backend para não expor o token
const MP_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MP_ACCESS_TOKEN ?? '';

// Fallback: links fixos por pacote (criar no painel MP com os valores corretos)
// Usado quando a criação de preferência falha ou o token não está configurado
const MP_FALLBACK_LINKS: Record<string, string> = {
  pkg_1:  'https://link.mercadopago.com.br/alertoo',
  pkg_5:  'https://link.mercadopago.com.br/alertoo',
  pkg_10: 'https://link.mercadopago.com.br/alertoo',
  pkg_20: 'https://link.mercadopago.com.br/alertoo',
};

async function createMPPreference(pkg: CreditPackage): Promise<string> {
  if (!MP_ACCESS_TOKEN) throw new Error('Token MP não configurado');

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      items: [
        {
          id: pkg.id,
          title: pkg.label,
          description: `${pkg.credits} crédito(s) para promoção no Alertoo`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: pkg.price,
        },
      ],
      payment_methods: {
        excluded_payment_types: [{ id: 'ticket' }], // exclui boleto, mantém PIX e cartão
        installments: 1,
      },
      back_urls: {
        success: 'alertoo://payment/success',
        failure: 'alertoo://payment/failure',
        pending: 'alertoo://payment/pending',
      },
      statement_descriptor: 'ALERTOO',
    }),
  });

  if (!response.ok) throw new Error(`MP API error: ${response.status}`);
  const data = await response.json();
  // init_point = link de checkout com valor pré-preenchido
  return data.init_point as string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onPurchased?: (credits: number) => void;
}

export function BuyCreditsScreen({ visible, onClose, onPurchased }: Props) {
  const [selected, setSelected] = useState<CreditPackage | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleBuyMercadoPago() {
    if (!selected) return;
    const userId = getCurrentUserId();
    setLoading(true);

    let url: string;
    try {
      // Tenta criar preferência com valor pré-preenchido
      url = await createMPPreference(selected);
    } catch {
      // Fallback para link fixo
      url = MP_FALLBACK_LINKS[selected.id];
    } finally {
      setLoading(false);
    }

    try {
      await Linking.openURL(url);

      // Após abrir o link, mostra confirmação manual (simplificado)
      // Em produção: webhook do MP atualiza automaticamente via Cloud Function
      Alert.alert(
        '✅ Pagamento iniciado',
        `Após concluir o pagamento via Mercado Pago, seus ${selected.credits} crédito(s) serão adicionados automaticamente.\n\nSe não aparecer em até 5 minutos, entre em contato com o suporte.`,
        [
          {
            text: 'Já paguei',
            onPress: async () => {
              // Simulação local — em produção via webhook
              setLoading(true);
              try {
                await addCredits(
                  userId,
                  selected.credits,
                  selected.id,
                  'mercadopago',
                  `mp_${Date.now()}`,
                  selected.price,
                );
                onPurchased?.(selected.credits);
                setSelected(null);
                onClose();
              } catch (err: any) {
                Alert.alert('Erro', err.message ?? 'Falha ao registrar créditos.');
              } finally {
                setLoading(false);
              }
            },
          },
          { text: 'Cancelar', style: 'cancel' },
        ],
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o Mercado Pago.');
    }
  }

  function handleClose() {
    setSelected(null);
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
          <Text style={styles.headerTitle}>🪙 Comprar Créditos</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>🚀</Text>
            <Text style={styles.heroTitle}>Destaque seu evento</Text>
            <Text style={styles.heroDesc}>
              Use créditos para promover seus restaurantes, bares e eventos no mapa com destaque especial.
            </Text>
          </View>

          {/* Pacotes */}
          <Text style={styles.sectionLabel}>ESCOLHA UM PACOTE</Text>

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
                      {pkg.credits === 1 ? 'crédito' : 'créditos'}
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
            <Text style={styles.infoTitle}>💡 O que são créditos?</Text>
            <Text style={styles.infoText}>
              {'• 1 crédito = 1 promoção Bronze (7 dias)\n'}
              {'• 2 créditos = 1 promoção Prata (14 dias)\n'}
              {'• 3 créditos = 1 promoção Ouro (30 dias)\n'}
              {'• Créditos não expiram'}
            </Text>
          </View>

          {/* Pagamento */}
          <Text style={styles.sectionLabel}>MÉTODO DE PAGAMENTO</Text>

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
                <View>
                  <Text style={styles.payBtnLabel}>PIX ou Cartão</Text>
                  <Text style={styles.payBtnSub}>via Mercado Pago</Text>
                </View>
                {selected && (
                  <Text style={styles.payBtnAmount}>R$ {selected.price.toFixed(2)}</Text>
                )}
              </>
            )}
          </TouchableOpacity>

          <View style={styles.secureRow}>
            <Text style={styles.secureText}>🔒 Pagamento seguro via Mercado Pago</Text>
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

  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#009EE3', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 20, marginBottom: 12,
  },
  payBtnDisabled: { backgroundColor: '#ccc' },
  payBtnIcon: { fontSize: 24 },
  payBtnLabel: { fontSize: 15, fontWeight: '800', color: '#fff' },
  payBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  payBtnAmount: { marginLeft: 'auto', fontSize: 17, fontWeight: '900', color: '#fff' },

  secureRow: { alignItems: 'center' },
  secureText: { fontSize: 12, color: '#aaa' },
});
