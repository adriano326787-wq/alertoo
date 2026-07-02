"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const i18nNotifications_1 = require("../i18nNotifications");
describe('resolveLangForCountry', () => {
    it('Brasil e país ausente resolvem para pt', () => {
        expect((0, i18nNotifications_1.resolveLangForCountry)('BR')).toBe('pt');
        expect((0, i18nNotifications_1.resolveLangForCountry)(null)).toBe('pt');
        expect((0, i18nNotifications_1.resolveLangForCountry)(undefined)).toBe('pt');
    });
    it('países hispanofalantes da expansão resolvem para es', () => {
        expect((0, i18nNotifications_1.resolveLangForCountry)('AR')).toBe('es');
        expect((0, i18nNotifications_1.resolveLangForCountry)('cl')).toBe('es');
        expect((0, i18nNotifications_1.resolveLangForCountry)('CO')).toBe('es');
        expect((0, i18nNotifications_1.resolveLangForCountry)('PE')).toBe('es');
        expect((0, i18nNotifications_1.resolveLangForCountry)('UY')).toBe('es');
    });
    it('país desconhecido/não mapeado cai em en', () => {
        expect((0, i18nNotifications_1.resolveLangForCountry)('JP')).toBe('en');
    });
});
describe('normalizeLangCode', () => {
    it('aceita variantes regionais (pt-BR -> pt)', () => {
        expect((0, i18nNotifications_1.normalizeLangCode)('pt-BR')).toBe('pt');
        expect((0, i18nNotifications_1.normalizeLangCode)('es-AR')).toBe('es');
        expect((0, i18nNotifications_1.normalizeLangCode)('EN')).toBe('en');
    });
    it('vazio/desconhecido cai em pt', () => {
        expect((0, i18nNotifications_1.normalizeLangCode)(null)).toBe('pt');
        expect((0, i18nNotifications_1.normalizeLangCode)('de')).toBe('pt');
    });
});
describe('categoryLabel', () => {
    it('traduz categoria conhecida em cada idioma', () => {
        expect((0, i18nNotifications_1.categoryLabel)('pt', 'drunkcheck')).toBe('Lei Seca');
        expect((0, i18nNotifications_1.categoryLabel)('es', 'drunkcheck')).toBe('control de alcoholemia');
        expect((0, i18nNotifications_1.categoryLabel)('en', 'accident')).toBe('accident');
    });
    it('categoria desconhecida cai no fallback do idioma', () => {
        expect((0, i18nNotifications_1.categoryLabel)('pt', 'xyz')).toBe('alerta');
        expect((0, i18nNotifications_1.categoryLabel)('en', 'xyz')).toBe('alert');
    });
});
describe('templates dinâmicos', () => {
    it('entertainmentCommentBody usa nome de fallback por idioma quando ausente', () => {
        expect((0, i18nNotifications_1.entertainmentCommentBody)('pt', undefined, 'Show')).toBe('Alguém comentou em "Show".');
        expect((0, i18nNotifications_1.entertainmentCommentBody)('en', 'Ana', 'Show')).toBe('Ana commented on "Show".');
    });
    it('roadEventConfirmedBody muda a frase entre 1ª confirmação e múltiplas', () => {
        expect((0, i18nNotifications_1.roadEventConfirmedBody)('pt', 'blitz', 1)).toContain('acabou de ser confirmado');
        expect((0, i18nNotifications_1.roadEventConfirmedBody)('pt', 'blitz', 3)).toContain('3 vezes');
    });
    it('radarConfirmedBody muda a frase entre 1ª confirmação e múltiplas', () => {
        expect((0, i18nNotifications_1.radarConfirmedBody)('es', 1)).toContain('sigue allí');
        expect((0, i18nNotifications_1.radarConfirmedBody)('es', 5)).toContain('5 veces');
    });
});
describe('NOTIF_STATIC', () => {
    it('tem as 4 línguas para blitzReminder e streakReminder', () => {
        for (const key of ['blitzReminder', 'streakReminder']) {
            for (const lang of ['pt', 'en', 'es', 'fr']) {
                expect(i18nNotifications_1.NOTIF_STATIC[key][lang].title).toBeTruthy();
                expect(i18nNotifications_1.NOTIF_STATIC[key][lang].body).toBeTruthy();
            }
        }
    });
});
describe('brazilOnlyMessage', () => {
    it('tem as 4 línguas para os 3 métodos Brasil-only', () => {
        for (const method of ['mercadopago', 'pix', 'donation']) {
            for (const lang of ['pt', 'en', 'es', 'fr']) {
                expect((0, i18nNotifications_1.brazilOnlyMessage)(lang, method)).toBeTruthy();
            }
        }
    });
    it('mensagens diferem por idioma (não caem todas no fallback pt)', () => {
        expect((0, i18nNotifications_1.brazilOnlyMessage)('es', 'pix')).not.toBe((0, i18nNotifications_1.brazilOnlyMessage)('pt', 'pix'));
        expect((0, i18nNotifications_1.brazilOnlyMessage)('en', 'mercadopago')).toContain('Mercado Pago');
    });
});
//# sourceMappingURL=i18nNotifications.test.js.map