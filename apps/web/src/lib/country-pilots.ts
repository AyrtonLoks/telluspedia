/** Os seis países piloto, com dossiê completo e marcos próprios (T36: dados separados de `country-data.ts`). */
import type { PilotCountryData } from "./country-types";
import { getCountryMilestones } from "./milestones";

export const PILOT_COUNTRIES: Record<string, PilotCountryData> = {
  BRA: {
    isoCode: "BRA",
    iso2: "BR",
    numericCode: "076",
    nameCommon: "Brasil",
    nameOfficial: "República Federativa do Brasil",
    capital: "Brasília",
    continent: "Americas",
    region: "América do Sul",
    population: 214300000,
    areaKm2: 8515767,
    latitude: -15.7939,
    longitude: -47.8828,
    timezone: "America/Sao_Paulo",
    flagSvgUrl: "https://flagcdn.com/br.svg",
    currencyCode: "BRL",
    currencyName: "Real Brasileiro (R$)",
    governmentType: "República Federativa Presidencialista",
    headOfState: "Presidente da República",
    summary: "Maior país da América do Sul e quinto maior do mundo em área territorial e população, com vasta biodiversidade e a bacia amazônica.",
    indicators: [
      { indicatorCode: "NY.GDP.MKTP.CD", indicatorName: "PIB a Preços Correntes", category: "ECONOMY", year: 2023, value: 2.17e12, unit: "USD", sourcePrimary: "Banco Mundial" },
      { indicatorCode: "NY.GDP.PCAP.CD", indicatorName: "PIB per capita", category: "ECONOMY", year: 2023, value: 10043, unit: "USD", sourcePrimary: "Banco Mundial" },
      { indicatorCode: "SP.POP.TOTL", indicatorName: "População Total", category: "DEMOGRAPHY", year: 2023, value: 214300000, unit: "habitantes", sourcePrimary: "IBGE / Banco Mundial" },
      { indicatorCode: "UNDP.HDI", indicatorName: "Índice de Desenvolvimento Humano", category: "DEMOGRAPHY", year: 2022, value: 0.760, unit: "score", sourcePrimary: "PNUD" },
      { indicatorCode: "SP.DYN.LE00.IN", indicatorName: "Expectativa de Vida ao Nascer", category: "HEALTH", year: 2023, value: 76.2, unit: "anos", sourcePrimary: "OMS" },
      { indicatorCode: "MS.MIL.XPND.GD.ZS", indicatorName: "Gastos Militares (% do PIB)", category: "MILITARY", year: 2023, value: 1.1, unit: "%", sourcePrimary: "SIPRI" },
    ],
    dossierSections: [
      {
        dimension: "GEOGRAPHY",
        title: "Dimensões Continentais, Biomas e Recursos Naturais",
        estimatedReadMin: 6,
        citationsJson: { primarySource: "IBGE (2024)", doi: "10.1590/telluspedia.geo.bra" },
        contentMarkdown: `O **Brasil** ocupa uma área territorial contínua de 8.515.767 km² [3], abrangendo quase metade da massa continental da América do Sul [3]. O território abriga seis biomas terrestres fundamentais: a **Amazônia**, o **Cerrado**, a **Mata Atlântica**, a **Caatinga**, o **Pampa** e o **Pantanal** [1].

A hidrografia brasileira é dominada pela Bacia Amazônica — a maior bacia hidrográfica do planeta tanto em volume de descarga quanto em área territorial — e pela Bacia do Rio da Prata (formada pelos rios Paraná, Paraguai e Uruguai) [1]. A matriz energética nacional se destaca no cenário mundial com mais de 80% de eletricidade gerada por fontes limpas e renováveis, primariamente hidrelétrica, eólica e solar [2].`,
      },
      {
        dimension: "GOVERNMENT_POLITICS",
        title: "Sistema Político, Separação de Poderes e a Constituição de 1988",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Constituição da República Federativa do Brasil de 1988" },
        contentMarkdown: `O sistema de governo brasileiro é uma **República Federativa Presidencialista** [1], fundamentada na soberania popular, na cidadania, na dignidade da pessoa humana e no pluralismo político, conforme estabelecido pelo Artigo 1º da Constituição Cidadã de 1988 [1].

A estrutura do Estado é dividida em três poderes harmônicos e independentes [1]:
- **Poder Executivo**: chefiado pelo Presidente da República, eleito pelo sistema majoritário de dois turnos para mandatos de quatro anos [1].
- **Poder Legislativo**: exercido pelo Congresso Nacional em modelo bicameral, composto pela Câmara dos Deputados e pelo Senado Federal [1].
- **Poder Judiciário**: encabeçado pelo Supremo Tribunal Federal (STF), guarda guardião da Carta Magna [1].`,
      },
      {
        dimension: "HISTORY",
        title: "Trajetória Histórica: Do Período Colonial à Consolidação Democrática",
        estimatedReadMin: 10,
        citationsJson: { primarySource: "Fausto, Boris. História do Brasil. EdUSP, 2019." },
        contentMarkdown: `A história do território brasileiro compreende milênios de povoamento por comunidades originárias indígenas, sucedidos por mais de três séculos de colonização portuguesa após a chegada da armada de Pedro Álvares Cabral em 1500 [1].

Em 1808, a transferência da corte portuguesa para o Rio de Janeiro transformou a colônia na sede do Império Português [1]. Em 7 de setembro de 1822, Dom Pedro I proclamou a Independência do Brasil, estabelecendo o Império do Brasil, uma monarquia parlamentar que perdurou até 1889 [1].

Em 15 de novembro de 1889, Marechal Deodoro da Fonseca liderou a Proclamação da República [1]. Ao longo do século XX, o país vivenciou períodos de profunda transformação econômica e instabilidade institucional, incluindo a Era Vargas (1930–1945), a construção de Brasília sob Juscelino Kubitschek (1956–1961), a Ditadura Militar (1964–1985) e a redemocratização que culminou na Constituição de 1988 [1].`,
      },
      {
        dimension: "ECONOMY_SOCIAL",
        title: "Estrutura Econômica, Agropecuária, Indústria e Serviços",
        estimatedReadMin: 7,
        citationsJson: { primarySource: "Banco Central do Brasil / Banco Mundial (2024)" },
        contentMarkdown: `A economia brasileira é a maior da América Latina e situa-se entre as dez maiores do mundo por PIB nominal [2]. Seu setor de serviços responde por mais de 65% do valor adicionado, enquanto o agronegócio (grãos, proteína animal, café, cana-de-açúcar) figura como principal âncora do superávit na balança comercial [1][2].

A base industrial é diversificada, destacando-se na produção aeronáutica (Embraer), extração de petróleo em águas ultraprofundas (Camada Pré-Sal via Petrobras), mineração de ferro (Vale) e complexo automotivo [1][2].`,
      },
    ],
    milestones: getCountryMilestones("BRA"),
  },
  DEU: {
    isoCode: "DEU",
    iso2: "DE",
    numericCode: "276",
    nameCommon: "Alemanha",
    nameOfficial: "República Federal da Alemanha",
    capital: "Berlim",
    continent: "Europe",
    region: "Europa Ocidental",
    population: 84400000,
    areaKm2: 357022,
    latitude: 52.52,
    longitude: 13.405,
    timezone: "Europe/Berlin",
    flagSvgUrl: "https://flagcdn.com/de.svg",
    currencyCode: "EUR",
    currencyName: "Euro (€)",
    governmentType: "República Parlamentar Federal",
    headOfState: "Presidente Federal",
    headOfGov: "Chanceler Federal",
    summary: "Potência industrial e científica no centro da Europa, principal economia da União Europeia e pioneira em pesquisa tecnológica.",
    indicators: [
      { indicatorCode: "NY.GDP.MKTP.CD", indicatorName: "PIB a Preços Correntes", category: "ECONOMY", year: 2023, value: 4.46e12, unit: "USD", sourcePrimary: "Banco Mundial" },
      { indicatorCode: "NY.GDP.PCAP.CD", indicatorName: "PIB per capita", category: "ECONOMY", year: 2023, value: 52824, unit: "USD", sourcePrimary: "Banco Mundial" },
      { indicatorCode: "SP.POP.TOTL", indicatorName: "População Total", category: "DEMOGRAPHY", year: 2023, value: 84400000, unit: "habitantes", sourcePrimary: "Destatis" },
      { indicatorCode: "UNDP.HDI", indicatorName: "Índice de Desenvolvimento Humano", category: "DEMOGRAPHY", year: 2022, value: 0.942, unit: "score", sourcePrimary: "PNUD" },
      { indicatorCode: "SP.DYN.LE00.IN", indicatorName: "Expectativa de Vida ao Nascer", category: "HEALTH", year: 2023, value: 80.9, unit: "anos", sourcePrimary: "Destatis" },
      { indicatorCode: "MS.MIL.XPND.GD.ZS", indicatorName: "Gastos Militares (% do PIB)", category: "MILITARY", year: 2023, value: 1.5, unit: "%", sourcePrimary: "SIPRI" },
    ],
    dossierSections: [
      {
        dimension: "GOVERNMENT_POLITICS",
        title: "Estrutura Institucional e a Lei Fundamental (Grundgesetz)",
        estimatedReadMin: 7,
        citationsJson: { primarySource: "Grundgesetz für die Bundesrepublik Deutschland" },
        contentMarkdown: `A **Alemanha** é uma democracia representativa parlamentar e federal composta por 16 estados federados (*Länder*) [1]. A ordem constitucional repousa sobre a Lei Fundamental de 1949 (*Grundgesetz*), que coloca a intangibilidade da dignidade humana no ápice do ordenamento jurídico [1].

O Poder Executivo tem a liderança política centralizada no Chanceler Federal (*Bundeskanzler*), eleito pelo Bundestag (parlamento federal) [1]. O Presidente Federal (*Bundespräsident*) exerce o papel cerimonial de chefe de Estado [1].`,
      },
      {
        dimension: "HISTORY",
        title: "Da Unificação de 1871 à Queda do Muro e Reunificação Europeia",
        estimatedReadMin: 9,
        citationsJson: { primarySource: "Winkler, Heinrich August. Der lange Weg nach Westen. C.H. Beck, 2000." },
        contentMarkdown: `A constituição do Estado-nação alemão moderno ocorreu em 1871 sob Otto von Bismarck [1]. O século XX foi marcado pelas convulsões da Primeira Guerra Mundial, a experiência democrática da República de Weimar (1919–1933), a ascensão do regime nazista e as devastações da Segunda Guerra Mundial [1].

Após 1945, a Alemanha foi dividida entre a República Federal da Alemanha (RFA, ocidental) e a República Democrática Alemã (RDA, oriental) [1]. Em 9 de novembro de 1989, a pacífica queda do Muro de Berlim abriu caminho para a reunificação oficial em 3 de outubro de 1990 [1][2].`,
      },
    ],
    milestones: getCountryMilestones("DEU"),
  },
  USA: {
    isoCode: "USA",
    iso2: "US",
    numericCode: "840",
    nameCommon: "Estados Unidos",
    nameOfficial: "Estados Unidos da América",
    capital: "Washington, D.C.",
    continent: "Americas",
    region: "América do Norte",
    population: 334900000,
    areaKm2: 9833517,
    latitude: 38.8951,
    longitude: -77.0364,
    timezone: "America/New_York",
    flagSvgUrl: "https://flagcdn.com/us.svg",
    currencyCode: "USD",
    currencyName: "Dólar Americano ($)",
    governmentType: "República Federal Constitucional Presidencialista",
    headOfState: "Presidente dos Estados Unidos",
    summary: "Maior economia nominal do mundo, superpotência global militar e tecnológica com 50 estados e influência cultural decisiva.",
    indicators: [
      { indicatorCode: "NY.GDP.MKTP.CD", indicatorName: "PIB a Preços Correntes", category: "ECONOMY", year: 2023, value: 2.74e13, unit: "USD", sourcePrimary: "Banco Mundial / BEA" },
      { indicatorCode: "NY.GDP.PCAP.CD", indicatorName: "PIB per capita", category: "ECONOMY", year: 2023, value: 81630, unit: "USD", sourcePrimary: "Banco Mundial" },
      { indicatorCode: "SP.POP.TOTL", indicatorName: "População Total", category: "DEMOGRAPHY", year: 2023, value: 334900000, unit: "habitantes", sourcePrimary: "US Census Bureau" },
      { indicatorCode: "UNDP.HDI", indicatorName: "Índice de Desenvolvimento Humano", category: "DEMOGRAPHY", year: 2022, value: 0.927, unit: "score", sourcePrimary: "PNUD" },
      { indicatorCode: "SP.DYN.LE00.IN", indicatorName: "Expectativa de Vida ao Nascer", category: "HEALTH", year: 2023, value: 77.5, unit: "anos", sourcePrimary: "CDC" },
      { indicatorCode: "MS.MIL.XPND.GD.ZS", indicatorName: "Gastos Militares (% do PIB)", category: "MILITARY", year: 2023, value: 3.4, unit: "%", sourcePrimary: "SIPRI" },
    ],
    dossierSections: [
      {
        dimension: "GOVERNMENT_POLITICS",
        title: "Federalismo, Tripartição de Poderes e a Constituição de 1787",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "US National Archives / Constitution of the United States" },
        contentMarkdown: `A estrutura de poder nos **Estados Unidos** repousa sobre a Constituição de 1787, a mais antiga constituição escrita e codificada ainda em vigor no mundo [1].

O sistema baseia-se em um rigoroso equilíbrio de freios e contrapesos (*checks and balances*) [1]:
- O Presidente chefia o Executivo e as Forças Armadas [1].
- O Congresso bicameral detém a prerrogativa legislativa e a aprovação orçamentária [1].
- A Suprema Corte dos Estados Unidos interpreta a conformidade constitucional das leis federais e estaduais [1].`,
      },
      {
        dimension: "HISTORY",
        title: "Da Revolução Americana à Liderança Global e Era Espacial",
        estimatedReadMin: 10,
        citationsJson: { primarySource: "Library of Congress" },
        contentMarkdown: `Originado a partir das Treze Colônias britânicas que declararam independência em 4 de julho de 1776, os Estados Unidos expandiram-se para o oeste ao longo do século XIX [1].

Após a Guerra de Secessão (1861–1865), o país acelerou seu processo de industrialização e emergiu como potência mundial decisiva na Primeira e Segunda Guerras Mundiais [1]. Durante a Guerra Fria, protagonizou a corrida espacial que culminou com o desembarque na Lua pelo programa Apollo em 1969 [1][2].`,
      },
    ],
    milestones: getCountryMilestones("USA"),
  },
  JPN: {
    isoCode: "JPN",
    iso2: "JP",
    numericCode: "392",
    nameCommon: "Japão",
    nameOfficial: "Estado do Japão",
    capital: "Tóquio",
    continent: "Asia",
    region: "Ásia Oriental",
    population: 125100000,
    areaKm2: 377975,
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: "Asia/Tokyo",
    flagSvgUrl: "https://flagcdn.com/jp.svg",
    currencyCode: "JPY",
    currencyName: "Iene Japonês (¥)",
    governmentType: "Monarquia Constitucional Parlamentar",
    headOfState: "Imperador do Japão",
    headOfGov: "Primeiro-Ministro do Japão",
    summary: "Arquipélago vulcânico asiático, quarta maior economia do globo, líder de inovação em robótica, ferrovias de alta velocidade e cultura global.",
    indicators: [
      { indicatorCode: "NY.GDP.MKTP.CD", indicatorName: "PIB a Preços Correntes", category: "ECONOMY", year: 2023, value: 4.21e12, unit: "USD", sourcePrimary: "Banco Mundial" },
      { indicatorCode: "NY.GDP.PCAP.CD", indicatorName: "PIB per capita", category: "ECONOMY", year: 2023, value: 33834, unit: "USD", sourcePrimary: "Banco Mundial" },
      { indicatorCode: "SP.POP.TOTL", indicatorName: "População Total", category: "DEMOGRAPHY", year: 2023, value: 125100000, unit: "habitantes", sourcePrimary: "E-Stat Japan" },
      { indicatorCode: "UNDP.HDI", indicatorName: "Índice de Desenvolvimento Humano", category: "DEMOGRAPHY", year: 2022, value: 0.920, unit: "score", sourcePrimary: "PNUD" },
      { indicatorCode: "SP.DYN.LE00.IN", indicatorName: "Expectativa de Vida ao Nascer", category: "HEALTH", year: 2023, value: 84.6, unit: "anos", sourcePrimary: "MHLW Japan" },
      { indicatorCode: "MS.MIL.XPND.GD.ZS", indicatorName: "Gastos Militares (% do PIB)", category: "MILITARY", year: 2023, value: 1.2, unit: "%", sourcePrimary: "SIPRI" },
    ],
    dossierSections: [
      {
        dimension: "GOVERNMENT_POLITICS",
        title: "Monarquia Constitucional e a Constituição Pacifista de 1947",
        estimatedReadMin: 7,
        citationsJson: { primarySource: "Constituição do Japão (Nihon-koku Kenpō)" },
        contentMarkdown: `O sistema de governo do **Japão** é uma monarquia constitucional democrática [1]. O Imperador é reconhecido pela Constituição de 1947 como "símbolo do Estado e da unidade do povo", sem poderes de governo [1].

O Poder Executivo é conduzido pelo Primeiro-Ministro e seu Gabinete, responsáveis perante a Dieta Nacional (*Kokkai*), o parlamento bicameral japonês [1]. O Artigo 9º da Constituição renuncia expressamente à guerra como direito soberano da nação [1].`,
      },
    ],
    milestones: getCountryMilestones("JPN"),
  },
  ZAF: {
    isoCode: "ZAF",
    iso2: "ZA",
    numericCode: "710",
    nameCommon: "África do Sul",
    nameOfficial: "República da África do Sul",
    capital: "Pretória",
    continent: "Africa",
    region: "África Austral",
    population: 60400000,
    areaKm2: 1221037,
    latitude: -25.7479,
    longitude: 28.2293,
    timezone: "Africa/Johannesburg",
    flagSvgUrl: "https://flagcdn.com/za.svg",
    currencyCode: "ZAR",
    currencyName: "Rand Sul-Africano (R)",
    governmentType: "República Parlamentar com Presidente Executivo",
    headOfState: "Presidente da África do Sul",
    summary: "País mais meridional do continente africano, caracterizado por rica diversidade étnica e mineral, economia mais industrializada da África subsaariana.",
    indicators: [
      { indicatorCode: "NY.GDP.MKTP.CD", indicatorName: "PIB a Preços Correntes", category: "ECONOMY", year: 2023, value: 3.77e11, unit: "USD", sourcePrimary: "Banco Mundial" },
      { indicatorCode: "NY.GDP.PCAP.CD", indicatorName: "PIB per capita", category: "ECONOMY", year: 2023, value: 6253, unit: "USD", sourcePrimary: "Banco Mundial" },
      { indicatorCode: "SP.POP.TOTL", indicatorName: "População Total", category: "DEMOGRAPHY", year: 2023, value: 60400000, unit: "habitantes", sourcePrimary: "Stats SA" },
      { indicatorCode: "UNDP.HDI", indicatorName: "Índice de Desenvolvimento Humano", category: "DEMOGRAPHY", year: 2022, value: 0.713, unit: "score", sourcePrimary: "PNUD" },
      { indicatorCode: "SP.DYN.LE00.IN", indicatorName: "Expectativa de Vida ao Nascer", category: "HEALTH", year: 2023, value: 65.3, unit: "anos", sourcePrimary: "OMS" },
      { indicatorCode: "MS.MIL.XPND.GD.ZS", indicatorName: "Gastos Militares (% do PIB)", category: "MILITARY", year: 2023, value: 0.7, unit: "%", sourcePrimary: "SIPRI" },
    ],
    dossierSections: [
      {
        dimension: "GOVERNMENT_POLITICS",
        title: "A Nação Arco-Íris e a Constituição Democrática de 1996",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Constitution of the Republic of South Africa, 1996" },
        contentMarkdown: `A **África do Sul** é uma república parlamentar com três capitais: Pretória (sede do Poder Executivo), Cidade do Cabo (sede do Poder Legislativo) e Bloemfontein (sede do Poder Judiciário) [1].

A Constituição de 1996 é considerada uma das mais progressistas do mundo, com uma Declaração de Direitos ampla que protege expressamente contra discriminação por raça, gênero, orientação sexual e crença [1][2].`,
      },
    ],
    milestones: getCountryMilestones("ZAF"),
  },
  EGY: {
    isoCode: "EGY",
    iso2: "EG",
    numericCode: "818",
    nameCommon: "Egito",
    nameOfficial: "República Árabe do Egito",
    capital: "Cairo",
    continent: "Africa",
    region: "Norte da África",
    population: 109300000,
    areaKm2: 1002450,
    latitude: 30.0444,
    longitude: 31.2357,
    timezone: "Africa/Cairo",
    flagSvgUrl: "https://flagcdn.com/eg.svg",
    currencyCode: "EGP",
    currencyName: "Libra Egípcia (E£)",
    governmentType: "República Semipresidencialista",
    headOfState: "Presidente da República",
    summary: "Berço de uma das mais antigas civilizações da humanidade, ponto de encontro geográfico entre África e Ásia com controle estratégico do Canal de Suez.",
    indicators: [
      { indicatorCode: "NY.GDP.MKTP.CD", indicatorName: "PIB a Preços Correntes", category: "ECONOMY", year: 2023, value: 3.96e11, unit: "USD", sourcePrimary: "Banco Mundial" },
      { indicatorCode: "NY.GDP.PCAP.CD", indicatorName: "PIB per capita", category: "ECONOMY", year: 2023, value: 3698, unit: "USD", sourcePrimary: "Banco Mundial" },
      { indicatorCode: "SP.POP.TOTL", indicatorName: "População Total", category: "DEMOGRAPHY", year: 2023, value: 109300000, unit: "habitantes", sourcePrimary: "CAPMAS" },
      { indicatorCode: "UNDP.HDI", indicatorName: "Índice de Desenvolvimento Humano", category: "DEMOGRAPHY", year: 2022, value: 0.728, unit: "score", sourcePrimary: "PNUD" },
      { indicatorCode: "SP.DYN.LE00.IN", indicatorName: "Expectativa de Vida ao Nascer", category: "HEALTH", year: 2023, value: 70.2, unit: "anos", sourcePrimary: "OMS" },
      { indicatorCode: "MS.MIL.XPND.GD.ZS", indicatorName: "Gastos Militares (% do PIB)", category: "MILITARY", year: 2023, value: 1.2, unit: "%", sourcePrimary: "SIPRI" },
    ],
    dossierSections: [
      {
        dimension: "HISTORY",
        title: "Do Egito Antigo dos Faraós à Abertura do Canal de Suez",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Ministry of Tourism and Antiquities of Egypt" },
        contentMarkdown: `Com mais de cinco milênios de história registrada, o Egito floresceu ao longo das margens férteis do Rio Nilo [1]. Suas pirâmides em Gizé e complexos templários em Luxor e Karnak constituem testemunhos indeléveis da engenharia e espiritualidade antigas [1].

Na modernidade, a abertura do Canal de Suez em 1869 revolucionou o comércio marítimo mundial ao interligar diretamente o Mar Mediterrâneo ao Mar Vermelho [1][2].`,
      },
    ],
    milestones: getCountryMilestones("EGY"),
  },
};
