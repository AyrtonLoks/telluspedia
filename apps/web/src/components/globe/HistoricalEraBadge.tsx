"use client";

import React from "react";
import { RotateCcw } from "lucide-react";
import { useTimelineStore } from "@/stores/timelineStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useStudyStore } from "@/stores/studyStore";
import {
  resolveHistoricalEra,
  resolveEffectiveHistoricalYear,
  HISTORICAL_ENTITIES,
} from "@/lib/historical-entities";
import { findMilestoneById } from "@/lib/country-data";

export interface HistoricalEraBadgeProps {
  selectedYear?: number | null;
  selectedMilestoneId?: string | null;
}

export const HistoricalEraBadge: React.FC<HistoricalEraBadgeProps> = (props) => {
  const storeSelectedYear = useTimelineStore((s) => s.selectedYear);
  const storeMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);
  const storeStartYear = useTimelineStore((s) => s.startYear);
  const storeEndYear = useTimelineStore((s) => s.endYear);
  const storeCurrentStudyId = useStudyStore((s) => s.currentStudyId);

  const currentStudyId =
    typeof window === "undefined"
      ? useStudyStore.getState().currentStudyId
      : storeCurrentStudyId;

  const selectedYear =
    props.selectedYear !== undefined
      ? props.selectedYear
      : typeof window === "undefined"
      ? useTimelineStore.getState().selectedYear
      : storeSelectedYear;

  const selectedMilestoneId =
    props.selectedMilestoneId !== undefined
      ? props.selectedMilestoneId
      : typeof window === "undefined"
      ? useTimelineStore.getState().selectedMilestoneId
      : storeMilestoneId;

  const startYear =
    typeof window === "undefined"
      ? useTimelineStore.getState().startYear
      : storeStartYear;

  const endYear =
    typeof window === "undefined"
      ? useTimelineStore.getState().endYear
      : storeEndYear;

  const selectYear = useTimelineStore((s) => s.selectYear);
  const selectMilestone = useTimelineStore((s) => s.selectMilestone);
  const setYearRange = useTimelineStore((s) => s.setYearRange);

  // Determine active reference year using canonical multi-parameter resolver
  let milestoneYear: number | null = null;
  if (selectedMilestoneId) {
    const milestone = findMilestoneById(selectedMilestoneId);
    if (milestone?.year) {
      milestoneYear = milestone.year;
    }
  }

  const effectiveYear = resolveEffectiveHistoricalYear({
    selectedYear,
    milestoneYear,
    startYear,
    endYear,
  });

  const era = resolveHistoricalEra(effectiveYear);

  if (era.id === "CONTEMPORARY") {
    return null;
  }

  const handleRestoreCurrent = () => {
    selectMilestone(null);
    selectYear(2024);
    setYearRange(1974, 2024);
    useStudyStore.getState().setHistoricalEra(null);
    useStudyStore.getState().setIsApollo11Active(false);

    // If currently selected country is an extinct historical entity, transition to modern sovereign successor
    const currentIso = useGlobeStore.getState().selectedIso;
    if (currentIso && HISTORICAL_ENTITIES[currentIso]?.successorIsos?.length > 0) {
      useGlobeStore.getState().setSelectedIso(HISTORICAL_ENTITIES[currentIso].successorIsos[0]);
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
