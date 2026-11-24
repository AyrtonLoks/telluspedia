"use client";

import React from "react";
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
import type {
  ComparisonBarEntry,
  ComparisonChartDataset,
  ComparisonMetricSpec,
} from "@/lib/comparator-data";
import { useI18n } from "@/lib/i18n/useT";

export interface ComparisonLatestChartProps {
  selectedIsos: readonly string[];
  metric: ComparisonMetricSpec;
  metricShort: string;
  chartEntries: readonly ComparisonBarEntry[];
  missing: ComparisonChartDataset["missing"];
  countryColors: readonly string[];
  localizeCountry: (isoCode: string, fallback: string) => string;
}

/** Gráfico de barras da leitura mais recente do Comparador (extraído de ComparisonCharts na T45). */
export const ComparisonLatestChart: React.FC<ComparisonLatestChartProps> = ({
  selectedIsos,
  metric,
  metricShort,
  chartEntries,
  missing,
  countryColors,
  localizeCountry,
}) => {
  const { t } = useI18n();

  return (
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
                data={[...chartEntries]}
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
                      fill={countryColors[entry.colorIndex % countryColors.length]}
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
                      backgroundColor: countryColors[entry.colorIndex % countryColors.length],
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

      {missing.length > 0 && chartEntries.length > 0 && (
        <p
          data-testid="comparison-chart-missing"
          className="mt-3 flex items-start gap-1.5 text-caption text-fg-muted"
        >
          <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {t("comp.missingMetricPrefix", "Dado indisponível nesta métrica")} ({metric.indicatorCode}){" "}
            {t("comp.missingMetricFor", "para:")}{" "}
            <strong className="font-medium text-fg-secondary">
              {missing.map((m) => localizeCountry(m.isoCode, m.nameCommon)).join(", ")}
            </strong>
            . {t("comp.missingMetricSuffix", "Nenhum valor estimado foi inserido.")}
          </span>
        </p>
      )}
    </>
  );
};
