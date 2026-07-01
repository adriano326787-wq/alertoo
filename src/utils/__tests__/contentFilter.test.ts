import { findBlockedTerm, hasInappropriateContent } from '../contentFilter';

describe('findBlockedTerm', () => {
  it('retorna null para texto limpo', () => {
    expect(findBlockedTerm('Show de rock no Centro Cultural')).toBeNull();
  });

  it('retorna null para texto vazio ou só espaços', () => {
    expect(findBlockedTerm('')).toBeNull();
    expect(findBlockedTerm('   ')).toBeNull();
  });

  it('detecta palavrão direto', () => {
    expect(findBlockedTerm('que merda de trânsito')).toBe('merda');
  });

  it('detecta termo obfuscado com leet speak (números no lugar de letras)', () => {
    expect(findBlockedTerm('p0rr4 que trânsito')).toBe('porra');
  });

  it('detecta termo com letras repetidas (ex: "merdaaaa")', () => {
    expect(findBlockedTerm('merdaaaa')).toBe('merda');
  });

  it('NÃO bloqueia "Cuiabá" por causa do termo curto "cu" (word boundary)', () => {
    expect(findBlockedTerm('Vou pra Cuiabá hoje')).toBeNull();
  });

  it('NÃO bloqueia "assistência" por causa do termo curto "ass" (word boundary)', () => {
    expect(findBlockedTerm('Posto de assistência técnica')).toBeNull();
  });

  // ⚠️ FALSO POSITIVO CONHECIDO: o comentário original em contentFilter.ts diz que
  // o word-boundary evita bloquear "Rua Pinto Ferreira", mas isso só é verdade pra
  // obfuscação dentro de outra palavra (ex: "espinto") — "Pinto" como palavra isolada
  // (sobrenome comum em endereços brasileiros) ainda é bloqueado. Teste documenta o
  // comportamento ATUAL (não o desejado) — reportado ao usuário, correção pendente de decisão.
  it('[bug conhecido] bloqueia "Rua Pinto Ferreira" mesmo sendo um endereço legítimo', () => {
    expect(findBlockedTerm('Rua Pinto Ferreira, 123')).toBe('pinto');
  });

  it('bloqueia "cu" quando aparece como palavra isolada', () => {
    expect(findBlockedTerm('seu cu doeu')).toBe('cu');
  });

  it('detecta termos em inglês', () => {
    expect(findBlockedTerm('fuck this traffic')).toBe('fuck');
  });

  it('detecta termos de spam/golpe', () => {
    expect(findBlockedTerm('clique aqui e ganhe dinheiro')).toBe('clique aqui');
  });

  it('é case-insensitive', () => {
    expect(findBlockedTerm('PORRA QUE TRÂNSITO')).toBe('porra');
  });
});

describe('hasInappropriateContent', () => {
  it('retorna false para texto limpo', () => {
    expect(hasInappropriateContent('Festa de aniversário no clube')).toBe(false);
  });

  it('retorna true quando há termo proibido', () => {
    expect(hasInappropriateContent('vai se foder')).toBe(true);
  });
});
