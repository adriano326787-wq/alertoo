import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Lê o valor de um secret removendo BOM e espaços nas pontas.
 * Extraído de shared.ts para ser testável sem disparar o initializeApp()
 * do firebase-admin (que roda no top-level daquele módulo).
 */
export function readSecret(secret: { value(): string }): string {
  // eslint-disable-next-line no-control-regex
  return secret.value().replace(/﻿/g, '').replace(/^\s+|\s+$/g, '');
}

/** Sanitiza string de entrada (remove caracteres de controle, valida tamanho). */
export function sanitizeString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') throw new HttpsError('invalid-argument', 'Campo de texto invalido.');
  // eslint-disable-next-line no-control-regex
  const clean = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  if (clean.length === 0) throw new HttpsError('invalid-argument', 'Campo vazio apos sanitizacao.');
  if (clean.length > maxLength) throw new HttpsError('invalid-argument', `Campo excede ${maxLength} caracteres.`);
  return clean;
}
