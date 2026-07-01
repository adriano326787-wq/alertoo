"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firestore_1 = require("firebase-admin/firestore");
const ssrHelpers_1 = require("../ssrHelpers");
describe('escapeHtmlSSR', () => {
    it('escapa os 5 caracteres especiais de HTML', () => {
        expect((0, ssrHelpers_1.escapeHtmlSSR)('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
    });
    it('não altera texto sem caracteres especiais', () => {
        expect((0, ssrHelpers_1.escapeHtmlSSR)('Lei Seca no Centro')).toBe('Lei Seca no Centro');
    });
    it('escapa tentativa de injeção de script', () => {
        expect((0, ssrHelpers_1.escapeHtmlSSR)('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });
    it('escapa aspas em atributo (evita quebrar atributo HTML)', () => {
        expect((0, ssrHelpers_1.escapeHtmlSSR)('Bar do "João"')).toBe('Bar do &quot;João&quot;');
    });
});
describe('jsStringLiteralSSR', () => {
    it('produz um literal JSON válido entre aspas', () => {
        expect((0, ssrHelpers_1.jsStringLiteralSSR)('hello')).toBe('"hello"');
    });
    it('escapa a sequência </script> para não fechar a tag prematuramente', () => {
        expect((0, ssrHelpers_1.jsStringLiteralSSR)('</script><script>alert(1)</script>')).not.toContain('</script>');
        expect((0, ssrHelpers_1.jsStringLiteralSSR)('</script>')).toBe('"<\\/script>"');
    });
    it('escapa aspas e quebras de linha corretamente (via JSON.stringify)', () => {
        expect((0, ssrHelpers_1.jsStringLiteralSSR)('linha1\nlinha2 "citado"')).toBe(JSON.stringify('linha1\nlinha2 "citado"'));
    });
});
describe('tsToMs', () => {
    it('retorna o próprio número quando já é number', () => {
        expect((0, ssrHelpers_1.tsToMs)(1700000000000)).toBe(1700000000000);
    });
    it('converte objeto {_seconds} (formato REST do Firestore) para ms', () => {
        expect((0, ssrHelpers_1.tsToMs)({ _seconds: 1700000000 })).toBe(1700000000000);
    });
    it('converte instância de Timestamp do firebase-admin para ms', () => {
        const ts = firestore_1.Timestamp.fromMillis(1700000000000);
        expect((0, ssrHelpers_1.tsToMs)(ts)).toBe(1700000000000);
    });
    it('retorna 0 para valores desconhecidos (null, undefined, string)', () => {
        expect((0, ssrHelpers_1.tsToMs)(null)).toBe(0);
        expect((0, ssrHelpers_1.tsToMs)(undefined)).toBe(0);
        expect((0, ssrHelpers_1.tsToMs)('not-a-date')).toBe(0);
        expect((0, ssrHelpers_1.tsToMs)({})).toBe(0);
    });
});
//# sourceMappingURL=ssrHelpers.test.js.map