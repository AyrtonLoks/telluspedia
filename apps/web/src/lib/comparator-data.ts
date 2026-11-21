import {
  getAllCountries,
  getCountryData,
  type CountryData,
} from "@/lib/country-data";
import { getSourceUrl } from "@/lib/citations";

export type ComparisonMetricId =
  | "GDP"
  | "GDP_PER_CAPITA"
  | "POPULATION"
  | "LIFE_EXPECTANCY"
  | "RENEWABLE_ENERGY"
  | "CO2_PER_CAPITA"
  | "HDI"
  | "MILITARY";

export interface ComparisonMetricSpec {
  id: ComparisonMetricId;
  shortLabel: string;
  title: string;
  historicalTitle: string;
  unit: string;
  indicatorCode: string;
  hasWorldBankTimeseries: boolean;
  toDisplayValue: (rawValue: number) => number;
  formatValue: (displayValue: number) => string;
}

export interface ComparisonBarEntry {
  isoCode: string;
  nameCommon: string;
  label: string;
  value: number;
  rawValue: number;
  year: number | null;
  sourcePrimary: string;
  sourceUrl: string;
  colorIndex: number;
}

export interface ComparisonMissingCountry {
  isoCode: string;
  nameCommon: string;
}

export interface ComparisonChartDataset {
  metric: ComparisonMetricSpec;
  entries: ComparisonBarEntry[];
  missing: ComparisonMissingCountry[];
}

export const COMPARISON_METRICS: Record<ComparisonMetricId, ComparisonMetricSpec> = {
  GDP: {
    id: "GDP",
    shortLabel: "PIB",
    title: "PIB Nominal (leitura mais recente)",
    historicalTitle: "PIB Nominal Histórico (1990–2024)",
    unit: "Bilhões USD",
    indicatorCode: "NY.GDP.MKTP.CD",
    hasWorldBankTimeseries: true,
    toDisplayValue: (raw) => Math.round((raw / 1e9) * 10) / 10,
    formatValue: (v) =>
      v >= 1000
        ? `$ ${(v / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tri`
        : `$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} bi`,
  },
  GDP_PER_CAPITA: {
    id: "GDP_PER_CAPITA",
    shortLabel: "PIB per capita",
    title: "PIB per capita (leitura mais recente)",
    historicalTitle: "PIB per capita Histórico (1990–2024)",
    unit: "USD / habitante",
    indicatorCode: "NY.GDP.PCAP.CD",
    hasWorldBankTimeseries: true,
    toDisplayValue: (raw) => Math.round(raw),
    formatValue: (v) => `$ ${Math.round(v).toLocaleString("pt-BR")}`,
  },
  POPULATION: {
    id: "POPULATION",
    shortLabel: "População",
    title: "População Total (leitura mais recente)",
    historicalTitle: "Evolução Demográfica Real (1990–2024)",
    unit: "Milhões de habitantes",
    indicatorCode: "SP.POP.TOTL",
    hasWorldBankTimeseries: true,
    toDisplayValue: (raw) => Math.round((raw / 1e6) * 100) / 100,
    formatValue: (v) =>
      v >= 1000
        ? `${(v / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} bi`
        : `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`,
  },
  LIFE_EXPECTANCY: {
    id: "LIFE_EXPECTANCY",
    shortLabel: "Expectativa de vida",
    title: "Expectativa de Vida ao Nascer (leitura mais recente)",
    historicalTitle: "Expectativa de Vida Real (1990–2024)",
    unit: "Anos",
    indicatorCode: "SP.DYN.LE00.IN",
    hasWorldBankTimeseries: true,
    toDisplayValue: (raw) => Math.round(raw * 10) / 10,
    formatValue: (v) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} anos`,
  },
  RENEWABLE_ENERGY: {
    id: "RENEWABLE_ENERGY",
    shortLabel: "Renováveis",
    title: "Consumo de Energia Renovável (leitura mais recente)",
    historicalTitle: "Energia Renovável no Consumo Final (1990–2024)",
    unit: "% do consumo final",
    indicatorCode: "EG.FEC.RNEW.ZS",
    hasWorldBankTimeseries: true,
    toDisplayValue: (raw) => Math.round(raw * 10) / 10,
    formatValue: (v) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
  },
  CO2_PER_CAPITA: {
    id: "CO2_PER_CAPITA",
    shortLabel: "CO₂ per capita",
    title: "Emissões de CO₂ per capita (leitura mais recente)",
    historicalTitle: "Emissões de CO₂ per capita (1990–2024)",
    unit: "t CO₂e / hab.",
    indicatorCode: "EN.GHG.CO2.PC.CE.AR5",
    hasWorldBankTimeseries: true,
    toDisplayValue: (raw) => Math.round(raw * 100) / 100,
    formatValue: (v) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t`,
  },
  MILITARY: {
    id: "MILITARY",
    shortLabel: "Defesa",
    title: "Gastos Militares (leitura mais recente)",
    historicalTitle: "Gastos Militares Históricos (1990–2024)",
    unit: "% do PIB",
    indicatorCode: "MS.MIL.XPND.GD.ZS",
    hasWorldBankTimeseries: true,
    toDisplayValue: (raw) => Math.round(raw * 100) / 100,
    formatValue: (v) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% do PIB`,
  },
  HDI: {
    id: "HDI",
    shortLabel: "IDH",
    title: "Índice de Desenvolvimento Humano (leitura mais recente)",
    historicalTitle: "Índice de Desenvolvimento Humano",
    unit: "Score (0–1)",
    indicatorCode: "UNDP.HDI",
    hasWorldBankTimeseries: false,
    toDisplayValue: (raw) => Math.round(raw * 1000) / 1000,
    formatValue: (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
  },
};

export const COMPARISON_METRIC_ORDER: readonly ComparisonMetricId[] = [
  "GDP",
  "GDP_PER_CAPITA",
  "POPULATION",
  "LIFE_EXPECTANCY",
  "RENEWABLE_ENERGY",
  "CO2_PER_CAPITA",
  "MILITARY",
  "HDI",
];

/**
 * Constrói o conjunto de dados de comparação exclusivamente com leituras reais
 * (sem curvas interpoladas nem valores fallback inventados). Países sem dado para
 * a métrica vão para `missing` em vez de receberem valores artificiais ou zero.
 */
export function buildComparisonDataset(
  selectedIsos: string[],
  metricId: ComparisonMetricId
): ComparisonChartDataset {
  const metric = COMPARISON_METRICS[metricId];
  const entries: ComparisonBarEntry[] = [];
  const missing: ComparisonMissingCountry[] = [];

  selectedIsos.forEach((iso, idx) => {
    const country = getCountryData(iso);
    if (!country) return;

    const ind = country.indicators.find((i) => i.indicatorCode === metric.indicatorCode);
    const rawValue =
      ind && typeof ind.value === "number" && Number.isFinite(ind.value)
        ? ind.value
        : metricId === "POPULATION" &&
            typeof country.population === "number" &&
            Number.isFinite(country.population)
          ? country.population
          : null;

    if (rawValue === null) {
      missing.push({ isoCode: country.isoCode, nameCommon: country.nameCommon });
      return;
    }

    const year = ind?.year ?? null;
    const sourcePrimary = ind?.sourcePrimary || country.dataSource || "Banco Mundial";
    const sourceUrl = ind?.sourceUrl || country.sourceUrl || getSourceUrl(sourcePrimary);

    entries.push({
      isoCode: country.isoCode,
      nameCommon: country.nameCommon,
      label: year ? `${country.nameCommon} (${year})` : country.nameCommon,
      value: metric.toDisplayValue(rawValue),
      rawValue,
      year,
      sourcePrimary,
      sourceUrl,
      colorIndex: idx,
    });
  });

  return { metric, entries, missing };
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const FEATURED_STARTER_ISOS = [
  "BRA",
  "USA",
  "CHN",
  "DEU",
  "IND",
  "JPN",
  "FRA",
  "ARG",
  "ZAF",
  "EGY",
  "GBR",
  "MEX",
];

let cachedAllCountries: CountryData[] | null = null;

function getSortedAllCountries(): CountryData[] {
  if (!cachedAllCountries) {
    cachedAllCountries = [...getAllCountries()].sort((a, b) =>
      a.nameCommon.localeCompare(b.nameCommon, "pt-BR")
    );
  }
  return cachedAllCountries;
}

/**
 * Pesquisa países comparáveis dentre todos os 177 territórios do catálogo Natural Earth,
 * excluindo os ISOs já selecionados. Com consulta vazia, devolve sugestões iniciais
 * diversificadas (permitindo também digitar para encontrar qualquer um dos 177).
 */
export function searchComparableCountries(
  query: string,
  selectedIsos: string[],
  limit = 12
): CountryData[] {
  const selectedSet = new Set(selectedIsos.map((iso) => iso.toUpperCase()));
  const all = getSortedAllCountries();
  const normalized = normalizeSearch(query);

  if (!normalized) {
    const featured: CountryData[] = [];
    const seen = new Set<string>();
    for (const iso of FEATURED_STARTER_ISOS) {
      if (selectedSet.has(iso)) continue;
      const country = getCountryData(iso);
      if (country) {
        featured.push(country);
        seen.add(iso);
      }
      if (featured.length >= limit) return featured;
    }
    for (const country of all) {
      if (selectedSet.has(country.isoCode) || seen.has(country.isoCode)) continue;
      featured.push(country);
      if (featured.length >= limit) break;
    }
    return featured;
  }

  const scored: Array<{ country: CountryData; rank: number }> = [];

  for (const country of all) {
    if (selectedSet.has(country.isoCode)) continue;

    const iso3 = country.isoCode.toLowerCase();
    const iso2 = (country.iso2 || "").toLowerCase();
    const common = normalizeSearch(country.nameCommon);
    const official = country.nameOfficial ? normalizeSearch(country.nameOfficial) : "";
    const continent = country.continent ? normalizeSearch(country.continent) : "";
    const region = country.region ? normalizeSearch(country.region) : "";

    let rank = -1;
    if (iso3 === normalized || iso2 === normalized) {
      rank = 0;
    } else if (common.startsWith(normalized) || iso3.startsWith(normalized)) {
      rank = 1;
    } else if (common.includes(normalized) || official.includes(normalized)) {
      rank = 2;
    } else if (continent.includes(normalized) || region.includes(normalized)) {
      rank = 3;
    }

    if (rank !== -1) {
      scored.push({ country, rank });
    }
  }

  scored.sort(
    (a, b) => a.rank - b.rank || a.country.nameCommon.localeCompare(b.country.nameCommon, "pt-BR")
  );

  return scored.slice(0, limit).map((item) => item.country);
}
