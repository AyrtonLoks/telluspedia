import type { DossierCitations } from "./citation-types";
import {
  HISTORICAL_ENTITIES,
  resolveHistoricalEntity,
  HistoricalEraId,
} from "./historical-entities";
import { WORLD_COUNTRIES_CATALOG, WORLD_COUNTRIES_METADATA, type WorldCountryCatalogEntry } from "./country-catalog";
import worldBankDataset from "../../public/data/countries-worldbank-indicators.json";
import { GLOBAL_MILESTONES, getCountryMilestones } from "./milestones";
import type { MilestoneItem } from "./milestones";

export type DataCompleteness = "full" | "partial" | "none";

export type CountryIndicatorCategory =
  | "ECONOMY"
  | "DEMOGRAPHY"
  | "GEOGRAPHY"
  | "HEALTH"
  | "MILITARY";

export interface CountryIndicator {
  indicatorCode: string;
  indicatorName: string;
  category: CountryIndicatorCategory;
  year: number;
  value: number;
  unit: string;
  sourcePrimary: string;
  sourceUrl?: string;
  referenceDate?: string;
}

export interface WorldBankIndicatorSpec {
  code: string;
  name: string;
  category: CountryIndicatorCategory;
  unit: string;
  sourcePrimary: string;
  sourceUrl: string;
  lastUpdated: string;
}

export interface WorldBankCountryEntry {
  nameOfficial: string | null;
  capital: string | null;
  continent: string | null;
  region: string | null;
  currencyCode: string | null;
  currencyName: string | null;
  indicators: Record<string, { value: number; year: number }>;
}


export { WORLD_COUNTRIES_CATALOG, WORLD_COUNTRIES_METADATA } from "./country-catalog";
export type { WorldCountryCatalogEntry } from "./country-catalog";

export const WORLD_BANK_METADATA = worldBankDataset.metadata;
export const WORLD_BANK_INDICATOR_SPECS: WorldBankIndicatorSpec[] =
  worldBankDataset.metadata.indicators as WorldBankIndicatorSpec[];
export const WORLD_BANK_COUNTRIES: Record<string, WorldBankCountryEntry> =
  worldBankDataset.countries as Record<string, WorldBankCountryEntry>;

function buildWorldBankIndicatorUrl(indicatorCode: string, iso2?: string): string {
  const base = `https://data.worldbank.org/indicator/${encodeURIComponent(indicatorCode)}`;
  return iso2 ? `${base}?locations=${encodeURIComponent(iso2)}` : base;
}

function hydrateWorldBankIndicators(isoCode: string, iso2?: string): CountryIndicator[] {
  const entry = WORLD_BANK_COUNTRIES[isoCode];
  if (!entry?.indicators) return [];

  const result: CountryIndicator[] = [];
  for (const spec of WORLD_BANK_INDICATOR_SPECS) {
    const reading = entry.indicators[spec.code];
    if (!reading || typeof reading.value !== "number" || !Number.isFinite(reading.value)) {
      continue;
    }
    result.push({
      indicatorCode: spec.code,
      indicatorName: spec.name,
      category: spec.category,
      year: reading.year,
      value: reading.value,
      unit: spec.unit,
      sourcePrimary: spec.sourcePrimary,
      sourceUrl: buildWorldBankIndicatorUrl(spec.code, iso2),
      referenceDate: spec.lastUpdated,
    });
  }
  return result;
}

export interface CountryData {
  isoCode: string;
  iso2: string;
  numericCode: string | null;
  nameCommon: string;
  nameOfficial: string | null;
  capital: string | null;
  continent: string | null;
  region: string | null;
  population: number | null;
  areaKm2: number | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  flagSvgUrl: string;
  currencyCode: string | null;
  currencyName: string | null;
  governmentType: string | null;
  headOfState: string | null;
  headOfGov?: string | null;
  summary: string | null;
  completeness: DataCompleteness;
  dataSource?: string;
  referenceDate?: string;
  sourceUrl?: string;
  wikidataQid?: string;
  historicalLeader?: string;
  leaderTitle?: string;
  startYear?: number;
  endYear?: number;
  era?: HistoricalEraId;
  successorIsos?: string[];
  predecessorIsos?: string[];
  isHistoricalEntity?: boolean;
  indicators: CountryIndicator[];
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
    citationsJson: DossierCitations;
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

export interface PilotCountryData extends Omit<CountryData, "completeness"> {
  completeness?: DataCompleteness;
  numericCode: string;
  nameOfficial: string;
  capital: string;
  continent: string;
  region: string;
  population: number;
  areaKm2: number;
  latitude: number;
  longitude: number;
  timezone: string;
  currencyCode: string;
  currencyName: string;
  governmentType: string;
  headOfState: string;
  summary: string;
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

export type { MilestoneItem } from "./milestones";
export { GLOBAL_MILESTONES, findMilestoneById, PILOT_COUNTRY_ISOS, getCountryMilestones } from "./milestones";

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
  MOZ: {
    nameCommon: "Moçambique",
    nameOfficial: "República de Moçambique",
    capital: "Maputo",
    numericCode: "508",
    iso2: "MZ",
    continent: "Africa",
    region: "África Austral",
    // Centroide de countries-110m do World Atlas.
    latitude: -17.15,
    longitude: 35.54,
    currencyCode: "MZN",
    currencyName: "Metical",
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
  // Territories & Non-Sovereign ISO 3166-1 Codes
  ATA: "AQ", ATF: "TF", ESH: "EH", FLK: "FK", GRL: "GL", GUF: "GF", NCL: "NC", PRI: "PR", PSE: "PS",
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
  if (WORLD_COUNTRIES_CATALOG[upper]?.iso2) return WORLD_COUNTRIES_CATALOG[upper].iso2;
  return ISO3_TO_ISO2[upper];
}

export function getCountryData(iso: string, year?: number | null): CountryData | null {
  const upper = (iso || "").trim().toUpperCase();
  if (!upper) return null;

  const normalized = NUMERIC_TO_ISO[upper] || upper;
  const resolvedIso =
    year !== undefined && year !== null
      ? resolveHistoricalEntity(normalized, year)
      : normalized;

  if (HISTORICAL_ENTITIES[resolvedIso]) {
    const h = HISTORICAL_ENTITIES[resolvedIso];
    const histIso2 = ISO3_TO_ISO2[resolvedIso] || "";
    const popIndicator = h.indicators.find((i) => i.category === "DEMOGRAPHY")?.value;

    return {
      isoCode: h.id,
      iso2: histIso2,
      numericCode: h.numericCode ?? null,
      nameCommon: h.nameCommon,
      nameOfficial: h.nameOfficial,
      capital: h.capital ?? null,
      continent: h.continent ?? null,
      region: "História Geopolítica",
      population: popIndicator !== undefined ? popIndicator : null,
      areaKm2: h.areaKm2 !== undefined ? h.areaKm2 : null,
      latitude: h.latitude ?? null,
      longitude: h.longitude ?? null,
      timezone: ISO3_TO_TIMEZONE[resolvedIso] ?? null,
      flagSvgUrl: h.flagSvgUrl,
      currencyCode: null,
      currencyName: null,
      governmentType: h.governmentType ?? null,
      headOfState: h.leaderTitle ?? null,
      headOfGov: h.historicalLeader ?? null,
      summary: h.summary ?? null,
      completeness: "full",
      dataSource: "Maddison Project Database / Correlates of War / Natural Earth",
      referenceDate: "2026-11-20",
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
    const wbIndicators = hydrateWorldBankIndicators(pilot.isoCode, pilot.iso2);
    const existingCodes = new Set(pilot.indicators.map((i) => i.indicatorCode));
    const mergedIndicators: CountryIndicator[] = [
      ...pilot.indicators,
      ...wbIndicators.filter((i) => !existingCodes.has(i.indicatorCode)),
    ];

    return {
      ...pilot,
      indicators: mergedIndicators,
      completeness: "full",
      dataSource: "Banco Mundial (WDI) / ONU / IBGE / Natural Earth",
      referenceDate: WORLD_BANK_METADATA.worldBankLastUpdated,
      sourceUrl: `https://data.worldbank.org/country/${pilot.isoCode}`,
      milestones: pilot.milestones.map((m) => ({
        ...m,
        countryIso: m.countryIso || pilot.isoCode,
      })),
    };
  }

  const catalog = WORLD_COUNTRIES_CATALOG[normalized];
  const global = GLOBAL_COUNTRY_INFO[normalized];
  const wb = WORLD_BANK_COUNTRIES[normalized];

  if (global || catalog || wb) {
    const iso2 = global?.iso2 || catalog?.iso2 || getIso2FromIso3(normalized) || "";
    const wbIndicators = hydrateWorldBankIndicators(normalized, iso2);
    const wbPop = wb?.indicators?.["SP.POP.TOTL"]?.value ?? null;
    const wbArea = wb?.indicators?.["AG.SRF.TOTL.K2"]?.value ?? null;

    const population = wbPop !== null ? wbPop : (global?.population ?? null);
    const areaKm2 = wbArea !== null ? wbArea : (global?.areaKm2 ?? null);
    const nameOfficial = global?.nameOfficial ?? wb?.nameOfficial ?? null;
    const capital = global?.capital ?? wb?.capital ?? null;
    const continent = global?.continent ?? wb?.continent ?? null;
    const region = global?.region ?? wb?.region ?? null;
    const currencyCode = global?.currencyCode ?? wb?.currencyCode ?? null;
    const currencyName = global?.currencyName ?? wb?.currencyName ?? null;
    const governmentType = global?.governmentType ?? null;
    const headOfState = global?.headOfState ?? null;
    const summary = global?.summary ?? null;

    const hasWorldBankData = wbIndicators.length > 0;
    const hasPartialFacts =
      hasWorldBankData ||
      Boolean(global) ||
      capital !== null ||
      currencyCode !== null ||
      population !== null ||
      areaKm2 !== null;

    return {
      isoCode: normalized,
      iso2,
      numericCode: global?.numericCode ?? catalog?.numericCode ?? null,
      nameCommon: global?.nameCommon || catalog?.nameCommon || normalized,
      nameOfficial,
      capital,
      continent,
      region,
      population,
      areaKm2,
      latitude: global?.latitude ?? catalog?.latitude ?? null,
      longitude: global?.longitude ?? catalog?.longitude ?? null,
      timezone: global?.timezone ?? ISO3_TO_TIMEZONE[normalized] ?? null,
      flagSvgUrl:
        global?.flagSvgUrl ||
        catalog?.flagSvgUrl ||
        (iso2 ? `https://flagcdn.com/${iso2.toLowerCase()}.svg` : ""),
      currencyCode,
      currencyName,
      governmentType,
      headOfState,
      summary,
      completeness: hasPartialFacts ? "partial" : "none",
      dataSource: hasWorldBankData
        ? "Banco Mundial (WDI) / REST Countries / Natural Earth"
        : WORLD_COUNTRIES_METADATA.source,
      referenceDate: hasWorldBankData
        ? WORLD_BANK_METADATA.worldBankLastUpdated
        : WORLD_COUNTRIES_METADATA.referenceDate,
      sourceUrl: hasWorldBankData
        ? `https://data.worldbank.org/country/${normalized}`
        : WORLD_COUNTRIES_METADATA.sourceUrl,
      wikidataQid: global?.wikidataQid,
      indicators: wbIndicators,
      dossierSections: [],
      milestones: [],
    };
  }

  return null;
}

export function getAllCountries(): CountryData[] {
  const allIsos = Array.from(
    new Set([
      ...Object.keys(WORLD_COUNTRIES_CATALOG),
      ...Object.keys(PILOT_COUNTRIES),
    ])
  ).sort();

  const countries: CountryData[] = [];
  for (const iso of allIsos) {
    const data = getCountryData(iso);
    if (data) countries.push(data);
  }
  return countries;
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
