"use client";

import React from "react";
import { RotateCcw, Mountain } from "lucide-react";
import { useTimelineStore } from "@/stores/timelineStore";
import { useStudyStore } from "@/stores/studyStore";
import { resolveGeologicalEra } from "@/lib/paleo-data";

export interface PaleoEraBadgeProps {
  geologicalMa?: number | null;
}

export const PaleoEraBadge: React.FC<PaleoEraBadgeProps> = (props) => {
  const storeGeologicalMa = useTimelineStore((s) => s.geologicalMa);
  const storeCurrentStudyId = useStudyStore((s) => s.currentStudyId);

  const currentStudyId =
    typeof window === "undefined"
      ? useStudyStore.getState().currentStudyId
      : storeCurrentStudyId;

  const geologicalMa =
    props.geologicalMa !== undefined
      ? props.geologicalMa
      : typeof window === "undefined"
      ? useTimelineStore.getState().geologicalMa
      : storeGeologicalMa;

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

  const handleRestoreCurrent = () => {
    const timeline = useTimelineStore.getState();
    timeline.setGeologicalMa(null);
    timeline.setTimelineMode("HISTORICAL");
    timeline.selectYear(2024);
    timeline.setYearRange(1974, 2024);
    timeline.selectMilestone(null);
    timeline.setActiveRouteId(null);

    try {
      const { useHistoricalRouteStore } = require("@/stores/historicalRouteStore");
      useHistoricalRouteStore.getState().setActiveRouteId(null);
    } catch {
      // safe
    }

    const study = useStudyStore.getState();
    if (study) {
      if (typeof study.setHistoricalEra === "function") {
        study.setHistoricalEra(null);
      }
      if (typeof study.setGeologicalMa === "function") {
        study.setGeologicalMa(null);
      }
      if (typeof study.setActiveRouteId === "function") {
        study.setActiveRouteId(null);
      }
    }
  };

  // Reposicionamento dinâmico contra o ForkStudyBanner para evitar sobreposição na barra superior
  const positionClass = currentStudyId
    ? "top-24 sm:top-20"
    : "top-16 sm:top-5";

  return (
    <div
      data-testid="paleo-era-badge"
      className={`fixed ${positionClass} left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-2xl glass-panel shadow-2xl border border-amber-500/50 bg-slate-950/90 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto`}
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-sm shadow-sm select-none">
          <span aria-hidden="true">{eraEmoji}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
          <span className="text-xs font-semibold text-amber-400 tracking-wide">
            Paleogeografia:
          </span>
          <span className="text-xs font-medium text-slate-200">
            {era.name} (~{era.ageMa} Ma)
          </span>
        </div>
      </div>

      <div className="h-4 w-[1px] bg-slate-700/60" />

      <button
        onClick={handleRestoreCurrent}
        title="Restaurar Geografia Contemporânea"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 hover:border-amber-400/50 text-[11px] font-medium text-slate-300 hover:text-amber-300 transition-all shadow-sm"
      >
        <RotateCcw className="w-3 h-3 text-amber-400" />
        <span className="hidden md:inline">Restaurar Geografia Contemporânea</span>
        <span className="md:hidden">Restaurar</span>
      </button>
    </div>
  );
};
