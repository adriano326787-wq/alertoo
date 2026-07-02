import {
  resolveLangForCountry,
  normalizeLangCode,
  categoryLabel,
  entertainmentCommentBody,
  roadEventConfirmedBody,
  radarConfirmedBody,
  brazilOnlyMessage,
  NOTIF_STATIC,
} from '../i18nNotifications';

describe('resolveLangForCountry', () => {
  it('Brasil e país ausente resolvem para pt', () => {
    expect(resolveLangForCountry('BR')).toBe('pt');
    expect(resolveLangForCountry(null)).toBe('pt');
    expect(resolveLangForCountry(undefined)).toBe('pt');
  });

  it('países hispanofalantes da expansão resolvem para es', () => {
    expect(resolveLangForCountry('AR')).toBe('es');
    expect(resolveLangForCountry('cl')).toBe('es');
    expect(resolveLangForCountry('CO')).toBe('es');
    expect(resolveLangForCountry('PE')).toBe('es');
    expect(resolveLangForCountry('UY')).toBe('es');
  });

  it('país desconhecido/não mapeado cai em en', () => {
    expect(resolveLangForCountry('JP')).toBe('en');
  });
});

describe('normalizeLangCode', () => {
  it('aceita variantes regionais (pt-BR -> pt)', () => {
    expect(normalizeLangCode('pt-BR')).toBe('pt');
    expect(normalizeLangCode('es-AR')).toBe('es');
    expect(normalizeLangCode('EN')).toBe('en');
  });

  it('vazio/desconhecido cai em pt', () => {
    expect(normalizeLangCode(null)).toBe('pt');
    expect(normalizeLangCode('de')).toBe('pt');
  });
});

describe('categoryLabel', () => {
  it('traduz categoria conhecida em cada idioma', () => {
    expect(categoryLabel('pt', 'drunkcheck')).toBe('Lei Seca');
    expect(categoryLabel('es', 'drunkcheck')).toBe('control de alcoholemia');
    expect(categoryLabel('en', 'accident')).toBe('accident');
  });

  it('categoria desconhecida cai no fallback do idioma', () => {
    expect(categoryLabel('pt', 'xyz')).toBe('alerta');
    expect(categoryLabel('en', 'xyz')).toBe('alert');
  });
});

describe('templates dinâmicos', () => {
  it('entertainmentCommentBody usa nome de fallback por idioma quando ausente', () => {
    expect(entertainmentCommentBody('pt', undefined, 'Show')).toBe('Alguém comentou em "Show".');
    expect(entertainmentCommentBody('en', 'Ana', 'Show')).toBe('Ana commented on "Show".');
  });

  it('roadEventConfirmedBody muda a frase entre 1ª confirmação e múltiplas', () => {
    expect(roadEventConfirmedBody('pt', 'blitz', 1)).toContain('acabou de ser confirmado');
    expect(roadEventConfirmedBody('pt', 'blitz', 3)).toContain('3 vezes');
  });

  it('radarConfirmedBody muda a frase entre 1ª confirmação e múltiplas', () => {
    expect(radarConfirmedBody('es', 1)).toContain('sigue allí');
    expect(radarConfirmedBody('es', 5)).toContain('5 veces');
  });
});

describe('NOTIF_STATIC', () => {
  it('tem as 4 línguas para blitzReminder e streakReminder', () => {
    for (const key of ['blitzReminder', 'streakReminder'] as const) {
      for (const lang of ['pt', 'en', 'es', 'fr'] as const) {
        expect(NOTIF_STATIC[key][lang].title).toBeTruthy();
        expect(NOTIF_STATIC[key][lang].body).toBeTruthy();
      }
    }
  });
});

describe('brazilOnlyMessage', () => {
  it('tem as 4 línguas para os 3 métodos Brasil-only', () => {
    for (const method of ['mercadopago', 'pix', 'donation'] as const) {
      for (const lang of ['pt', 'en', 'es', 'fr'] as const) {
        expect(brazilOnlyMessage(lang, method)).toBeTruthy();
      }
    }
  });

  it('mensagens diferem por idioma (não caem todas no fallback pt)', () => {
    expect(brazilOnlyMessage('es', 'pix')).not.toBe(brazilOnlyMessage('pt', 'pix'));
    expect(brazilOnlyMessage('en', 'mercadopago')).toContain('Mercado Pago');
  });
});
