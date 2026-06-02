import { t, tf } from './i18n';

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
  'macumbeiro', 'macumbeira',
  // Nota: negro/preto/gordo removidos — são palavras comuns em endereços brasileiros
  // ex: "Bar do Preto", "Rua da Preta", "Gordinho Lanches"
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

// ─── Termos curtos que exigem correspondência de palavra inteira ─────────────
// Sem isso, "cu" bloquearia "Cuiabá", "curva", "acucar";
// "pinto" bloquearia "Rua Pinto Ferreira"; "ass" bloquearia "assistência".
const WORD_BOUNDARY_TERMS = new Set([
  'cu', 'ass', 'pinto', 'rola', 'sex', 'fdp', 'vsf', 'kkk', 'wtf', 'xxx', 'dick',
]);

// ─── Regex pré-compiladas para termos com word boundary (M10) ─────────────
// Evita criar new RegExp() a cada chamada de findBlockedTerm (potencialmente frequente).
const _wordBoundaryRegexCache = new Map<string, RegExp>();
function getWordBoundaryRegex(normTerm: string): RegExp {
  let re = _wordBoundaryRegexCache.get(normTerm);
  if (!re) {
    re = new RegExp(`\\b${normTerm}\\b`);
    _wordBoundaryRegexCache.set(normTerm, re);
  }
  return re;
}

// ─── Normalização agressiva (sem espaços) ─────────────────────────────────────
// Usada para detectar termos longos obfuscados ("m3rd4", "p0rr4", etc.)
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/2/g, 'z').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/6/g, 'g').replace(/7/g, 't')
    .replace(/8/g, 'b').replace(/9/g, 'g') // #18 — cobertura completa de leet speak
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/[\s\-_.!*@#$%^&]+/g, '');
}

// ─── Normalização suave (preserva espaços) ────────────────────────────────────
// Usada para termos curtos que precisam de word boundary (\b).
function normalizeSoft(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/2/g, 'z').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/6/g, 'g').replace(/7/g, 't')
    .replace(/8/g, 'b').replace(/9/g, 'g') // #18 — cobertura completa de leet speak
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/[^\w\s]/g, ' ');  // pontuação → espaço (preserva words)
}

// ─── Verificação ──────────────────────────────────────────────────────────────

/** Retorna o primeiro termo proibido encontrado ou null se o texto for limpo. */
export function findBlockedTerm(text: string): string | null {
  if (!text.trim()) return null;
  const normalized = normalize(text);       // sem espaços — detecta obfuscação
  const soft = normalizeSoft(text);         // com espaços — para word boundary

  for (const term of BLOCKED_TERMS) {
    const normTerm = normalize(term);
    if (WORD_BOUNDARY_TERMS.has(normTerm)) {
      // Termos curtos: exige palavra isolada para evitar falsos positivos
      if (getWordBoundaryRegex(normTerm).test(soft)) return term;
    } else {
      // Termos longos: substring match (captura obfuscação com separadores)
      if (normalized.includes(normTerm)) return term;
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
  // #7 Ciclo 8 — labels e mensagem de erro via i18n (suporte multi-idioma)
  const checks: Array<{ labelKey: string; value?: string }> = [
    { labelKey: 'content_label_title',       value: fields.title },
    { labelKey: 'content_label_description', value: fields.description },
    { labelKey: 'content_label_address',     value: fields.address },
  ];

  for (const { labelKey, value } of checks) {
    if (!value) continue;
    const found = findBlockedTerm(value);
    if (found) {
      return tf('content_inappropriate', { label: t(labelKey) });
    }
  }
  return null;
}
