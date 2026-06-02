import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// firebase/auth tem conditional exports — em React Native o Metro resolve
// automaticamente para dist/rn/index.js, que inclui getReactNativePersistence.
import { initializeAuth, getAuth, type Auth } from 'firebase/auth';
// @ts-expect-error — getReactNativePersistence existe no bundle RN mas não nos types públicos
import { getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANTE: process.env.VAR deve ser acesso LITERAL (não dinâmico) para que
// o Metro substitua corretamente em bundle time. Acesso via process.env[key]
// NÃO é substituído e retorna undefined em runtime no Hermes → tela preta.
export const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY             ?? '',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN         ?? '',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID          ?? '',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET      ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID              ?? '',
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Inicializa Auth com persistência via AsyncStorage (evita login a cada sessão)
// try/catch evita erro "auth/already-initialized" em hot-reloads
let auth: Auth;
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
