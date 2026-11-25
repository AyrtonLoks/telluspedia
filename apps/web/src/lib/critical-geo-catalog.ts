/**
 * Catálogo conceitual, bibliográfico e analítico das Lentes de Geografia Crítica — Milton Santos (D36).
 * Carregado sob demanda (0 bytes no First Load JS de `/`).
 *
 * Princípio T03: ZERO dados sintéticos ou estimados. A lente MTCI combina exclusivamente
 * indicadores reais auditados do Banco Mundial (WDI, CC BY 4.0) e declara países sem leitura
 * completa como "Sem dado suficiente".
 */

import { getCountryData, WORLD_COUNTRIES_CATALOG } from "@/lib/country-data";
import type {
  CriticalGeoLensId,
  FourBrazilsRegionId,
  IbgeRegionId,
} from "@/lib/critical-geo-ids";
import { CHOROPLETH_MISSING_COLOR, samplePaletteColor } from "@/lib/choropleth";

export interface CriticalGeoLensMeta {
  id: CriticalGeoLensId;
  titlePt: string;
  titleEn: string;
  shortPt: string;
  shortEn: string;
  subtitlePt: string;
  subtitleEn: string;
  conceptSummaryPt: string;
  conceptSummaryEn: string;
  methodologyNotePt: string;
  methodologyNoteEn: string;
  primaryReference: string;
  referenceUrl: string;
}

export const CRITICAL_GEO_LENSES: Readonly<Record<CriticalGeoLensId, CriticalGeoLensMeta>> = {
  MTCI: {
    id: "MTCI",
    titlePt: "Meio Técnico-Científico-Informacional",
    titleEn: "Technical-Scientific-Informational Milieu",
    shortPt: "Meio TCI",
    shortEn: "TSI Milieu",
    subtitlePt: "Espaços luminosos e espaços opacos na difusão desigual da técnica e informação.",
    subtitleEn: "Luminous and opaque spaces in the uneven diffusion of technology and information.",
    conceptSummaryPt:
      "Segundo Milton Santos (1996), o meio técnico-científico-informacional é a face geográfica da globalização: ciência, tecnologia e informação incorporam-se ao território de modo altamente seletivo, concentrando infraestrutura em 'espaços luminosos' enquanto vastas áreas permanecem como 'espaços opacos'.",
    conceptSummaryEn:
      "In Milton Santos's theory (1996), the technical-scientific-informational milieu is the geographic expression of globalization: science, technology, and information are embedded selectively in territory, producing 'luminous spaces' alongside 'opaque spaces'.",
    methodologyNotePt:
      "Leitura empírica transparente (sem valores sintéticos): média dos percentis normalizados de dois indicadores reais do Banco Mundial (WDI, CC BY 4.0) — PIB per capita em escala log10 (NY.GDP.PCAP.CD) e expectativa de vida ao nascer (SP.DYN.LE00.IN). Países sem ambos os registros oficiais aparecem como 'Sem dado suficiente'.",
    methodologyNoteEn:
      "Transparent empirical reading (zero synthetic values): mean of normalized percentiles from two real World Bank indicators (WDI, CC BY 4.0) — log10 GDP per capita (NY.GDP.PCAP.CD) and life expectancy at birth (SP.DYN.LE00.IN). Countries missing either official reading appear as 'Insufficient data'.",
    primaryReference: "SANTOS, Milton. A Natureza do Espaço: Técnica e Tempo, Razão e Emoção. São Paulo: Hucitec / Edusp, 1996.",
    referenceUrl: "https://data.worldbank.org/",
  },
  VERTICALITIES: {
    id: "VERTICALITIES",
    titlePt: "Horizontalidades vs. Verticalidades",
    titleEn: "Horizontalities vs. Verticalities",
    shortPt: "Verticalidades",
    shortEn: "Verticalities",
    subtitlePt: "Vetores globais de alta velocidade em tensão com a contiguidade do território usado.",
    subtitleEn: "High-speed global vectors in tension with the contiguity of used territory.",
    conceptSummaryPt:
      "Verticalidades articulam pontos distantes do planeta por meio de redes financeiras, aéreas, marítimas e informacionais que impõem ordens externas aos lugares. Horizontalidades expressam o domínio da contiguidade territorial, da vida cotidiana e da solidariedade orgânica local (circuito superior vs. circuito inferior da economia urbana).",
    conceptSummaryEn:
      "Verticalities link distant nodes across the planet through financial, aviation, maritime, and informational networks imposing external rhythms on places. Horizontalities represent territorial contiguity, everyday life, and local solidarity (upper vs. lower circuits of the urban economy).",
    methodologyNotePt:
      "Os arcos geodésicos ilustram eixos reais entre centros financeiros e portuários globais (coordenadas geográficas reais) e podem ser cruzados ao vivo com camadas reais do Observatório (aviação OpenSky, rotas marítimas AIS e satélites orbitais).",
    methodologyNoteEn:
      "Geodesic arcs highlight major axes connecting real global financial and logistics hubs (exact coordinates) and can be cross-referenced live with real Observatory layers (OpenSky aviation, AIS maritime traffic, and orbital satellites).",
    primaryReference:
      "SANTOS, Milton. O Espaço Dividido (1979); A Natureza do Espaço (1996); Por uma outra globalização (2000).",
    referenceUrl: "https://www.edusp.com.br/",
  },
  FOUR_BRAZILS: {
    id: "FOUR_BRAZILS",
    titlePt: "Os Quatro Brasis (Santos & Silveira, 2001)",
    titleEn: "The Four Brazils (Santos & Silveira, 2001)",
    shortPt: "4 Brasis",
    shortEn: "4 Brazils",
    subtitlePt: "Regionalização crítica do território brasileiro pela difusão técnica e informacional.",
    subtitleEn: "Critical regionalization of Brazilian territory by technical-informational density.",
    conceptSummaryPt:
      "Em O Brasil: Território e Sociedade no Início do Século XXI (2001), Milton Santos e María Laura Silveira propuseram substituir as 5 macrorregiões clássicas do IBGE por 4 grandes regiões baseadas na densidade do meio técnico-científico-informacional: Região Concentrada (Sudeste + Sul), Centro-Oeste (incluindo Tocantins), Nordeste e Amazônia.",
    conceptSummaryEn:
      "In O Brasil: Território e Sociedade no Início do Século XXI (2001), Milton Santos and María Laura Silveira proposed replacing IBGE's five classic macro-regions with four regions defined by technical-scientific-informational density: Concentrated Region (Southeast + South), Center-West (including Tocantins), Northeast, and Amazonia.",
    methodologyNotePt:
      "Contorno territorial derivado do limite oficial Natural Earth 1:50m do Brasil particionado segundo o agrupamento estadual de Santos & Silveira (2001), comparável diretamente à divisão das 5 macrorregiões do IBGE.",
    methodologyNoteEn:
      "Territorial outline derived from Natural Earth 1:50m Brazil boundaries partitioned according to Santos & Silveira's (2001) state groupings, directly comparable with IBGE's five official macro-regions.",
    primaryReference:
      "SANTOS, Milton; SILVEIRA, María Laura. O Brasil: Território e Sociedade no Início do Século XXI. Rio de Janeiro: Record, 2001.",
    referenceUrl: "https://www.ibge.gov.br/",
  },
};

export const CRITICAL_GEO_LENS_LIST: readonly CriticalGeoLensMeta[] = [
  CRITICAL_GEO_LENSES.MTCI,
  CRITICAL_GEO_LENSES.VERTICALITIES,
  CRITICAL_GEO_LENSES.FOUR_BRAZILS,
];

/** Rampa perceptualmente uniforme (Espaços Opacos âmbar escuro → Espaços Luminosos ciano claro). */
export const MTCI_PALETTE = ["#3b241c", "#7c4727", "#b58134", "#3d9a9b", "#7be3f6"] as const;

export interface MtciCountryEntry {
  isoCode: string;
  nameCommon: string;
  available: boolean;
  score: number | null; // 0..100 composto transparente
  normalized: number | null; // 0..1
  color: string;
  gdpPerCapita: number | null;
  gdpPerCapitaYear: number | null;
  lifeExpectancy: number | null;
  lifeExpectancyYear: number | null;
  rank: number | null;
  rankTotal: number;
}

export interface MtciDataset {
  entries: Record<string, MtciCountryEntry>;
  availableCount: number;
  totalCountries: number;
}

let cachedMtciDataset: MtciDataset | null = null;

/**
 * Constrói a leitura empírica do Meio Técnico-Científico-Informacional estritamente com
 * indicadores reais do Banco Mundial (NY.GDP.PCAP.CD e SP.DYN.LE00.IN). Zero valores inventados.
 */
export function buildMtciDataset(): MtciDataset {
  if (cachedMtciDataset) return cachedMtciDataset;

  const countries = Object.values(WORLD_COUNTRIES_CATALOG);
  const raw: Array<{
    isoCode: string;
    nameCommon: string;
    gdpPc: number | null;
    gdpYear: number | null;
    lifeExp: number | null;
    lifeYear: number | null;
  }> = [];

  for (const c of countries) {
    const full = getCountryData(c.isoCode);
    const indicators = full?.indicators ?? [];
    const gdpInd = indicators.find((i) => i.indicatorCode === "NY.GDP.PCAP.CD");
    const lifeInd = indicators.find((i) => i.indicatorCode === "SP.DYN.LE00.IN");
    const gdpPc =
      gdpInd && Number.isFinite(gdpInd.value) && gdpInd.value > 0 ? gdpInd.value : null;
    const lifeExp =
      lifeInd && Number.isFinite(lifeInd.value) && lifeInd.value > 0 ? lifeInd.value : null;
    raw.push({
      isoCode: c.isoCode,
      nameCommon: c.nameCommon,
      gdpPc,
      gdpYear: gdpInd?.year ?? null,
      lifeExp,
      lifeYear: lifeInd?.year ?? null,
    });
  }

  const complete = raw.filter(
    (r): r is typeof r & { gdpPc: number; lifeExp: number } =>
      r.gdpPc !== null && r.lifeExp !== null
  );

  const logGdps = complete.map((r) => Math.log10(r.gdpPc));
  const lifeVals = complete.map((r) => r.lifeExp);
  const minLogGdp = Math.min(...logGdps);
  const maxLogGdp = Math.max(...logGdps);
  const minLife = Math.min(...lifeVals);
  const maxLife = Math.max(...lifeVals);

  const scored = complete.map((r) => {
    const gNorm =
      maxLogGdp > minLogGdp ? (Math.log10(r.gdpPc) - minLogGdp) / (maxLogGdp - minLogGdp) : 0.5;
    const lNorm = maxLife > minLife ? (r.lifeExp - minLife) / (maxLife - minLife) : 0.5;
    const combined = Math.max(0, Math.min(1, 0.65 * gNorm + 0.35 * lNorm));
    return { ...r, normalized: combined, score: Math.round(combined * 100) };
  });

  const sortedByScore = [...scored].sort((a, b) => b.normalized - a.normalized);
  const rankMap = new Map<string, number>();
  sortedByScore.forEach((item, idx) => rankMap.set(item.isoCode, idx + 1));

  const scoredByIso = new Map(scored.map((s) => [s.isoCode, s]));
  const entries: Record<string, MtciCountryEntry> = {};

  for (const r of raw) {
    const found = scoredByIso.get(r.isoCode);
    if (found) {
      entries[r.isoCode] = {
        isoCode: r.isoCode,
        nameCommon: r.nameCommon,
        available: true,
        score: found.score,
        normalized: found.normalized,
        color: samplePaletteColor(MTCI_PALETTE, found.normalized),
        gdpPerCapita: found.gdpPc,
        gdpPerCapitaYear: found.gdpYear,
        lifeExpectancy: found.lifeExp,
        lifeExpectancyYear: found.lifeYear,
        rank: rankMap.get(r.isoCode) ?? null,
        rankTotal: scored.length,
      };
    } else {
      entries[r.isoCode] = {
        isoCode: r.isoCode,
        nameCommon: r.nameCommon,
        available: false,
        score: null,
        normalized: null,
        color: CHOROPLETH_MISSING_COLOR,
        gdpPerCapita: r.gdpPc,
        gdpPerCapitaYear: r.gdpYear,
        lifeExpectancy: r.lifeExp,
        lifeExpectancyYear: r.lifeYear,
        rank: null,
        rankTotal: scored.length,
      };
    }
  }

  cachedMtciDataset = {
    entries,
    availableCount: scored.length,
    totalCountries: countries.length,
  };
  return cachedMtciDataset;
}

export interface FourBrazilsRegionMeta {
  id: FourBrazilsRegionId;
  namePt: string;
  nameEn: string;
  states: readonly string[];
  hex: string;
  center: readonly [number, number]; // [lat, lng]
  densityLevelPt: string;
  densityLevelEn: string;
  summaryPt: string;
  summaryEn: string;
  ibgeContrastPt: string;
  ibgeContrastEn: string;
}

export const FOUR_BRAZILS_REGIONS: Readonly<Record<FourBrazilsRegionId, FourBrazilsRegionMeta>> = {
  CONCENTRADA: {
    id: "CONCENTRADA",
    namePt: "Região Concentrada",
    nameEn: "Concentrated Region",
    states: ["SP", "RJ", "MG", "ES", "PR", "SC", "RS"],
    hex: "#38BDF8",
    center: [-23.5, -47.5],
    densityLevelPt: "Máxima densidade técnico-científico-informacional",
    densityLevelEn: "Highest technical-scientific-informational density",
    summaryPt:
      "Unifica Sudeste e Sul em um espaço contínuo de alta fluidez logística, comando financeiro, pesquisa científica, indústria avançada e agroindústria intensiva — epicentro dos fluxos verticais no país.",
    summaryEn:
      "Unites the Southeast and South into a contiguous space of high logistical fluidity, financial command, scientific research, advanced manufacturing, and intensive agribusiness.",
    ibgeContrastPt:
      "Funde as macrorregiões IBGE Sudeste e Sul em uma única região funcional.",
    ibgeContrastEn:
      "Merges IBGE's Southeast and South macro-regions into a single functional region.",
  },
  CENTRO_OESTE: {
    id: "CENTRO_OESTE",
    namePt: "Centro-Oeste",
    nameEn: "Center-West",
    states: ["MT", "MS", "GO", "DF", "TO"],
    hex: "#F59E0B",
    center: [-14.8, -53.2],
    densityLevelPt: "Ocupação periférica moderna e agroexportação em rede",
    densityLevelEn: "Modern peripheral occupation & networked agro-export",
    summaryPt:
      "Incorpora o Tocantins ao Centro-Oeste clássico: território marcado por modernização agrícola acelerada, biotecnologia de grãos, corredores de exportação e forte subordinação a vetores externos (verticalidades).",
    summaryEn:
      "Incorporates Tocantins alongside classic Center-West states: shaped by rapid agricultural modernization, export corridors, and strong linkage to global commodity verticalities.",
    ibgeContrastPt:
      "Inclui o estado do Tocantins (que no IBGE pertence à Região Norte) pela dinâmica de fronteira agrícola moderna.",
    ibgeContrastEn:
      "Includes Tocantins (classified under North by IBGE) due to its modern agricultural frontier dynamics.",
  },
  NORDESTE: {
    id: "NORDESTE",
    namePt: "Nordeste",
    nameEn: "Northeast",
    states: ["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"],
    hex: "#E87954",
    center: [-9.2, -40.5],
    densityLevelPt: "Povoamento antigo e modernizações seletivas",
    densityLevelEn: "Historic settlement & selective modernizations",
    summaryPt:
      "Área de povoamento colonial antigo e densa herança cultural, marcada por rugosidades estruturais históricas combinadas a manchas pontuais de modernização industrial, energética, turística e de fruticultura irrigada.",
    summaryEn:
      "Zone of early colonial settlement and deep cultural heritage, combining historical structural legacies ('rugosidades') with localized hubs of industrial, renewable energy, and irrigated agriculture modernization.",
    ibgeContrastPt:
      "Mantém o conjunto dos 9 estados do Nordeste do IBGE, enfatizando o contraste entre litoral moderno e interior semiárido.",
    ibgeContrastEn:
      "Retains the same 9 states as IBGE's Northeast, emphasizing contrasts between coastal hubs and the semiarid interior.",
  },
  AMAZONIA: {
    id: "AMAZONIA",
    namePt: "Amazônia",
    nameEn: "Amazonia",
    states: ["AM", "PA", "AC", "RO", "RR", "AP"],
    hex: "#22C55E",
    center: [-4.2, -61.5],
    densityLevelPt: "Baixa densidade técnica contínua e enclaves pontuais",
    densityLevelEn: "Sparse continuous technical networks & localized enclaves",
    summaryPt:
      "Caracterizada pela rarefação demográfica e de redes técnicas contínuas, pela predominância do sistema fluvial e florestal e pela presença de enclaves de alta densidade (Zona Franca de Manaus, mineração e hidrelétricas).",
    summaryEn:
      "Defined by low continuous technical-network density, riverine and forest dominance, and isolated high-density enclaves (Manaus Free Trade Zone, mining, and hydropower).",
    ibgeContrastPt:
      "Corresponde à Região Norte do IBGE sem o estado do Tocantins (integrado ao Centro-Oeste em Santos & Silveira).",
    ibgeContrastEn:
      "Corresponds to IBGE's North Region excluding Tocantins (integrated into Center-West by Santos & Silveira).",
  },
};

export const FOUR_BRAZILS_LIST: readonly FourBrazilsRegionMeta[] = [
  FOUR_BRAZILS_REGIONS.CONCENTRADA,
  FOUR_BRAZILS_REGIONS.CENTRO_OESTE,
  FOUR_BRAZILS_REGIONS.NORDESTE,
  FOUR_BRAZILS_REGIONS.AMAZONIA,
];

export const IBGE_REGION_LABELS: Readonly<Record<IbgeRegionId, { pt: string; en: string }>> = {
  NORTE: { pt: "Norte (IBGE)", en: "North (IBGE)" },
  NORDESTE: { pt: "Nordeste (IBGE)", en: "Northeast (IBGE)" },
  CENTRO_OESTE: { pt: "Centro-Oeste (IBGE)", en: "Center-West (IBGE)" },
  SUDESTE: { pt: "Sudeste (IBGE)", en: "Southeast (IBGE)" },
  SUL: { pt: "Sul (IBGE)", en: "South (IBGE)" },
};

export interface VerticalityHub {
  id: string;
  namePt: string;
  nameEn: string;
  countryIso: string;
  lat: number;
  lng: number;
  rolePt: string;
  roleEn: string;
}

export const VERTICALITY_HUBS: readonly VerticalityHub[] = [
  { id: "nyc", namePt: "Nova Iorque", nameEn: "New York", countryIso: "USA", lat: 40.7128, lng: -74.006, rolePt: "Comando financeiro e redes de informação", roleEn: "Financial command & information networks" },
  { id: "lon", namePt: "Londres", nameEn: "London", countryIso: "GBR", lat: 51.5074, lng: -0.1278, rolePt: "Finanças globais e cabos transatlânticos", roleEn: "Global finance & transatlantic cables" },
  { id: "fra", namePt: "Frankfurt", nameEn: "Frankfurt", countryIso: "DEU", lat: 50.1109, lng: 8.6821, rolePt: "Nó bancário europeu e troca de tráfego IP", roleEn: "European banking & IXP hub" },
  { id: "tok", namePt: "Tóquio", nameEn: "Tokyo", countryIso: "JPN", lat: 35.6762, lng: 139.6503, rolePt: "Inovação técnico-científica e finanças do Pacífico", roleEn: "Tech-scientific innovation & Pacific finance" },
  { id: "sha", namePt: "Xangai", nameEn: "Shanghai", countryIso: "CHN", lat: 31.2304, lng: 121.4737, rolePt: "Maior complexo portuário e cadeia manufatureira", roleEn: "World's largest container port & manufacturing hub" },
  { id: "sin", namePt: "Singapura", nameEn: "Singapore", countryIso: "SGP", lat: 1.3521, lng: 103.8198, rolePt: "Entroncamento marítimo e digital Indo-Pacífico", roleEn: "Indo-Pacific maritime & digital crossroads" },
  { id: "sao", namePt: "São Paulo", nameEn: "São Paulo", countryIso: "BRA", lat: -23.5505, lng: -46.6333, rolePt: "Metrópole informacional e comando da Região Concentrada", roleEn: "Informational metropolis & Concentrated Region hub" },
  { id: "jnb", namePt: "Joanesburgo", nameEn: "Johannesburg", countryIso: "ZAF", lat: -26.2041, lng: 28.0473, rolePt: "Nó financeiro e logístico da África Austral", roleEn: "Southern African financial & logistics hub" },
];

export const VERTICALITY_CORRIDORS: ReadonlyArray<readonly [string, string]> = [
  ["nyc", "lon"],
  ["lon", "fra"],
  ["fra", "sin"],
  ["sin", "sha"],
  ["sha", "tok"],
  ["tok", "nyc"],
  ["nyc", "sao"],
  ["lon", "sao"],
  ["lon", "jnb"],
  ["jnb", "sin"],
  ["sao", "jnb"],
];

export interface HorizontalityZone {
  id: string;
  namePt: string;
  nameEn: string;
  hex: string;
  isos: readonly string[];
}

/**
 * Domínios de contiguidade territorial (Horizontalidades — Santos, 1996): grandes blocos
 * de vizinhança geográfica, bacias compartilhadas e cooperação regional contígua.
 */
export const HORIZONTALITY_ZONES: readonly HorizontalityZone[] = [
  {
    id: "south-america",
    namePt: "Contiguidade Sul-Americana (Mercosul / Bacia Amazônica / Andes)",
    nameEn: "South American Contiguity (Mercosur / Amazon Basin / Andes)",
    hex: "#38B27A",
    isos: ["BRA", "ARG", "URY", "PRY", "BOL", "CHL", "PER", "ECU", "COL", "VEN", "GUY", "SUR"],
  },
  {
    id: "central-north-america",
    namePt: "Contiguidade Mesoamericana & Norte-Americana",
    nameEn: "Mesoamerican & North American Contiguity",
    hex: "#D9943B",
    isos: ["MEX", "GTM", "HND", "SLV", "NIC", "CRI", "PAN", "BLZ", "USA", "CAN"],
  },
  {
    id: "europe",
    namePt: "Contiguidade Europeia (Espaço Contíguo de Fronteiras)",
    nameEn: "European Territorial Contiguity",
    hex: "#5AA9B8",
    isos: ["PRT", "ESP", "FRA", "DEU", "ITA", "BEL", "NLD", "CHE", "AUT", "POL", "CZE", "HUN", "ROU", "GRC", "SWE", "NOR", "FIN", "DNK"],
  },
  {
    id: "africa-contiguous",
    namePt: "Contiguidade Africana (SADC / CEDEAO / África Oriental)",
    nameEn: "African Regional Contiguity (SADC / ECOWAS / East Africa)",
    hex: "#D97757",
    isos: ["AGO", "MOZ", "ZAF", "NAM", "BWA", "ZWE", "ZMB", "TZA", "KEN", "ETH", "NGA", "GHA", "SEN", "GNB", "MAR", "DZA", "EGY"],
  },
  {
    id: "asean-asia",
    namePt: "Contiguidade Sul & Sudeste Asiático (ASEAN / Subcontinente)",
    nameEn: "South & Southeast Asian Contiguity (ASEAN / Subcontinent)",
    hex: "#84B552",
    isos: ["IDN", "MYS", "THA", "VNM", "KHM", "LAO", "MMR", "PHL", "TLS", "IND", "BGD", "NPL", "LKA", "PAK"],
  },
];

export const HORIZONTALITY_COLOR_BY_ISO: Readonly<Record<string, string>> = Object.fromEntries(
  HORIZONTALITY_ZONES.flatMap((zone) => zone.isos.map((iso) => [iso, zone.hex]))
);
