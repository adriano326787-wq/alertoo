export interface BrazilCity {
  name: string;
  latitude: number;
  longitude: number;
}

export interface BrazilState {
  name: string;
  uf: string;
  cities: BrazilCity[];
}

export const BRAZIL_STATES: BrazilState[] = [
  { name: 'Acre', uf: 'AC', cities: [{ name: 'Rio Branco', latitude: -9.9754, longitude: -67.8249 }, { name: 'Cruzeiro do Sul', latitude: -7.6303, longitude: -72.6739 }] },
  { name: 'Alagoas', uf: 'AL', cities: [{ name: 'Maceió', latitude: -9.6658, longitude: -35.7350 }, { name: 'Arapiraca', latitude: -9.7525, longitude: -36.6614 }] },
  { name: 'Amapá', uf: 'AP', cities: [{ name: 'Macapá', latitude: 0.0349, longitude: -51.0694 }, { name: 'Santana', latitude: -0.0581, longitude: -51.1783 }] },
  { name: 'Amazonas', uf: 'AM', cities: [{ name: 'Manaus', latitude: -3.1019, longitude: -60.0250 }, { name: 'Parintins', latitude: -2.6292, longitude: -56.7361 }, { name: 'Itacoatiara', latitude: -3.1439, longitude: -58.4442 }] },
  { name: 'Bahia', uf: 'BA', cities: [{ name: 'Salvador', latitude: -12.9714, longitude: -38.5014 }, { name: 'Feira de Santana', latitude: -12.2664, longitude: -38.9663 }, { name: 'Vitória da Conquista', latitude: -14.8661, longitude: -40.8444 }, { name: 'Ilhéus', latitude: -14.7892, longitude: -39.0444 }, { name: 'Porto Seguro', latitude: -16.4497, longitude: -39.0647 }] },
  { name: 'Ceará', uf: 'CE', cities: [{ name: 'Fortaleza', latitude: -3.7172, longitude: -38.5433 }, { name: 'Caucaia', latitude: -3.7361, longitude: -38.6531 }, { name: 'Juazeiro do Norte', latitude: -7.2136, longitude: -39.3153 }, { name: 'Sobral', latitude: -3.6861, longitude: -40.3497 }] },
  { name: 'Distrito Federal', uf: 'DF', cities: [{ name: 'Brasília', latitude: -15.7801, longitude: -47.9292 }, { name: 'Taguatinga', latitude: -15.8311, longitude: -48.0594 }, { name: 'Ceilândia', latitude: -15.8156, longitude: -48.1081 }] },
  { name: 'Espírito Santo', uf: 'ES', cities: [{ name: 'Vitória', latitude: -20.3155, longitude: -40.3128 }, { name: 'Vila Velha', latitude: -20.3297, longitude: -40.2922 }, { name: 'Serra', latitude: -20.1286, longitude: -40.3078 }, { name: 'Cachoeiro de Itapemirim', latitude: -20.8489, longitude: -41.1136 }] },
  { name: 'Goiás', uf: 'GO', cities: [{ name: 'Goiânia', latitude: -16.6869, longitude: -49.2648 }, { name: 'Aparecida de Goiânia', latitude: -16.8231, longitude: -49.2458 }, { name: 'Anápolis', latitude: -16.3281, longitude: -48.9531 }, { name: 'Rio Verde', latitude: -17.7983, longitude: -50.9272 }] },
  { name: 'Maranhão', uf: 'MA', cities: [{ name: 'São Luís', latitude: -2.5297, longitude: -44.3028 }, { name: 'Imperatriz', latitude: -5.5261, longitude: -47.4919 }, { name: 'Timon', latitude: -5.0944, longitude: -42.8369 }] },
  { name: 'Mato Grosso', uf: 'MT', cities: [{ name: 'Cuiabá', latitude: -15.6014, longitude: -56.0979 }, { name: 'Várzea Grande', latitude: -15.6469, longitude: -56.1325 }, { name: 'Rondonópolis', latitude: -16.4728, longitude: -54.6358 }] },
  { name: 'Mato Grosso do Sul', uf: 'MS', cities: [{ name: 'Campo Grande', latitude: -20.4697, longitude: -54.6201 }, { name: 'Dourados', latitude: -22.2233, longitude: -54.8119 }, { name: 'Três Lagoas', latitude: -20.7519, longitude: -51.6783 }] },
  { name: 'Minas Gerais', uf: 'MG', cities: [{ name: 'Belo Horizonte', latitude: -19.9167, longitude: -43.9345 }, { name: 'Uberlândia', latitude: -18.9186, longitude: -48.2772 }, { name: 'Contagem', latitude: -19.9317, longitude: -44.0536 }, { name: 'Juiz de Fora', latitude: -21.7642, longitude: -43.3503 }, { name: 'Betim', latitude: -19.9678, longitude: -44.1983 }, { name: 'Montes Claros', latitude: -16.7286, longitude: -43.8614 }] },
  { name: 'Pará', uf: 'PA', cities: [{ name: 'Belém', latitude: -1.4558, longitude: -48.5044 }, { name: 'Ananindeua', latitude: -1.3656, longitude: -48.3722 }, { name: 'Santarém', latitude: -2.4444, longitude: -54.7083 }, { name: 'Marabá', latitude: -5.3686, longitude: -49.1178 }] },
  { name: 'Paraíba', uf: 'PB', cities: [{ name: 'João Pessoa', latitude: -7.1195, longitude: -34.8450 }, { name: 'Campina Grande', latitude: -7.2306, longitude: -35.8811 }, { name: 'Santa Rita', latitude: -7.1128, longitude: -34.9778 }] },
  { name: 'Paraná', uf: 'PR', cities: [{ name: 'Curitiba', latitude: -25.4284, longitude: -49.2733 }, { name: 'Londrina', latitude: -23.3045, longitude: -51.1696 }, { name: 'Maringá', latitude: -23.4205, longitude: -51.9333 }, { name: 'Foz do Iguaçu', latitude: -25.5478, longitude: -54.5882 }, { name: 'Cascavel', latitude: -24.9578, longitude: -53.4595 }] },
  { name: 'Pernambuco', uf: 'PE', cities: [{ name: 'Recife', latitude: -8.0578, longitude: -34.8829 }, { name: 'Caruaru', latitude: -8.2836, longitude: -35.9753 }, { name: 'Olinda', latitude: -7.9956, longitude: -34.8511 }, { name: 'Petrolina', latitude: -9.3986, longitude: -40.5011 }] },
  { name: 'Piauí', uf: 'PI', cities: [{ name: 'Teresina', latitude: -5.0919, longitude: -42.8034 }, { name: 'Parnaíba', latitude: -2.9044, longitude: -41.7769 }] },
  { name: 'Rio de Janeiro', uf: 'RJ', cities: [{ name: 'Rio de Janeiro', latitude: -22.9068, longitude: -43.1729 }, { name: 'São Gonçalo', latitude: -22.8269, longitude: -43.0539 }, { name: 'Duque de Caxias', latitude: -22.7858, longitude: -43.3117 }, { name: 'Nova Iguaçu', latitude: -22.7597, longitude: -43.4511 }, { name: 'Niterói', latitude: -22.8833, longitude: -43.1036 }, { name: 'Petrópolis', latitude: -22.5050, longitude: -43.1786 }] },
  { name: 'Rio Grande do Norte', uf: 'RN', cities: [{ name: 'Natal', latitude: -5.7945, longitude: -35.2110 }, { name: 'Mossoró', latitude: -5.1878, longitude: -37.3442 }, { name: 'Parnamirim', latitude: -5.9147, longitude: -35.2631 }] },
  { name: 'Rio Grande do Sul', uf: 'RS', cities: [{ name: 'Porto Alegre', latitude: -30.0346, longitude: -51.2177 }, { name: 'Caxias do Sul', latitude: -29.1681, longitude: -51.1794 }, { name: 'Pelotas', latitude: -31.7654, longitude: -52.3376 }, { name: 'Canoas', latitude: -29.9178, longitude: -51.1839 }, { name: 'Santa Maria', latitude: -29.6842, longitude: -53.8069 }] },
  { name: 'Rondônia', uf: 'RO', cities: [{ name: 'Porto Velho', latitude: -8.7612, longitude: -63.9004 }, { name: 'Ji-Paraná', latitude: -10.8806, longitude: -61.9481 }] },
  { name: 'Roraima', uf: 'RR', cities: [{ name: 'Boa Vista', latitude: 2.8197, longitude: -60.6733 }] },
  { name: 'Santa Catarina', uf: 'SC', cities: [{ name: 'Florianópolis', latitude: -27.5954, longitude: -48.5480 }, { name: 'Joinville', latitude: -26.3044, longitude: -48.8487 }, { name: 'Blumenau', latitude: -26.9194, longitude: -49.0661 }, { name: 'Chapecó', latitude: -27.1006, longitude: -52.6156 }] },
  { name: 'São Paulo', uf: 'SP', cities: [{ name: 'São Paulo', latitude: -23.5505, longitude: -46.6333 }, { name: 'Guarulhos', latitude: -23.4628, longitude: -46.5328 }, { name: 'Campinas', latitude: -22.9056, longitude: -47.0608 }, { name: 'São Bernardo do Campo', latitude: -23.6939, longitude: -46.5650 }, { name: 'Santo André', latitude: -23.6639, longitude: -46.5383 }, { name: 'Osasco', latitude: -23.5328, longitude: -46.7919 }, { name: 'Ribeirão Preto', latitude: -21.1775, longitude: -47.8103 }, { name: 'Sorocaba', latitude: -23.5015, longitude: -47.4526 }, { name: 'Santos', latitude: -23.9608, longitude: -46.3336 }] },
  { name: 'Sergipe', uf: 'SE', cities: [{ name: 'Aracaju', latitude: -10.9472, longitude: -37.0731 }, { name: 'Nossa Senhora do Socorro', latitude: -10.8553, longitude: -37.1267 }] },
  { name: 'Tocantins', uf: 'TO', cities: [{ name: 'Palmas', latitude: -10.2128, longitude: -48.3603 }, { name: 'Araguaína', latitude: -7.1919, longitude: -48.2072 }] },
];

// Mapeia nome completo do estado (retornado pelo reverseGeocodeAsync) para a sigla UF
const STATE_NAME_TO_UF: Record<string, string> = Object.fromEntries(
  BRAZIL_STATES.map((s) => [s.name.toLowerCase(), s.uf])
);

// Também mapeia variações comuns retornadas pela API de geocoding
const STATE_ALIASES: Record<string, string> = {
  'minas gerais': 'MG',
  'são paulo': 'SP',
  'rio de janeiro': 'RJ',
  'rio grande do sul': 'RS',
  'rio grande do norte': 'RN',
  'mato grosso do sul': 'MS',
  'mato grosso': 'MT',
  'espírito santo': 'ES',
  'espirito santo': 'ES',
  'santa catarina': 'SC',
  'distrito federal': 'DF',
  'pará': 'PA',
  'para': 'PA',
  'amapá': 'AP',
  'amapa': 'AP',
  'amazonas': 'AM',
  'rondônia': 'RO',
  'rondonia': 'RO',
  'roraima': 'RR',
  'acre': 'AC',
  'tocantins': 'TO',
  'maranhão': 'MA',
  'maranhao': 'MA',
  'piauí': 'PI',
  'piaui': 'PI',
  'ceará': 'CE',
  'ceara': 'CE',
  'paraíba': 'PB',
  'paraiba': 'PB',
  'pernambuco': 'PE',
  'alagoas': 'AL',
  'sergipe': 'SE',
  'bahia': 'BA',
  'goiás': 'GO',
  'goias': 'GO',
  'paraná': 'PR',
  'parana': 'PR',
};

/** Converte qualquer string retornada pelo geocoder para sigla UF (apenas Brasil) */
export function resolveStateUF(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase();
  // Já é uma sigla (2 letras)
  if (normalized.length === 2) return normalized.toUpperCase();
  return STATE_ALIASES[normalized] ?? STATE_NAME_TO_UF[normalized] ?? undefined;
}

/**
 * Resolve a região (estado/província/departamento) de forma genérica por país.
 *
 * - Brasil (ou país desconhecido): mantém a semântica de UF de 2 letras via
 *   resolveStateUF — preserva compatibilidade com os eventos brasileiros existentes
 *   e com o recurso de pins de estado (específico do Brasil).
 * - Outros países (AR/CL/CO/PE/UY etc.): usa o próprio nome da região como
 *   identificador estável. Tanto a CRIAÇÃO do evento quanto a DETECÇÃO da
 *   localização do usuário passam por esta função com o mesmo `countryCode`,
 *   então o mesmo lugar físico sempre produz o mesmo identificador → o filtro
 *   `event.stateUF === userStateUF` casa corretamente.
 *
 * Nota: confia na consistência de caixa do geocoder do SO para um dado país/região
 * (determinístico por coordenada). Só normaliza espaços nas pontas e internos.
 */
export function resolveRegion(
  raw: string | null | undefined,
  countryCode?: string | null,
): string | undefined {
  if (!raw) return undefined;
  const cc = (countryCode ?? '').trim().toUpperCase();
  if (!cc || cc === 'BR') return resolveStateUF(raw);
  const normalized = raw.trim().replace(/\s+/g, ' ');
  return normalized.length >= 2 ? normalized : undefined;
}

export function getStateByUF(uf: string): BrazilState | undefined {
  return BRAZIL_STATES.find((s) => s.uf === uf);
}

/** Lista de siglas de todos os estados (usada para iterar agregações). */
export const BRAZIL_UFS: string[] = BRAZIL_STATES.map((s) => s.uf);

/**
 * Centróide aproximado do estado — média das coordenadas das cidades cadastradas.
 * Suficiente para posicionar um pin de resumo no mapa (não precisa de precisão geográfica).
 */
export function getStateCentroid(uf: string): { latitude: number; longitude: number } | undefined {
  const state = getStateByUF(uf);
  if (!state || state.cities.length === 0) return undefined;
  const sum = state.cities.reduce(
    (acc, c) => ({ latitude: acc.latitude + c.latitude, longitude: acc.longitude + c.longitude }),
    { latitude: 0, longitude: 0 },
  );
  return {
    latitude: sum.latitude / state.cities.length,
    longitude: sum.longitude / state.cities.length,
  };
}
