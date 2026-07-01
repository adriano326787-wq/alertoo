import { HttpsError } from 'firebase-functions/v2/https';
import { readSecret, sanitizeString } from '../text';

describe('readSecret', () => {
  it('remove espaços nas pontas', () => {
    expect(readSecret({ value: () => '  abc123  ' })).toBe('abc123');
  });

  it('remove BOM (U+FEFF) do início do valor', () => {
    expect(readSecret({ value: () => '﻿secret-value' })).toBe('secret-value');
  });

  it('retorna string vazia para secret vazio', () => {
    expect(readSecret({ value: () => '' })).toBe('');
  });

  it('não altera valor já limpo', () => {
    expect(readSecret({ value: () => 'clean-secret' })).toBe('clean-secret');
  });
});

describe('sanitizeString', () => {
  it('aceita string normal dentro do limite', () => {
    expect(sanitizeString('Lei Seca no Centro', 50)).toBe('Lei Seca no Centro');
  });

  it('remove espaços nas pontas', () => {
    expect(sanitizeString('  texto  ', 50)).toBe('texto');
  });

  it('remove caracteres de controle (ex: \\x00, \\x1F)', () => {
    expect(sanitizeString('abc\x00def\x1Fghi', 50)).toBe('abcdefghi');
  });

  it('lança HttpsError "invalid-argument" quando o valor não é string', () => {
    expect(() => sanitizeString(123, 50)).toThrow(HttpsError);
    expect(() => sanitizeString(null, 50)).toThrow(HttpsError);
    expect(() => sanitizeString(undefined, 50)).toThrow(HttpsError);
  });

  it('lança HttpsError quando o campo fica vazio após sanitização', () => {
    expect(() => sanitizeString('   ', 50)).toThrow(HttpsError);
    expect(() => sanitizeString('\x00\x01\x02', 50)).toThrow(HttpsError);
  });

  it('lança HttpsError quando excede o tamanho máximo', () => {
    expect(() => sanitizeString('a'.repeat(51), 50)).toThrow(HttpsError);
  });

  it('aceita string exatamente no limite máximo', () => {
    expect(sanitizeString('a'.repeat(50), 50)).toBe('a'.repeat(50));
  });
});
