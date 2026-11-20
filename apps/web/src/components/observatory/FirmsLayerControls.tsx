"use client";

import React from "react";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { FIRMS_WINDOWS, type FirmsWindowDays } from "@/lib/firms-aggregate";
import { FIRMS_FRP_STOPS } from "@/lib/firms-display";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/components/ui/cn";

const WINDOW_LABEL: Record<FirmsWindowDays, string> = { 1: "24 h", 2: "48 h", 5: "5 dias" };

/** Gradiente da legenda a partir da mesma escala usada pelo shader do globo. */
const LEGEND_GRADIENT = `linear-gradient(to right, ${FIRMS_FRP_STOPS.map(
  (s, i) => `${s.hex} ${Math.round((i / (FIRMS_FRP_STOPS.length - 1)) * 100)}%`
).join(", ")})`;

/** Janela temporal, filtro de confiança e legenda da camada de queimadas (D05). */
export const FirmsLayerControls: React.FC = () => {
  const storeWindow = useObservatoryStore((s) => s.firmsWindow);
  const firmsWindow = typeof window === "undefined" ? useObservatoryStore.getState().firmsWindow : storeWindow;
  const setFirmsWindow = useObservatoryStore((s) => s.setFirmsWindow);
  const isLoading = useObservatoryStore((s) => s.isLoading.NASA_FIRMS);

  return (
    <div data-testid="firms-controls" className="space-y-2.5">
      <div role="group" aria-label="Janela temporal das queimadas" className="flex items-center gap-1">
        <span className="mr-1 text-caption text-fg-muted">Período</span>
        {FIRMS_WINDOWS.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={firmsWindow.days === d}
            disabled={isLoading}
            onClick={() => setFirmsWindow({ days: d })}
            className={cn(
              "h-7 rounded-control px-2.5 text-caption font-medium transition-colors duration-fast ease-out disabled:opacity-60",
              firmsWindow.days === d ? "bg-surface-hover text-fg" : "text-fg-secondary hover:bg-surface-hover/60 hover:text-fg"
            )}
          >
            {WINDOW_LABEL[d]}
          </button>
        ))}
      </div>

      <Chip
        tone="layer-fires"
        pressed={firmsWindow.confidence === "all"}
        disabled={isLoading}
        onClick={() => setFirmsWindow({ confidence: firmsWindow.confidence === "all" ? "nominal" : "all" })}
      >
        Incluir focos de baixa confiança
      </Chip>

      <div className="space-y-1" aria-label="Legenda: potência radiativa do fogo (FRP)">
        <div aria-hidden="true" className="h-1.5 w-full rounded-full" style={{ background: LEGEND_GRADIENT }} />
        <div className="flex justify-between font-mono text-caption tabular-nums text-fg-muted">
          <span>0</span>
          <span>20</span>
          <span>80</span>
          <span>300+ MW</span>
        </div>
        <p className="text-caption text-fg-muted">
          Cor e tamanho = potência radiativa do fogo (FRP). De longe, as manchas mostram a densidade de focos.
        </p>
      </div>
    </div>
  );
};
