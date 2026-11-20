"use client";

import { restoreContemporaryTimeline } from "@/stores/actions";

import React from "react";
import { RotateCcw, Mountain } from "lucide-react";
import { useStudyStore } from "@/stores/studyStore";
import { resolveGeologicalEra } from "@/lib/paleo-data";
import { useEpochState } from "@/lib/epoch/useEpochState";

export interface PaleoEraBadgeProps {
  geologicalMa?: number | null;
}

export const PaleoEraBadge: React.FC<PaleoEraBadgeProps> = (props) => {
  const storeCurrentStudyId = useStudyStore((s) => s.currentStudyId);

  const currentStudyId =
    typeof window === "undefined"
      ? useStudyStore.getState().currentStudyId
      : storeCurrentStudyId;

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
        onClick={restoreContemporaryTimeline}
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
