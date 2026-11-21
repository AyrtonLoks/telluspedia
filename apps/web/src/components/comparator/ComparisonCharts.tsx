"use client";

import React, { useMemo, useState } from "react";
import { ExternalLink, Info } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
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
import { cn } from "@/components/ui/cn";

const COUNTRY_COLORS = [
  "rgb(var(--color-accent))",
  "rgb(var(--color-cat-economy))",
  "rgb(var(--color-cat-science))",
  "rgb(var(--color-cat-health))",
];

type StoreMetric = "GDP" | "POPULATION" | "HDI" | "MILITARY";

function isStoreMetric(metric: ComparisonMetricId): metric is StoreMetric {
  return metric === "GDP" || metric === "POPULATION" || metric === "HDI" || metric === "MILITARY";
}

export const ComparisonCharts: React.FC = () => {
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

  // Permite alternar para métricas adicionais (ex.: Expectativa de vida) sem quebrar o store atual.
  const [overrideMetric, setOverrideMetric] = useState<{
    metric: ComparisonMetricId;
    baseStoreMetric: StoreMetric;
  } | null>(null);

  const activeMetric: ComparisonMetricId =
    overrideMetric && overrideMetric.baseStoreMetric === currentStoreMetric
      ? overrideMetric.metric
      : currentStoreMetric;

  const handleSelectMetric = (metric: ComparisonMetricId) => {
    if (isStoreMetric(metric)) {
      setOverrideMetric(null);
      setStoreActiveMetric(metric);
    } else {
      setOverrideMetric({ metric, baseStoreMetric: currentStoreMetric });
    }
  };

  const dataset = useMemo(
    () => buildComparisonDataset(selectedIsos, activeMetric),
    [selectedIsos, activeMetric]
  );

  const { metric, entries, missing } = dataset;

  return (
    <section
      aria-label="Comparação gráfica de indicadores reais"
      data-testid="comparison-charts"
      className="rounded-card border border-line bg-surface-raised p-4"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-body font-semibold text-fg">{metric.title}</h4>
          <span className="font-mono text-caption text-fg-muted">
            Código {metric.indicatorCode} · Unidade: {metric.unit}
          </span>
        </div>

        {/* Seletor de métrica */}
        <div role="group" aria-label="Métrica do gráfico" className="flex flex-wrap items-center gap-1.5">
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
              {COMPARISON_METRICS[m].shortLabel}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <div
          data-testid="comparison-chart-empty"
          className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-control border border-dashed border-line bg-surface-sunken px-4 py-8 text-center"
        >
          <Info aria-hidden="true" className="h-5 w-5 text-fg-muted" />
          <p className="text-label font-medium text-fg-secondary">
            {selectedIsos.length === 0
              ? "Selecione até 4 países acima para visualizar a comparação gráfica."
              : `Dado indisponível para os países selecionados em ${metric.shortLabel} (${metric.indicatorCode}).`}
          </p>
          {selectedIsos.length > 0 && (
            <p className="text-caption text-fg-muted">
              O gráfico exibe exclusivamente leituras oficiais sem interpolação ou estimativas sintéticas.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={entries}
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
                    return [Number.isFinite(num) ? metric.formatValue(num) : String(value), metric.shortLabel];
                  }}
                />
                <Bar dataKey="value" name={metric.shortLabel} radius={[6, 6, 0, 0]} maxBarSize={64}>
                  {entries.map((entry) => (
                    <Cell
                      key={entry.isoCode}
                      fill={COUNTRY_COLORS[entry.colorIndex % COUNTRY_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Leitura textual acessível com ano e link oficial por país (RN02) */}
          <ul className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
            {entries.map((entry) => (
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
                    title={`Fonte primária: ${entry.sourcePrimary} (${metric.indicatorCode})`}
                    className="inline-flex items-center gap-0.5 text-accent hover:text-accent-hover hover:underline"
                  >
                    <span className="sr-only">
                      Fonte de {entry.nameCommon}: {entry.sourcePrimary}
                    </span>
                    <ExternalLink aria-hidden="true" className="h-3 w-3" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {missing.length > 0 && entries.length > 0 && (
        <p
          data-testid="comparison-chart-missing"
          className="mt-3 flex items-start gap-1.5 text-caption text-fg-muted"
        >
          <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Dado indisponível nesta métrica ({metric.indicatorCode}) para:{" "}
            <strong className="font-medium text-fg-secondary">
              {missing.map((m) => m.nameCommon).join(", ")}
            </strong>
            . Nenhum valor estimado foi inserido.
          </span>
        </p>
      )}
    </section>
  );
};
