"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeHtmlSSR = escapeHtmlSSR;
exports.jsStringLiteralSSR = jsStringLiteralSSR;
exports.tsToMs = tsToMs;
const firestore_1 = require("firebase-admin/firestore");
/**
 * Helpers de SSR extraídos de web.ts para serem testáveis sem disparar o
 * initializeApp() do firebase-admin (que roda no top-level de shared.ts,
 * importado por web.ts).
 */
function escapeHtmlSSR(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function jsStringLiteralSSR(s) {
    return JSON.stringify(s).replace(/<\//g, '<\\/');
}
/** Converte Timestamp do Firestore (ou número/objeto {_seconds}) para milissegundos. */
function tsToMs(v) {
    if (typeof v === 'number')
        return v;
    if (v && typeof v === 'object' && '_seconds' in v)
        return v._seconds * 1000;
    if (v instanceof firestore_1.Timestamp)
        return v.toMillis();
    return 0;
}
//# sourceMappingURL=ssrHelpers.js.map