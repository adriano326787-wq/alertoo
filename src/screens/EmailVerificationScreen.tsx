import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User } from 'firebase/auth';
import { resendVerificationEmail, reloadUser, signOut } from '../services/authService';

interface Props {
  user: User;
  onVerified: () => void;
}

export function EmailVerificationScreen({ user, onVerified }: Props) {
  const { top } = useSafeAreaInsets();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Verifica automaticamente a cada 5 segundos se o usuário clicou no link
  useEffect(() => {
    const autoCheck = setInterval(async () => {
      const verified = await reloadUser();
      if (verified) {
        clearInterval(autoCheck);
        onVerified();
      }
    }, 5000);
    return () => clearInterval(autoCheck);
  }, []);

  // Countdown para reenvio
  useEffect(() => {
    if (countdown <= 0) return;
    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(intervalRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [countdown]);

  async function handleCheckNow() {
    setChecking(true);
    try {
      const verified = await reloadUser();
      if (verified) {
        onVerified();
      } else {
        Alert.alert(
          'Ainda não verificado',
          'Não encontramos a confirmação ainda. Verifique seu e-mail e clique no link enviado.'
        );
      }
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await resendVerificationEmail();
      setCountdown(60); // aguarda 60s para reenviar novamente
      Alert.alert('E-mail reenviado!', `Um novo link foi enviado para ${user.email}`);
    } catch {
      Alert.alert('Erro', 'Não foi possível reenviar. Tente novamente em instantes.');
    } finally {
      setResending(false);
    }
  }

  async function handleSignOut() {
    await signOut();
  }

  return (
    <View style={[styles.root, { paddingTop: top + 40 }]}>
      {/* Ícone */}
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>📧</Text>
      </View>

      {/* Título */}
      <Text style={styles.title}>Confirme seu e-mail</Text>
      <Text style={styles.subtitle}>
        Enviamos um link de confirmação para:
      </Text>
      <Text style={styles.email}>{user.email}</Text>
      <Text style={styles.desc}>
        Abra o e-mail e clique no link para ativar sua conta.{'\n'}
        Esta tela atualiza automaticamente.
      </Text>

      {/* Verificar agora */}
      <TouchableOpacity
        style={[styles.primaryBtn, checking && styles.btnDisabled]}
        onPress={handleCheckNow}
        disabled={checking}
      >
        {checking
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.primaryBtnText}>✓ Já confirmei o e-mail</Text>}
      </TouchableOpacity>

      {/* Reenviar */}
      <TouchableOpacity
        style={[styles.secondaryBtn, (resending || countdown > 0) && styles.btnDisabled]}
        onPress={handleResend}
        disabled={resending || countdown > 0}
      >
        {resending
          ? <ActivityIndicator color="#E53935" />
          : <Text style={styles.secondaryBtnText}>
              {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar e-mail'}
            </Text>}
      </TouchableOpacity>

      {/* Dicas */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Não recebeu o e-mail?</Text>
        <Text style={styles.tip}>• Verifique a pasta de spam ou lixo eletrônico</Text>
        <Text style={styles.tip}>• Aguarde alguns minutos e tente reenviar</Text>
        <Text style={styles.tip}>• Confirme se o e-mail está correto</Text>
      </View>

      {/* Usar conta errada */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Usar outro e-mail</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#fff',
    paddingHorizontal: 28, alignItems: 'center',
  },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FFF3E0', alignItems: 'center',
    justifyContent: 'center', marginBottom: 28,
  },
  icon: { fontSize: 48 },
  title: { fontSize: 26, fontWeight: '900', color: '#1a1a1a', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center' },
  email: {
    fontSize: 15, fontWeight: '700', color: '#E53935',
    marginVertical: 6, textAlign: 'center',
  },
  desc: {
    fontSize: 13, color: '#aaa', textAlign: 'center',
    lineHeight: 20, marginBottom: 32,
  },
  primaryBtn: {
    backgroundColor: '#E53935', borderRadius: 14,
    paddingVertical: 15, width: '100%', alignItems: 'center',
    marginBottom: 12, elevation: 2,
    shadowColor: '#E53935', shadowOpacity: 0.3, shadowRadius: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: {
    borderWidth: 1.5, borderColor: '#E53935', borderRadius: 14,
    paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 28,
  },
  secondaryBtnText: { color: '#E53935', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.45 },
  tipsCard: {
    backgroundColor: '#F5F5F5', borderRadius: 14,
    padding: 16, width: '100%', gap: 6, marginBottom: 24,
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 4 },
  tip: { fontSize: 12, color: '#888', lineHeight: 18 },
  signOutBtn: { paddingVertical: 10 },
  signOutText: { fontSize: 13, color: '#bbb', textDecorationLine: 'underline' },
});
