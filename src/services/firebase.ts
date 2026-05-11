import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// As variáveis EXPO_PUBLIC_* são substituídas em build time pelo Expo.
// Em desenvolvimento: crie um arquivo .env na raiz (veja .env.example).
// Em produção (EAS Build): configure via "eas secret:create".
export const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            ?? 'AIzaSyCoI9rNBK07vGZBuygprq4PkDKGT0iZkYU',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? 'lei-seca---eventos.firebaseapp.com',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         ?? 'lei-seca---eventos',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? 'lei-seca---eventos.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '657066902706',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             ?? '1:657066902706:web:3e3d49f23a819c5ce1b5ab',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Inicializa Auth com persistência via AsyncStorage (evita login a cada sessão)
// try/catch evita erro "auth/already-initialized" em hot-reloads
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch {
  auth = getAuth(app);
}
export { auth };

export const db      = getFirestore(app);
export const storage = getStorage(app);
