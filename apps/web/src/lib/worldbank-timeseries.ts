import { getCountryData } from "@/lib/country-data";
import { getSourceUrl } from "@/lib/citations";
import {
  COMPARISON_METRICS,
  type ComparisonMetricId,
  type ComparisonMetricSpec,
  type ComparisonMissingCountry,
} from "@/lib/comparator-data";

export interface WorldBankTimeseriesIndicatorMeta {
  name: string;
  unit: string;
  sourcePrimary: string;
  sourceUrl: string;
  lastUpdated: string;
}

export interface WorldBankTimeseriesDataset {
  metadata: {
    schemaVersion: number;
    generatedAt: string;
    worldBankLastUpdated: string;
    range: [number, number];
    source: {
      id: string;
      name: string;
      url: string;
      license: string;
    };
    indicators: Record<string, WorldBankTimeseriesIndicatorMeta>;
    coverage: Record<string, { countries: number; observations: number }>;
    notes?: string;
  };
  years: number[];
  series: Record<string, Record<string, Array<number | null>>>;
}

export interface HistoricalCountrySeriesMeta {
  isoCode: string;
  nameCommon: string;
  firstYear: number;
  lastYear: number;
  pointCount: number;
  latestValue: number;
  sourcePrimary: string;
  sourceUrl: string;
  colorIndex: number;
}

export interface HistoricalSeriesPoint {
  year: number;
  [isoCode: string]: number | null;
}

export interface HistoricalComparisonDataset {
  metric: ComparisonMetricSpec;
  supported: boolean;
  range: [number, number];
  points: HistoricalSeriesPoint[];
  activeSeries: HistoricalCountrySeriesMeta[];
  missing: ComparisonMissingCountry[];
  lastUpdated: string | null;
}

export const WORLDBANK_TIMESERIES_URL = "/data/worldbank-timeseries.json";

let cachedTimeseries: WorldBankTimeseriesDataset | null = null;
let inflightTimeseries: Promise<WorldBankTimeseriesDataset> | null = null;

/**
 * Carrega sob demanda o dataset compacto de séries históricas reais do Banco Mundial (1990–2024).
 * Nunca importado estaticamente no bundle inicial de `/` (preserva orçamento da T25).
 */
export async function loadWorldBankTimeseries(): Promise<WorldBankTimeseriesDataset> {
  if (cachedTimeseries) return cachedTimeseries;
  if (!inflightTimeseries) {
    inflightTimeseries = fetch(WORLDBANK_TIMESERIES_URL)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Falha ao carregar séries históricas (HTTP ${res.status})`);
        }
        const json = (await res.json()) as WorldBankTimeseriesDataset;
        if (!json || !Array.isArray(json.years) || !json.series) {
          throw new Error("Formato inválido do dataset de séries históricas");
        }
        cachedTimeseries = json;
        return json;
      })
      .catch((err) => {
        inflightTimeseries = null;
        throw err;
      });
  }
  return inflightTimeseries;
}

export function resetTimeseriesCacheForTest(): void {
  cachedTimeseries = null;
  inflightTimeseries = null;
}

function buildIndicatorCountryUrl(indicatorCode: string, iso2?: string): string {
  const base = getSourceUrl("Banco Mundial", indicatorCode);
  return iso2 ? `${base}?locations=${encodeURIComponent(iso2)}` : base;
}

/**
 * Monta pontos anuais (1990–2024) exclusivamente com leituras oficiais do Banco Mundial.
 * Lacunas reais permanecem como `null` (para renderização com `connectNulls={false}`),
 * sem qualquer interpolação ou estimativa sintética.
 */
export function buildHistoricalSeriesDataset(
  timeseries: WorldBankTimeseriesDataset,
  selectedIsos: string[],
  metricId: ComparisonMetricId
): HistoricalComparisonDataset {
  const metric = COMPARISON_METRICS[metricId];
  const indicatorSeries = timeseries.series[metric.indicatorCode];
  const indicatorMeta = timeseries.metadata.indicators[metric.indicatorCode];
  const range: [number, number] = timeseries.metadata.range || [
    timeseries.years[0] ?? 1990,
    timeseries.years[timeseries.years.length - 1] ?? 2024,
  ];

  if (!indicatorSeries) {
    const missing: ComparisonMissingCountry[] = selectedIsos
      .map((iso) => getCountryData(iso))
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .map((c) => ({ isoCode: c.isoCode, nameCommon: c.nameCommon }));

    return {
      metric,
      supported: false,
      range,
      points: [],
      activeSeries: [],
      missing,
      lastUpdated: timeseries.metadata.worldBankLastUpdated || null,
    };
  }

  const activeSeries: HistoricalCountrySeriesMeta[] = [];
  const missing: ComparisonMissingCountry[] = [];
  const rawSeriesByIso = new Map<string, Array<number | null>>();

  selectedIsos.forEach((iso, idx) => {
    const country = getCountryData(iso);
    if (!country) return;

    const arr = indicatorSeries[country.isoCode];
    if (!Array.isArray(arr)) {
      missing.push({ isoCode: country.isoCode, nameCommon: country.nameCommon });
      return;
    }

    let firstYear: number | null = null;
    let lastYear: number | null = null;
    let latestValue: number | null = null;
    let pointCount = 0;

    for (let i = 0; i < timeseries.years.length; i++) {
      const v = arr[i];
      if (typeof v === "number" && Number.isFinite(v)) {
        const y = timeseries.years[i];
        if (firstYear === null) firstYear = y;
        lastYear = y;
        latestValue = metric.toDisplayValue(v);
        pointCount += 1;
      }
    }

    if (pointCount === 0 || firstYear === null || lastYear === null || latestValue === null) {
      missing.push({ isoCode: country.isoCode, nameCommon: country.nameCommon });
      return;
    }

    rawSeriesByIso.set(country.isoCode, arr);
    activeSeries.push({
      isoCode: country.isoCode,
      nameCommon: country.nameCommon,
      firstYear,
      lastYear,
      pointCount,
      latestValue,
      sourcePrimary: indicatorMeta?.sourcePrimary || "Banco Mundial",
      sourceUrl: buildIndicatorCountryUrl(metric.indicatorCode, country.iso2),
      colorIndex: idx,
    });
  });

  if (activeSeries.length === 0) {
    return {
      metric,
      supported: true,
      range,
      points: [],
      activeSeries: [],
      missing,
      lastUpdated: indicatorMeta?.lastUpdated || timeseries.metadata.worldBankLastUpdated || null,
    };
  }

  const points: HistoricalSeriesPoint[] = timeseries.years.map((year, idx) => {
    const row: HistoricalSeriesPoint = { year };
    for (const s of activeSeries) {
      const raw = rawSeriesByIso.get(s.isoCode)?.[idx];
      row[s.isoCode] =
        typeof raw === "number" && Number.isFinite(raw) ? metric.toDisplayValue(raw) : null;
    }
    return row;
  });

  return {
    metric,
    supported: true,
    range,
    points,
    activeSeries,
    missing,
    lastUpdated: indicatorMeta?.lastUpdated || timeseries.metadata.worldBankLastUpdated || null,
  };
}
