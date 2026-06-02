import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  signInWithEmail,
  registerWithEmail,
  signInWithGoogleToken,
  signInAnon,
  sendPasswordReset,
  GOOGLE_CLIENT_IDS,
} from '../services/authService';
import { useUserStore } from '../store/userStore';
import { useAppStore } from '../store/appStore';
import { useT } from '../hooks/useT';
import { User } from 'firebase/auth';

// webClientId = cliente tipo 3 (web) do mesmo projeto Firebase
GoogleSignin.configure({
  webClientId: GOOGLE_CLIENT_IDS.webClientId,
  offlineAccess: false,
});

interface GoogleBtnProps {
  onSuccess: (idToken: string | null, accessToken?: string | null) => void;
  disabled: boolean;
}

function GoogleAuthButton({ onSuccess, disabled }: GoogleBtnProps) {
  const t = useT();
  async function handlePress() {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Limpa sessão cacheada (pode estar apontando para projeto antigo após troca de config)
      try { await GoogleSignin.signOut(); } catch {}

      const userInfo: any = await GoogleSignin.signIn();

      // Lib v16: { type: 'success', data: { idToken, user: {...} } }
      // Lib antigas: { idToken, user: {...} }
      const idToken =
        userInfo?.data?.idToken ??
        userInfo?.idToken ??
        userInfo?.user?.idToken ??
        null;

      if (!idToken) {
        Alert.alert(t('error'), t('auth_google_token_error'));
        return;
      }

      if (__DEV__) console.log('[GoogleSignIn] idToken obtido, prosseguindo para Firebase...');
      onSuccess(idToken, null);
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (error.code === statusCodes.IN_PROGRESS) return;
      const code = error.code ?? 'sem código';
      const msg = error.message ?? 'erro desconhecido';
      if (__DEV__) console.error('[GoogleSignIn] erro:', code, msg, error);
      Alert.alert(t('auth_google_error_title'), `Código: ${code}\n\nMensagem: ${msg}`);
    }
  }

  return (
    <TouchableOpacity
      style={[styles.socialBtn, disabled && styles.socialBtnDisabled]}
      onPress={handlePress}
      disabled={disabled}
    >
      <Text style={styles.googleIcon}>G</Text>
      <Text style={styles.socialBtnText}>{t('auth_google')}</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  onAuthenticated: (user: User) => void;
}

type Mode = 'login' | 'register';

export function AuthScreen({ onAuthenticated }: Props) {
  const t = useT();
  const { top } = useSafeAreaInsets();
  const loadProfile = useUserStore((s) => s.loadProfile);
  const { pendingAuthTab, setPendingAuthTab } = useAppStore();

  const [mode, setMode] = useState<Mode>('login');

  // Lê a aba pendente definida pelo perfil anônimo (item 11: deps corretas)
  useEffect(() => {
    if (pendingAuthTab) {
      setMode(pendingAuthTab);
      setPendingAuthTab(null);
    }
  }, [pendingAuthTab]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Recuperação de senha
  const [resetVisible, setResetVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleGoogleToken(idToken: string | null, accessToken?: string | null | undefined) {
    setLoading(true);
    try {
      const user = await signInWithGoogleToken(idToken, accessToken);
      await loadProfile(user.uid, {
        displayName: user.displayName ?? undefined,
        email: user.email ?? undefined,
        photoURL: user.photoURL ?? undefined,
      });
      onAuthenticated(user);
    } catch (err: any) {
      Alert.alert(t('auth_google_error_title'), err?.message ?? t('auth_google_signin_failed'));
    } finally {
      setLoading(false);
    }
  }


  async function handlePasswordReset() {
    if (!resetEmail.trim()) {
      Alert.alert(t('auth_reset_no_email_title'), t('auth_reset_no_email_msg'));
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordReset(resetEmail.trim());
      setResetSent(true);
    } catch (err: any) {
      const code = err?.code ?? '';
      const msg =
        code === 'auth/user-not-found'  ? t('auth_reset_user_not_found') :
        code === 'auth/invalid-email'   ? t('auth_reset_invalid_email') :
        t('auth_reset_failed');
      Alert.alert(t('error'), msg);
    } finally {
      setResetLoading(false);
    }
  }

  function handleCloseReset() {
    setResetVisible(false);
    setResetEmail('');
    setResetSent(false);
  }

  async function handleAnonSignIn() {
    setLoading(true);
    try {
      const user = await signInAnon();
      // Tenta criar perfil mas não bloqueia a navegação se falhar
      try {
        await loadProfile(user.uid, { displayName: t('auth_anon_display_name') });
      } catch (_) {}
      onAuthenticated(user);
    } catch (err: any) {
      Alert.alert(t('error'), t('auth_anon_failed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('auth_required_fields_title'), t('auth_required_email_password_msg'));
      return;
    }
    // #14 — basic email format check before hitting Firebase
    if (!email.trim().includes('@') || !email.trim().includes('.')) {
      Alert.alert(t('auth_invalid_email_title'), t('auth_invalid_email_msg'));
      return;
    }
    if (mode === 'register' && !name.trim()) {
      Alert.alert(t('auth_required_fields_title'), t('auth_name_required_msg'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('auth_weak_password_title'), t('auth_weak_password_msg'));
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      Alert.alert(t('auth_passwords_mismatch_title'), t('auth_passwords_mismatch_msg'));
      return;
    }
    setLoading(true);
    try {
      const user = mode === 'login'
        ? await signInWithEmail(email.trim(), password)
        : await registerWithEmail(email.trim(), password, name.trim());

      await loadProfile(user.uid, {
        displayName: (user.displayName ?? name.trim()) || undefined,
        email: user.email ?? undefined,
      });
      onAuthenticated(user);
    } catch (err: any) {
      const code = err?.code ?? '';
      const msg =
        code === 'auth/wrong-password'       ? t('auth_wrong_password') :
        code === 'auth/invalid-credential'   ? t('auth_invalid_credential') :
        code === 'auth/user-not-found'       ? t('auth_user_not_found') :
        code === 'auth/email-already-in-use' ? t('auth_email_in_use') :
        code === 'auth/weak-password'        ? t('auth_weak_password') :
        code === 'auth/invalid-email'        ? t('auth_invalid_email_code') :
        err?.message ?? t('auth_failed');
      Alert.alert(t('error'), msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: top + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logo}>🔔</Text>
          </View>
          <Text style={styles.appName}>Alertoo</Text>
          <Text style={styles.subtitle}>{t('auth_subtitle')}</Text>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
            onPress={() => setMode('login')}
          >
            <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>
              {t('auth_sign_in_tab')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
            onPress={() => setMode('register')}
          >
            <Text style={[styles.modeBtnText, mode === 'register' && styles.modeBtnTextActive]}>
              {t('auth_register_tab')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'register' && (
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t('auth_name_label')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth_name_placeholder')}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                placeholderTextColor="#bbb"
              />
            </View>
          )}

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>{t('auth_email')}</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#bbb"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>{t('auth_password')}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder={t('auth_password_placeholder')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#bbb"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? t('auth_hide_password') : t('auth_show_password')}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {mode === 'register' && (
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t('auth_confirm_password_label')}</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder={t('auth_confirm_password_placeholder')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor="#bbb"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPassword((v) => !v)}
                  accessibilityLabel={showConfirmPassword ? t('auth_hide_confirm_password') : t('auth_show_confirm_password')}
                >
                  <Text style={styles.eyeIcon}>{showConfirmPassword ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {mode === 'login' && (
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => { setResetEmail(email); setResetVisible(true); }}
              accessibilityRole="link"
              accessibilityLabel={t('auth_forgot')}
            >
              <Text style={styles.forgotText}>{t('auth_forgot')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleEmailSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>
                  {mode === 'login' ? t('auth_sign_in_tab') : t('auth_register_tab')}
                </Text>}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>{t('auth_or')}</Text>
          <View style={styles.divider} />
        </View>

        {/* Botões de login social */}
        <GoogleAuthButton onSuccess={handleGoogleToken} disabled={loading} />

        {/* Continuar sem conta */}
        <TouchableOpacity
          style={styles.anonBtn}
          onPress={handleAnonSignIn}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={t('auth_continue_anon')}
        >
          <Text style={styles.anonBtnText}>{t('auth_continue_anon')}</Text>
        </TouchableOpacity>
        <Text style={styles.anonNote}>{t('auth_anon_note')}</Text>

        {/* Rank teaser */}
        <View style={styles.teaser}>
          <Text style={styles.teaserTitle}>{t('auth_ranks_title')}</Text>
          <Text style={styles.teaserText}>{t('auth_ranks_desc')}</Text>
        </View>
      </ScrollView>

      {/* Modal recuperação de senha */}
      <Modal visible={resetVisible} transparent animationType="fade" onRequestClose={handleCloseReset}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleCloseReset}>
          <View style={styles.modalCard}>
            {!resetSent ? (
              <>
                <Text style={styles.modalIcon}>🔐</Text>
                <Text style={styles.modalTitle}>{t('auth_forgot_title')}</Text>
                <Text style={styles.modalDesc}>{t('auth_forgot_desc')}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="seu@email.com"
                  placeholderTextColor="#bbb"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.modalBtn, (!resetEmail.trim() || resetLoading) && styles.modalBtnDisabled]}
                  onPress={handlePasswordReset}
                  disabled={!resetEmail.trim() || resetLoading}
                >
                  {resetLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.modalBtnText}>{t('auth_forgot_send')}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={handleCloseReset}>
                  <Text style={styles.modalCancelText}>{t('filter_cancel')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalIcon}>✅</Text>
                <Text style={styles.modalTitle}>{t('auth_sent_title')}</Text>
                <Text style={styles.modalDesc}>
                  {t('auth_reset_sent_desc')}{'\n'}
                  <Text style={styles.modalEmail}>{resetEmail}</Text>
                </Text>
                <Text style={styles.modalHint}>{t('auth_reset_spam_hint')}</Text>
                <TouchableOpacity style={styles.modalBtn} onPress={handleCloseReset}>
                  <Text style={styles.modalBtnText}>{t('auth_close')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24, paddingBottom: 48 },

  header: { alignItems: 'center', marginBottom: 40 },
  logoBadge: {
    width: 88, height: 88, borderRadius: 28, backgroundColor: '#FF5722',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    elevation: 8, shadowColor: '#FF5722', shadowOpacity: 0.4, shadowRadius: 12,
  },
  logo: { fontSize: 44 },
  appName: { fontSize: 36, fontWeight: '900', color: '#1E293B', letterSpacing: -1.5 },
  subtitle: { fontSize: 13, color: '#94A3B8', marginTop: 6, textAlign: 'center', lineHeight: 20 },

  modeRow: {
    flexDirection: 'row', backgroundColor: '#f4f4f4',
    borderRadius: 14, padding: 4, marginBottom: 28,
  },
  modeBtn: { flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center' },
  modeBtnActive: {
    backgroundColor: '#fff', elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  modeBtnText: { fontSize: 15, fontWeight: '600', color: '#aaa' },
  modeBtnTextActive: { color: '#1a1a1a' },

  form: { gap: 14 },
  inputWrapper: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginLeft: 4 },
  input: {
    borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 13,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#1a1a1a', backgroundColor: '#fafafa',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 },
  eyeBtn: {
    height: 52, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: '#e8e8e8', borderLeftWidth: 0,
    borderTopRightRadius: 13, borderBottomRightRadius: 13,
    backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center',
  },
  eyeIcon: { fontSize: 18 },

  primaryBtn: {
    backgroundColor: '#FF5722', borderRadius: 13,
    paddingVertical: 16, alignItems: 'center', marginTop: 6,
    elevation: 4, shadowColor: '#FF5722', shadowOpacity: 0.4, shadowRadius: 8,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: '#efefef' },
  dividerText: { color: '#ccc', fontSize: 13, fontWeight: '600' },

  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 13,
    paddingVertical: 14, backgroundColor: '#fff',
  },
  socialBtnDisabled: { opacity: 0.45 },
  socialBtnText: { fontSize: 15, fontWeight: '700', color: '#333' },
  googleIcon: {
    fontSize: 18, fontWeight: '900', color: '#4285F4',
    backgroundColor: '#fff', width: 26, height: 26,
    textAlign: 'center', lineHeight: 26, borderRadius: 13,
    borderWidth: 1.5, borderColor: '#4285F4',
  },

  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 4, marginTop: -6 },
  forgotText: { fontSize: 13, color: '#FF5722', fontWeight: '600' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 28,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    width: '100%', alignItems: 'center', elevation: 10,
  },
  modalIcon: { fontSize: 44, marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1a1a1a', marginBottom: 8, textAlign: 'center' },
  modalDesc: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  modalEmail: { fontWeight: '700', color: '#E53935' },
  modalHint: { fontSize: 12, color: '#bbb', textAlign: 'center', marginBottom: 20 },
  modalInput: {
    width: '100%', borderWidth: 1.5, borderColor: '#e0e0e0',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: '#1a1a1a', marginBottom: 16,
  },
  modalBtn: {
    backgroundColor: '#FF5722', borderRadius: 12, width: '100%',
    paddingVertical: 14, alignItems: 'center', marginBottom: 10,
  },
  modalBtnDisabled: { backgroundColor: '#ccc' },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalCancelBtn: { paddingVertical: 8 },
  modalCancelText: { fontSize: 14, color: '#aaa', fontWeight: '600' },

  anonBtn: {
    marginTop: 12, paddingVertical: 14, alignItems: 'center',
  },
  anonBtnText: { fontSize: 14, color: '#999', fontWeight: '600', textDecorationLine: 'underline' },
  anonNote: { textAlign: 'center', fontSize: 11, color: '#ccc', marginTop: 4, lineHeight: 16 },

  teaser: {
    marginTop: 36, backgroundColor: '#FFF3E0',
    borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#FFCCBC',
  },
  teaserTitle: { fontSize: 15, fontWeight: '800', color: '#E64A19', marginBottom: 6 },
  teaserText: { fontSize: 13, color: '#5D4037', lineHeight: 20 },
});
