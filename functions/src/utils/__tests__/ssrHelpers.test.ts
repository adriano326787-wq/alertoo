import { Timestamp } from 'firebase-admin/firestore';
import { escapeHtmlSSR, jsStringLiteralSSR, tsToMs } from '../ssrHelpers';

describe('escapeHtmlSSR', () => {
  it('escapa os 5 caracteres especiais de HTML', () => {
    expect(escapeHtmlSSR('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('não altera texto sem caracteres especiais', () => {
    expect(escapeHtmlSSR('Lei Seca no Centro')).toBe('Lei Seca no Centro');
  });

  it('escapa tentativa de injeção de script', () => {
    expect(escapeHtmlSSR('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapa aspas em atributo (evita quebrar atributo HTML)', () => {
    expect(escapeHtmlSSR('Bar do "João"')).toBe('Bar do &quot;João&quot;');
  });
});

describe('jsStringLiteralSSR', () => {
  it('produz um literal JSON válido entre aspas', () => {
    expect(jsStringLiteralSSR('hello')).toBe('"hello"');
  });

  it('escapa a sequência </script> para não fechar a tag prematuramente', () => {
    expect(jsStringLiteralSSR('</script><script>alert(1)</script>')).not.toContain('</script>');
    expect(jsStringLiteralSSR('</script>')).toBe('"<\\/script>"');
  });

  it('escapa aspas e quebras de linha corretamente (via JSON.stringify)', () => {
    expect(jsStringLiteralSSR('linha1\nlinha2 "citado"')).toBe(JSON.stringify('linha1\nlinha2 "citado"'));
  });
});

describe('tsToMs', () => {
  it('retorna o próprio número quando já é number', () => {
    expect(tsToMs(1700000000000)).toBe(1700000000000);
  });

  it('converte objeto {_seconds} (formato REST do Firestore) para ms', () => {
    expect(tsToMs({ _seconds: 1700000000 })).toBe(1700000000000);
  });

  it('converte instância de Timestamp do firebase-admin para ms', () => {
    const ts = Timestamp.fromMillis(1700000000000);
    expect(tsToMs(ts)).toBe(1700000000000);
  });

  it('retorna 0 para valores desconhecidos (null, undefined, string)', () => {
    expect(tsToMs(null)).toBe(0);
    expect(tsToMs(undefined)).toBe(0);
    expect(tsToMs('not-a-date')).toBe(0);
    expect(tsToMs({})).toBe(0);
  });
});
