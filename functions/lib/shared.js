"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CREDIT_PACKAGES = exports.MAX_FCM_TOKEN_LEN = exports.MAX_DONATION_BRL = exports.PAYMENT_ATTEMPT_COOLDOWN_MS = exports.VERIFICATION_EMAIL_COOLDOWN_MS = exports.OPENWEATHER_API_KEY = exports.RESEND_API_KEY = exports.ALERTOO_PIX_KEY_SECRET = exports.STRIPE_SECRET_KEY = exports.MP_ACCESS_TOKEN = exports.visionClient = exports.db = exports.sanitizeString = exports.readSecret = void 0;
exports.assertAuth = assertAuth;
exports.enforcePaymentCooldown = enforcePaymentCooldown;
exports.checkAppToken = checkAppToken;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const vision_1 = require("@google-cloud/vision");
const text_1 = require("./utils/text");
Object.defineProperty(exports, "readSecret", { enumerable: true, get: function () { return text_1.readSecret; } });
Object.defineProperty(exports, "sanitizeString", { enumerable: true, get: function () { return text_1.sanitizeString; } });
(0, app_1.initializeApp)();
exports.db = (0, firestore_1.getFirestore)();
exports.visionClient = new vision_1.ImageAnnotatorClient();
// Segredos no Google Secret Manager — nunca expostos no código
exports.MP_ACCESS_TOKEN = (0, params_1.defineSecret)('MP_ACCESS_TOKEN');
exports.STRIPE_SECRET_KEY = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
exports.ALERTOO_PIX_KEY_SECRET = (0, params_1.defineSecret)('ALERTOO_PIX_KEY');
exports.RESEND_API_KEY = (0, params_1.defineSecret)('RESEND_API_KEY');
exports.OPENWEATHER_API_KEY = (0, params_1.defineSecret)('OPENWEATHER_API_KEY');
// Tempo minimo entre envios de e-mail de verificacao
exports.VERIFICATION_EMAIL_COOLDOWN_MS = 45 * 1000;
// ─── Rate limit nas funções de criação de pagamento ───────────────────────
exports.PAYMENT_ATTEMPT_COOLDOWN_MS = 10 * 1000;
// ─── Limites de negócio ────────────────────────────────────────────────────
exports.MAX_DONATION_BRL = 500;
exports.MAX_FCM_TOKEN_LEN = 300;
// ─── Pacotes válidos (manter em sincronia com src/types/promotion.ts) ─────────
exports.CREDIT_PACKAGES = {
    pkg_1: { credits: 1, price: 4.99, label: '1 credito' },
    pkg_5: { credits: 5, price: 19.99, label: '5 creditos' },
    pkg_10: { credits: 10, price: 34.99, label: '10 creditos' },
    pkg_20: { credits: 20, price: 59.99, label: '20 creditos' },
};
// ─── Validação de UID Firebase ─────────────────────────────────────────────
function assertAuth(uid) {
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Login obrigatorio.');
}
// ─── Rate limit nas funções de criação de pagamento ───────────────────────
async function enforcePaymentCooldown(uid) {
    const userRef = exports.db.collection('users').doc(uid);
    const snap = await userRef.get();
    const last = snap.data()?.lastPaymentAttemptAt;
    if (last && Date.now() - last < exports.PAYMENT_ATTEMPT_COOLDOWN_MS) {
        throw new https_1.HttpsError('resource-exhausted', 'Aguarde alguns segundos antes de tentar novamente.');
    }
    await userRef.set({ lastPaymentAttemptAt: Date.now() }, { merge: true });
}
// ─── App Check — verificação de origem ────────────────────────────────────
function checkAppToken(request, fnName) {
    if (!request.app) {
        console.warn(`[AppCheck][AUDIT] ${fnName} chamado sem token de app válido`, {
            uid: request.auth?.uid ?? 'anonymous',
            timestamp: new Date().toISOString(),
        });
    }
}
//# sourceMappingURL=shared.js.map