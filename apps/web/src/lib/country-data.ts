import {
  HISTORICAL_ENTITIES,
  resolveHistoricalEntity,
  HistoricalEraId,
} from "./historical-entities";

export interface PilotCountryData {
  isoCode: string;
  iso2: string;
  numericCode: string;
  nameCommon: string;
  nameOfficial: string;
  capital: string;
  continent: string;
  region: string;
  population: number;
  areaKm2: number;
  latitude: number;
  longitude: number;
  timezone: string;
  flagSvgUrl: string;
  currencyCode: string;
  currencyName: string;
  governmentType: string;
  headOfState: string;
  headOfGov?: string;
  summary: string;
  wikidataQid?: string;
  historicalLeader?: string;
  leaderTitle?: string;
  startYear?: number;
  endYear?: number;
  era?: HistoricalEraId;
  successorIsos?: string[];
  predecessorIsos?: string[];
  isHistoricalEntity?: boolean;
  indicators: {
    indicatorCode: string;
    indicatorName: string;
    category: "ECONOMY" | "DEMOGRAPHY" | "HEALTH" | "MILITARY";
    year: number;
    value: number;
    unit: string;
    sourcePrimary: string;
  }[];
  dossierSections: {
    dimension:
      | "GEOGRAPHY"
      | "GOVERNMENT_POLITICS"
      | "ECONOMY_SOCIAL"
      | "HISTORY"
      | "BIOGRAPHIES"
      | "CULTURE_HUMANITIES"
      | "BIOLOGY_HEALTH"
      | "NEWS_CURRENT_AFFAIRS";
    title: string;
    contentMarkdown: string;
    estimatedReadMin: number;
    citationsJson: any;
  }[];
  milestones: {
    id: string;
    title: string;
    summary: string;
    year: number;
    exactDate?: string;
    category: "POLITICS_REGIMES" | "ECONOMY" | "WAR_MILITARY" | "SCIENCE_CULTURE" | "HEALTH_PANDEMICS";
    sourcePrimary: string;
    latitude?: number;
    longitude?: number;
    countryIso?: string;
    blocIsos?: string[];
    preferredAltitude?: number;
  }[];
}

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
    milestones: [
      { id: "bra-1822", title: "Independência do Brasil", summary: "Rompe os laços coloniais com Portugal e funda o Império do Brasil.", year: 1822, exactDate: "1822-09-07", category: "POLITICS_REGIMES", sourcePrimary: "IHGB", latitude: -23.585, longitude: -46.609, countryIso: "BRA" },
      { id: "bra-1888", title: "Abolição da Escravidão (Lei Áurea)", summary: "Fim formal do regime escravocrata sancionado pela Princesa Isabel.", year: 1888, exactDate: "1888-05-13", category: "POLITICS_REGIMES", sourcePrimary: "Arquivo Nacional", latitude: -22.906, longitude: -43.172, countryIso: "BRA" },
      { id: "bra-1889", title: "Proclamação da República", summary: "Deposição do Imperador Dom Pedro II e instituição da República Federativa.", year: 1889, exactDate: "1889-11-15", category: "POLITICS_REGIMES", sourcePrimary: "IHGB", latitude: -22.9068, longitude: -43.1729, countryIso: "BRA" },
      { id: "bra-1960", title: "Inauguração de Brasília", summary: "Transferência da capital federal para o planalto central sob Juscelino Kubitschek.", year: 1960, exactDate: "1960-04-21", category: "SCIENCE_CULTURE", sourcePrimary: "IBGE", latitude: -15.7939, longitude: -47.8828, countryIso: "BRA" },
      { id: "bra-1988", title: "Promulgação da Constituição Cidadã", summary: "Marco fundamental da redemocratização e garantia dos direitos fundamentais.", year: 1988, exactDate: "1988-10-05", category: "POLITICS_REGIMES", sourcePrimary: "Congresso Nacional", latitude: -15.7998, longitude: -47.8645, countryIso: "BRA" },
    ],
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
    milestones: [
      { id: "deu-1871", title: "Unificação da Alemanha", summary: "Proclamação do Império Alemão no Palácio de Versalhes sob Bismarck e Guilherme I.", year: 1871, exactDate: "1871-01-18", category: "POLITICS_REGIMES", sourcePrimary: "Bundesarchiv", latitude: 48.8049, longitude: 2.1204, countryIso: "DEU" },
      { id: "deu-1949", title: "Promulgação da Lei Fundamental", summary: "Criação da República Federal da Alemanha e adoção da Grundgesetz.", year: 1949, exactDate: "1949-05-23", category: "POLITICS_REGIMES", sourcePrimary: "Bundestag", latitude: 50.7374, longitude: 7.0982, countryIso: "DEU" },
      { id: "deu-1989", title: "Queda do Muro de Berlim", summary: "Abertura das fronteiras entre Berlim Oriental e Ocidental, antecipando o fim da Guerra Fria.", year: 1989, exactDate: "1989-11-09", category: "POLITICS_REGIMES", sourcePrimary: "Bundesarchiv", latitude: 52.5163, longitude: 13.3777, countryIso: "DEU" },
      { id: "deu-1990", title: "Reunificação da Alemanha", summary: "Adesão formal dos novos estados da RDA à República Federal da Alemanha.", year: 1990, exactDate: "1990-10-03", category: "POLITICS_REGIMES", sourcePrimary: "Bundestag", latitude: 52.5186, longitude: 13.3762, countryIso: "DEU" },
    ],
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
    milestones: [
      { id: "usa-1776", title: "Declaração de Independência", summary: "As Treze Colônias rompem com a Grã-Bretanha e estabelecem os Estados Unidos.", year: 1776, exactDate: "1776-07-04", category: "POLITICS_REGIMES", sourcePrimary: "National Archives", latitude: 39.9489, longitude: -75.15, countryIso: "USA" },
      { id: "usa-1865", title: "Fim da Guerra de Secessão e 13ª Emenda", summary: "Preservação da união federal e abolição formal da escravidão nos EUA.", year: 1865, exactDate: "1865-04-09", category: "WAR_MILITARY", sourcePrimary: "Library of Congress", latitude: 37.3775, longitude: -78.7967, countryIso: "USA" },
      { id: "usa-1969", title: "Apollo 11: Pouso Humano na Lua", summary: "Neil Armstrong e Buzz Aldrin tornam-se os primeiros humanos a caminhar no solo lunar.", year: 1969, exactDate: "1969-07-20", category: "SCIENCE_CULTURE", sourcePrimary: "NASA", latitude: 28.5721, longitude: -80.648, countryIso: "USA" },
    ],
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
    milestones: [
      { id: "jpn-1868", title: "Restauração Meiji", summary: "Queda do xogunato Tokugawa, restauração do poder imperial e rápida modernização do Japão.", year: 1868, exactDate: "1868-01-03", category: "POLITICS_REGIMES", sourcePrimary: "Arquivo Histórico Nacional do Japão", latitude: 35.0116, longitude: 135.7681, countryIso: "JPN" },
      { id: "jpn-1964", title: "Estreia do Trem Bala Shinkansen", summary: "Inauguração da primeira ferrovia comercial de alta velocidade conectando Tóquio e Osaka.", year: 1964, exactDate: "1964-10-01", category: "SCIENCE_CULTURE", sourcePrimary: "JR Central", latitude: 35.6812, longitude: 139.7671, countryIso: "JPN" },
    ],
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
    milestones: [
      { id: "zaf-1994", title: "Fim do Apartheid e Eleição de Nelson Mandela", summary: "Primeiras eleições multirraciais livres da África do Sul e posse de Nelson Mandela.", year: 1994, exactDate: "1994-04-27", category: "POLITICS_REGIMES", sourcePrimary: "Nelson Mandela Foundation", latitude: -25.7479, longitude: 28.2293, countryIso: "ZAF" },
    ],
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
    milestones: [
      { id: "egy-1869", title: "Inauguração do Canal de Suez", summary: "Abertura da via aquática artificial de 193 km conectando a Europa e a Ásia.", year: 1869, exactDate: "1869-11-17", category: "ECONOMY", sourcePrimary: "Suez Canal Authority", latitude: 31.2653, longitude: 32.3019, countryIso: "EGY" },
      { id: "egy-1952", title: "Revolução Egípcia de 1952", summary: "Queda da monarquia de Faruque I e proclamação da República Árabe do Egito.", year: 1952, exactDate: "1952-07-23", category: "POLITICS_REGIMES", sourcePrimary: "Al-Ahram Archives", latitude: 30.0444, longitude: 31.2357, countryIso: "EGY" },
    ],
  },
};

export interface MilestoneItem {
  id: string;
  title: string;
  summary: string;
  year: number;
  exactDate?: string;
  category: "POLITICS_REGIMES" | "ECONOMY" | "WAR_MILITARY" | "SCIENCE_CULTURE" | "HEALTH_PANDEMICS";
  sourcePrimary: string;
  latitude?: number;
  longitude?: number;
  countryIso?: string;
  blocIsos?: string[];
  preferredAltitude?: number;
}

export const GLOBAL_MILESTONES: MilestoneItem[] = [
  {
    id: "magellan-1519",
    title: "Primeira Circum-navegação da Terra (Magalhães–Elcano)",
    summary: "A armada de cinco naus parte de Sanlúcar de Barrameda sob o comando de Fernão de Magalhães, realizando a primeira travessia global da história.",
    year: 1519,
    exactDate: "1519-09-20",
    category: "SCIENCE_CULTURE" as const,
    sourcePrimary: "Arquivo Geral das Índias / Antonio Pigafetta",
    latitude: 36.7786,
    longitude: -6.3533,
    countryIso: "ESP",
    blocIsos: ["ESP", "PRT"],
  },
  {
    id: "elcano-1522",
    title: "Retorno da Nau Victoria e Conclusão da Circum-navegação",
    summary: "Juan Sebastián Elcano e 17 sobreviventes a bordo da Nau Victoria chegam a Sanlúcar de Barrameda, comprovando a esfericidade e navegabilidade contínua da Terra.",
    year: 1522,
    exactDate: "1522-09-06",
    category: "SCIENCE_CULTURE" as const,
    sourcePrimary: "Arquivo Geral das Índias / Antonio Pigafetta",
    latitude: 36.7786,
    longitude: -6.3533,
    countryIso: "ESP",
    blocIsos: ["ESP"],
  },
  { id: "ahu-1867", title: "Compromisso Austro-Húngaro (Ausgleich)", summary: "Criação da Monarquia Dual soberana entre a Áustria e a Hungria sob Francisco José I.", year: 1867, exactDate: "1867-06-08", category: "POLITICS_REGIMES" as const, sourcePrimary: "Österreichisches Staatsarchiv", latitude: 48.2082, longitude: 16.3738, countryIso: "AHU", blocIsos: ["AHU", "AUT", "HUN"] },
  { id: "glo-1870", title: "Batalha de Sedan e Guerra Franco-Prussiana", summary: "Capitulação do imperador francês Napoleão III perante as forças prussianas e confederadas, abrindo caminho para a unificação.", year: 1870, exactDate: "1870-09-02", category: "WAR_MILITARY" as const, sourcePrimary: "Bundesarchiv / SHD", latitude: 49.7022, longitude: 4.9436, countryIso: "FRA", blocIsos: ["PRU", "FRA", "DEU"] },
  { id: "pru-1871", title: "Unificação Alemã e Proclamação do Reich em Versalhes", summary: "Príncipes alemães aclamam Guilherme I da Prússia como Imperador Alemão na Galeria dos Espelhos no Palácio de Versalhes.", year: 1871, exactDate: "1871-01-18", category: "POLITICS_REGIMES" as const, sourcePrimary: "Preußisches Geheimes Staatsarchiv", latitude: 48.8049, longitude: 2.1204, countryIso: "PRU", blocIsos: ["PRU", "DEU"] },
  { id: "tur-1908", title: "Revolução dos Jovens Turcos", summary: "Movimento constitucionalista restaura o Parlamento e a Constituição de 1876 na Sublime Porta.", year: 1908, exactDate: "1908-07-24", category: "POLITICS_REGIMES" as const, sourcePrimary: "Başbakanlık Osmanlı Arşivi", latitude: 41.0082, longitude: 28.9784, countryIso: "TUR_HIST", blocIsos: ["TUR_HIST"] },
  { id: "glo-1914", title: "Eclosão da Primeira Guerra Mundial", summary: "Assassinato do Arquiduque Francisco Ferdinando em Sarajevo deflagra o primeiro conflito em escala global.", year: 1914, exactDate: "1914-07-28", category: "WAR_MILITARY" as const, sourcePrimary: "Imperial War Museum", latitude: 43.8563, longitude: 18.4131, countryIso: "BIH", blocIsos: ["AHU", "DEU", "RUS", "FRA", "GBR", "TUR_HIST"] },
  { id: "glo-1919", title: "Tratado de Versalhes e Liga das Nações", summary: "Assinatura do tratado de paz no Salão dos Espelhos em Versalhes e fundação da primeira organização internacional de segurança coletiva.", year: 1919, exactDate: "1919-06-28", category: "POLITICS_REGIMES" as const, sourcePrimary: "Liga das Nações / Arquivo de Versalhes", latitude: 48.8049, longitude: 2.1204, countryIso: "FRA" },
  { id: "glo-1939", title: "Início da Segunda Guerra Mundial", summary: "Invasão da Polônia por forças da Alemanha nazista deflagra a Segunda Guerra Mundial na Europa.", year: 1939, exactDate: "1939-09-01", category: "WAR_MILITARY" as const, sourcePrimary: "Bundesarchiv / Polish Institute", latitude: 54.4069, longitude: 18.6738, countryIso: "POL", blocIsos: ["DEU", "POL", "SUN", "GBR", "FRA"] },
  { id: "glo-1944", title: "Desembarque da Normandia (Dia D)", summary: "A Operação Overlord desembarca mais de 150 mil soldados aliados na Normandia, abrindo a frente ocidental decisiva contra o Eixo.", year: 1944, exactDate: "1944-06-06", category: "WAR_MILITARY" as const, sourcePrimary: "US National Archives (NARA)", latitude: 49.3364, longitude: -0.8653, countryIso: "FRA" },
  { id: "glo-1945", title: "Fundação das Nações Unidas (ONU)", summary: "Criação da organização internacional com o objetivo de manter a paz e cooperação global.", year: 1945, exactDate: "1945-10-24", category: "POLITICS_REGIMES" as const, sourcePrimary: "UN Archives", latitude: 40.7489, longitude: -73.968, countryIso: "USA" },
  { id: "glo-1947", title: "Doutrina Truman e Plano Marshall", summary: "Lançamento do plano maciço de assistência econômica dos EUA para a reconstrução da Europa Ocidental e contenção da Guerra Fria.", year: 1947, exactDate: "1947-06-05", category: "ECONOMY" as const, sourcePrimary: "US Department of State", latitude: 38.8951, longitude: -77.0364, countryIso: "USA" },
  { id: "glo-1957", title: "Lançamento do Sputnik 1", summary: "Primeiro satélite artificial em órbita terrestre, inaugurando a Era Espacial.", year: 1957, exactDate: "1957-10-04", category: "SCIENCE_CULTURE" as const, sourcePrimary: "Roscosmos / NASA", latitude: 45.9646, longitude: 63.3052, countryIso: "KAZ", blocIsos: ["SUN"] },
  { id: "sun-1961", title: "Vostok 1: Primeiro Voo Humano no Espaço", summary: "O cosmonauta soviético Yuri Gagarin realiza a primeira órbita tripulada ao redor da Terra.", year: 1961, exactDate: "1961-04-12", category: "SCIENCE_CULTURE" as const, sourcePrimary: "Roscosmos / RGANTD", latitude: 45.9646, longitude: 63.3052, countryIso: "SUN", blocIsos: ["SUN"] },
  { id: "yug-1961", title: "Conferência de Belgrado dos Países Não-Alinhados", summary: "Fundação do Movimento dos Não-Alinhados liderado por Tito, Nasser e Nehru como alternativa à bipolaridade EUA-URSS.", year: 1961, exactDate: "1961-09-01", category: "POLITICS_REGIMES" as const, sourcePrimary: "Diplomatski arhiv MSP Srbije", latitude: 44.8176, longitude: 20.4633, countryIso: "YUG", blocIsos: ["YUG"] },
  { id: "gdr-1961", title: "Construção do Muro de Berlim", summary: "O governo da RDA inicia o fechamento e fortificação da fronteira entre Berlim Oriental e Ocidental.", year: 1961, exactDate: "1961-08-13", category: "POLITICS_REGIMES" as const, sourcePrimary: "Stiftung Berliner Mauer", latitude: 52.5163, longitude: 13.3777, countryIso: "GDR", blocIsos: ["GDR", "FRG", "SUN", "USA"] },
  { id: "glo-1962", title: "Crise dos Mísseis de Cuba", summary: "Confronto de treze dias entre EUA e URSS sobre mísseis nucleares soviéticos instalados em Cuba, ápice de tensão na Guerra Fria.", year: 1962, exactDate: "1962-10-16", category: "WAR_MILITARY" as const, sourcePrimary: "JFK Presidential Library", latitude: 23.1136, longitude: -82.3666, countryIso: "CUB" },
  { id: "csk-1968", title: "Primavera de Praga e Invasão do Pacto de Varsóvia", summary: "Abertura política do 'socialismo com rosto humano' sob Alexander Dubček e subsequente ocupação militar soviética.", year: 1968, exactDate: "1968-08-20", category: "WAR_MILITARY" as const, sourcePrimary: "Národní archiv Praha", latitude: 50.0755, longitude: 14.4378, countryIso: "CSK", blocIsos: ["CSK", "SUN"] },
  { id: "glo-1969", title: "Apollo 11: Pouso Humano na Lua", summary: "Neil Armstrong e Buzz Aldrin tornam-se os primeiros humanos a caminhar na Lua.", year: 1969, exactDate: "1969-07-20", category: "SCIENCE_CULTURE" as const, sourcePrimary: "NASA", latitude: 28.5721, longitude: -80.648, countryIso: "USA", blocIsos: ["USA"] },
  { id: "glo-1973", title: "Primeiro Choque do Petróleo", summary: "Embargo da OPEP desencadeia quadruplicação dos preços do barril e reorientação energética mundial.", year: 1973, exactDate: "1973-10-17", category: "ECONOMY" as const, sourcePrimary: "IEA", latitude: 24.7136, longitude: 46.6753, countryIso: "SAU" },
  { id: "glo-1989", title: "Queda do Muro de Berlim", summary: "Abertura dos postos de controle entre Berlim Oriental e Ocidental, sinalizando o fim da Guerra Fria.", year: 1989, exactDate: "1989-11-09", category: "POLITICS_REGIMES" as const, sourcePrimary: "Bundesarchiv", latitude: 52.5163, longitude: 13.3777, countryIso: "DEU", blocIsos: ["GDR", "FRG"] },
  { id: "glo-1991", title: "Criação da World Wide Web", summary: "Tim Berners-Lee publica a primeira página web no CERN, inaugurando a era da internet pública.", year: 1991, exactDate: "1991-08-06", category: "SCIENCE_CULTURE" as const, sourcePrimary: "CERN", latitude: 46.233, longitude: 6.0557, countryIso: "CHE" },
  { id: "glo-1991-ussr", title: "Dissolução da União Soviética", summary: "Renúncia de Gorbachev e arriamento da bandeira soviética no Kremlin encerram formalmente a União Soviética e a Guerra Fria.", year: 1991, exactDate: "1991-12-26", category: "POLITICS_REGIMES" as const, sourcePrimary: "Arquivo Estatal da Federação Russa (GARF)", latitude: 55.752, longitude: 37.6175, countryIso: "RUS" },
  {
    id: "glo-1999",
    title: "Criação da Moeda Única Euro",
    summary: "Entrada em vigor do Euro nos mercados financeiros de 11 nações da União Europeia.",
    year: 1999,
    exactDate: "1999-01-01",
    category: "ECONOMY" as const,
    sourcePrimary: "ECB",
    latitude: 48.5,
    longitude: 9.0,
    preferredAltitude: 2.7,
    countryIso: "DEU",
    blocIsos: ["DEU", "FRA", "ITA", "ESP", "PRT", "NLD", "BEL", "LUX", "AUT", "FIN", "IRL"],
  },
  { id: "glo-2008", title: "Crise Financeira Global de 2008", summary: "Colapso do banco Lehman Brothers desencadeia a maior recessão global desde a Grande Depressão.", year: 2008, exactDate: "2008-09-15", category: "ECONOMY" as const, sourcePrimary: "Federal Reserve", latitude: 40.7128, longitude: -74.006, countryIso: "USA" },
  { id: "glo-2015", title: "Acordo de Paris sobre o Clima", summary: "Tratado internacional assinado por 196 nações para limitar o aquecimento global abaixo de 2°C.", year: 2015, exactDate: "2015-12-12", category: "SCIENCE_CULTURE" as const, sourcePrimary: "UNFCCC", latitude: 48.8566, longitude: 2.3522, countryIso: "FRA" },
  { id: "glo-2020", title: "Declaração de Pandemia de COVID-19", summary: "OMS classifica a disseminação global do coronavírus SARS-CoV-2 como pandemia mundial.", year: 2020, exactDate: "2020-03-11", category: "HEALTH_PANDEMICS" as const, sourcePrimary: "OMS", latitude: 46.2044, longitude: 6.1432, countryIso: "CHE" },
  { id: "glo-2021", title: "Lançamento do Telescópio Espacial James Webb", summary: "O mais avançado observatório astronômico espacial é lançado pelo foguete Ariane 5.", year: 2021, exactDate: "2021-12-25", category: "SCIENCE_CULTURE" as const, sourcePrimary: "NASA / ESA", latitude: 5.2372, longitude: -52.7686, countryIso: "FRA" },
];

export function findMilestoneById(id: string): MilestoneItem | undefined {
  const global = GLOBAL_MILESTONES.find((m) => m.id === id);
  if (global) return global;
  for (const country of Object.values(PILOT_COUNTRIES)) {
    const found = country.milestones.find((m) => m.id === id);
    if (found) {
      return {
        ...found,
        countryIso: found.countryIso || country.isoCode,
      };
    }
  }
  return undefined;
}

export const NUMERIC_TO_ISO: Record<string, string> = {
  "004": "AFG", "008": "ALB", "010": "ATA", "012": "DZA", "024": "AGO", "031": "AZE", "032": "ARG", "036": "AUS",
  "040": "AUT", "044": "BHS", "050": "BGD", "051": "ARM", "056": "BEL", "064": "BTN", "068": "BOL", "070": "BIH",
  "072": "BWA", "076": "BRA", "084": "BLZ", "090": "SLB", "096": "BRN", "100": "BGR", "104": "MMR", "108": "BDI",
  "112": "BLR", "116": "KHM", "120": "CMR", "124": "CAN", "140": "CAF", "144": "LKA", "148": "TCD", "152": "CHL",
  "156": "CHN", "158": "TWN", "170": "COL", "178": "COG", "180": "COD", "188": "CRI", "191": "HRV", "192": "CUB",
  "196": "CYP", "203": "CZE", "204": "BEN", "208": "DNK", "214": "DOM", "218": "ECU", "222": "SLV", "226": "GNQ",
  "231": "ETH", "232": "ERI", "233": "EST", "238": "FLK", "242": "FJI", "246": "FIN", "250": "FRA", "260": "ATF",
  "262": "DJI", "266": "GAB", "268": "GEO", "270": "GMB", "275": "PSE", "276": "DEU", "288": "GHA", "300": "GRC",
  "304": "GRL", "320": "GTM", "324": "GIN", "328": "GUY", "332": "HTI", "340": "HND", "348": "HUN", "352": "ISL",
  "356": "IND", "360": "IDN", "364": "IRN", "368": "IRQ", "372": "IRL", "376": "ISR", "380": "ITA", "384": "CIV",
  "388": "JAM", "392": "JPN", "398": "KAZ", "400": "JOR", "404": "KEN", "408": "PRK", "410": "KOR", "414": "KWT",
  "417": "KGZ", "418": "LAO", "422": "LBN", "426": "LSO", "428": "LVA", "430": "LBR", "434": "LBY", "440": "LTU",
  "442": "LUX", "450": "MDG", "454": "MWI", "458": "MYS", "466": "MLI", "478": "MRT", "484": "MEX", "496": "MNG",
  "498": "MDA", "499": "MNE", "504": "MAR", "508": "MOZ", "512": "OMN", "516": "NAM", "524": "NPL", "528": "NLD",
  "540": "NCL", "548": "VUT", "554": "NZL", "558": "NIC", "562": "NER", "566": "NGA", "578": "NOR", "586": "PAK",
  "591": "PAN", "598": "PNG", "600": "PRY", "604": "PER", "608": "PHL", "616": "POL", "620": "PRT", "624": "GNB",
  "626": "TLS", "630": "PRI", "634": "QAT", "642": "ROU", "643": "RUS", "646": "RWA", "682": "SAU", "686": "SEN",
  "688": "SRB", "694": "SLE", "703": "SVK", "704": "VNM", "705": "SVN", "706": "SOM", "710": "ZAF", "716": "ZWE",
  "724": "ESP", "728": "SSD", "729": "SDN", "732": "ESH", "740": "SUR", "748": "SWZ", "752": "SWE", "756": "CHE",
  "760": "SYR", "762": "TJK", "764": "THA", "768": "TGO", "780": "TTO", "784": "ARE", "788": "TUN", "792": "TUR",
  "795": "TKM", "800": "UGA", "804": "UKR", "807": "MKD", "818": "EGY", "826": "GBR", "834": "TZA", "840": "USA",
  "854": "BFA", "858": "URY", "860": "UZB", "862": "VEN", "887": "YEM", "894": "ZMB",
  // Historical Entity Standard Numeric Codes
  "810": "SUN", "278": "GDR", "280": "FRG", "891": "YUG", "200": "CSK", "901": "AHU", "902": "PRU", "903": "TUR_HIST",
  // Historical Entity IDs & Territories
  "PRU": "PRU", "SUN": "SUN", "AHU": "AHU", "GDR": "GDR", "FRG": "FRG", "TUR_HIST": "TUR_HIST",
  "YUG": "YUG", "CSK": "CSK", "CYN": "CYN", "SOM": "SOM", "XKX": "XKX",
  // Alpha-3 direct identity mapping for TopoJSON mesh features
  "DEU": "DEU", "FRA": "FRA", "GBR": "GBR", "RUS": "RUS", "JPN": "JPN", "ITA": "ITA",
  "POL": "POL", "SVK": "SVK", "CZE": "CZE", "AUT": "AUT", "HUN": "HUN", "TUR": "TUR",
  "USA": "USA", "BRA": "BRA", "CHN": "CHN", "IND": "IND", "CAN": "CAN", "AUS": "AUS",
  "ARG": "ARG", "MEX": "MEX", "ESP": "ESP", "PRT": "PRT", "KOR": "KOR", "CHL": "CHL",
  "COL": "COL", "PER": "PER", "VEN": "VEN", "ECU": "ECU", "BOL": "BOL", "PRY": "PRY",
  "URY": "URY", "NOR": "NOR", "SWE": "SWE", "FIN": "FIN", "DNK": "DNK", "NLD": "NLD",
  "BEL": "BEL", "CHE": "CHE", "UKR": "UKR", "GRC": "GRC", "SAU": "SAU", "IRN": "IRN",
  "IRQ": "IRQ", "ISR": "ISR", "EGY": "EGY", "ZAF": "ZAF", "NGA": "NGA", "KEN": "KEN",
};

export const NAME_TO_ISO: Record<string, string> = {
  "Brazil": "BRA", "Germany": "DEU", "United States of America": "USA", "United States": "USA", "USA": "USA",
  "Japan": "JPN", "South Africa": "ZAF", "Egypt": "EGY", "Canada": "CAN", "France": "FRA", "United Kingdom": "GBR",
  "Italy": "ITA", "China": "CHN", "India": "IND", "Russia": "RUS", "Australia": "AUS", "Argentina": "ARG",
  "Mexico": "MEX", "Spain": "ESP", "Portugal": "PRT", "South Korea": "KOR", "Chile": "CHL", "Colombia": "COL",
  "Peru": "PER", "Venezuela": "VEN", "Ecuador": "ECU", "Bolivia": "BOL", "Paraguay": "PRY", "Uruguay": "URY",
  "Norway": "NOR", "Sweden": "SWE", "Finland": "FIN", "Denmark": "DNK", "Netherlands": "NLD", "Belgium": "BEL",
  "Switzerland": "CHE", "Austria": "AUT", "Poland": "POL", "Ukraine": "UKR", "Greece": "GRC", "Turkey": "TUR",
  "Saudi Arabia": "SAU", "Iran": "IRN", "Iraq": "IRQ", "Israel": "ISR", "Nigeria": "NGA", "Kenya": "KEN",
  "Morocco": "MAR", "Algeria": "DZA", "New Zealand": "NZL", "Indonesia": "IDN", "Thailand": "THA",
  "Vietnam": "VNM", "Philippines": "PHL", "Pakistan": "PAK", "Kazakhstan": "KAZ", "N. Cyprus": "CYN",
  "Somaliland": "SOM", "Kosovo": "XKX", "W. Sahara": "ESH", "Dem. Rep. Congo": "COD", "Central African Rep.": "CAF",
  "Trinidad and Tobago": "TTO", "Solomon Is.": "SLB", "Falkland Is.": "FLK", "Fr. S. Antarctic Lands": "ATF",
  // Historical Entity Names
  "Reino da Prússia": "PRU", "Prússia": "PRU", "Prussia": "PRU", "Königreich Preußen": "PRU",
  "União Soviética": "SUN", "Soviet Union": "SUN", "USSR": "SUN", "URSS": "SUN",
  "Áustria-Hungria": "AHU", "Austria-Hungary": "AHU", "Império Austro-Húngaro": "AHU",
  "Alemanha Oriental (RDA)": "GDR", "Alemanha Oriental": "GDR", "East Germany": "GDR", "RDA": "GDR", "GDR": "GDR", "Deutsche Demokratische Republik": "GDR",
  "Alemanha Ocidental (RFA)": "FRG", "Alemanha Ocidental": "FRG", "West Germany": "FRG", "RFA": "FRG", "FRG": "FRG", "Bundesrepublik Deutschland": "FRG",
  "Império Otomano": "TUR_HIST", "Ottoman Empire": "TUR_HIST",
  "Império Alemão": "DEU", "German Empire": "DEU", "Deutsches Kaiserreich": "DEU",
  "Alemanha (Terceiro Reich)": "DEU", "Terceiro Reich": "DEU", "Third Reich": "DEU",
  "Império Francês": "FRA", "French Empire": "FRA", "República Francesa": "FRA", "French Republic": "FRA",
  "Império Russo": "RUS", "Russian Empire": "RUS",
  "Reino Unido da Grã-Bretanha e Irlanda": "GBR", "Reino Unido": "GBR",
  "Império do Japão": "JPN", "Empire of Japan": "JPN", "Japão": "JPN",
  "Reino da Itália": "ITA", "Kingdom of Italy": "ITA", "Itália": "ITA",
  "Segunda República Polonesa": "POL", "Second Polish Republic": "POL", "Polônia": "POL",
  "República Eslovaca": "SVK", "Slovak Republic": "SVK", "Eslováquia": "SVK",
  "Iugoslávia": "YUG", "Yugoslavia": "YUG", "República Socialista Federativa da Iugoslávia": "YUG",
  "Tchecoslováquia": "CSK", "Czechoslovakia": "CSK", "República Socialista da Tchecoslováquia": "CSK",
};

export const GLOBAL_COUNTRY_INFO: Record<string, Partial<PilotCountryData>> = {
  CAN: {
    isoCode: "CAN", iso2: "CA", numericCode: "124", nameCommon: "Canadá", nameOfficial: "Canadá",
    capital: "Ottawa", continent: "Americas", region: "América do Norte",
    population: 39500000, areaKm2: 9984670, latitude: 45.4215, longitude: -75.6972,
    timezone: "America/Toronto", flagSvgUrl: "https://flagcdn.com/ca.svg",
    currencyCode: "CAD", currencyName: "Dólar Canadense ($)", governmentType: "Monarquia Constitucional Federal",
    headOfState: "Monarca Britânico", summary: "Segundo maior país do planeta em extensão territorial, com vastas florestas boreais, lagos de água doce e economia avançada.",
  },
  FRA: {
    isoCode: "FRA", iso2: "FR", numericCode: "250", nameCommon: "França", nameOfficial: "República Francesa",
    capital: "Paris", continent: "Europe", region: "Europa Ocidental",
    population: 68000000, areaKm2: 643801, latitude: 48.8566, longitude: 2.3522,
    timezone: "Europe/Paris", flagSvgUrl: "https://flagcdn.com/fr.svg",
    currencyCode: "EUR", currencyName: "Euro (€)", governmentType: "República Semipresidencialista",
    headOfState: "Presidente da República", summary: "Potência europeia de destaque nas artes, filosofia, ciência, alta gastronomia e pioneira na integração da União Europeia.",
  },
  GBR: {
    isoCode: "GBR", iso2: "GB", numericCode: "826", nameCommon: "Reino Unido", nameOfficial: "Reino Unido da Grã-Bretanha e Irlanda do Norte",
    capital: "Londres", continent: "Europe", region: "Europa Ocidental",
    population: 67300000, areaKm2: 242495, latitude: 51.5074, longitude: -0.1278,
    timezone: "Europe/London", flagSvgUrl: "https://flagcdn.com/gb.svg",
    currencyCode: "GBP", currencyName: "Libra Esterlina (£)", governmentType: "Monarquia Constitucional Parlamentar",
    headOfState: "Monarca Britânico", summary: "Berço da Revolução Industrial e do parlamentarismo moderno, centro financeiro global e potência cultural influente.",
  },
  ITA: {
    isoCode: "ITA", iso2: "IT", numericCode: "380", nameCommon: "Itália", nameOfficial: "República Italiana",
    capital: "Roma", continent: "Europe", region: "Europa Meridional",
    population: 58900000, areaKm2: 301340, latitude: 41.9028, longitude: 12.4964,
    timezone: "Europe/Rome", flagSvgUrl: "https://flagcdn.com/it.svg",
    currencyCode: "EUR", currencyName: "Euro (€)", governmentType: "República Parlamentar",
    headOfState: "Presidente da República", summary: "Berço do Império Romano e do Renascimento, líder em design automotivo, moda, manufatura industrial e patrimônio histórico mundial.",
  },
  ESP: {
    isoCode: "ESP", iso2: "ES", numericCode: "724", nameCommon: "Espanha", nameOfficial: "Reino da Espanha",
    capital: "Madri", continent: "Europe", region: "Península Ibérica",
    population: 47800000, areaKm2: 505990, latitude: 40.4168, longitude: -3.7038,
    timezone: "Europe/Madrid", flagSvgUrl: "https://flagcdn.com/es.svg",
    currencyCode: "EUR", currencyName: "Euro (€)", governmentType: "Monarquia Constitucional Parlamentar",
    headOfState: "Rei da Espanha", summary: "Ponto de ligação cultural entre a Europa, América Latina e Norte da África, com rica herança arquitetônica e dinamismo econômico.",
  },
  PRT: {
    isoCode: "PRT", iso2: "PT", numericCode: "620", nameCommon: "Portugal", nameOfficial: "República Portuguesa",
    capital: "Lisboa", continent: "Europe", region: "Península Ibérica",
    population: 10400000, areaKm2: 92212, latitude: 38.7223, longitude: -9.1393,
    timezone: "Europe/Lisbon", flagSvgUrl: "https://flagcdn.com/pt.svg",
    currencyCode: "EUR", currencyName: "Euro (€)", governmentType: "República Semipresidencialista",
    headOfState: "Presidente da República", summary: "Nação atlântica pioneira da Era das Grandes Navegações, fundadora da Comunidade dos Países de Língua Portuguesa (CPLP).",
  },
  CHN: {
    isoCode: "CHN", iso2: "CN", numericCode: "156", nameCommon: "China", nameOfficial: "República Popular da China",
    capital: "Pequim", continent: "Asia", region: "Ásia Oriental",
    population: 1412000000, areaKm2: 9596961, latitude: 39.9042, longitude: 116.4074,
    timezone: "Asia/Shanghai", flagSvgUrl: "https://flagcdn.com/cn.svg",
    currencyCode: "CNY", currencyName: "Yuan Renminbi (¥)", governmentType: "República Socialista de Partido Único",
    headOfState: "Presidente da República", summary: "Uma das mais antigas civilizações do planeta e segunda maior economia mundial, líder global em manufatura, energia solar e trens de alta velocidade.",
  },
  IND: {
    isoCode: "IND", iso2: "IN", numericCode: "356", nameCommon: "Índia", nameOfficial: "República da Índia",
    capital: "Nova Délhi", continent: "Asia", region: "Sul da Ásia",
    population: 1428000000, areaKm2: 3287263, latitude: 28.6139, longitude: 77.2090,
    timezone: "Asia/Kolkata", flagSvgUrl: "https://flagcdn.com/in.svg",
    currencyCode: "INR", currencyName: "Rúpia Indiana (₹)", governmentType: "República Federal Parlamentar",
    headOfState: "Presidente da Índia", summary: "A democracia mais populosa do planeta, centro mundial de tecnologia da informação, exploração espacial (ISRO) e rica multiplicidade linguística e espiritual.",
  },
  RUS: {
    isoCode: "RUS", iso2: "RU", numericCode: "643", nameCommon: "Rússia", nameOfficial: "Federação Russa",
    capital: "Moscou", continent: "Europe/Asia", region: "Eurásia",
    population: 144200000, areaKm2: 17098242, latitude: 55.7558, longitude: 37.6173,
    timezone: "Europe/Moscow", flagSvgUrl: "https://flagcdn.com/ru.svg",
    currencyCode: "RUB", currencyName: "Rublo Russo (₽)", governmentType: "República Federal Semipresidencialista",
    headOfState: "Presidente da Federação Russa", summary: "Maior país do mundo em área territorial contínua, estendendo-se por 11 fusos horários da Europa Oriental ao Oceano Pacífico, rico em recursos energéticos.",
  },
  AUS: {
    isoCode: "AUS", iso2: "AU", numericCode: "036", nameCommon: "Austrália", nameOfficial: "Comunidade da Austrália",
    capital: "Camberra", continent: "Oceania", region: "Australásia",
    population: 26000000, areaKm2: 7692024, latitude: -35.2809, longitude: 149.1300,
    timezone: "Australia/Sydney", flagSvgUrl: "https://flagcdn.com/au.svg",
    currencyCode: "AUD", currencyName: "Dólar Australiano ($)", governmentType: "Monarquia Constitucional Federal Parlamentar",
    headOfState: "Monarca Britânico", summary: "País-continente cercado pelos oceanos Índico e Pacífico, célebre pela Grande Barreira de Corais, fauna endêmica única e elevado padrão de vida.",
  },
  ARG: {
    isoCode: "ARG", iso2: "AR", numericCode: "032", nameCommon: "Argentina", nameOfficial: "República Argentina",
    capital: "Buenos Aires", continent: "Americas", region: "América do Sul",
    population: 46200000, areaKm2: 2780400, latitude: -34.6037, longitude: -58.3816,
    timezone: "America/Argentina/Buenos_Aires", flagSvgUrl: "https://flagcdn.com/ar.svg",
    currencyCode: "ARS", currencyName: "Peso Argentino ($)", governmentType: "República Presidencialista Federal",
    headOfState: "Presidente da Nação Argentina", summary: "Segunda maior economia da América do Sul, com a Cordilheira dos Andes, os Pampas férteis, rica tradição literária, tango e produção agropecuária.",
  },
  MEX: {
    isoCode: "MEX", iso2: "MX", numericCode: "484", nameCommon: "México", nameOfficial: "Estados Unidos Mexicanos",
    capital: "Cidade do México", continent: "Americas", region: "América do Norte",
    population: 128500000, areaKm2: 1964375, latitude: 19.4326, longitude: -99.1332,
    timezone: "America/Mexico_City", flagSvgUrl: "https://flagcdn.com/mx.svg",
    currencyCode: "MXN", currencyName: "Peso Mexicano ($)", governmentType: "República Federal Presidencialista",
    headOfState: "Presidente da República", summary: "Berço das civilizações Maia e Asteca, com forte parque industrial exportador, rica herança culinária e conexão estratégica na América do Norte.",
  },
  CHL: {
    isoCode: "CHL", iso2: "CL", numericCode: "152", nameCommon: "Chile", nameOfficial: "República do Chile",
    capital: "Santiago", continent: "Americas", region: "América do Sul",
    population: 19600000, areaKm2: 756102, latitude: -33.4489, longitude: -70.6693,
    timezone: "America/Santiago", flagSvgUrl: "https://flagcdn.com/cl.svg",
    currencyCode: "CLP", currencyName: "Peso Chileno ($)", governmentType: "República Presidencialista",
    headOfState: "Presidente da República", summary: "Faixa estreita de terra entre os Andes e o Oceano Pacífico, maior produtor mundial de cobre e centro astronômico de ponta no Deserto do Atacama.",
  },
  COL: {
    isoCode: "COL", iso2: "CO", numericCode: "170", nameCommon: "Colômbia", nameOfficial: "República da Colômbia",
    capital: "Bogotá", continent: "Americas", region: "América do Sul",
    population: 52000000, areaKm2: 1141748, latitude: 4.7110, longitude: -74.0721,
    timezone: "America/Bogota", flagSvgUrl: "https://flagcdn.com/co.svg",
    currencyCode: "COP", currencyName: "Peso Colombiano ($)", governmentType: "República Presidencialista",
    headOfState: "Presidente da República", summary: "Nação megadiversa com costas no Atlântico e Pacífico, líder em produção cafeeira de alta qualidade, esmeraldas e patrimônio cultural andino e caribenho.",
  },
  POL: {
    isoCode: "POL", iso2: "PL", numericCode: "616", nameCommon: "Polônia", nameOfficial: "República da Polônia",
    capital: "Varsóvia", continent: "Europe", region: "Europa Central",
    population: 37750000, areaKm2: 312696, latitude: 52.2297, longitude: 21.0122,
    timezone: "Europe/Warsaw", flagSvgUrl: "https://flagcdn.com/pl.svg",
    currencyCode: "PLN", currencyName: "Złoty Polonês (zł)", governmentType: "República Parlamentar",
    headOfState: "Presidente da Polônia", summary: "Nação da Europa Central com rico patrimônio histórico, expressivo dinamismo industrial e posição geoestratégica central na OTAN e União Europeia.",
  },
  VEN: {
    isoCode: "VEN", iso2: "VE", numericCode: "862", nameCommon: "Venezuela", nameOfficial: "República Bolivariana da Venezuela",
    capital: "Caracas", continent: "Americas", region: "América do Sul",
    population: 28800000, areaKm2: 916445, latitude: 10.4806, longitude: -66.9036,
    timezone: "America/Caracas", flagSvgUrl: "https://flagcdn.com/ve.svg",
    currencyCode: "VES", currencyName: "Bolívar Soberano (Bs.)", governmentType: "República Presidencialista",
    headOfState: "Presidente da República", summary: "Nação sul-americana com a maior reserva comprovada de petróleo do planeta, praias caribenhas e as imponentes formações dos Tepuis e Salto Ángel.",
  },
  PER: {
    isoCode: "PER", iso2: "PE", numericCode: "604", nameCommon: "Peru", nameOfficial: "República do Peru",
    capital: "Lima", continent: "Americas", region: "América do Sul",
    population: 34000000, areaKm2: 1285216, latitude: -12.0464, longitude: -77.0428,
    timezone: "America/Lima", flagSvgUrl: "https://flagcdn.com/pe.svg",
    currencyCode: "PEN", currencyName: "Sol Peruano (S/.)", governmentType: "República Presidencialista",
    headOfState: "Presidente da República", summary: "Berço do Império Inca e de civilizações milenares, com extraordinária biodiversidade andina e amazônica e culinária internacionalmente renomada.",
  },
  ECU: {
    isoCode: "ECU", iso2: "EC", numericCode: "218", nameCommon: "Equador", nameOfficial: "República do Equador",
    capital: "Quito", continent: "Americas", region: "América do Sul",
    population: 18000000, areaKm2: 276841, latitude: -0.1807, longitude: -78.4678,
    timezone: "America/Guayaquil", flagSvgUrl: "https://flagcdn.com/ec.svg",
    currencyCode: "USD", currencyName: "Dólar dos Estados Unidos ($)", governmentType: "República Presidencialista",
    headOfState: "Presidente da República", summary: "Cortado pela Linha Equatorial, abriga o Arquipélago de Galápagos, os imponentes vulcões da Cordilheira dos Andes e rica floresta tropical.",
  },
  BOL: {
    isoCode: "BOL", iso2: "BO", numericCode: "068", nameCommon: "Bolívia", nameOfficial: "Estado Plurinacional da Bolívia",
    capital: "Sucre", continent: "Americas", region: "América do Sul",
    population: 12200000, areaKm2: 1098581, latitude: -16.5000, longitude: -68.1500,
    timezone: "America/La_Paz", flagSvgUrl: "https://flagcdn.com/bo.svg",
    currencyCode: "BOB", currencyName: "Boliviano (Bs.)", governmentType: "República Presidencialista Plurinacional",
    headOfState: "Presidente do Estado Plurinacional", summary: "Coração da América do Sul, com o Salar de Uyuni, reservas estratégicas mundiais de lítio e profunda preservação cultural originária.",
  },
  PRY: {
    isoCode: "PRY", iso2: "PY", numericCode: "600", nameCommon: "Paraguai", nameOfficial: "República do Paraguai",
    capital: "Assunção", continent: "Americas", region: "América do Sul",
    population: 7400000, areaKm2: 406752, latitude: -25.2637, longitude: -57.5759,
    timezone: "America/Asuncion", flagSvgUrl: "https://flagcdn.com/py.svg",
    currencyCode: "PYG", currencyName: "Guarani Paraguaio (₲)", governmentType: "República Presidencialista",
    headOfState: "Presidente da República", summary: "Nação no coração da Bacia do Prata, cogestora da Usina Hidrelétrica de Itaipu, com expressiva produção agropecuária e idioma Guarani oficial.",
  },
  URY: {
    isoCode: "URY", iso2: "UY", numericCode: "858", nameCommon: "Uruguai", nameOfficial: "República Oriental do Uruguai",
    capital: "Montevidéu", continent: "Americas", region: "América do Sul",
    population: 3500000, areaKm2: 176215, latitude: -34.9011, longitude: -56.1645,
    timezone: "America/Montevideo", flagSvgUrl: "https://flagcdn.com/uy.svg",
    currencyCode: "UYU", currencyName: "Peso Uruguaio ($)", governmentType: "República Democrática Presidencialista",
    headOfState: "Presidente da República", summary: "Reconhecido pelo elevado índice de desenvolvimento humano, matriz elétrica quase 100% renovável e solidez democrática às margens do Rio da Prata.",
  },
  GUY: {
    isoCode: "GUY", iso2: "GY", numericCode: "328", nameCommon: "Guiana", nameOfficial: "República Cooperativa da Guiana",
    capital: "Georgetown", continent: "Americas", region: "América do Sul",
    population: 800000, areaKm2: 214969, latitude: 6.8013, longitude: -58.1551,
    timezone: "America/Guyana", flagSvgUrl: "https://flagcdn.com/gy.svg",
    currencyCode: "GYD", currencyName: "Dólar Guianense ($)", governmentType: "República Semipresidencialista",
    headOfState: "Presidente da República", summary: "Único país de língua inglesa na América do Sul, com vastas florestas tropicais pristinas e rápida expansão econômica alavancada por recursos energéticos marítimos.",
  },
  SUR: {
    isoCode: "SUR", iso2: "SR", numericCode: "740", nameCommon: "Suriname", nameOfficial: "República do Suriname",
    capital: "Paramaribo", continent: "Americas", region: "América do Sul",
    population: 620000, areaKm2: 163820, latitude: 5.8520, longitude: -55.2038,
    timezone: "America/Paramaribo", flagSvgUrl: "https://flagcdn.com/sr.svg",
    currencyCode: "SRD", currencyName: "Dólar do Suriname ($)", governmentType: "República Presidencialista",
    headOfState: "Presidente da República", summary: "Nação amazônica de expressiva diversidade étnico-cultural, com o neerlandês como língua oficial e mais de 90% do território coberto por floresta tropical densa.",
  },
};

export const ISO3_TO_ISO2: Record<string, string> = {
  AFG: "AF", ALB: "AL", DZA: "DZ", AND: "AD", AGO: "AO", ATG: "AG", ARG: "AR", ARM: "AM", AUS: "AU", AUT: "AT",
  AZE: "AZ", BHS: "BS", BHR: "BH", BGD: "BD", BRB: "BB", BLR: "BY", BEL: "BE", BLZ: "BZ", BEN: "BJ", BTN: "BT",
  BOL: "BO", BIH: "BA", BWA: "BW", BRA: "BR", BRN: "BN", BGR: "BG", BFA: "BF", BDI: "BI", CPV: "CV", KHM: "KH",
  CMR: "CM", CAN: "CA", CAF: "CF", TCD: "TD", CHL: "CL", CHN: "CN", COL: "CO", COM: "KM", COG: "CG", COD: "CD",
  CRI: "CR", CIV: "CI", HRV: "HR", CUB: "CU", CYP: "CY", CZE: "CZ", DNK: "DK", DJI: "DJ", DMA: "DM", DOM: "DO",
  ECU: "EC", EGY: "EG", SLV: "SV", GNQ: "GQ", ERI: "ER", EST: "EE", SWZ: "SZ", ETH: "ET", FJI: "FJ", FIN: "FI",
  FRA: "FR", GAB: "GA", GMB: "GM", GEO: "GE", DEU: "DE", GHA: "GH", GRC: "GR", GRD: "GD", GTM: "GT", GIN: "GN",
  GNB: "GW", GUY: "GY", HTI: "HT", HND: "HN", HUN: "HU", ISL: "IS", IND: "IN", IDN: "ID", IRN: "IR", IRQ: "IQ",
  IRL: "IE", ISR: "IL", ITA: "IT", JAM: "JM", JPN: "JP", JOR: "JO", KAZ: "KZ", KEN: "KE", KIR: "KI", PRK: "KP",
  KOR: "KR", KWT: "KW", KGZ: "KG", LAO: "LA", LVA: "LV", LBN: "LB", LSO: "LS", LBR: "LR", LBY: "LY", LIE: "LI",
  LTU: "LT", LUX: "LU", MDG: "MG", MWI: "MW", MYS: "MY", MDV: "MV", MLI: "ML", MLT: "MT", MHL: "MH", MRT: "MR",
  MUS: "MU", MEX: "MX", FSM: "FM", MDA: "MD", MCO: "MC", MNG: "MN", MNE: "ME", MAR: "MA", MOZ: "MZ", MMR: "MM",
  NAM: "NA", NRU: "NR", NPL: "NP", NLD: "NL", NZL: "NZ", NIC: "NI", NER: "NE", NGA: "NG", MKD: "MK", NOR: "NO",
  OMN: "OM", PAK: "PK", PLW: "PW", PAN: "PA", PNG: "PG", PRY: "PY", PER: "PE", PHL: "PH", POL: "PL", PRT: "PT",
  QAT: "QA", ROU: "RO", RUS: "RU", RWA: "RW", KNA: "KN", LCA: "LC", VCT: "VC", WSM: "WS", SMR: "SM", STP: "ST",
  SAU: "SA", SEN: "SN", SRB: "RS", SYC: "SC", SLE: "SL", SGP: "SG", SVK: "SK", SVN: "SI", SLB: "SB", SOM: "SO",
  ZAF: "ZA", SSD: "SS", ESP: "ES", LKA: "LK", SDN: "SD", SUR: "SR", SWE: "SE", CHE: "CH", SYR: "SY", TWN: "TW",
  TJK: "TJ", TZA: "TZ", THA: "TH", TLS: "TL", TGO: "TG", TON: "TO", TTO: "TT", TUN: "TN", TUR: "TR", TKM: "TM",
  TUV: "TV", UGA: "UG", UKR: "UA", ARE: "AE", GBR: "GB", USA: "US", URY: "UY", UZB: "UZ", VUT: "VU", VEN: "VE",
  VNM: "VN", YEM: "YE", ZMB: "ZM", ZWE: "ZW",
  // Historical Entities & Territories
  PRU: "PR", SUN: "SU", AHU: "AH", GDR: "DD", FRG: "DE", TUR_HIST: "TR",
  YUG: "YU", CSK: "CS", CYN: "CY", XKX: "XK",
};

export const ISO3_TO_TIMEZONE: Record<string, string> = {
  // South America
  BRA: "America/Sao_Paulo",
  ARG: "America/Argentina/Buenos_Aires",
  CHL: "America/Santiago",
  COL: "America/Bogota",
  PER: "America/Lima",
  VEN: "America/Caracas",
  ECU: "America/Guayaquil",
  BOL: "America/La_Paz",
  PRY: "America/Asuncion",
  URY: "America/Montevideo",
  GUY: "America/Guyana",
  SUR: "America/Paramaribo",
  GUF: "America/Cayenne",
  FLK: "Atlantic/Stanley",
  // North & Central America & Caribbean
  USA: "America/New_York",
  CAN: "America/Toronto",
  MEX: "America/Mexico_City",
  PAN: "America/Panama",
  CRI: "America/Costa_Rica",
  NIC: "America/Managua",
  HND: "America/Tegucigalpa",
  SLV: "America/El_Salvador",
  GTM: "America/Guatemala",
  BLZ: "America/Belize",
  CUB: "America/Havana",
  DOM: "America/Santo_Domingo",
  HTI: "America/Port-au-Prince",
  JAM: "America/Jamaica",
  TTO: "America/Port_of_Spain",
  BHS: "America/Nassau",
  BRB: "America/Barbados",
  // Europe
  GBR: "Europe/London",
  FRA: "Europe/Paris",
  DEU: "Europe/Berlin",
  ITA: "Europe/Rome",
  ESP: "Europe/Madrid",
  PRT: "Europe/Lisbon",
  POL: "Europe/Warsaw",
  NLD: "Europe/Amsterdam",
  BEL: "Europe/Brussels",
  CHE: "Europe/Zurich",
  AUT: "Europe/Vienna",
  SWE: "Europe/Stockholm",
  NOR: "Europe/Oslo",
  FIN: "Europe/Helsinki",
  DNK: "Europe/Copenhagen",
  IRL: "Europe/Dublin",
  GRC: "Europe/Athens",
  TUR: "Europe/Istanbul",
  UKR: "Europe/Kyiv",
  RUS: "Europe/Moscow",
  CZE: "Europe/Prague",
  ROU: "Europe/Bucharest",
  HUN: "Europe/Budapest",
  BGR: "Europe/Sofia",
  HRV: "Europe/Zagreb",
  SRB: "Europe/Belgrade",
  SVK: "Europe/Bratislava",
  SVN: "Europe/Ljubljana",
  ISL: "Atlantic/Reykjavik",
  // Asia
  CHN: "Asia/Shanghai",
  JPN: "Asia/Tokyo",
  IND: "Asia/Kolkata",
  KOR: "Asia/Seoul",
  PRK: "Asia/Pyongyang",
  IDN: "Asia/Jakarta",
  SAU: "Asia/Riyadh",
  ARE: "Asia/Dubai",
  IRN: "Asia/Tehran",
  IRQ: "Asia/Baghdad",
  ISR: "Asia/Jerusalem",
  THA: "Asia/Bangkok",
  VNM: "Asia/Ho_Chi_Minh",
  PHL: "Asia/Manila",
  MYS: "Asia/Kuala_Lumpur",
  SGP: "Asia/Singapore",
  PAK: "Asia/Karachi",
  BGD: "Asia/Dhaka",
  TWN: "Asia/Taipei",
  KAZ: "Asia/Almaty",
  UZB: "Asia/Tashkent",
  QAT: "Asia/Qatar",
  KWT: "Asia/Kuwait",
  // Oceania
  AUS: "Australia/Sydney",
  NZL: "Pacific/Auckland",
  PNG: "Pacific/Port_Moresby",
  FJI: "Pacific/Fiji",
  // Africa
  ZAF: "Africa/Johannesburg",
  EGY: "Africa/Cairo",
  NGA: "Africa/Lagos",
  KEN: "Africa/Nairobi",
  MAR: "Africa/Casablanca",
  DZA: "Africa/Algiers",
  ETH: "Africa/Addis_Ababa",
  GHA: "Africa/Accra",
  SEN: "Africa/Dakar",
  AGO: "Africa/Luanda",
  MOZ: "Africa/Maputo",
  COD: "Africa/Kinshasa",
  TZA: "Africa/Dar_es_Salaam",
  TUN: "Africa/Tunis",
  UGA: "Africa/Kampala",
  // Historical Entities & Territories
  PRU: "Europe/Berlin",
  SUN: "Europe/Moscow",
  AHU: "Europe/Vienna",
  GDR: "Europe/Berlin",
  FRG: "Europe/Berlin",
  TUR_HIST: "Europe/Istanbul",
  YUG: "Europe/Belgrade",
  CSK: "Europe/Prague",
  CYN: "Asia/Nicosia",
  SOM: "Africa/Mogadishu",
  XKX: "Europe/Belgrade",
};

export function getIso2FromIso3(iso3: string): string | undefined {
  const upper = (iso3 || "").toUpperCase();
  if (PILOT_COUNTRIES[upper]?.iso2) return PILOT_COUNTRIES[upper].iso2;
  if (GLOBAL_COUNTRY_INFO[upper]?.iso2) return GLOBAL_COUNTRY_INFO[upper].iso2;
  return ISO3_TO_ISO2[upper];
}

export function getCountryData(iso: string, year?: number | null): PilotCountryData {
  const upper = (iso || "").trim().toUpperCase();
  const normalized = NUMERIC_TO_ISO[upper] || upper;
  const resolvedIso =
    year !== undefined && year !== null
      ? resolveHistoricalEntity(normalized, year)
      : normalized;

  if (HISTORICAL_ENTITIES[resolvedIso]) {
    const h = HISTORICAL_ENTITIES[resolvedIso];
    const histIso2 = ISO3_TO_ISO2[resolvedIso] || "XX";

    const popIndicator = h.indicators.find((i) => i.category === "DEMOGRAPHY")?.value;
    const pop = popIndicator !== undefined ? popIndicator : 30000000;

    return {
      isoCode: h.id,
      iso2: histIso2,
      numericCode: h.numericCode || "900",
      nameCommon: h.nameCommon,
      nameOfficial: h.nameOfficial,
      capital: h.capital,
      continent: h.continent || "Europe",
      region: "História Geopolítica",
      population: pop,
      areaKm2: h.areaKm2 !== undefined ? h.areaKm2 : 350000,
      latitude: h.latitude,
      longitude: h.longitude,
      timezone: ISO3_TO_TIMEZONE[resolvedIso] || "Europe/Berlin",
      flagSvgUrl: h.flagSvgUrl,
      currencyCode: "HIST",
      currencyName: "Moeda Histórica",
      governmentType: h.governmentType,
      headOfState: h.leaderTitle,
      headOfGov: h.historicalLeader,
      summary: h.summary,
      indicators: h.indicators,
      dossierSections: h.dossierSections,
      milestones: GLOBAL_MILESTONES.filter(
        (m) => m.countryIso === h.id || m.blocIsos?.includes(h.id)
      ),
      wikidataQid: h.wikidataQid,
      historicalLeader: h.historicalLeader,
      leaderTitle: h.leaderTitle,
      startYear: h.startYear,
      endYear: h.endYear,
      era: h.era,
      successorIsos: h.successorIsos,
      predecessorIsos: h.predecessorIsos,
      isHistoricalEntity: true,
    };
  }

  if (PILOT_COUNTRIES[resolvedIso]) {
    const pilot = PILOT_COUNTRIES[resolvedIso];
    return {
      ...pilot,
      milestones: pilot.milestones.map((m) => ({
        ...m,
        countryIso: m.countryIso || pilot.isoCode,
      })),
    };
  }
  const mappedIso2 = getIso2FromIso3(upper);
  const global = GLOBAL_COUNTRY_INFO[upper];
  if (global) {
    const iso2 = global.iso2 || mappedIso2 || "";
    return {
      isoCode: upper,
      iso2,
      numericCode: global.numericCode || "000",
      nameCommon: global.nameCommon || upper,
      nameOfficial: global.nameOfficial || `Estado de ${upper}`,
      capital: global.capital || "Capital Nacional",
      continent: global.continent || "Mundo",
      region: global.region || "Geopolítica Global",
      population: global.population || 15000000,
      areaKm2: global.areaKm2 || 350000,
      latitude: global.latitude || 0,
      longitude: global.longitude || 0,
      timezone: global.timezone || ISO3_TO_TIMEZONE[upper] || "UTC",
      flagSvgUrl: global.flagSvgUrl || (iso2 ? `https://flagcdn.com/${iso2.toLowerCase()}.svg` : ""),
      currencyCode: global.currencyCode || "USD",
      currencyName: global.currencyName || "Moeda Local",
      governmentType: global.governmentType || "Estado Soberano",
      headOfState: global.headOfState || "Chefe de Estado",
      summary: global.summary || "Nação soberana integrante do sistema internacional.",
      indicators: [],
      dossierSections: [],
      milestones: [],
    };
  }

  // Generic fallback for any unindexed ISO
  const iso2 = mappedIso2 || "";
  return {
    isoCode: upper,
    iso2,
    numericCode: "000",
    nameCommon: upper,
    nameOfficial: `Nação Soberana (${upper})`,
    capital: "Capital Central",
    continent: "Terra",
    region: "Geopolítica Global",
    population: 10000000,
    areaKm2: 250000,
    latitude: 0,
    longitude: 0,
    timezone: ISO3_TO_TIMEZONE[upper] || "UTC",
    flagSvgUrl: iso2 ? `https://flagcdn.com/${iso2.toLowerCase()}.svg` : "",
    currencyCode: "USD",
    currencyName: "Moeda Oficial",
    governmentType: "Estado Soberano",
    headOfState: "Chefe de Estado",
    summary: "Dados em processo de sincronização com as bases mundiais.",
    indicators: [],
    dossierSections: [],
    milestones: [],
  };
}

export { getSourceUrl } from "./citations";

export {
  HISTORICAL_ENTITIES,
  resolveHistoricalEra,
  resolveHistoricalEntity,
  HISTORICAL_ERAS,
  findHistoricalEntity,
} from "./historical-entities";
export type {
  HistoricalEraId,
  HistoricalEraDefinition,
  HistoricalEntity,
} from "./historical-entities";
