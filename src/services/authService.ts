import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  updateProfile,
  sendEmailVerification,
  reload,
  User,
} from 'firebase/auth';
import { auth } from './firebase';

// ─── Configure your Google OAuth Client IDs here ──────────────────────────────
// Get them from: https://console.cloud.google.com → APIs & Services → Credentials
// For Expo Go testing, use the Web Client ID as expoClientId.
export const GOOGLE_CLIENT_IDS = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  // webClientId = Web Client do Firebase (projeto 657066902706 / lei-seca---eventos)
  // O cliente Android (type=1) com SHA-1 já está no google-services.json
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '657066902706-t8tsomtaqqjctmpme5fei1c904mtscp6.apps.googleusercontent.com',
};
// ──────────────────────────────────────────────────────────────────────────────

let currentUser: User | null = null;

export function getCurrentUserId(): string {
  return currentUser?.uid ?? 'anonymous';
}

export function getCurrentUser(): User | null {
  return currentUser;
}

export function setCurrentUser(user: User | null) {
  currentUser = user;
}

// Returns the current user if already signed in, or null if not authenticated.
export async function initAuth(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      currentUser = user;
      resolve(user);
    });
  });
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  currentUser = cred.user;
  return cred.user;
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  // Envia e-mail de verificação automaticamente após o cadastro
  try {
    await sendEmailVerification(cred.user);
  } catch (_) {
    // Falha silenciosa — não bloqueia o cadastro
  }
  currentUser = cred.user;
  return cred.user;
}

// Reenvia o e-mail de verificação
export async function resendVerificationEmail(): Promise<void> {
  if (currentUser && !currentUser.emailVerified) {
    await sendEmailVerification(currentUser);
  }
}

// Recarrega o usuário para checar se verificou o e-mail
export async function reloadUser(): Promise<boolean> {
  if (!currentUser) return false;
  await reload(currentUser);
  return currentUser.emailVerified;
}

/**
 * Login com Google.
 * Aceita id_token (preferencial) ou access_token como fallback.
 */
export async function signInWithGoogleToken(
  idToken: string | null,
  accessToken?: string | null,
): Promise<User> {
  const credential = GoogleAuthProvider.credential(idToken ?? null, accessToken ?? undefined);
  const cred = await signInWithCredential(auth, credential);
  currentUser = cred.user;
  return cred.user;
}

/**
 * Login com Apple (iOS 13+).
 * identityToken vem do expo-apple-authentication.
 */
export async function signInWithApple(
  identityToken: string,
  nonce: string,
  displayName?: string | null,
): Promise<User> {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken: identityToken, rawNonce: nonce });
  const cred = await signInWithCredential(auth, credential);
  // Apple só fornece o nome no primeiro login — persistir se disponível
  if (displayName && !cred.user.displayName) {
    await updateProfile(cred.user, { displayName });
  }
  currentUser = cred.user;
  return cred.user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { sendPasswordResetEmail } = await import('firebase/auth');
  await sendPasswordResetEmail(auth, email);
}

export async function signInAnon(): Promise<User> {
  const { signInAnonymously } = await import('firebase/auth');
  const cred = await signInAnonymously(auth);
  currentUser = cred.user;
  return cred.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
  currentUser = null;
}
