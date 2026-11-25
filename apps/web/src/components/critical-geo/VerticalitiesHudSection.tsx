"use client";

import React from "react";
import { Flame, Leaf, Plane, Satellite, Ship, TriangleAlert } from "lucide-react";
import { HORIZONTALITY_ZONES, VERTICALITY_HUBS } from "@/lib/critical-geo-catalog";
import type { VerticalityFocusMode } from "@/lib/critical-geo-ids";
import type { ObservatoryLayer } from "@/lib/observatory-data";
import { useI18n } from "@/lib/i18n/useT";
import { cn } from "@/components/ui/cn";

export interface VerticalitiesHudSectionProps {
  verticalityMode: VerticalityFocusMode;
  onSelectMode: (mode: VerticalityFocusMode) => void;
  activeObsLayers: readonly ObservatoryLayer[];
  onToggleObsLayer: (layer: ObservatoryLayer) => void;
  flightsCount: number;
  vesselsCount: number;
  satellitesCount: number;
}

export const VerticalitiesHudSection: React.FC<VerticalitiesHudSectionProps> = ({
  verticalityMode,
  onSelectMode,
  activeObsLayers,
  onToggleObsLayer,
  flightsCount,
  vesselsCount,
  satellitesCount,
}) => {
  const { locale, t } = useI18n();
  const isEn = locale === "en";

  const crossItems =
    verticalityMode === "horizontalities"
      ? ([
          { id: "BIOMES_MAP", labelPt: "Biomas", labelEn: "Biomes", icon: Leaf, count: 0 },
          { id: "NASA_FIRMS", labelPt: "Queimadas", labelEn: "Wildfires", icon: Flame, count: 0 },
          { id: "NASA_EONET", labelPt: "Eventos Severos", labelEn: "Severe Events", icon: TriangleAlert, count: 0 },
        ] as const)
      : ([
          { id: "FLIGHTS_OPENSKY", labelPt: "Aviação", labelEn: "Aviation", icon: Plane, count: flightsCount },
          { id: "MARITIME_ROUTES", labelPt: "Marítimo AIS", labelEn: "AIS Maritime", icon: Ship, count: vesselsCount },
          { id: "ISS_SATELLITES", labelPt: "Satélites", labelEn: "Satellites", icon: Satellite, count: satellitesCount },
        ] as const);

  return (
    <div className="space-y-2.5" data-testid="critical-geo-verticalities-panel">
      <div
        role="group"
        aria-label={t("criticalGeo.focusModeAria", "Escolher leitura: Verticalidades, Horizontalidades ou Ambos")}
        className="space-y-2"
      >
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={verticalityMode === "verticalities"}
            data-testid="verticalities-mode-verticalities"
            onClick={() => onSelectMode("verticalities")}
            className={cn(
              "rounded-card border p-2.5 text-left transition-colors duration-fast ease-out",
              verticalityMode === "verticalities"
                ? "border-accent/60 bg-accent/15 text-fg"
                : "border-line bg-surface-raised text-fg-secondary hover:border-line-strong hover:bg-surface-hover hover:text-fg"
            )}
          >
            <div
              className={cn(
                "text-label font-semibold",
                verticalityMode === "verticalities" ? "text-accent" : "text-fg"
              )}
            >
              {t("criticalGeo.upperCircuit", "Verticalidades")}
            </div>
            <p className="mt-1 leading-relaxed text-fg-secondary">
              {t(
                "criticalGeo.upperCircuitDesc",
                "Circuito superior: finanças globais, aviação, rotas marítimas e redes de informação que conectam nós distantes."
              )}
            </p>
          </button>
          <button
            type="button"
            aria-pressed={verticalityMode === "horizontalities"}
            data-testid="verticalities-mode-horizontalities"
            onClick={() => onSelectMode("horizontalities")}
            className={cn(
              "rounded-card border p-2.5 text-left transition-colors duration-fast ease-out",
              verticalityMode === "horizontalities"
                ? "border-accent/60 bg-accent/15 text-fg"
                : "border-line bg-surface-raised text-fg-secondary hover:border-line-strong hover:bg-surface-hover hover:text-fg"
            )}
          >
            <div
              className={cn(
                "text-label font-semibold",
                verticalityMode === "horizontalities" ? "text-accent" : "text-fg"
              )}
            >
              {t("criticalGeo.lowerCircuit", "Horizontalidades")}
            </div>
            <p className="mt-1 leading-relaxed text-fg-secondary">
              {t(
                "criticalGeo.lowerCircuitDesc",
                "Circuito inferior: contiguidade territorial, trabalho local, solidariedade cotidiana e território usado."
              )}
            </p>
          </button>
        </div>
        <button
          type="button"
          aria-pressed={verticalityMode === "both"}
          data-testid="verticalities-mode-both"
          onClick={() => onSelectMode("both")}
          className={cn(
            "w-full rounded-control border px-2.5 py-1.5 text-center text-caption font-medium transition-colors duration-fast ease-out",
            verticalityMode === "both"
              ? "border-accent/60 bg-accent/15 text-accent"
              : "border-line bg-surface-raised text-fg-secondary hover:bg-surface-hover hover:text-fg"
          )}
        >
          {t("criticalGeo.modeBoth", "Ver ambos em tensão (Verticalidades + Horizontalidades)")}
        </button>
      </div>

      <div className="space-y-1.5">
        <span className="text-caption font-medium text-fg">
          {verticalityMode === "horizontalities"
            ? t("criticalGeo.crossWithTerritory", "Cruzar ao vivo com camadas territoriais do Observatório:")
            : t("criticalGeo.crossWithFlows", "Cruzar ao vivo com fluxos reais do Observatório:")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {crossItems.map((item) => {
            const active = activeObsLayers.includes(item.id);
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                data-testid={`verticalities-cross-${item.id}`}
                onClick={() => onToggleObsLayer(item.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1 text-caption font-medium transition-colors duration-fast ease-out",
                  active
                    ? "border-accent/50 bg-accent/15 text-accent"
                    : "border-line bg-surface-raised text-fg-secondary hover:bg-surface-hover hover:text-fg"
                )}
              >
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                <span>{isEn ? item.labelEn : item.labelPt}</span>
                {active && item.count > 0 && (
                  <span className="font-mono tabular-nums">({item.count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {verticalityMode === "horizontalities" ? (
        <div
          data-testid="horizontalities-zones-legend"
          className="space-y-1 rounded-card border border-line bg-surface-sunken/80 p-2.5 text-fg-muted"
        >
          <div className="font-medium text-fg-secondary">
            {t("criticalGeo.horizZonesTitle", "Domínios de contiguidade destacados no globo:")}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {HORIZONTALITY_ZONES.map((z) => (
              <span key={z.id} className="inline-flex items-center gap-1 text-caption">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: z.hex }}
                />
                <span>{isEn ? z.nameEn.split(" (")[0] : z.namePt.split(" (")[0]}</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-card border border-line bg-surface-sunken/80 p-2.5 text-fg-muted">
          {t("criticalGeo.hubsCountPrefix", "Eixos destacados entre")}{" "}
          <span className="font-mono tabular-nums text-fg">{VERTICALITY_HUBS.length}</span>{" "}
          {t("criticalGeo.hubsCountSuffix", "metrópoles de comando global (Nova Iorque, Londres, Frankfurt, Tóquio, Xangai, Singapura, São Paulo e Joanesburgo).")}
        </div>
      )}
    </div>
  );
};
