"use client";

import { restoreContemporaryTimeline, selectCountry } from "@/stores/actions";

import React from "react";
import { RotateCcw } from "lucide-react";
import { useGlobeStore } from "@/stores/globeStore";
import { useStudyStore } from "@/stores/studyStore";
import { HISTORICAL_ENTITIES, HISTORICAL_ERAS } from "@/lib/historical-entities";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

export const HistoricalEraBadge: React.FC = () => {
  // Época ativa: fonte única (T12)
  const epoch = useEpochState();

  // Deep-time geological eras take precedence and have their own PaleoEraBadge
  if (epoch.mode === "GEOLOGICAL") {
    return null;
  }

  const era = HISTORICAL_ERAS[epoch.historicalEraId];

  if (era.id === "CONTEMPORARY") {
    return null;
  }

  const handleRestoreCurrent = () => {
    restoreContemporaryTimeline();
    useStudyStore.getState().setHistoricalEra(null);
    useStudyStore.getState().setIsApollo11Active(false);

    // If currently selected country is an extinct historical entity, transition to modern sovereign successor
    const currentIso = useGlobeStore.getState().selectedIso;
    if (currentIso && HISTORICAL_ENTITIES[currentIso]?.successorIsos?.length > 0) {
      selectCountry(HISTORICAL_ENTITIES[currentIso].successorIsos[0]);
    }
  };

  // Clean title without trailing year parenthesis (e.g. "Unificação Alemã & Reino da Prússia")
  const cleanTitle = era.label.replace(/\s*\(\d{4}\)/, "");


  return (
    <Panel
      data-testid="historical-era-badge"
      className="map-epoch-badge pointer-events-auto fixed z-20 max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 border-warning/40 px-2 py-1.5 animate-rise-in sm:gap-3 sm:px-4 sm:py-2"
    >
      <div className="flex items-center gap-2">
        <span className="select-none text-body" aria-hidden="true">
          🏛️
        </span>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
          <span className="text-caption font-semibold text-warning">
            Cartografia Histórica:
          </span>
          <span className="text-caption font-medium text-fg">
            {era.representativeYear} — {cleanTitle}
          </span>
        </div>
      </div>

      <div className="h-4 w-px bg-line-strong" />

      <Button
        variant="secondary"
        size="sm"
        onClick={handleRestoreCurrent}
        title="Restaurar Cartografia Atual"
      >
        <RotateCcw aria-hidden="true" className="h-3 w-3 text-accent" />
        <span className="hidden md:inline">Restaurar Cartografia Atual</span>
        <span className="md:hidden">Restaurar</span>
      </Button>
    </Panel>
  );
};
