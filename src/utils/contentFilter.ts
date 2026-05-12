/**
 * Filtro de conteúdo impróprio
 * Bloqueia palavrões e termos inadequados em títulos, descrições e endereços.
 * A verificação é feita normalizando acentos e ignorando maiúsculas/minúsculas,
 * além de detectar variações com números (ex: "4ss" → "ass").
 */

// ─── Lista de termos proibidos ────────────────────────────────────────────────
const BLOCKED_TERMS: string[] = [
  // Palavrões em português
  'porra', 'caralho', 'merda', 'puta', 'putaria', 'vagabunda', 'vagabundo',
  'viado', 'viadinho', 'cu', 'cuzao', 'cuzão', 'buceta', 'xoxota', 'piroca',
  'pinto', 'rola', 'foder', 'foda', 'fodase', 'fodasse', 'foda-se',
  'arrombado', 'arrombada', 'vsf', 'vai se foder', 'fdp', 'filho da puta',
  'filha da puta', 'desgraça', 'desgraçado', 'desgraçada', 'canalha',
  'safado', 'safada', 'corno', 'corna', 'pederasta', 'prostituta',
  'bosta', 'broxa', 'punheta', 'puta merda', 'que merda', 'que porra',
  'otario', 'otário', 'idiota', 'imbecil', 'cretino', 'babaca',
  'lixo', 'escoria', 'escória', 'maldito', 'maldita',
  'macumbeiro', 'macumbeira', 'negro', 'negra', 'preto', 'preta',
  'gordo', 'gorda', 'gordinho', 'gordinha',
  // Palavrões em inglês
  'fuck', 'fucking', 'fucker', 'shit', 'bitch', 'asshole', 'ass',
  'dick', 'cock', 'pussy', 'cunt', 'nigger', 'nigga', 'whore',
  'bastard', 'motherfucker', 'bullshit', 'wtf', 'stfu', 'slut',
  // Conteúdo sexual/adulto
  'sexo', 'sex', 'porno', 'porn', 'pornô', 'xxx', 'nude', 'nudes',
  'pelado', 'pelada', 'puteiro', 'bordel', 'strip', 'stripper',
  // Ódio / discriminação
  'nazismo', 'nazista', 'hitlerista', 'kkk',
  // Spam / golpe
  'clique aqui', 'ganhe dinheiro', 'renda extra', 'clica aqui',
  'link na bio', 'acesse agora', 'compre agora', 'promoção imperdível',
];

// ─── Normalização de texto ────────────────────────────────────────────────────
function normalize(text: string): string {
  return text
    .toLowerCase()
    // Remove acentos
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // Substituições comuns de leet-speak
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    // Remove caracteres repetidos (ex: "meeerdaaa" → "merda")
    .replace(/(.)\1{2,}/g, '$1$1')
    // Remove separadores comuns usados para burlar filtros
    .replace(/[\s\-_.!*@#$%^&]+/g, '');
}

// ─── Verificação ──────────────────────────────────────────────────────────────

/** Retorna o primeiro termo proibido encontrado ou null se o texto for limpo. */
export function findBlockedTerm(text: string): string | null {
  if (!text.trim()) return null;
  const normalized = normalize(text);
  for (const term of BLOCKED_TERMS) {
    const normalizedTerm = normalize(term);
    if (normalized.includes(normalizedTerm)) {
      return term;
    }
  }
  return null;
}

/** Retorna true se o texto contiver algum termo proibido. */
export function hasInappropriateContent(text: string): boolean {
  return findBlockedTerm(text) !== null;
}

/**
 * Valida múltiplos campos de uma vez.
 * Retorna uma mensagem de erro pronta ou null se tudo estiver ok.
 */
export function validateEventContent(fields: {
  title?: string;
  description?: string;
  address?: string;
}): string | null {
  const checks: Array<{ label: string; value?: string }> = [
    { label: 'título', value: fields.title },
    { label: 'descrição', value: fields.description },
    { label: 'endereço', value: fields.address },
  ];

  for (const { label, value } of checks) {
    if (!value) continue;
    const found = findBlockedTerm(value);
    if (found) {
      return `O ${label} contém um termo inadequado. Por favor, revise o conteúdo antes de publicar.`;
    }
  }
  return null;
}
