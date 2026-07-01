"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const text_1 = require("../text");
describe('readSecret', () => {
    it('remove espaços nas pontas', () => {
        expect((0, text_1.readSecret)({ value: () => '  abc123  ' })).toBe('abc123');
    });
    it('remove BOM (U+FEFF) do início do valor', () => {
        expect((0, text_1.readSecret)({ value: () => '﻿secret-value' })).toBe('secret-value');
    });
    it('retorna string vazia para secret vazio', () => {
        expect((0, text_1.readSecret)({ value: () => '' })).toBe('');
    });
    it('não altera valor já limpo', () => {
        expect((0, text_1.readSecret)({ value: () => 'clean-secret' })).toBe('clean-secret');
    });
});
describe('sanitizeString', () => {
    it('aceita string normal dentro do limite', () => {
        expect((0, text_1.sanitizeString)('Lei Seca no Centro', 50)).toBe('Lei Seca no Centro');
    });
    it('remove espaços nas pontas', () => {
        expect((0, text_1.sanitizeString)('  texto  ', 50)).toBe('texto');
    });
    it('remove caracteres de controle (ex: \\x00, \\x1F)', () => {
        expect((0, text_1.sanitizeString)('abc\x00def\x1Fghi', 50)).toBe('abcdefghi');
    });
    it('lança HttpsError "invalid-argument" quando o valor não é string', () => {
        expect(() => (0, text_1.sanitizeString)(123, 50)).toThrow(https_1.HttpsError);
        expect(() => (0, text_1.sanitizeString)(null, 50)).toThrow(https_1.HttpsError);
        expect(() => (0, text_1.sanitizeString)(undefined, 50)).toThrow(https_1.HttpsError);
    });
    it('lança HttpsError quando o campo fica vazio após sanitização', () => {
        expect(() => (0, text_1.sanitizeString)('   ', 50)).toThrow(https_1.HttpsError);
        expect(() => (0, text_1.sanitizeString)('\x00\x01\x02', 50)).toThrow(https_1.HttpsError);
    });
    it('lança HttpsError quando excede o tamanho máximo', () => {
        expect(() => (0, text_1.sanitizeString)('a'.repeat(51), 50)).toThrow(https_1.HttpsError);
    });
    it('aceita string exatamente no limite máximo', () => {
        expect((0, text_1.sanitizeString)('a'.repeat(50), 50)).toBe('a'.repeat(50));
    });
});
//# sourceMappingURL=text.test.js.map