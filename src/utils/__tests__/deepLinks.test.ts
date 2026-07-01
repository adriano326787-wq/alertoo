import {
  parsePaymentDeepLink,
  buildEventDeepLink,
  buildEventWebLink,
  buildPlayStoreInstallLink,
  buildShareLinks,
  parseEventDeepLink,
} from '../deepLinks';

describe('parsePaymentDeepLink', () => {
  it('detecta retorno de sucesso', () => {
    expect(parsePaymentDeepLink('alertoo://payment/success')).toBe('success');
  });

  it('detecta retorno de falha', () => {
    expect(parsePaymentDeepLink('alertoo://payment/failure')).toBe('failure');
  });

  it('detecta retorno pendente', () => {
    expect(parsePaymentDeepLink('alertoo://payment/pending')).toBe('pending');
  });

  it('retorna null para link que não é de pagamento', () => {
    expect(parsePaymentDeepLink('alertoo://evento/road/abc123')).toBeNull();
  });

  it('retorna null para null/undefined/vazio', () => {
    expect(parsePaymentDeepLink(null)).toBeNull();
    expect(parsePaymentDeepLink(undefined)).toBeNull();
    expect(parsePaymentDeepLink('')).toBeNull();
  });
});

describe('buildEventDeepLink', () => {
  it('monta o deep link no formato alertoo://evento/{type}/{id}', () => {
    expect(buildEventDeepLink('road', 'abc123')).toBe('alertoo://evento/road/abc123');
    expect(buildEventDeepLink('entertainment', 'xyz789')).toBe('alertoo://evento/entertainment/xyz789');
  });
});

describe('buildEventWebLink', () => {
  it('monta a URL pública https com o id do evento', () => {
    const link = buildEventWebLink('road', 'abc123');
    expect(link).toContain('https://');
    expect(link).toContain('/evento/road/abc123');
  });
});

describe('buildPlayStoreInstallLink', () => {
  it('monta link da Play Store com referrer codificado', () => {
    const link = buildPlayStoreInstallLink('road', 'abc123');
    expect(link).toContain('play.google.com/store/apps/details?id=com.alertoo.app');
    expect(link).toContain('referrer=evento_road_abc123');
  });

  it('codifica corretamente ids com caracteres especiais', () => {
    const link = buildPlayStoreInstallLink('entertainment', 'a/b c');
    expect(link).toContain(encodeURIComponent('evento_entertainment_a/b c'));
  });
});

describe('buildShareLinks', () => {
  it('retorna os 3 formatos de link consistentes entre si', () => {
    const links = buildShareLinks('road', 'abc123');
    expect(links.deepLink).toBe('alertoo://evento/road/abc123');
    expect(links.webLink).toContain('/evento/road/abc123');
    expect(links.storeLink).toContain('referrer=evento_road_abc123');
  });
});

describe('parseEventDeepLink', () => {
  it('extrai type e id de um deep link alertoo://', () => {
    expect(parseEventDeepLink('alertoo://evento/road/abc123')).toEqual({ type: 'road', id: 'abc123' });
  });

  it('extrai type e id de uma URL web pública', () => {
    const webLink = buildEventWebLink('entertainment', 'xyz789');
    expect(parseEventDeepLink(webLink)).toEqual({ type: 'entertainment', id: 'xyz789' });
  });

  it('decodifica id com caracteres especiais (URL-encoded)', () => {
    expect(parseEventDeepLink('alertoo://evento/road/abc%20123')).toEqual({ type: 'road', id: 'abc 123' });
  });

  it('retorna null para tipo de evento inválido', () => {
    expect(parseEventDeepLink('alertoo://evento/invalid/abc123')).toBeNull();
  });

  it('retorna null para URL que não é deep link do app', () => {
    expect(parseEventDeepLink('https://google.com/search?q=alertoo')).toBeNull();
  });

  it('retorna null para null/undefined/vazio', () => {
    expect(parseEventDeepLink(null)).toBeNull();
    expect(parseEventDeepLink(undefined)).toBeNull();
    expect(parseEventDeepLink('')).toBeNull();
  });

  it('retorna null quando falta o id', () => {
    expect(parseEventDeepLink('alertoo://evento/road/')).toBeNull();
  });

  it('é o inverso de buildEventDeepLink (round-trip)', () => {
    const built = buildEventDeepLink('road', 'test-id-123');
    expect(parseEventDeepLink(built)).toEqual({ type: 'road', id: 'test-id-123' });
  });
});
