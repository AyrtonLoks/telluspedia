"use client";

import React from "react";
import { useObservatoryStore } from "@/stores/observatoryStore";
import {
  WIND_ALTITUDE_META,
  WIND_COLOR_STOPS,
  formatWindSpeed,
  unitLabel,
  windScaleLabels,
} from "@/lib/winds-data";
import {
  CURRENT_COLOR_STOPS,
  currentScaleLabels,
  currentUnitLabel,
  formatCurrentSpeed,
} from "@/lib/currents-data";
import type { CurrentUnit, FlowMode, WindAltitude, WindUnit } from "@/lib/winds-types";
import { cn } from "@/components/ui/cn";

const FLOW_MODES: readonly { id: FlowMode; label: string }[] = [
  { id: "winds", label: "Ventos" },
  { id: "currents", label: "Correntes" },
  { id: "both", label: "Ambos" },
];
const ALTITUDES: readonly WindAltitude[] = ["surface", "jet250"];
const WIND_UNITS: readonly WindUnit[] = ["kmh", "knots"];
const CURRENT_UNITS: readonly CurrentUnit[] = ["ms", "knots"];

const WIND_GRADIENT = `linear-gradient(90deg, ${WIND_COLOR_STOPS.map(
  (s) => `${s.hex} ${Math.round(s.at * 100)}%`
).join(", ")})`;

const CURRENT_GRADIENT = `linear-gradient(90deg, ${CURRENT_COLOR_STOPS.map(
  (s) => `${s.hex} ${Math.round(s.at * 100)}%`
).join(", ")})`;

/** Controles D14 de Ventos Globais (10 m / 250 hPa), Correntes Oceânicas e modo simultâneo Ambos (D27a / D27b). */
export const WindLayerControls: React.FC = () => {
  const storeFlowMode = useObservatoryStore((s) => s.flowMode);
  const storeAltitude = useObservatoryStore((s) => s.windAltitude);
  const storeWindUnit = useObservatoryStore((s) => s.windUnit);
  const storeCurrentUnit = useObservatoryStore((s) => s.currentUnit);
  const storeWinds = useObservatoryStore((s) => s.winds);
  const storeCurrents = useObservatoryStore((s) => s.currents);
  const storeWindMeta = useObservatoryStore((s) => s.layerMeta.GLOBAL_WINDS);
  const storeCurrentsMeta = useObservatoryStore((s) => s.currentsMeta);
  const ssr = typeof window === "undefined" ? useObservatoryStore.getState() : null;

  const flowMode = ssr?.flowMode ?? storeFlowMode;
  const altitude = ssr?.windAltitude ?? storeAltitude;
  const windUnit = ssr?.windUnit ?? storeWindUnit;
  const currentUnit = ssr?.currentUnit ?? storeCurrentUnit;
  const winds = ssr ? ssr.winds : storeWinds;
  const currents = ssr ? ssr.currents : storeCurrents;
  const windMeta = ssr ? ssr.layerMeta.GLOBAL_WINDS : storeWindMeta;
  const currentsMeta = ssr ? ssr.currentsMeta : storeCurrentsMeta;

  const setFlowMode = useObservatoryStore((s) => s.setFlowMode);
  const setWindAltitude = useObservatoryStore((s) => s.setWindAltitude);
  const setWindUnit = useObservatoryStore((s) => s.setWindUnit);
  const setCurrentUnit = useObservatoryStore((s) => s.setCurrentUnit);
  const isWindLoading = useObservatoryStore((s) => s.isLoading.GLOBAL_WINDS);
  const isCurrentsLoading = useObservatoryStore((s) => s.currentsLoading);

  const showWinds = flowMode === "winds" || flowMode === "both";
  const showCurrents = flowMode === "currents" || flowMode === "both";
  const activeWindGrid = winds ? winds[altitude] : null;
  const windInfo = WIND_ALTITUDE_META[altitude];
  const windLabels = windScaleLabels(altitude, windUnit);
  const currentLabels = currentScaleLabels(currentUnit);

  return (
    <div data-testid="winds-controls" className="space-y-2.5">
      {/* Seletor principal: Ventos | Correntes | Ambos (D27b) */}
      <div
        role="group"
        aria-label="Modo de fluxo planetário"
        className="grid grid-cols-3 gap-1 rounded-control border border-line bg-surface p-0.5"
      >
        {FLOW_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            data-testid={`flow-mode-${mode.id}`}
            aria-pressed={flowMode === mode.id}
            onClick={() => setFlowMode(mode.id)}
            className={cn(
              "h-7 rounded-control px-2 text-caption font-medium transition-colors duration-fast ease-out",
              flowMode === mode.id
                ? "bg-accent/15 text-accent"
                : "text-fg-secondary hover:bg-surface-hover/60 hover:text-fg"
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {showWinds && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="group" aria-label="Nível atmosférico" className="flex items-center gap-1">
              {ALTITUDES.map((level) => (
                <button
                  key={level}
                  type="button"
                  data-testid={`winds-altitude-${level}`}
                  aria-pressed={altitude === level}
                  disabled={isWindLoading}
                  onClick={() => setWindAltitude(level)}
                  className={cn(
                    "h-7 rounded-control px-2.5 text-caption font-medium transition-colors duration-fast ease-out disabled:opacity-60",
                    altitude === level
                      ? "bg-surface-hover text-fg"
                      : "text-fg-secondary hover:bg-surface-hover/60 hover:text-fg"
                  )}
                >
                  {WIND_ALTITUDE_META[level].label}
                </button>
              ))}
            </div>

            <div role="group" aria-label="Unidade de velocidade do vento" className="flex items-center gap-1">
              {WIND_UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  data-testid={`winds-unit-${u}`}
                  aria-pressed={windUnit === u}
                  onClick={() => setWindUnit(u)}
                  className={cn(
                    "h-7 rounded-control px-2 font-mono text-caption tabular-nums transition-colors duration-fast ease-out",
                    windUnit === u
                      ? "bg-surface-hover text-fg"
                      : "text-fg-secondary hover:bg-surface-hover/60 hover:text-fg"
                  )}
                >
                  {unitLabel(u)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1" aria-label={`Legenda de velocidade do vento em ${unitLabel(windUnit)}`}>
            <div
              aria-hidden="true"
              className="h-1.5 w-full rounded-full"
              style={{ backgroundImage: WIND_GRADIENT }}
            />
            <div className="relative h-4 font-mono text-caption tabular-nums text-fg-muted">
              {windLabels.map((l) => (
                <span
                  key={l.text}
                  className="absolute top-0"
                  style={{
                    left: `${l.at * 100}%`,
                    transform:
                      l.at === 0 ? "none" : l.at === 1 ? "translateX(-100%)" : "translateX(-50%)",
                  }}
                >
                  {l.text}
                </span>
              ))}
            </div>
            <p className="text-caption text-fg-muted">
              {flowMode === "both" ? "Ventos atmosféricos: " : `${windInfo.description} `}
              {activeWindGrid && (
                <span className="font-mono tabular-nums text-fg-secondary">
                  Pico {formatWindSpeed(activeWindGrid.maxSpeedMs, windUnit)} · Média{" "}
                  {formatWindSpeed(activeWindGrid.meanSpeedMs, windUnit)}.
                </span>
              )}{" "}
              {windMeta.source === "fallback" && (
                <span data-testid="winds-fallback-note" className="text-warning">
                  Climatologia global de referência (Hadley/Ferrel/Jato).
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {showCurrents && (
        <div className={cn("space-y-2", flowMode === "both" && "border-t border-line pt-2.5")}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-fg-secondary">
              {flowMode === "both" ? "Correntes oceânicas" : "Superfície oceânica (máscara costeira)"}
            </span>
            <div role="group" aria-label="Unidade de velocidade da corrente" className="flex items-center gap-1">
              {CURRENT_UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  data-testid={`currents-unit-${u}`}
                  aria-pressed={currentUnit === u}
                  disabled={isCurrentsLoading}
                  onClick={() => setCurrentUnit(u)}
                  className={cn(
                    "h-7 rounded-control px-2 font-mono text-caption tabular-nums transition-colors duration-fast ease-out disabled:opacity-60",
                    currentUnit === u
                      ? "bg-surface-hover text-fg"
                      : "text-fg-secondary hover:bg-surface-hover/60 hover:text-fg"
                  )}
                >
                  {currentUnitLabel(u)}
                </button>
              ))}
            </div>
          </div>

          <div
            className="space-y-1"
            aria-label={`Legenda de correntes oceânicas em ${currentUnitLabel(currentUnit)}`}
          >
            <div
              aria-hidden="true"
              className="h-1.5 w-full rounded-full"
              style={{ backgroundImage: CURRENT_GRADIENT }}
            />
            <div className="relative h-4 font-mono text-caption tabular-nums text-fg-muted">
              {currentLabels.map((l) => (
                <span
                  key={l.text}
                  className="absolute top-0"
                  style={{
                    left: `${l.at * 100}%`,
                    transform:
                      l.at === 0 ? "none" : l.at === 1 ? "translateX(-100%)" : "translateX(-50%)",
                  }}
                >
                  {l.text}
                </span>
              ))}
            </div>
            <p className="text-caption text-fg-muted">
              {flowMode === "both"
                ? "Superfície oceânica: "
                : "Correntes superficiais (Golfo, Kuroshio, Humboldt, Benguela, Circumpolar Antártica). "}
              {currents && (
                <span className="font-mono tabular-nums text-fg-secondary">
                  Pico {formatCurrentSpeed(currents.maxSpeedMs, currentUnit)} · Média{" "}
                  {formatCurrentSpeed(currents.meanSpeedMs, currentUnit)}.
                </span>
              )}{" "}
              {currentsMeta.source === "fallback" && (
                <span data-testid="currents-fallback-note" className="text-warning">
                  Climatologia de giros oceânicos de referência.
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
