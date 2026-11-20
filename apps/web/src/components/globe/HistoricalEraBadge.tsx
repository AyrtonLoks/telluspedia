"use client";

import { restoreContemporaryTimeline, selectCountry } from "@/stores/actions";

import React from "react";
import { RotateCcw } from "lucide-react";
import { useGlobeStore } from "@/stores/globeStore";
import { useStudyStore } from "@/stores/studyStore";
import { HISTORICAL_ENTITIES, HISTORICAL_ERAS } from "@/lib/historical-entities";
import { useEpochState } from "@/lib/epoch/useEpochState";

export const HistoricalEraBadge: React.FC = () => {
  const storeCurrentStudyId = useStudyStore((s) => s.currentStudyId);

  const currentStudyId =
    typeof window === "undefined"
      ? useStudyStore.getState().currentStudyId
      : storeCurrentStudyId;

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

  // If a study banner is mounted at top-4, position badge lower to avoid visual overlap
  const positionClass = currentStudyId
    ? "top-24 sm:top-20"
    : "top-16 sm:top-5";

  return (
    <div
      data-testid="historical-era-badge"
      className={`fixed ${positionClass} left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-2xl glass-panel shadow-2xl border border-amber-500/40 bg-slate-950/85 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto`}
    >
      <div className="flex items-center gap-2">
        <span className="text-base select-none" aria-hidden="true">
          🏛️
        </span>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
          <span className="text-xs font-semibold text-amber-300 tracking-wide">
            Cartografia Histórica:
          </span>
          <span className="text-xs font-medium text-slate-200">
            {era.representativeYear} — {cleanTitle}
          </span>
        </div>
      </div>

      <div className="h-4 w-[1px] bg-slate-700/60" />

      <button
        onClick={handleRestoreCurrent}
        title="Restaurar Cartografia Atual"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 hover:border-cyan-500/50 text-[11px] font-medium text-slate-300 hover:text-cyan-300 transition-all shadow-sm"
      >
        <RotateCcw className="w-3 h-3 text-cyan-400" />
        <span className="hidden md:inline">Restaurar Cartografia Atual</span>
        <span className="md:hidden">Restaurar</span>
      </button>
    </div>
  );
};
