import {
  getAllCountries,
  getCountryData,
  type CountryData,
} from "@/lib/country-data";
import { getSourceUrl } from "@/lib/citations";

export type AnalyticalIndicatorCode =
  | "NY.GDP.MKTP.CD"
  | "NY.GDP.PCAP.CD"
  | "SP.POP.TOTL"
  | "AG.SRF.TOTL.K2"
  | "SP.DYN.LE00.IN"
  | "EG.FEC.RNEW.ZS"
  | "EN.GHG.CO2.PC.CE.AR5"
  | "MS.MIL.XPND.GD.ZS";

export interface AnalyticalIndicatorMeta {
  code: AnalyticalIndicatorCode;
  label: string;
  unit: string;
  useLogForSimilarity: boolean;
  formatValue: (value: number) => string;
}

export interface IndicatorRankingEntry {
  code: AnalyticalIndicatorCode;
  label: string;
  unit: string;
  value: number;
  formattedValue: string;
  year: number | null;
  sourcePrimary: string;
  sourceUrl: string;
  globalRank: number;
  globalTotal: number;
  globalPercentile: number;
  regionalGroupName: string | null;
  regionalRank: number | null;
  regionalTotal: number;
  regionalAverage: number | null;
  regionalMedian: number | null;
  formattedRegionalAverage: string | null;
  deltaVsRegionalAvgPct: number | null;
}

export interface ComparablePeer {
  isoCode: string;
  nameCommon: string;
  region: string | null;
  continent: string | null;
  flagSvgUrl: string;
  sharedMetricsCount: number;
  similarityScore: number;
  gdpPerCapita: number | null;
  population: number | null;
  lifeExpectancy: number | null;
}

export interface CountryAnalyticalProfile {
  isoCode: string;
  nameCommon: string;
  nameOfficial: string | null;
  capital: string | null;
  region: string | null;
  continent: string | null;
  currencyLabel: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  populationDensityPerKm2: number | null;
  referenceDate: string | null;
  rankings: IndicatorRankingEntry[];
  missingIndicators: Array<{ code: AnalyticalIndicatorCode; label: string }>;
  peers: ComparablePeer[];
  regionalPeers: ComparablePeer[];
  summarySentences: string[];
  hasQuantitativeData: boolean;
}

export const ANALYTICAL_INDICATORS: readonly AnalyticalIndicatorMeta[] = [
  {
    code: "NY.GDP.MKTP.CD",
    label: "PIB nominal",
    unit: "USD",
    useLogForSimilarity: true,
    formatValue: (v) =>
      v >= 1e12
        ? `$ ${(v / 1e12).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tri`
        : v >= 1e9
          ? `$ ${(v / 1e9).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} bi`
          : `$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`,
  },
  {
    code: "NY.GDP.PCAP.CD",
    label: "PIB per capita",
    unit: "USD / hab.",
    useLogForSimilarity: true,
    formatValue: (v) => `$ ${Math.round(v).toLocaleString("pt-BR")}`,
  },
  {
    code: "SP.POP.TOTL",
    label: "População total",
    unit: "habitantes",
    useLogForSimilarity: true,
    formatValue: (v) =>
      v >= 1e9
        ? `${(v / 1e9).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} bi`
        : v >= 1e6
          ? `${(v / 1e6).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`
          : Math.round(v).toLocaleString("pt-BR"),
  },
  {
    code: "AG.SRF.TOTL.K2",
    label: "Área territorial",
    unit: "km²",
    useLogForSimilarity: false,
    formatValue: (v) => `${Math.round(v).toLocaleString("pt-BR")} km²`,
  },
  {
    code: "SP.DYN.LE00.IN",
    label: "Expectativa de vida",
    unit: "anos",
    useLogForSimilarity: false,
    formatValue: (v) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} anos`,
  },
  {
    code: "EG.FEC.RNEW.ZS",
    label: "Energia renovável",
    unit: "% do consumo final",
    useLogForSimilarity: false,
    formatValue: (v) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
  },
  {
    code: "EN.GHG.CO2.PC.CE.AR5",
    label: "Emissões de CO₂ per capita",
    unit: "t CO₂e / hab.",
    useLogForSimilarity: false,
    formatValue: (v) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t`,
  },
  {
    code: "MS.MIL.XPND.GD.ZS",
    label: "Gastos militares",
    unit: "% do PIB",
    useLogForSimilarity: false,
    formatValue: (v) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% do PIB`,
  },
];

const SIMILARITY_CODES: readonly AnalyticalIndicatorCode[] = [
  "NY.GDP.MKTP.CD",
  "NY.GDP.PCAP.CD",
  "SP.POP.TOTL",
  "SP.DYN.LE00.IN",
  "EG.FEC.RNEW.ZS",
  "EN.GHG.CO2.PC.CE.AR5",
];

function readNumericIndicator(country: CountryData, code: AnalyticalIndicatorCode): {
  value: number;
  year: number | null;
  sourcePrimary: string;
  sourceUrl: string;
} | null {
  const ind = country.indicators.find((i) => i.indicatorCode === code);
  if (ind && typeof ind.value === "number" && Number.isFinite(ind.value)) {
    const sourcePrimary = ind.sourcePrimary || "Banco Mundial";
    return {
      value: ind.value,
      year: ind.year ?? null,
      sourcePrimary,
      sourceUrl: ind.sourceUrl || getSourceUrl(sourcePrimary, code),
    };
  }
  if (code === "SP.POP.TOTL" && typeof country.population === "number" && Number.isFinite(country.population)) {
    return {
      value: country.population,
      year: null,
      sourcePrimary: country.dataSource || "Banco Mundial",
      sourceUrl: getSourceUrl("Banco Mundial", code),
    };
  }
  if (code === "AG.SRF.TOTL.K2" && typeof country.areaKm2 === "number" && Number.isFinite(country.areaKm2)) {
    return {
      value: country.areaKm2,
      year: null,
      sourcePrimary: country.dataSource || "Banco Mundial",
      sourceUrl: getSourceUrl("Banco Mundial", code),
    };
  }
  return null;
}

interface CatalogStatsCache {
  allCountries: CountryData[];
  byIso: Map<string, CountryData>;
  /** Valores ordenados (decrescente) por código de indicador para cálculo exato de ranking. */
  sortedValuesByCode: Map<AnalyticalIndicatorCode, Array<{ iso: string; value: number }>>;
  /** Estatísticas de normalização (média e desvio-padrão) para distância de pares comparáveis. */
  normStats: Map<AnalyticalIndicatorCode, { mean: number; std: number; useLog: boolean }>;
}

let cachedStats: CatalogStatsCache | null = null;

function getCatalogStats(): CatalogStatsCache {
  if (cachedStats) return cachedStats;

  const allCountries = getAllCountries();
  const byIso = new Map<string, CountryData>();
  for (const c of allCountries) byIso.set(c.isoCode, c);

  const sortedValuesByCode = new Map<AnalyticalIndicatorCode, Array<{ iso: string; value: number }>>();
  const normStats = new Map<AnalyticalIndicatorCode, { mean: number; std: number; useLog: boolean }>();

  for (const meta of ANALYTICAL_INDICATORS) {
    const entries: Array<{ iso: string; value: number }> = [];
    for (const c of allCountries) {
      const reading = readNumericIndicator(c, meta.code);
      if (reading !== null) {
        entries.push({ iso: c.isoCode, value: reading.value });
      }
    }
    entries.sort((a, b) => b.value - a.value || a.iso.localeCompare(b.iso));
    sortedValuesByCode.set(meta.code, entries);

    if (SIMILARITY_CODES.includes(meta.code)) {
      const transformed = entries
        .map((e) => (meta.useLogForSimilarity ? (e.value > 0 ? Math.log10(e.value) : null) : e.value))
        .filter((v): v is number => v !== null && Number.isFinite(v));

      if (transformed.length > 1) {
        const mean = transformed.reduce((acc, v) => acc + v, 0) / transformed.length;
        const variance =
          transformed.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / transformed.length;
        normStats.set(meta.code, {
          mean,
          std: Math.sqrt(variance) || 1,
          useLog: meta.useLogForSimilarity,
        });
      }
    }
  }

  cachedStats = { allCountries, byIso, sortedValuesByCode, normStats };
  return cachedStats;
}

/**
 * Ranking de competição padrão (1 = maior valor; empates compartilham o mesmo posto).
 */
function computeCompetitionRank(sortedDesc: Array<{ iso: string; value: number }>, targetValue: number): number {
  let strictlyGreater = 0;
  for (const item of sortedDesc) {
    if (item.value > targetValue) strictlyGreater += 1;
    else break;
  }
  return strictlyGreater + 1;
}

function computeMedian(sortedDesc: number[]): number | null {
  if (sortedDesc.length === 0) return null;
  const mid = Math.floor(sortedDesc.length / 2);
  if (sortedDesc.length % 2 === 1) return sortedDesc[mid];
  return (sortedDesc[mid - 1] + sortedDesc[mid]) / 2;
}

function computeNormalizedVector(
  country: CountryData,
  normStats: CatalogStatsCache["normStats"]
): Map<AnalyticalIndicatorCode, number> {
  const vec = new Map<AnalyticalIndicatorCode, number>();
  for (const code of SIMILARITY_CODES) {
    const stat = normStats.get(code);
    if (!stat) continue;
    const reading = readNumericIndicator(country, code);
    if (!reading) continue;
    if (stat.useLog && reading.value <= 0) continue;
    const raw = stat.useLog ? Math.log10(reading.value) : reading.value;
    vec.set(code, (raw - stat.mean) / stat.std);
  }
  return vec;
}

function findPeers(
  target: CountryData,
  candidates: CountryData[],
  normStats: CatalogStatsCache["normStats"],
  limit: number
): ComparablePeer[] {
  const targetVec = computeNormalizedVector(target, normStats);
  if (targetVec.size < 2) return [];

  const minShared = targetVec.size >= 3 ? 3 : 2;
  const scored: Array<{ country: CountryData; dist: number; shared: number }> = [];

  for (const cand of candidates) {
    if (cand.isoCode === target.isoCode) continue;
    const candVec = computeNormalizedVector(cand, normStats);

    let sumSq = 0;
    let shared = 0;
    for (const [code, tVal] of targetVec.entries()) {
      const cVal = candVec.get(code);
      if (cVal === undefined) continue;
      const d = tVal - cVal;
      sumSq += d * d;
      shared += 1;
    }

    if (shared < minShared) continue;
    const rmsd = Math.sqrt(sumSq / shared);
    scored.push({ country: cand, dist: rmsd, shared });
  }

  scored.sort((a, b) => a.dist - b.dist || a.country.nameCommon.localeCompare(b.country.nameCommon, "pt-BR"));

  return scored.slice(0, limit).map(({ country, dist, shared }) => ({
    isoCode: country.isoCode,
    nameCommon: country.nameCommon,
    region: country.region,
    continent: country.continent,
    flagSvgUrl: country.flagSvgUrl,
    sharedMetricsCount: shared,
    similarityScore: Math.round((1 / (1 + dist)) * 100),
    gdpPerCapita: readNumericIndicator(country, "NY.GDP.PCAP.CD")?.value ?? null,
    population: readNumericIndicator(country, "SP.POP.TOTL")?.value ?? null,
    lifeExpectancy: readNumericIndicator(country, "SP.DYN.LE00.IN")?.value ?? null,
  }));
}

/**
 * Constrói o Perfil Analítico & Posição Global auditado para qualquer um dos 177 países
 * do catálogo Natural Earth (100% derivado de dados oficiais, zero prosa inventada).
 */
export function buildCountryAnalyticalProfile(
  isoOrCountry: string | CountryData
): CountryAnalyticalProfile | null {
  const country =
    typeof isoOrCountry === "string" ? getCountryData(isoOrCountry) : isoOrCountry;
  if (!country) return null;

  const stats = getCatalogStats();
  const rankings: IndicatorRankingEntry[] = [];
  const missingIndicators: Array<{ code: AnalyticalIndicatorCode; label: string }> = [];

  // Grupo regional de comparação: prioriza sub-região com >= 3 países; fallback para continente
  const sameSubregion = country.region
    ? stats.allCountries.filter((c) => c.region === country.region)
    : [];
  const sameContinent = country.continent
    ? stats.allCountries.filter((c) => c.continent === country.continent)
    : [];
  const regionalGroup =
    sameSubregion.length >= 3
      ? { name: country.region!, members: sameSubregion }
      : sameContinent.length >= 3
        ? { name: country.continent!, members: sameContinent }
        : null;
  const regionalIsoSet = regionalGroup ? new Set(regionalGroup.members.map((m) => m.isoCode)) : null;

  for (const meta of ANALYTICAL_INDICATORS) {
    const reading = readNumericIndicator(country, meta.code);
    if (!reading) {
      missingIndicators.push({ code: meta.code, label: meta.label });
      continue;
    }

    const globalSorted = stats.sortedValuesByCode.get(meta.code) ?? [];
    const globalTotal = globalSorted.length;
    const globalRank = computeCompetitionRank(globalSorted, reading.value);
    const globalPercentile =
      globalTotal > 1
        ? Math.round(((globalTotal - globalRank) / (globalTotal - 1)) * 100)
        : 100;

    let regionalRank: number | null = null;
    let regionalTotal = 0;
    let regionalAverage: number | null = null;
    let regionalMedian: number | null = null;
    let deltaVsRegionalAvgPct: number | null = null;

    if (regionalGroup && regionalIsoSet) {
      const regSorted = globalSorted.filter((item) => regionalIsoSet.has(item.iso));
      regionalTotal = regSorted.length;
      if (regionalTotal >= 2) {
        regionalRank = computeCompetitionRank(regSorted, reading.value);
        const sum = regSorted.reduce((acc, item) => acc + item.value, 0);
        regionalAverage = sum / regionalTotal;
        regionalMedian = computeMedian(regSorted.map((item) => item.value));
        if (regionalAverage > 0) {
          deltaVsRegionalAvgPct =
            Math.round(((reading.value - regionalAverage) / regionalAverage) * 1000) / 10;
        }
      }
    }

    rankings.push({
      code: meta.code,
      label: meta.label,
      unit: meta.unit,
      value: reading.value,
      formattedValue: meta.formatValue(reading.value),
      year: reading.year,
      sourcePrimary: reading.sourcePrimary,
      sourceUrl: reading.sourceUrl,
      globalRank,
      globalTotal,
      globalPercentile,
      regionalGroupName: regionalRank !== null && regionalGroup ? regionalGroup.name : null,
      regionalRank,
      regionalTotal,
      regionalAverage,
      regionalMedian,
      formattedRegionalAverage:
        regionalAverage !== null ? meta.formatValue(regionalAverage) : null,
      deltaVsRegionalAvgPct,
    });
  }

  const popVal = readNumericIndicator(country, "SP.POP.TOTL")?.value ?? null;
  const areaVal = readNumericIndicator(country, "AG.SRF.TOTL.K2")?.value ?? null;
  const populationDensityPerKm2 =
    popVal !== null && areaVal !== null && areaVal > 0
      ? Math.round((popVal / areaVal) * 10) / 10
      : null;

  const peers = findPeers(country, stats.allCountries, stats.normStats, 4);
  const regionalPeers = regionalGroup
    ? findPeers(country, regionalGroup.members, stats.normStats, 3)
    : [];

  // Resumo factual estritamente derivado de campos reais (zero texto inventado)
  const summarySentences: string[] = [];

  const locationParts = [
    country.nameOfficial && country.nameOfficial !== country.nameCommon
      ? `${country.nameCommon} (oficialmente ${country.nameOfficial})`
      : country.nameCommon,
    country.region ? `localizado em ${country.region}` : country.continent ? `localizado em ${country.continent}` : null,
    country.capital ? `com capital em ${country.capital}` : null,
  ].filter(Boolean);
  if (locationParts.length > 0) {
    summarySentences.push(`${locationParts.join(", ")}.`);
  }

  const gdpRank = rankings.find((r) => r.code === "NY.GDP.MKTP.CD");
  const gdpPcapRank = rankings.find((r) => r.code === "NY.GDP.PCAP.CD");
  if (gdpRank) {
    const yearNote = gdpRank.year ? `, ${gdpRank.year}` : "";
    const regClause =
      gdpRank.regionalRank !== null && gdpRank.regionalGroupName
        ? ` (${gdpRank.regionalRank}º de ${gdpRank.regionalTotal} em ${gdpRank.regionalGroupName})`
        : "";
    const pcapClause = gdpPcapRank
      ? `, com PIB per capita de ${gdpPcapRank.formattedValue} (${gdpPcapRank.globalRank}º/${gdpPcapRank.globalTotal})`
      : "";
    summarySentences.push(
      `Em escala econômica, ocupa a ${gdpRank.globalRank}ª posição global entre ${gdpRank.globalTotal} economias avaliadas, com PIB nominal de ${gdpRank.formattedValue}${yearNote}${regClause}${pcapClause}.`
    );
  }

  const popRank = rankings.find((r) => r.code === "SP.POP.TOTL");
  const lifeRank = rankings.find((r) => r.code === "SP.DYN.LE00.IN");
  if (popRank) {
    const densityClause =
      populationDensityPerKm2 !== null
        ? ` e densidade demográfica de ${populationDensityPerKm2.toLocaleString("pt-BR")} hab./km²`
        : "";
    const lifeClause = lifeRank
      ? `; a expectativa de vida ao nascer é de ${lifeRank.formattedValue} (${lifeRank.globalRank}º/${lifeRank.globalTotal})`
      : "";
    summarySentences.push(
      `No recorte demográfico, registra ${popRank.formattedValue} habitantes (${popRank.globalRank}º/${popRank.globalTotal} global)${densityClause}${lifeClause}.`
    );
  }

  const renewRank = rankings.find((r) => r.code === "EG.FEC.RNEW.ZS");
  const co2Rank = rankings.find((r) => r.code === "EN.GHG.CO2.PC.CE.AR5");
  if (renewRank || co2Rank) {
    const parts: string[] = [];
    if (renewRank) {
      parts.push(
        `participação de energia renovável de ${renewRank.formattedValue} (${renewRank.globalRank}º/${renewRank.globalTotal})`
      );
    }
    if (co2Rank) {
      parts.push(
        `emissões de CO₂ per capita de ${co2Rank.formattedValue} (${co2Rank.globalRank}º/${co2Rank.globalTotal})`
      );
    }
    summarySentences.push(`Na matriz energética e climática, apresenta ${parts.join(" e ")}.`);
  }

  const currencyLabel =
    country.currencyName && country.currencyCode
      ? `${country.currencyName} (${country.currencyCode})`
      : country.currencyName || country.currencyCode || null;

  return {
    isoCode: country.isoCode,
    nameCommon: country.nameCommon,
    nameOfficial: country.nameOfficial,
    capital: country.capital,
    region: country.region,
    continent: country.continent,
    currencyLabel,
    timezone: country.timezone,
    latitude: country.latitude,
    longitude: country.longitude,
    populationDensityPerKm2,
    referenceDate: country.referenceDate || null,
    rankings,
    missingIndicators,
    peers,
    regionalPeers,
    summarySentences,
    hasQuantitativeData: rankings.length > 0,
  };
}
