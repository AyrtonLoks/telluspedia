"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, ExternalLink, Info, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  Legend,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useComparatorStore } from "@/stores/comparatorStore";
import {
  buildComparisonDataset,
  COMPARISON_METRIC_ORDER,
  COMPARISON_METRICS,
  type ComparisonMetricId,
} from "@/lib/comparator-data";
import {
  buildHistoricalSeriesDataset,
  loadWorldBankTimeseries,
  type WorldBankTimeseriesDataset,
} from "@/lib/worldbank-timeseries";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/useT";
import { formatCountryName } from "@/lib/i18n/format";
import { WORLD_COUNTRIES_CATALOG } from "@/lib/country-data";

const COUNTRY_COLORS = [
  "rgb(var(--color-accent))",
  "rgb(var(--color-cat-economy))",
  "rgb(var(--color-cat-science))",
  "rgb(var(--color-cat-health))",
];

type StoreMetric = "GDP" | "POPULATION" | "HDI" | "MILITARY";
export type ChartViewMode = "latest" | "historical";

function isStoreMetric(metric: ComparisonMetricId): metric is StoreMetric {
  return metric === "GDP" || metric === "POPULATION" || metric === "HDI" || metric === "MILITARY";
}

export interface ComparisonChartsProps {
  /** Modo inicial (útil para testes e deep links); padrão: leitura mais recente. */
  initialViewMode?: ChartViewMode;
  /** Dataset histórico pré-carregado (opcional, usado em testes SSR/unitários). */
  initialTimeseries?: WorldBankTimeseriesDataset | null;
}

export const ComparisonCharts: React.FC<ComparisonChartsProps> = ({
  initialViewMode = "latest",
  initialTimeseries = null,
}) => {
  const { locale, t } = useI18n();
  const localizeCountry = (isoCode: string, fallback: string) =>
    formatCountryName(WORLD_COUNTRIES_CATALOG[isoCode]?.iso2, fallback, locale);
  const storeSelectedIsos = useComparatorStore((s) => s.selectedIsos);
  const storeActiveMetric = useComparatorStore((s) => s.activeMetric);
  const setStoreActiveMetric = useComparatorStore((s) => s.setActiveMetric);

  const selectedIsos =
    typeof window === "undefined"
      ? useComparatorStore.getState().selectedIsos
      : storeSelectedIsos;
  const currentStoreMetric =
    typeof window === "undefined"
      ? useComparatorStore.getState().activeMetric
      : storeActiveMetric;

  // Permite alternar para métricas adicionais (PIB per capita, Expectativa, Renováveis, CO₂) sem alterar o store.
  const [overrideMetric, setOverrideMetric] = useState<{
    metric: ComparisonMetricId;
    baseStoreMetric: StoreMetric;
  } | null>(null);

  const activeMetric: ComparisonMetricId =
    overrideMetric && overrideMetric.baseStoreMetric === currentStoreMetric
      ? overrideMetric.metric
      : currentStoreMetric;

  const [viewMode, setViewMode] = useState<ChartViewMode>(initialViewMode);
  const [timeseries, setTimeseries] = useState<WorldBankTimeseriesDataset | null>(initialTimeseries);
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  // Carrega `/data/worldbank-timeseries.json` sob demanda apenas quando o modo histórico é ativado (T32 / T25).
  useEffect(() => {
    if (viewMode !== "historical" || timeseries) return;
    let cancelled = false;
    setIsLoadingSeries(true);
    setSeriesError(null);
    loadWorldBankTimeseries()
      .then((data) => {
        if (!cancelled) setTimeseries(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setSeriesError(
            err instanceof Error ? err.message : "Não foi possível carregar as séries históricas."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSeries(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewMode, timeseries]);

  const handleSelectMetric = (metric: ComparisonMetricId) => {
    if (isStoreMetric(metric)) {
      setOverrideMetric(null);
      setStoreActiveMetric(metric);
    } else {
      setOverrideMetric({ metric, baseStoreMetric: currentStoreMetric });
    }
  };

  const latestDataset = useMemo(
    () => buildComparisonDataset(selectedIsos, activeMetric),
    [selectedIsos, activeMetric]
  );

  const historicalDataset = useMemo(
    () => (timeseries ? buildHistoricalSeriesDataset(timeseries, selectedIsos, activeMetric) : null),
    [timeseries, selectedIsos, activeMetric]
  );

  const metric = COMPARISON_METRICS[activeMetric];
  const metricShort = t(`comp.metric.${activeMetric}.short`, metric.shortLabel);
  const metricUnit = t(`comp.metric.${activeMetric}.unit`, metric.unit);
  const headingTitle =
    viewMode === "historical"
      ? t(`comp.metric.${activeMetric}.hist`, metric.historicalTitle)
      : t(`comp.metric.${activeMetric}.title`, metric.title);

  const chartEntries = useMemo(
    () =>
      latestDataset.entries.map((entry) => ({
        ...entry,
        label: localizeCountry(entry.isoCode, entry.label),
        nameCommon: localizeCountry(entry.isoCode, entry.nameCommon),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [latestDataset.entries, locale]
  );

  return (
    <section
      aria-label={t("comp.chartsAria", "Comparação gráfica de indicadores reais")}
      data-testid="comparison-charts"
      data-chart-mode={viewMode}
      className="rounded-card border border-line bg-surface-raised p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-body font-semibold text-fg">{headingTitle}</h4>
          <span className="font-mono text-caption text-fg-muted">
            {t("comp.codeLabel", "Código")} {metric.indicatorCode} · {t("comp.unitLabel", "Unidade")}: {metricUnit}
          </span>
        </div>

        {/* Alternador de modo: Leitura mais recente vs Série histórica real (1990–2024) */}
        <div
          role="group"
          aria-label={t("comp.viewTypeAria", "Tipo de visualização")}
          className="inline-flex items-center rounded-control border border-line bg-surface p-0.5"
        >
          <button
            type="button"
            aria-pressed={viewMode === "latest"}
            data-testid="chart-mode-latest"
            onClick={() => setViewMode("latest")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-caption font-medium transition-colors duration-fast ease-out",
              viewMode === "latest"
                ? "bg-accent text-accent-on"
                : "text-fg-secondary hover:bg-surface-hover hover:text-fg"
            )}
          >
            <BarChart3 aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{t("comp.viewLatest", "Mais recente")}</span>
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "historical"}
            data-testid="chart-mode-historical"
            onClick={() => setViewMode("historical")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-caption font-medium transition-colors duration-fast ease-out",
              viewMode === "historical"
                ? "bg-accent text-accent-on"
                : "text-fg-secondary hover:bg-surface-hover hover:text-fg"
            )}
          >
            <TrendingUp aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{t("comp.viewHistorical", "Série 1990–2024")}</span>
          </button>
        </div>
      </div>

      {/* Seletor de métrica */}
      <div
        role="group"
        aria-label={t("comp.metricGroupAria", "Métrica do gráfico")}
        className="mb-4 flex flex-wrap items-center gap-1.5"
      >
        {COMPARISON_METRIC_ORDER.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={activeMetric === m}
            onClick={() => handleSelectMetric(m)}
            className={cn(
              "rounded-control border px-2.5 py-1 text-caption font-medium transition-colors duration-fast ease-out",
              activeMetric === m
                ? "border-accent bg-accent text-accent-on"
                : "border-line bg-surface text-fg-secondary hover:bg-surface-hover hover:text-fg"
            )}
          >
            {t(`comp.metric.${m}.short`, COMPARISON_METRICS[m].shortLabel)}
          </button>
        ))}
      </div>

      {/* MODO 1: Leitura mais recente (BarChart) */}
      {viewMode === "latest" && (
        <>
          {chartEntries.length === 0 ? (
            <div
              data-testid="comparison-chart-empty"
              className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-control border border-dashed border-line bg-surface-sunken px-4 py-8 text-center"
            >
              <Info aria-hidden="true" className="h-5 w-5 text-fg-muted" />
              <p className="text-label font-medium text-fg-secondary">
                {selectedIsos.length === 0
                  ? t("comp.selectUpTo4", "Selecione até 4 países acima para visualizar a comparação gráfica.")
                  : `${t("comp.noDataMetricPrefix", "Dado indisponível para os países selecionados em")} ${metricShort} (${metric.indicatorCode}).`}
              </p>
              {selectedIsos.length > 0 && (
                <p className="text-caption text-fg-muted">
                  {t("comp.noSyntheticNote", "O gráfico exibe exclusivamente leituras oficiais sem interpolação ou estimativas sintéticas.")}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartEntries}
                    margin={{ top: 10, right: 20, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-line) / 0.14)" />
                    <XAxis
                      dataKey="label"
                      stroke="rgb(var(--color-fg-muted))"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      stroke="rgb(var(--color-fg-muted))"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgb(var(--color-surface-hover) / 0.5)" }}
                      contentStyle={{
                        backgroundColor: "rgb(var(--color-surface))",
                        borderColor: "rgb(var(--color-line) / 0.14)",
                        borderRadius: "10px",
                        fontSize: "12px",
                        color: "rgb(var(--color-fg))",
                      }}
                      formatter={(value: unknown) => {
                        const num = typeof value === "number" ? value : Number(value);
                        return [
                          Number.isFinite(num) ? metric.formatValue(num) : String(value),
                          metricShort,
                        ];
                      }}
                    />
                    <Bar dataKey="value" name={metricShort} radius={[6, 6, 0, 0]} maxBarSize={64}>
                      {chartEntries.map((entry) => (
                        <Cell
                          key={entry.isoCode}
                          fill={COUNTRY_COLORS[entry.colorIndex % COUNTRY_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <ul className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
                {chartEntries.map((entry) => (
                  <li
                    key={entry.isoCode}
                    className="flex items-center justify-between gap-2 rounded-control border border-line bg-surface px-3 py-2 text-caption"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: COUNTRY_COLORS[entry.colorIndex % COUNTRY_COLORS.length],
                        }}
                      />
                      <span className="truncate font-medium text-fg">{entry.nameCommon}</span>
                      {entry.year && (
                        <span className="font-mono tabular-nums text-fg-muted">({entry.year})</span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono font-medium tabular-nums text-fg">
                        {metric.formatValue(entry.value)}
                      </span>
                      <a
                        href={entry.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`${t("common.source", "Fonte primária")}: ${entry.sourcePrimary} (${metric.indicatorCode})`}
                        className="inline-flex items-center gap-0.5 text-accent hover:text-accent-hover hover:underline"
                      >
                        <span className="sr-only">
                          {t("common.source", "Fonte")} {entry.nameCommon}: {entry.sourcePrimary}
                        </span>
                        <ExternalLink aria-hidden="true" className="h-3 w-3" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {latestDataset.missing.length > 0 && chartEntries.length > 0 && (
            <p
              data-testid="comparison-chart-missing"
              className="mt-3 flex items-start gap-1.5 text-caption text-fg-muted"
            >
              <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {t("comp.missingMetricPrefix", "Dado indisponível nesta métrica")} ({metric.indicatorCode}){" "}
                {t("comp.missingMetricFor", "para:")}{" "}
                <strong className="font-medium text-fg-secondary">
                  {latestDataset.missing.map((m) => localizeCountry(m.isoCode, m.nameCommon)).join(", ")}
                </strong>
                . {t("comp.missingMetricSuffix", "Nenhum valor estimado foi inserido.")}
              </span>
            </p>
          )}
        </>
      )}

      {/* MODO 2: Série Histórica Real (1990–2024, connectNulls={false}) */}
      {viewMode === "historical" && (
        <>
          {selectedIsos.length === 0 ? (
            <div
              data-testid="comparison-chart-empty"
              className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-control border border-dashed border-line bg-surface-sunken px-4 py-8 text-center"
            >
              <Info aria-hidden="true" className="h-5 w-5 text-fg-muted" />
              <p className="text-label font-medium text-fg-secondary">
                {t("comp.selectUpTo4Hist", "Selecione até 4 países acima para visualizar a série histórica oficial (1990–2024).")}
              </p>
            </div>
          ) : !metric.hasWorldBankTimeseries ? (
            <div
              data-testid="comparison-historical-unsupported"
              className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-control border border-dashed border-line bg-surface-sunken px-4 py-8 text-center"
            >
              <Info aria-hidden="true" className="h-5 w-5 text-fg-muted" />
              <p className="text-label font-medium text-fg-secondary">
                {t("comp.histUnsupportedPrefix", "Série histórica anual indisponível na base do Banco Mundial para")}{" "}
                {metricShort} ({metric.indicatorCode}).
              </p>
              <p className="text-caption text-fg-muted">
                {t(
                  "comp.histUnsupportedHint",
                  "Alterne para “Mais recente” ou escolha um dos 7 indicadores com série oficial 1990–2024."
                )}
              </p>
            </div>
          ) : isLoadingSeries ? (
            <div
              data-testid="comparison-historical-loading"
              className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-control border border-line bg-surface-sunken px-4 py-8 text-caption text-fg-muted"
            >
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <span>{t("comp.histLoading", "Carregando séries históricas oficiais do Banco Mundial (1990–2024)…")}</span>
            </div>
          ) : seriesError ? (
            <div
              data-testid="comparison-historical-error"
              className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-control border border-danger/40 bg-surface-sunken px-4 py-8 text-center text-caption text-fg-secondary"
            >
              <p>{seriesError}</p>
            </div>
          ) : !historicalDataset || historicalDataset.activeSeries.length === 0 ? (
            <div
              data-testid="comparison-chart-empty"
              className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-control border border-dashed border-line bg-surface-sunken px-4 py-8 text-center"
            >
              <Info aria-hidden="true" className="h-5 w-5 text-fg-muted" />
              <p className="text-label font-medium text-fg-secondary">
                {t("comp.histNoObs", "Sem observações oficiais entre 1990 e 2024 para os países selecionados em")} {metricShort}.
              </p>
            </div>
          ) : (
            <>
              <div className="h-64 w-full" data-testid="comparison-historical-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={historicalDataset.points}
                    margin={{ top: 10, right: 20, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-line) / 0.14)" />
                    <XAxis
                      dataKey="year"
                      stroke="rgb(var(--color-fg-muted))"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      stroke="rgb(var(--color-fg-muted))"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgb(var(--color-surface))",
                        borderColor: "rgb(var(--color-line) / 0.14)",
                        borderRadius: "10px",
                        fontSize: "12px",
                        color: "rgb(var(--color-fg))",
                      }}
                      formatter={(value: unknown, name: string) => {
                        const num = typeof value === "number" ? value : Number(value);
                        return [
                          Number.isFinite(num) ? metric.formatValue(num) : t("common.dataUnavailable", "Dado indisponível"),
                          name,
                        ];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "6px" }} />
                    {historicalDataset.activeSeries.map((series) => (
                      <Line
                        key={series.isoCode}
                        type="monotone"
                        dataKey={series.isoCode}
                        name={localizeCountry(series.isoCode, series.nameCommon)}
                        stroke={COUNTRY_COLORS[series.colorIndex % COUNTRY_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Resumo auditável da série real por país (período observado, contagem e link RN02) */}
              <ul className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
                {historicalDataset.activeSeries.map((series) => {
                  const seriesName = localizeCountry(series.isoCode, series.nameCommon);
                  return (
                    <li
                      key={series.isoCode}
                      className="flex items-center justify-between gap-2 rounded-control border border-line bg-surface px-3 py-2 text-caption"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: COUNTRY_COLORS[series.colorIndex % COUNTRY_COLORS.length],
                          }}
                        />
                        <span className="truncate font-medium text-fg">{seriesName}</span>
                        <span className="font-mono tabular-nums text-fg-muted">
                          {series.firstYear}–{series.lastYear} ({series.pointCount} {t("common.years", "anos")})
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-mono font-medium tabular-nums text-fg">
                          {metric.formatValue(series.latestValue)}
                        </span>
                        <a
                          href={series.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`${t("common.source", "Série oficial")}: ${series.sourcePrimary} (${metric.indicatorCode})`}
                          className="inline-flex items-center gap-0.5 text-accent hover:text-accent-hover hover:underline"
                        >
                          <span className="sr-only">
                            {seriesName}: {series.sourcePrimary}
                          </span>
                          <ExternalLink aria-hidden="true" className="h-3 w-3" />
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-2 text-caption text-fg-muted">
                {t(
                  "comp.histFooter",
                  "Fonte: Banco Mundial (WDI, CC BY 4.0) · Lacunas oficiais são exibidas como interrupções na linha (sem interpolação)."
                )}
              </p>

              {historicalDataset.missing.length > 0 && (
                <p
                  data-testid="comparison-chart-missing"
                  className="mt-2 flex items-start gap-1.5 text-caption text-fg-muted"
                >
                  <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    {t("comp.histMissingPrefix", "Sem observações em")} {historicalDataset.range[0]}–{historicalDataset.range[1]}{" "}
                    {t("comp.histMissingFor", "para:")}{" "}
                    <strong className="font-medium text-fg-secondary">
                      {historicalDataset.missing.map((m) => localizeCountry(m.isoCode, m.nameCommon)).join(", ")}
                    </strong>
                    .
                  </span>
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
};
