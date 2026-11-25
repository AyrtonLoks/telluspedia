/**
 * Montagem do dataset coroplético (T35 / D34): precisa dos indicadores de todos os países
 * (`country-data.ts`), então fica fora de `choropleth.ts`, que o store e a barra superior
 * carregam no primeiro acesso. Só a camada e o HUD do mapa temático importam este arquivo.
 *
 * D34: suporta séries históricas reais 1990–2024 (`worldbank-timeseries.json` carregado
 * sob demanda) com domínio `[min, max]` travado ao longo de todo o período para comparação
 * visual honesta e exibição explícita de lacunas oficiais (`null` nunca interpolado).
 */
import { getAllCountries, WORLD_COUNTRIES_CATALOG } from "@/lib/country-data";
import type { FirmsCountryStats } from "@/lib/firms-aggregate";
import type { WorldBankTimeseriesDataset } from "@/lib/worldbank-timeseries";
import {
  CHOROPLETH_FIRMS_ZERO_COLOR,
  CHOROPLETH_INDICATORS,
  CHOROPLETH_MISSING_COLOR,
  buildLegendTicks,
  clampChoroplethYear,
  isTemporalChoroplethIndicator,
  normalizeScaleValue,
  samplePaletteColor,
  type ChoroplethCountryEntry,
  type ChoroplethDataset,
  type ChoroplethIndicatorId,
} from "@/lib/choropleth";

export interface BuildChoroplethOptions {
  /** Ano explícito (1990–2024) ou `null` para o snapshot mais recente. */
  year?: number | null;
  /** Dataset de séries temporais reais carregado sob demanda. */
  timeseries?: WorldBankTimeseriesDataset | null;
}

const staticDatasetCache = new Map<ChoroplethIndicatorId, ChoroplethDataset>();
const fixedDomainCache = new WeakMap<
  WorldBankTimeseriesDataset,
  Map<ChoroplethIndicatorId, { min: number; max: number } | null>
>();
const temporalDatasetCache = new WeakMap<
  WorldBankTimeseriesDataset,
  Map<string, ChoroplethDataset>
>();

/**
 * Calcula o domínio `[min, max]` global ao longo de todos os anos (1990–2024) de um indicador
 * para manter a rampa de cores fixa durante a animação temporal (D34).
 */
export function computeFixedTemporalDomain(
  indicatorId: ChoroplethIndicatorId,
  timeseries: WorldBankTimeseriesDataset
): { min: number; max: number } | null {
  let byIndicator = fixedDomainCache.get(timeseries);
  if (!byIndicator) {
    byIndicator = new Map();
    fixedDomainCache.set(timeseries, byIndicator);
  }
  if (byIndicator.has(indicatorId)) {
    return byIndicator.get(indicatorId) ?? null;
  }

  const indicatorSeries = timeseries.series[indicatorId];
  if (!indicatorSeries) {
    byIndicator.set(indicatorId, null);
    return null;
  }

  let min = Infinity;
  let max = -Infinity;
  for (const iso of Object.keys(WORLD_COUNTRIES_CATALOG)) {
    const arr = indicatorSeries[iso];
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < arr.length; i++) {
      const value = arr[i];
      if (typeof value === "number" && Number.isFinite(value)) {
        if (value < min) min = value;
        if (value > max) max = value;
      }
    }
  }

  const domain = Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
  byIndicator.set(indicatorId, domain);
  return domain;
}

function buildTemporalChoroplethDataset(
  indicatorId: ChoroplethIndicatorId,
  year: number,
  timeseries: WorldBankTimeseriesDataset
): ChoroplethDataset {
  let cache = temporalDatasetCache.get(timeseries);
  if (!cache) {
    cache = new Map();
    temporalDatasetCache.set(timeseries, cache);
  }
  const cacheKey = `${indicatorId}:${year}`;
  const existing = cache.get(cacheKey);
  if (existing) return existing;

  const meta = CHOROPLETH_INDICATORS[indicatorId];
  const allCountries = getAllCountries();
  const totalCountries = Object.keys(WORLD_COUNTRIES_CATALOG).length;
  const entries: Record<string, ChoroplethCountryEntry> = {};

  const yearIdx = timeseries.years.indexOf(year);
  const indicatorSeries = timeseries.series[indicatorId];
  const indicatorMeta = timeseries.metadata.indicators[indicatorId];
  const sourcePrimary = indicatorMeta?.sourcePrimary || meta.sourcePrimary;
  const sourceUrl = indicatorMeta?.sourceUrl || meta.sourceUrl;
  const fixedDomain = computeFixedTemporalDomain(indicatorId, timeseries);

  const validRows: Array<{ isoCode: string; nameCommon: string; value: number }> = [];
  const validByIso = new Map<string, number>();

  if (yearIdx >= 0 && indicatorSeries) {
    for (const country of allCountries) {
      const raw = indicatorSeries[country.isoCode]?.[yearIdx];
      if (typeof raw === "number" && Number.isFinite(raw)) {
        validRows.push({
          isoCode: country.isoCode,
          nameCommon: country.nameCommon,
          value: raw,
        });
        validByIso.set(country.isoCode, raw);
      }
    }
  }

  validRows.sort((a, b) => b.value - a.value);
  const rankByIso = new Map<string, number>();
  validRows.forEach((row, index) => {
    rankByIso.set(row.isoCode, index + 1);
  });

  const min = fixedDomain?.min ?? (validRows.length > 0 ? validRows[validRows.length - 1].value : null);
  const max = fixedDomain?.max ?? (validRows.length > 0 ? validRows[0].value : null);

  for (const country of allCountries) {
    const value = validByIso.get(country.isoCode);
    if (value !== undefined && min !== null && max !== null) {
      const normalized = normalizeScaleValue(value, min, max, meta.scale);
      entries[country.isoCode] = {
        isoCode: country.isoCode,
        nameCommon: country.nameCommon,
        available: true,
        value,
        normalized,
        color: samplePaletteColor(meta.palette, normalized),
        formattedValue: meta.formatValue(value),
        rank: rankByIso.get(country.isoCode) ?? null,
        rankTotal: validRows.length,
        year,
        sourcePrimary,
        sourceUrl,
      };
    } else {
      entries[country.isoCode] = {
        isoCode: country.isoCode,
        nameCommon: country.nameCommon,
        available: false,
        value: null,
        normalized: null,
        color: CHOROPLETH_MISSING_COLOR,
        formattedValue: "Dado indisponível",
        rank: null,
        rankTotal: validRows.length,
        year,
        sourcePrimary,
        sourceUrl,
      };
    }
  }

  const dataset: ChoroplethDataset = {
    indicator: meta,
    entries,
    min,
    max,
    availableCount: validRows.length,
    activeCount: validRows.length,
    totalCountries,
    ticks: buildLegendTicks(min, max, meta),
    isSourceUnavailable: false,
    activeYear: year,
    isFixedTemporalScale: fixedDomain !== null,
  };

  cache.set(cacheKey, dataset);
  return dataset;
}

/**
 * Constrói o dataset coroplético completo para os 177 países do globo.
 * Países sem dado real são marcados com `available: false` e `value: null`
 * (NUNCA convertidos em zero nem interpolados) e recebem `CHOROPLETH_MISSING_COLOR`.
 */
export function buildChoroplethDataset(
  indicatorId: ChoroplethIndicatorId,
  firmsByCountry?: Record<string, FirmsCountryStats> | null,
  options?: BuildChoroplethOptions
): ChoroplethDataset {
  const safeYear = clampChoroplethYear(options?.year);
  if (
    safeYear !== null &&
    isTemporalChoroplethIndicator(indicatorId) &&
    options?.timeseries
  ) {
    return buildTemporalChoroplethDataset(indicatorId, safeYear, options.timeseries);
  }

  const meta = CHOROPLETH_INDICATORS[indicatorId];

  if (indicatorId !== "NASA_FIRMS") {
    const cached = staticDatasetCache.get(indicatorId);
    if (cached) return cached;
  }

  const allCountries = getAllCountries();
  const totalCountries = Object.keys(WORLD_COUNTRIES_CATALOG).length;
  const entries: Record<string, ChoroplethCountryEntry> = {};

  if (indicatorId === "NASA_FIRMS") {
    const isSourceUnavailable = firmsByCountry === null || firmsByCountry === undefined;

    if (isSourceUnavailable) {
      for (const country of allCountries) {
        entries[country.isoCode] = {
          isoCode: country.isoCode,
          nameCommon: country.nameCommon,
          available: false,
          value: null,
          normalized: null,
          color: CHOROPLETH_MISSING_COLOR,
          formattedValue: "Dado indisponível",
          rank: null,
          rankTotal: 0,
          year: null,
          sourcePrimary: meta.sourcePrimary,
          sourceUrl: meta.sourceUrl,
        };
      }
      return {
        indicator: meta,
        entries,
        min: null,
        max: null,
        availableCount: 0,
        activeCount: 0,
        totalCountries,
        ticks: [],
        isSourceUnavailable: true,
        activeYear: null,
        isFixedTemporalScale: false,
      };
    }

    const positiveRows: Array<{
      isoCode: string;
      nameCommon: string;
      stats: FirmsCountryStats;
    }> = [];

    for (const country of allCountries) {
      const stats = firmsByCountry[country.isoCode];
      if (stats && Number.isFinite(stats.count) && stats.count > 0) {
        positiveRows.push({
          isoCode: country.isoCode,
          nameCommon: country.nameCommon,
          stats,
        });
      }
    }

    positiveRows.sort((a, b) => b.stats.count - a.stats.count || b.stats.frpSum - a.stats.frpSum);
    const min = positiveRows.length > 0 ? positiveRows[positiveRows.length - 1].stats.count : null;
    const max = positiveRows.length > 0 ? positiveRows[0].stats.count : null;
    const rankByIso = new Map<string, number>();
    positiveRows.forEach((row, index) => {
      rankByIso.set(row.isoCode, index + 1);
    });

    for (const country of allCountries) {
      const stats = firmsByCountry[country.isoCode];
      const count = stats && Number.isFinite(stats.count) && stats.count > 0 ? stats.count : 0;
      if (count > 0 && min !== null && max !== null) {
        const normalized = normalizeScaleValue(count, min, max, meta.scale);
        const frpLabel =
          Number.isFinite(stats.frpSum) && stats.frpSum > 0
            ? `FRP acumulado ${stats.frpSum.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MW`
            : undefined;
        entries[country.isoCode] = {
          isoCode: country.isoCode,
          nameCommon: country.nameCommon,
          available: true,
          isZeroActivity: false,
          value: count,
          normalized,
          color: samplePaletteColor(meta.palette, normalized),
          formattedValue: meta.formatValue(count),
          rank: rankByIso.get(country.isoCode) ?? null,
          rankTotal: positiveRows.length,
          year: null,
          sourcePrimary: meta.sourcePrimary,
          sourceUrl: meta.sourceUrl,
          extraDetail: frpLabel,
        };
      } else {
        entries[country.isoCode] = {
          isoCode: country.isoCode,
          nameCommon: country.nameCommon,
          available: true,
          isZeroActivity: true,
          value: 0,
          normalized: null,
          color: CHOROPLETH_FIRMS_ZERO_COLOR,
          formattedValue: "0 focos detectados (24h)",
          rank: null,
          rankTotal: positiveRows.length,
          year: null,
          sourcePrimary: meta.sourcePrimary,
          sourceUrl: meta.sourceUrl,
        };
      }
    }

    return {
      indicator: meta,
      entries,
      min,
      max,
      availableCount: totalCountries,
      activeCount: positiveRows.length,
      totalCountries,
      ticks: buildLegendTicks(min, max, meta),
      isSourceUnavailable: false,
      activeYear: null,
      isFixedTemporalScale: false,
    };
  }

  // Indicadores estruturais (snapshot mais recente Banco Mundial / SIPRI)
  const validRows: Array<{
    isoCode: string;
    nameCommon: string;
    value: number;
    year: number | null;
    sourcePrimary: string;
    sourceUrl: string;
  }> = [];

  const validByIso = new Map<string, (typeof validRows)[number]>();

  for (const country of allCountries) {
    const ind = country.indicators.find((item) => item.indicatorCode === indicatorId);
    if (ind && typeof ind.value === "number" && Number.isFinite(ind.value)) {
      const row = {
        isoCode: country.isoCode,
        nameCommon: country.nameCommon,
        value: ind.value,
        year: typeof ind.year === "number" && Number.isFinite(ind.year) ? ind.year : null,
        sourcePrimary: ind.sourcePrimary || meta.sourcePrimary,
        sourceUrl: ind.sourceUrl || meta.sourceUrl,
      };
      validRows.push(row);
      validByIso.set(country.isoCode, row);
    }
  }

  validRows.sort((a, b) => b.value - a.value);
  const rankByIso = new Map<string, number>();
  validRows.forEach((row, index) => {
    rankByIso.set(row.isoCode, index + 1);
  });

  const min = validRows.length > 0 ? validRows[validRows.length - 1].value : null;
  const max = validRows.length > 0 ? validRows[0].value : null;

  for (const country of allCountries) {
    const row = validByIso.get(country.isoCode);
    if (row && min !== null && max !== null) {
      const normalized = normalizeScaleValue(row.value, min, max, meta.scale);
      entries[country.isoCode] = {
        isoCode: country.isoCode,
        nameCommon: country.nameCommon,
        available: true,
        value: row.value,
        normalized,
        color: samplePaletteColor(meta.palette, normalized),
        formattedValue: meta.formatValue(row.value),
        rank: rankByIso.get(country.isoCode) ?? null,
        rankTotal: validRows.length,
        year: row.year,
        sourcePrimary: row.sourcePrimary,
        sourceUrl: row.sourceUrl,
      };
    } else {
      entries[country.isoCode] = {
        isoCode: country.isoCode,
        nameCommon: country.nameCommon,
        available: false,
        value: null,
        normalized: null,
        color: CHOROPLETH_MISSING_COLOR,
        formattedValue: "Dado indisponível",
        rank: null,
        rankTotal: validRows.length,
        year: null,
        sourcePrimary: meta.sourcePrimary,
        sourceUrl: meta.sourceUrl,
      };
    }
  }

  const dataset: ChoroplethDataset = {
    indicator: meta,
    entries,
    min,
    max,
    availableCount: validRows.length,
    activeCount: validRows.length,
    totalCountries,
    ticks: buildLegendTicks(min, max, meta),
    isSourceUnavailable: false,
    activeYear: null,
    isFixedTemporalScale: false,
  };

  staticDatasetCache.set(indicatorId, dataset);
  return dataset;
}
