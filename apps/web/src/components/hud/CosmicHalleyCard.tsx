"use client";

import React from "react";
import { HALLEY_TAIL_ACTIVATION_AU, type HalleyPosition } from "@/lib/astronomy-planets";
import { useTimelineStore } from "@/stores/timelineStore";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/useT";

const HALLEY_EPOCH_PRESETS = [
  { id: "perihelion-1986", label: "Periélio 1986", sublabel: "0,59 UA · cauda máx.", year: 1986.1081 },
  { id: "approach-1986", label: "Aprox. Terra", sublabel: "0,42 UA · Abr 1986", year: 1986.274 },
  { id: "aphelion-2026", label: "Afélio 2026", sublabel: "35 UA · sem cauda", year: 2026 },
] as const;

export interface CosmicHalleyCardProps {
  halleyTelemetry: HalleyPosition;
  selectedYear: number;
  auUnit: string;
}

/** Cartão de atividade cometária e atalhos de época do 1P/Halley (extraído de CosmicInspectorHUD na T45). */
export const CosmicHalleyCard: React.FC<CosmicHalleyCardProps> = ({
  halleyTelemetry,
  selectedYear,
  auUnit,
}) => {
  const { t } = useI18n();

  return (
    <div
      data-testid="halley-activity-panel"
      className="space-y-2.5 rounded-card border border-line bg-surface-raised p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption font-medium text-fg-secondary">
          {t("cosmic.halleyActivity", "Atividade cometária")}
        </span>
        <span
          data-testid="halley-tail-status"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-control border px-2 py-0.5 text-caption font-medium",
            halleyTelemetry.hasTail
              ? "border-accent/50 bg-accent/15 text-accent"
              : "border-line bg-surface text-fg-muted"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              halleyTelemetry.hasTail ? "bg-accent" : "bg-fg-muted"
            )}
          />
          {halleyTelemetry.hasTail
            ? t("cosmic.halleyTailActive", "Cauda dupla ativa")
            : t("cosmic.halleyTailInactive", "Sem cauda (afélio)")}
        </span>
      </div>

      {halleyTelemetry.hasTail ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-caption">
            <span className="text-fg-secondary">
              {t("cosmic.halleySublimation", "Sublimação solar")} (&lt; {HALLEY_TAIL_ACTIVATION_AU} {auUnit})
            </span>
            <span className="font-mono tabular-nums text-accent">
              {Math.round(halleyTelemetry.activityFactor * 100)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-accent transition-all duration-base ease-out"
              style={{ width: `${Math.max(4, Math.round(halleyTelemetry.activityFactor * 100))}%` }}
            />
          </div>
          <p className="text-caption text-fg-muted">
            {t("cosmic.halleyTailDesc", "Cauda iônica azulada (anti-solar) e cauda de poeira amarelada curvada.")}
          </p>
        </div>
      ) : (
        <p className="text-caption text-fg-muted">
          {t("cosmic.halleyAbove", "Acima de")} {HALLEY_TAIL_ACTIVATION_AU} {auUnit}{" "}
          {t(
            "cosmic.halleyNoTailDesc",
            "o gelo não sublima; apenas o núcleo rochoso e uma coma residual ficam visíveis."
          )}
        </p>
      )}

      <div className="grid grid-cols-3 gap-1.5 pt-0.5">
        {HALLEY_EPOCH_PRESETS.map((preset) => {
          const isActivePreset = Math.abs(selectedYear - preset.year) < 0.05;
          return (
            <button
              key={preset.id}
              type="button"
              data-testid={`halley-epoch-${preset.id}`}
              aria-pressed={isActivePreset}
              onClick={() => useTimelineStore.getState().selectYear(preset.year)}
              className={cn(
                "flex flex-col items-start rounded-control border px-2 py-1.5 text-left transition-colors duration-fast ease-out",
                isActivePreset
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-line bg-surface text-fg hover:border-line-strong"
              )}
            >
              <span className="text-caption font-medium leading-tight">
                {t(`cosmic.halley.${preset.id}.label`, preset.label)}
              </span>
              <span className="font-mono text-caption leading-tight tabular-nums text-fg-muted">
                {t(`cosmic.halley.${preset.id}.sub`, preset.sublabel)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
