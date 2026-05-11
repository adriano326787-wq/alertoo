import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, SafeAreaView, Linking, Alert,
} from 'react-native';

// ─── Links de pagamento do Mercado Pago ────────────────────────────────────────
// Crie os links em: https://www.mercadopago.com.br/links
// e substitua as URLs abaixo pelos seus links reais.

const MP_URL = 'https://link.mercadopago.com.br/alertoo';

export const DONATE_OPTIONS = [
  {
    label: 'Café',
    emoji: '☕',
    amount: 'R$ 5',
    description: 'Um café para o time',
    url: MP_URL,
    color: '#795548',
  },
  {
    label: 'Apoio',
    emoji: '🙌',
    amount: 'R$ 10',
    description: 'Ajuda com o servidor',
    url: MP_URL,
    color: '#1976D2',
  },
  {
    label: 'Parceiro',
    emoji: '🚀',
    amount: 'R$ 25',
    description: 'Parceiro do Alertoo',
    url: MP_URL,
    color: '#7B1FA2',
  },
  {
    label: 'Herói',
    emoji: '🏆',
    amount: 'R$ 50',
    description: 'Herói da comunidade',
    url: MP_URL,
    color: '#F9A825',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function MercadoPagoModal({ visible, onClose }: Props) {
  function handleSelect(url: string) {
    onClose();
    Linking.openURL(url).catch(() =>
      Alert.alert('Erro', 'Não foi possível abrir o Mercado Pago. Verifique sua conexão.')
    );
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
          <Text style={styles.headerTitle}>💛 Apoie o Alertoo</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Tela de escolha do valor ── */}
        <View style={styles.content}>
            <View style={styles.heroSection}>
              <Text style={styles.heroEmoji}>💛</Text>
              <Text style={styles.heroTitle}>Ajude a manter o Alertoo gratuito</Text>
              <Text style={styles.heroDesc}>
                O Alertoo é desenvolvido com muito carinho e mantido sem anúncios intrusivos.
                Sua doação ajuda a pagar servidores, mapas e novidades.
              </Text>
              <View style={styles.mpBadge}>
                <Text style={styles.mpBadgeText}>🔒 Pagamento seguro via Mercado Pago</Text>
              </View>
            </View>

            <Text style={styles.chooseLabel}>Escolha um valor:</Text>

            <View style={styles.grid}>
              {DONATE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.amount}
                  style={[styles.option, { borderColor: opt.color }]}
                  onPress={() => handleSelect(opt.url)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.optionAmount, { color: opt.color }]}>{opt.amount}</Text>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  <Text style={styles.optionDesc}>{opt.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Agora não</Text>
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
  optionEmoji: { fontSize: 28, marginBottom: 6 },
  optionAmount: { fontSize: 22, fontWeight: '900', marginBottom: 2 },
  optionLabel: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 2 },
  optionDesc: { fontSize: 11, color: '#999', textAlign: 'center' },

  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { fontSize: 14, color: '#bbb' },
});
