"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readSecret = readSecret;
exports.sanitizeString = sanitizeString;
const https_1 = require("firebase-functions/v2/https");
/**
 * Lê o valor de um secret removendo BOM e espaços nas pontas.
 * Extraído de shared.ts para ser testável sem disparar o initializeApp()
 * do firebase-admin (que roda no top-level daquele módulo).
 */
function readSecret(secret) {
    // eslint-disable-next-line no-control-regex
    return secret.value().replace(/﻿/g, '').replace(/^\s+|\s+$/g, '');
}
/** Sanitiza string de entrada (remove caracteres de controle, valida tamanho). */
function sanitizeString(value, maxLength) {
    if (typeof value !== 'string')
        throw new https_1.HttpsError('invalid-argument', 'Campo de texto invalido.');
    // eslint-disable-next-line no-control-regex
    const clean = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
    if (clean.length === 0)
        throw new https_1.HttpsError('invalid-argument', 'Campo vazio apos sanitizacao.');
    if (clean.length > maxLength)
        throw new https_1.HttpsError('invalid-argument', `Campo excede ${maxLength} caracteres.`);
    return clean;
}
//# sourceMappingURL=text.js.map