"use client";

import { restoreContemporaryTimeline } from "@/stores/actions";

import React from "react";
import { RotateCcw } from "lucide-react";
import { resolveGeologicalEra } from "@/lib/paleo-data";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

export interface PaleoEraBadgeProps {
  geologicalMa?: number | null;
}

export const PaleoEraBadge: React.FC<PaleoEraBadgeProps> = (props) => {
  // Época ativa: fonte única (T12); o prop permite renderizar uma idade específica.
  const epochMa = useEpochState().geologicalMa;
  const geologicalMa = props.geologicalMa !== undefined ? props.geologicalMa : epochMa;

  if (geologicalMa === null || geologicalMa === undefined) {
    return null;
  }

  const era = resolveGeologicalEra(geologicalMa);

  const eraEmoji =
    era.code === "KPG_66MA"
      ? "☄️"
      : era.code === "GONDWANA_150MA"
      ? "🦖"
      : "🌋";

  // Reposicionamento dinâmico contra o ForkStudyBanner para evitar sobreposição na barra superior

  return (
    <Panel
      data-testid="paleo-era-badge"
      className="map-epoch-badge pointer-events-auto fixed z-20 max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 border-warning/40 px-2 py-1.5 animate-rise-in sm:gap-3 sm:px-4 sm:py-2"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 select-none items-center justify-center rounded-control border border-warning/40 bg-warning/15 text-label">
          <span aria-hidden="true">{eraEmoji}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
          <span className="text-caption font-semibold text-warning">Paleogeografia:</span>
          <span className="text-caption font-medium text-fg">
            {era.name} (~{era.ageMa} Ma)
          </span>
        </div>
      </div>

      <div className="h-4 w-px bg-line-strong" />

      <Button
        variant="secondary"
        size="sm"
        onClick={restoreContemporaryTimeline}
        title="Restaurar Geografia Contemporânea"
      >
        <RotateCcw aria-hidden="true" className="h-3 w-3 text-warning" />
        <span className="hidden md:inline">Restaurar Geografia Contemporânea</span>
        <span className="md:hidden">Restaurar</span>
      </Button>
    </Panel>
  );
};
