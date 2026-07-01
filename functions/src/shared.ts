import { HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { readSecret, sanitizeString } from './utils/text';

// Reexportadas por compatibilidade — implementação pura e testável vive em
// ./utils/text.ts (sem o initializeApp() abaixo, que dispara side-effect no import)
export { readSecret, sanitizeString };

initializeApp();
export const db = getFirestore();
export const visionClient = new ImageAnnotatorClient();

// Segredos no Google Secret Manager — nunca expostos no código
export const MP_ACCESS_TOKEN   = defineSecret('MP_ACCESS_TOKEN');
export const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
export const ALERTOO_PIX_KEY_SECRET = defineSecret('ALERTOO_PIX_KEY');
export const RESEND_API_KEY    = defineSecret('RESEND_API_KEY');
export const OPENWEATHER_API_KEY = defineSecret('OPENWEATHER_API_KEY');

// Tempo minimo entre envios de e-mail de verificacao
export const VERIFICATION_EMAIL_COOLDOWN_MS = 45 * 1000;

// ─── Rate limit nas funções de criação de pagamento ───────────────────────
export const PAYMENT_ATTEMPT_COOLDOWN_MS = 10 * 1000;

// ─── Limites de negócio ────────────────────────────────────────────────────
export const MAX_DONATION_BRL = 500;
export const MAX_FCM_TOKEN_LEN = 300;

// ─── Pacotes válidos (manter em sincronia com src/types/promotion.ts) ─────────
export const CREDIT_PACKAGES: Record<string, { credits: number; price: number; label: string }> = {
  pkg_1:  { credits: 1,  price: 4.99,  label: '1 credito' },
  pkg_5:  { credits: 5,  price: 19.99, label: '5 creditos' },
  pkg_10: { credits: 10, price: 34.99, label: '10 creditos' },
  pkg_20: { credits: 20, price: 59.99, label: '20 creditos' },
};


// ─── Validação de UID Firebase ─────────────────────────────────────────────
export function assertAuth(uid: string | undefined): asserts uid is string {
  if (!uid) throw new HttpsError('unauthenticated', 'Login obrigatorio.');
}

// ─── Rate limit nas funções de criação de pagamento ───────────────────────
export async function enforcePaymentCooldown(uid: string): Promise<void> {
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  const last = snap.data()?.lastPaymentAttemptAt as number | undefined;
  if (last && Date.now() - last < PAYMENT_ATTEMPT_COOLDOWN_MS) {
    throw new HttpsError('resource-exhausted', 'Aguarde alguns segundos antes de tentar novamente.');
  }
  await userRef.set({ lastPaymentAttemptAt: Date.now() }, { merge: true });
}

// ─── App Check — verificação de origem ────────────────────────────────────
export function checkAppToken(request: { app?: unknown; auth?: { uid?: string } }, fnName: string): void {
  if (!request.app) {
    console.warn(`[AppCheck][AUDIT] ${fnName} chamado sem token de app válido`, {
      uid: request.auth?.uid ?? 'anonymous',
      timestamp: new Date().toISOString(),
    });
  }
}
