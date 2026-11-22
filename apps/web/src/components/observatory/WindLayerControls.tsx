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
import type { WindAltitude, WindUnit } from "@/lib/winds-types";
import { cn } from "@/components/ui/cn";

const ALTITUDES: readonly WindAltitude[] = ["surface", "jet250"];
const UNITS: readonly WindUnit[] = ["kmh", "knots"];

const WIND_GRADIENT = `linear-gradient(90deg, ${WIND_COLOR_STOPS.map(
  (s) => `${s.hex} ${Math.round(s.at * 100)}%`
).join(", ")})`;

/** Controles de altitude (10 m / 250 hPa), unidade (km/h / nós) e legenda de velocidade dos Ventos Globais (D27a). */
export const WindLayerControls: React.FC = () => {
  const storeAltitude = useObservatoryStore((s) => s.windAltitude);
  const storeUnit = useObservatoryStore((s) => s.windUnit);
  const storeWinds = useObservatoryStore((s) => s.winds);
  const storeMeta = useObservatoryStore((s) => s.layerMeta.GLOBAL_WINDS);
  const ssr = typeof window === "undefined" ? useObservatoryStore.getState() : null;

  const altitude = ssr?.windAltitude ?? storeAltitude;
  const unit = ssr?.windUnit ?? storeUnit;
  const winds = ssr ? ssr.winds : storeWinds;
  const meta = ssr ? ssr.layerMeta.GLOBAL_WINDS : storeMeta;

  const setWindAltitude = useObservatoryStore((s) => s.setWindAltitude);
  const setWindUnit = useObservatoryStore((s) => s.setWindUnit);
  const isLoading = useObservatoryStore((s) => s.isLoading.GLOBAL_WINDS);

  const activeGrid = winds ? winds[altitude] : null;
  const metaInfo = WIND_ALTITUDE_META[altitude];
  const labels = windScaleLabels(altitude, unit);

  return (
    <div data-testid="winds-controls" className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Nível atmosférico" className="flex items-center gap-1">
          {ALTITUDES.map((level) => (
            <button
              key={level}
              type="button"
              data-testid={`winds-altitude-${level}`}
              aria-pressed={altitude === level}
              disabled={isLoading}
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
          {UNITS.map((u) => (
            <button
              key={u}
              type="button"
              data-testid={`winds-unit-${u}`}
              aria-pressed={unit === u}
              onClick={() => setWindUnit(u)}
              className={cn(
                "h-7 rounded-control px-2 font-mono text-caption tabular-nums transition-colors duration-fast ease-out",
                unit === u
                  ? "bg-surface-hover text-fg"
                  : "text-fg-secondary hover:bg-surface-hover/60 hover:text-fg"
              )}
            >
              {unitLabel(u)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1" aria-label={`Legenda de velocidade do vento em ${unitLabel(unit)}`}>
        <div
          aria-hidden="true"
          className="h-1.5 w-full rounded-full"
          style={{ backgroundImage: WIND_GRADIENT }}
        />
        <div className="relative h-4 font-mono text-caption tabular-nums text-fg-muted">
          {labels.map((l) => (
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
          {metaInfo.description}{" "}
          {activeGrid && (
            <span className="font-mono tabular-nums text-fg-secondary">
              Pico {formatWindSpeed(activeGrid.maxSpeedMs, unit)} · Média{" "}
              {formatWindSpeed(activeGrid.meanSpeedMs, unit)}.
            </span>
          )}{" "}
          {meta.source === "fallback" && (
            <span data-testid="winds-fallback-note" className="text-warning">
              Exibindo climatologia global de referência (Hadley/Ferrel/Jato).
            </span>
          )}
        </p>
      </div>
    </div>
  );
};
