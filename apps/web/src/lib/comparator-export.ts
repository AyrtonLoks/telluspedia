/**
 * Exportação auditável CSV (RFC 4180) do Comparador Multidimensional (D37 · RN02),
 * preservando valores brutos oficiais, anos de referência e links de fontes primárias.
 */

import { getSourceUrl } from "@/lib/citations";
import type {
  ComparisonChartDataset,
  ComparisonMetricSpec,
} from "@/lib/comparator-data";
import { WORLD_COUNTRIES_CATALOG, type CountryData } from "@/lib/country-data";
import { formatCountryName } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/types";
import type { HistoricalComparisonDataset } from "@/lib/worldbank-timeseries";

export {
  buildPrimarySourceFooter,
  buildStandaloneChartSvg,
  downloadComparisonChartArtifact,
  escapeXml,
  rasterizeSvgToPngBlob,
  resolveChartCssVariables,
  type BuildStandaloneChartSvgParams,
  type ChartLegendExportItem,
  type ExportChartActionParams,
} from "./comparator-export-svg";

export const COMPARATOR_EXPORT_COLORS_HEX = [
  "#38bdd4",
  "#f59e0b",
  "#34d399",
  "#a78bfa",
] as const;

const FORMULA_TRIGGER_RE = /^[=+\-@]/;
const PLAIN_NEGATIVE_NUMBER_RE = /^-\d+(\.\d+)?$/;

/** Serializa uma célula segundo a RFC 4180 com proteção contra CSV Formula Injection. */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  let text = String(value);
  const trimmed = text.trimStart();
  if (FORMULA_TRIGGER_RE.test(trimmed) && !PLAIN_NEGATIVE_NUMBER_RE.test(trimmed)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function serializeCsvRows(
  rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>
): string {
  return `${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}\r\n`;
}

export function localizeSourceName(source: string, locale: Locale): string {
  if (locale !== "en") return source;
  if (source === "Banco Mundial") return "World Bank (WDI)";
  if (source === "PNUD") return "UNDP";
  if (source === "OMS") return "WHO";
  return source;
}

/**
 * Gera CSV RFC 4180 da grade comparativa completa (`ComparisonGrid`) com todos os indicadores
 * auditados dos países selecionados, preservando valores brutos, anos e links primários (RN02).
 */
export function buildComparisonGridCsv(
  countries: readonly CountryData[],
  locale: Locale = "pt-BR"
): string {
  const isEn = locale === "en";
  const header = isEn
    ? [
        "country_iso",
        "country_name",
        "indicator_code",
        "indicator_name",
        "raw_value",
        "unit",
        "reference_year",
        "primary_source",
        "source_url",
      ]
    : [
        "iso_pais",
        "pais",
        "codigo_indicador",
        "indicador",
        "valor_bruto",
        "unidade",
        "ano_referencia",
        "fonte_primaria",
        "url_fonte",
      ];

  const rows: Array<Array<string | number | null>> = [header];

  for (const country of countries) {
    const countryName = formatCountryName(country.iso2, country.nameCommon, locale);
    if (country.indicators.length === 0) {
      rows.push([
        country.isoCode,
        countryName,
        "",
        "",
        null,
        "",
        null,
        localizeSourceName(country.dataSource || "Natural Earth", locale),
        country.sourceUrl || getSourceUrl("Natural Earth"),
      ]);
      continue;
    }

    for (const ind of country.indicators) {
      rows.push([
        country.isoCode,
        countryName,
        ind.indicatorCode,
        ind.indicatorName,
        ind.value,
        ind.unit,
        ind.year,
        localizeSourceName(ind.sourcePrimary, locale),
        ind.sourceUrl || getSourceUrl(ind.sourcePrimary, ind.indicatorCode),
      ]);
    }
  }

  return serializeCsvRows(rows);
}

export interface BuildComparisonChartCsvParams {
  viewMode: "latest" | "historical";
  metric: ComparisonMetricSpec;
  metricTitle: string;
  metricUnit: string;
  latestDataset: ComparisonChartDataset;
  historicalDataset: HistoricalComparisonDataset | null;
  locale: Locale;
}

/**
 * Gera CSV RFC 4180 do gráfico ativo (`ComparisonCharts`):
 * - `latest`: valores brutos + valores escalados da leitura mais recente por país.
 * - `historical`: série anual real 1990–2024 sem interpolação (`null` exportado como célula vazia).
 */
export function buildComparisonChartCsv(params: BuildComparisonChartCsvParams): string {
  const { viewMode, metric, metricTitle, metricUnit, latestDataset, historicalDataset, locale } =
    params;
  const isEn = locale === "en";

  if (viewMode === "historical" && historicalDataset && historicalDataset.activeSeries.length > 0) {
    const seriesCols = historicalDataset.activeSeries.map((s) => {
      const name = formatCountryName(WORLD_COUNTRIES_CATALOG[s.isoCode]?.iso2, s.nameCommon, locale);
      return `${s.isoCode} (${name})`;
    });
    const header = isEn
      ? ["year", "indicator_code", "indicator", "unit", "primary_source", "source_url", ...seriesCols]
      : ["ano", "codigo_indicador", "indicador", "unidade", "fonte_primaria", "url_fonte", ...seriesCols];

    const sourceLabel = isEn
      ? "World Bank (WDI, CC BY 4.0)"
      : "Banco Mundial (WDI, CC BY 4.0)";
    const sourceUrl = getSourceUrl("Banco Mundial", metric.indicatorCode);

    const rows: Array<Array<string | number | null>> = [header];
    for (const pt of historicalDataset.points) {
      rows.push([
        pt.year,
        metric.indicatorCode,
        metricTitle,
        metricUnit,
        sourceLabel,
        sourceUrl,
        ...historicalDataset.activeSeries.map((s) => {
          const val = pt[s.isoCode];
          return typeof val === "number" && Number.isFinite(val) ? val : null;
        }),
      ]);
    }
    return serializeCsvRows(rows);
  }

  const header = isEn
    ? [
        "country_iso",
        "country_name",
        "indicator_code",
        "indicator",
        "raw_value",
        "display_value",
        "unit",
        "reference_year",
        "primary_source",
        "source_url",
      ]
    : [
        "iso_pais",
        "pais",
        "codigo_indicador",
        "indicador",
        "valor_bruto",
        "valor_grafico",
        "unidade",
        "ano_referencia",
        "fonte_primaria",
        "url_fonte",
      ];

  const rows: Array<Array<string | number | null>> = [header];
  for (const entry of latestDataset.entries) {
    const name = formatCountryName(
      WORLD_COUNTRIES_CATALOG[entry.isoCode]?.iso2,
      entry.nameCommon,
      locale
    );
    rows.push([
      entry.isoCode,
      name,
      metric.indicatorCode,
      metricTitle,
      entry.rawValue,
      entry.value,
      metricUnit,
      entry.year,
      localizeSourceName(entry.sourcePrimary, locale),
      entry.sourceUrl,
    ]);
  }
  for (const missing of latestDataset.missing) {
    const name = formatCountryName(
      WORLD_COUNTRIES_CATALOG[missing.isoCode]?.iso2,
      missing.nameCommon,
      locale
    );
    rows.push([
      missing.isoCode,
      name,
      metric.indicatorCode,
      metricTitle,
      null,
      null,
      metricUnit,
      null,
      isEn ? "No official reading published" : "Sem leitura oficial publicada",
      getSourceUrl("Banco Mundial", metric.indicatorCode),
    ]);
  }

  return serializeCsvRows(rows);
}

export function buildComparatorFilename(
  isos: readonly string[],
  suffix: string,
  ext: "csv" | "svg" | "png"
): string {
  const safeIsos =
    isos
      .slice(0, 4)
      .map((iso) => iso.toLowerCase().replace(/[^a-z0-9]/g, ""))
      .filter(Boolean)
      .join("-") || "global";
  const safeSuffix = suffix
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `telluspedia-comparador-${safeIsos}-${safeSuffix}.${ext}`;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
