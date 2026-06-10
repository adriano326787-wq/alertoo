/**
 * Dados das localidades para geração de páginas locais de SEO
 * (/lei-seca/{slug} e /festas-e-eventos/{slug}).
 *
 * highways: vias/rodovias usadas no texto das páginas de Lei Seca
 * regions:  bairros/regiões usados no texto das páginas de Festas e Eventos
 */

const STATES = [
  { uf: 'AC', name: 'Acre',                 slug: 'acre',                 capital: 'Rio Branco',     highways: ['BR-364', 'BR-317'], regions: ['Centro', 'Bosque', 'Avenida Ceará'] },
  { uf: 'AL', name: 'Alagoas',              slug: 'alagoas',              capital: 'Maceió',         highways: ['BR-101', 'AL-101'], regions: ['Pajuçara', 'Ponta Verde', 'Jatiúca'] },
  { uf: 'AP', name: 'Amapá',                slug: 'amapa',                capital: 'Macapá',         highways: ['BR-156'],           regions: ['Centro', 'Beirol', 'Trem'] },
  { uf: 'AM', name: 'Amazonas',             slug: 'amazonas',             capital: 'Manaus',         highways: ['BR-319', 'AM-070'], regions: ['Ponta Negra', 'Centro', 'Adrianópolis'] },
  { uf: 'BA', name: 'Bahia',                slug: 'bahia',                capital: 'Salvador',       highways: ['BR-324', 'Linha Verde (BA-099)'], regions: ['Barra', 'Pelourinho', 'Rio Vermelho'] },
  { uf: 'CE', name: 'Ceará',                slug: 'ceara',                capital: 'Fortaleza',      highways: ['BR-116', 'CE-040'], regions: ['Praia de Iracema', 'Beira Mar', 'Aldeota'] },
  { uf: 'DF', name: 'Distrito Federal',     slug: 'distrito-federal',     capital: 'Brasília',       highways: ['EPCT (DF-001)', 'BR-020'], regions: ['Asa Sul', 'Asa Norte', 'Lago Sul'] },
  { uf: 'ES', name: 'Espírito Santo',       slug: 'espirito-santo',       capital: 'Vitória',        highways: ['BR-101', 'ES-010'], regions: ['Praia do Canto', 'Jardim Camburi', 'Vila Velha'] },
  { uf: 'GO', name: 'Goiás',                slug: 'goias',                capital: 'Goiânia',        highways: ['BR-153', 'GO-070'], regions: ['Setor Bueno', 'Setor Marista', 'Jardim Goiás'] },
  { uf: 'MA', name: 'Maranhão',             slug: 'maranhao',             capital: 'São Luís',       highways: ['BR-135', 'BR-316'], regions: ['Litorânea', 'Calhau', 'Renascença'] },
  { uf: 'MT', name: 'Mato Grosso',          slug: 'mato-grosso',          capital: 'Cuiabá',         highways: ['BR-364', 'BR-163'], regions: ['Centro', 'Coxipó', 'CPA'] },
  { uf: 'MS', name: 'Mato Grosso do Sul',   slug: 'mato-grosso-do-sul',   capital: 'Campo Grande',   highways: ['BR-163', 'BR-262'], regions: ['Centro', 'Amambaí', 'Avenida Afonso Pena'] },
  { uf: 'MG', name: 'Minas Gerais',         slug: 'minas-gerais',         capital: 'Belo Horizonte', highways: ['BR-040', 'BR-381'], regions: ['Savassi', 'Pampulha', 'Lourdes'] },
  { uf: 'PA', name: 'Pará',                 slug: 'para',                 capital: 'Belém',          highways: ['BR-316', 'BR-010'], regions: ['Cidade Velha', 'Nazaré', 'Umarizal'] },
  { uf: 'PB', name: 'Paraíba',              slug: 'paraiba',              capital: 'João Pessoa',    highways: ['BR-230', 'PB-008'], regions: ['Tambaú', 'Cabo Branco', 'Manaíra'] },
  { uf: 'PR', name: 'Paraná',               slug: 'parana',               capital: 'Curitiba',       highways: ['BR-277', 'BR-376'], regions: ['Batel', 'Água Verde', 'Centro Cívico'] },
  { uf: 'PE', name: 'Pernambuco',           slug: 'pernambuco',           capital: 'Recife',         highways: ['BR-101', 'PE-015'], regions: ['Boa Viagem', 'Pina', 'Recife Antigo'] },
  { uf: 'PI', name: 'Piauí',                slug: 'piaui',                capital: 'Teresina',       highways: ['BR-343', 'BR-316'], regions: ['Centro', 'Fátima', 'Jóquei'] },
  { uf: 'RJ', name: 'Rio de Janeiro',       slug: 'rio-de-janeiro',       capital: 'Rio de Janeiro', highways: ['Linha Vermelha', 'Avenida Brasil', 'BR-101'], regions: ['Lapa', 'Copacabana', 'Barra da Tijuca'] },
  { uf: 'RN', name: 'Rio Grande do Norte',  slug: 'rio-grande-do-norte',  capital: 'Natal',          highways: ['BR-101', 'RN-063'], regions: ['Ponta Negra', 'Praia dos Artistas', 'Petrópolis'] },
  { uf: 'RS', name: 'Rio Grande do Sul',    slug: 'rio-grande-do-sul',    capital: 'Porto Alegre',   highways: ['Free Way (BR-290)', 'BR-116'], regions: ['Cidade Baixa', 'Moinhos de Vento', 'Bom Fim'] },
  { uf: 'RO', name: 'Rondônia',             slug: 'rondonia',             capital: 'Porto Velho',    highways: ['BR-364', 'BR-319'], regions: ['Centro', 'Embratel', 'Nações Unidas'] },
  { uf: 'RR', name: 'Roraima',              slug: 'roraima',              capital: 'Boa Vista',      highways: ['BR-174'],           regions: ['Centro', 'São Pedro', 'São Vicente'] },
  { uf: 'SC', name: 'Santa Catarina',       slug: 'santa-catarina',       capital: 'Florianópolis',  highways: ['BR-101', 'SC-401'], regions: ['Lagoa da Conceição', 'Centro', 'Jurerê'] },
  { uf: 'SP', name: 'São Paulo',            slug: 'sao-paulo',            capital: 'São Paulo',      highways: ['Marginal Tietê', 'Marginal Pinheiros', 'Rodovia dos Bandeirantes'], regions: ['Vila Madalena', 'Pinheiros', 'Itaim Bibi'] },
  { uf: 'SE', name: 'Sergipe',              slug: 'sergipe',              capital: 'Aracaju',        highways: ['BR-101', 'SE-100'], regions: ['Atalaia', 'Centro', 'Coroa do Meio'] },
  { uf: 'TO', name: 'Tocantins',            slug: 'tocantins',            capital: 'Palmas',         highways: ['BR-153', 'TO-050'], regions: ['Centro', 'Plano Diretor Sul', 'Taquaralto'] },
];

const CITIES = [
  { name: 'Niterói',            slug: 'niteroi',              uf: 'RJ', highways: ['Av. Roberto Silveira', 'Reta de Piratininga', 'RJ-104'], regions: ['Icaraí', 'Santa Rosa', 'Camboinhas'] },
  { name: 'Campinas',           slug: 'campinas',             uf: 'SP', highways: ['Rodovia Anhanguera', 'Rodovia Dom Pedro I'], regions: ['Cambuí', 'Taquaral', 'Centro'] },
  { name: 'Santos',             slug: 'santos',               uf: 'SP', highways: ['Rodovia Anchieta', 'Rodovia dos Imigrantes'], regions: ['Gonzaga', 'Embaré', 'Ponta da Praia'] },
  { name: 'São José dos Campos',slug: 'sao-jose-dos-campos',  uf: 'SP', highways: ['Rodovia Presidente Dutra'], regions: ['Jardim Aquarius', 'Centro', 'Vila Adyana'] },
  { name: 'Sorocaba',           slug: 'sorocaba',             uf: 'SP', highways: ['Rodovia Castelo Branco', 'Rodovia Raposo Tavares'], regions: ['Centro', 'Campolim', 'Jardim Vergueiro'] },
  { name: 'Ribeirão Preto',     slug: 'ribeirao-preto',       uf: 'SP', highways: ['Rodovia Anhanguera'], regions: ['Centro', 'Jardim California', 'Avenida Independência'] },
  { name: 'Joinville',          slug: 'joinville',            uf: 'SC', highways: ['BR-101', 'BR-280'], regions: ['Centro', 'América', 'Glória'] },
  { name: 'Londrina',           slug: 'londrina',             uf: 'PR', highways: ['BR-369', 'BR-376'], regions: ['Centro', 'Gleba Palhano', 'Catuaí'] },
  { name: 'Caxias do Sul',      slug: 'caxias-do-sul',        uf: 'RS', highways: ['BR-116'], regions: ['Centro', 'Exposição', 'São Pelegrino'] },
  { name: 'Foz do Iguaçu',      slug: 'foz-do-iguacu',        uf: 'PR', highways: ['BR-277', 'Ponte da Amizade'], regions: ['Centro', 'Jardim Itaipu', 'Vila Yolanda'] },
  { name: 'Uberlândia',         slug: 'uberlandia',           uf: 'MG', highways: ['BR-050', 'BR-365'], regions: ['Centro', 'Santa Mônica', 'Tibery'] },
  { name: 'Feira de Santana',   slug: 'feira-de-santana',     uf: 'BA', highways: ['BR-116', 'BR-324'], regions: ['Centro', 'Kalilândia', 'Tomba'] },
  { name: 'Maringá',            slug: 'maringa',              uf: 'PR', highways: ['BR-376', 'PR-317'], regions: ['Zona 7', 'Centro', 'Novo Centro'] },
  { name: 'Blumenau',           slug: 'blumenau',             uf: 'SC', highways: ['BR-470'], regions: ['Vila Germânica', 'Centro', 'Velha'] },
  { name: 'Cabo Frio',          slug: 'cabo-frio',            uf: 'RJ', highways: ['Via Lagos', 'RJ-106'], regions: ['Praia do Forte', 'Centro', 'Braga'] },
  { name: 'Búzios',             slug: 'buzios',               uf: 'RJ', highways: ['RJ-102', 'RJ-106'], regions: ['Rua das Pedras', 'Geribá', 'Ferradura'] },
  { name: 'Porto Seguro',       slug: 'porto-seguro',         uf: 'BA', highways: ['BR-367'], regions: ['Passarela do Álcool', 'Centro Histórico', 'Taperapuã'] },
  { name: 'Gramado',            slug: 'gramado',              uf: 'RS', highways: ['RS-115'], regions: ['Rua Coberta', 'Centro', 'Avenida Borges de Medeiros'] },
];

module.exports = { STATES, CITIES };
