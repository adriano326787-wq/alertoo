/**
 * PixPaymentModal — QR Code PIX gerado via Mercado Pago, exibido nativamente no app.
 *
 * Fluxo:
 *  1. Usuário seleciona pacote → `createPixPayment` Cloud Function gera o QR
 *  2. Modal exibe QR Code (imagem base64) + código copia-e-cola
 *  3. App verifica a cada 5s com `verifyPixPayment` até aprovação ou expiração
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../hooks/useT';
import { createPixPaymentCloud, verifyPixPaymentCloud } from '../services/promotionService';
import { CreditPackage } from '../types/promotion';
import { getCurrentUser } from '../services/authService';
import { formatPrice } from '../utils/currency';

interface Props {
  visible: boolean;
  pkg: CreditPackage | null;
  onClose: () => void;
  onApproved: (credits: number) => void;
}

const POLL_INTERVAL_MS = 5_000;   // verifica a cada 5s
const PIX_EXPIRY_MINUTES = 30;

export function PixPaymentModal({ visible, pkg, onClose, onApproved }: Props) {
  const t = useT();
  const { bottom } = useSafeAreaInsets();
  const user = getCurrentUser();

  const [loading, setLoading] = useState(false);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(PIX_EXPIRY_MINUTES * 60);
  const [copied, setCopied] = useState(false);
  const [polling, setPolling] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(false);

  // Gera o PIX ao abrir o modal com um pacote selecionado
  useEffect(() => {
    if (!visible || !pkg) return;
    isMounted.current = true;
    generatePix();

    return () => {
      isMounted.current = false;
      clearAll();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, pkg?.id]);

  function clearAll() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }

  async function generatePix() {
    if (!pkg) return;
    setLoading(true);
    setPixCode(null);
    setPaymentId(null);
    clearAll();

    try {
      const result = await createPixPaymentCloud(pkg.id, user?.email ?? undefined);
      if (!isMounted.current) return;

      setPixCode(result.pixCode);
      setPaymentId(result.paymentId);
      setExpiresAt(result.expiresAt);

      const secsLeft = Math.floor((result.expiresAt - Date.now()) / 1000);
      setTimeLeft(Math.max(0, secsLeft));

      // Countdown do temporizador
      countdownRef.current = setInterval(() => {
        setTimeLeft((n) => {
          if (n <= 1) { clearInterval(countdownRef.current!); return 0; }
          return n - 1;
        });
      }, 1000);

      // Polling de verificação
      startPolling(result.paymentId);
    } catch (err: any) {
      if (isMounted.current) {
        Alert.alert(t('error'), err.message ?? 'Não foi possível gerar o PIX.');
        onClose();
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }

  function startPolling(pid: string) {
    setPolling(true);
    pollRef.current = setInterval(async () => {
      if (!isMounted.current) return;

      // Para de verificar se expirou
      if (expiresAt && Date.now() > expiresAt) {
        clearAll();
        setPolling(false);
        return;
      }

      try {
        const result = await verifyPixPaymentCloud(pid);
        if (!isMounted.current) return;

        if (result.status === 'approved') {
          clearAll();
          setPolling(false);
          onApproved(result.credits ?? pkg?.credits ?? 0);
          onClose();
        } else if (result.status === 'rejected') {
          clearAll();
          setPolling(false);
          Alert.alert('PIX recusado', 'O pagamento PIX foi recusado. Tente novamente.', [{ text: 'OK', onPress: onClose }]);
        }
        // 'pending' → continua polling
      } catch {
        // ignora erros de rede — tenta de novo no próximo ciclo
      }
    }, POLL_INTERVAL_MS);
  }

  function handleCopy() {
    if (!pixCode) return;
    Clipboard.setString(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const expired = timeLeft === 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: Math.max(bottom, 20) }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>💚 Pagar com PIX</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {pkg && (
            <Text style={styles.subtitle}>
              {/* Pix é exclusivo do Brasil (bloqueado no servidor pra outros países) — sempre BRL */}
              {pkg.credits} crédito{pkg.credits !== 1 ? 's' : ''} · <Text style={styles.price}>{formatPrice(pkg.price, 'BRL')}</Text>
            </Text>
          )}

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#00B16A" />
                <Text style={styles.loadingText}>Gerando QR Code PIX...</Text>
              </View>
            ) : expired ? (
              <View style={styles.expiredBox}>
                <Text style={styles.expiredEmoji}>⏰</Text>
                <Text style={styles.expiredTitle}>PIX expirado</Text>
                <Text style={styles.expiredDesc}>O código PIX expirou. Gere um novo para continuar.</Text>
                <TouchableOpacity style={styles.regenerateBtn} onPress={generatePix}>
                  <Text style={styles.regenerateBtnText}>Gerar novo PIX</Text>
                </TouchableOpacity>
              </View>
            ) : pixCode ? (
              <>
                {/* Timer */}
                <View style={styles.timerRow}>
                  <Text style={styles.timerLabel}>Expira em</Text>
                  <Text style={[styles.timer, timeLeft < 60 && styles.timerUrgent]}>{mins}:{secs}</Text>
                </View>

                {/* QR Code — gerado no cliente a partir do BR Code da chave PIX */}
                <View style={styles.qrContainer}>
                  <QRCode
                    value={pixCode}
                    size={200}
                    color="#000"
                    backgroundColor="#fff"
                    ecl="M"
                  />
                </View>

                {/* Instrução */}
                <Text style={styles.instruction}>
                  Escaneie o QR Code com o app do seu banco ou copie o código PIX abaixo:
                </Text>

                {/* Copia e Cola */}
                <View style={styles.codeBox}>
                  <Text style={styles.codeText} numberOfLines={3} selectable>
                    {pixCode}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
                  onPress={handleCopy}
                  activeOpacity={0.8}
                >
                  <Text style={styles.copyBtnText}>
                    {copied ? '✓ Código copiado!' : '📋 Copiar código PIX'}
                  </Text>
                </TouchableOpacity>

                {/* Status de verificação */}
                <View style={styles.pollingRow}>
                  {polling && <ActivityIndicator size="small" color="#00B16A" style={{ marginRight: 8 }} />}
                  <Text style={styles.pollingText}>
                    {polling ? 'Aguardando confirmação do pagamento...' : 'Verificando...'}
                  </Text>
                </View>

                {/* Info */}
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    {'• Abra o app do seu banco\n'}
                    {'• Acesse Área PIX → Pagar\n'}
                    {'• Cole o código ou escaneie o QR\n'}
                    {'• Confirme o pagamento\n'}
                    {'• Seus créditos serão adicionados automaticamente ✅'}
                  </Text>
                </View>
              </>
            ) : null}
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
    paddingTop: 12, paddingHorizontal: 20, maxHeight: '92%',
  },
  handle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { fontSize: 18, color: '#888', fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  price: { color: '#00B16A', fontWeight: '800' },

  content: { paddingBottom: 8 },

  loadingBox: { alignItems: 'center', paddingVertical: 48 },
  loadingText: { fontSize: 14, color: '#666', marginTop: 12 },

  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  timerLabel: { fontSize: 13, color: '#888' },
  timer: { fontSize: 22, fontWeight: '900', color: '#00B16A', fontVariant: ['tabular-nums'] },
  timerUrgent: { color: '#EF4444' },

  qrContainer: {
    alignItems: 'center', marginBottom: 16,
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 2, borderColor: '#E2F5EA',
    padding: 12,
  },

  instruction: { fontSize: 13, color: '#555', textAlign: 'center', marginBottom: 12, lineHeight: 19 },

  codeBox: {
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 12,
  },
  codeText: { fontSize: 11, color: '#166534', fontFamily: 'monospace', lineHeight: 18 },

  copyBtn: {
    backgroundColor: '#00B16A', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 16,
  },
  copyBtnSuccess: { backgroundColor: '#16A34A' },
  copyBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  pollingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  pollingText: { fontSize: 12, color: '#888' },

  infoBox: {
    backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  infoText: { fontSize: 13, color: '#555', lineHeight: 22 },

  expiredBox: { alignItems: 'center', paddingVertical: 32 },
  expiredEmoji: { fontSize: 48, marginBottom: 12 },
  expiredTitle: { fontSize: 18, fontWeight: '800', color: '#EF4444', marginBottom: 8 },
  expiredDesc: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  regenerateBtn: { backgroundColor: '#00B16A', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  regenerateBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
