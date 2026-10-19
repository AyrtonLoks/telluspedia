"use client";

import React from "react";
import { useTimelineStore } from "@/stores/timelineStore";

export const PresetSelector: React.FC = () => {
  const startYear = useTimelineStore((s) => s.startYear);
  const endYear = useTimelineStore((s) => s.endYear);
  const setPreset = useTimelineStore((s) => s.setPreset);

  const presets = [
    { id: "LAST_50_YEARS", label: "50 Anos Padrão", start: 1974, end: 2024 },
    { id: "21ST_CENTURY", label: "Século XXI", start: 2000, end: 2026 },
    { id: "COLD_WAR", label: "Guerra Fria", start: 1947, end: 1991 },
    { id: "WORLD_WARS", label: "Guerras Mundiais", start: 1914, end: 1945 },
  ] as const;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {presets.map((p) => {
        const isSelected = startYear === p.start && endYear === p.end;
        return (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
              isSelected
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
};
