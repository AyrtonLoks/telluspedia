"use client";

import React from "react";
import { MilestoneCategoryType } from "@/stores/timelineStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useGlobeStore } from "@/stores/globeStore";

interface MilestonePinProps {
  id: string;
  title: string;
  summary: string;
  year: number;
  exactDate?: string;
  category: MilestoneCategoryType;
  latitude?: number;
  longitude?: number;
  index: number;
  percent: number;
}

const CATEGORY_COLORS: Record<MilestoneCategoryType, { border: string; glow: string; text: string }> = {
  POLITICS_REGIMES: { border: "border-cyan-400", glow: "shadow-cyan-500/50", text: "text-cyan-300" },
  ECONOMY: { border: "border-amber-400", glow: "shadow-amber-500/50", text: "text-amber-300" },
  WAR_MILITARY: { border: "border-rose-400", glow: "shadow-rose-500/50", text: "text-rose-300" },
  SCIENCE_CULTURE: { border: "border-emerald-400", glow: "shadow-emerald-500/50", text: "text-emerald-300" },
  HEALTH_PANDEMICS: { border: "border-purple-400", glow: "shadow-purple-500/50", text: "text-purple-300" },
};

export const MilestonePin: React.FC<MilestonePinProps> = ({
  id,
  title,
  summary,
  year,
  exactDate,
  category,
  latitude,
  longitude,
  index,
  percent,
}) => {
  const selectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);
  const selectMilestone = useTimelineStore((s) => s.selectMilestone);
  const selectYear = useTimelineStore((s) => s.selectYear);
  const flyTo = useGlobeStore((s) => s.flyTo);

  const isSelected = selectedMilestoneId === id;
  const isAbove = index % 2 === 0; // Alternating above and below the axis to prevent collision
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.POLITICS_REGIMES;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectMilestone(id);
    selectYear(year);
    if (latitude !== undefined && longitude !== undefined) {
      flyTo(latitude, longitude, 1.8);
    }
  };

  return (
    <div
      style={{ left: `${Math.max(2, Math.min(98, percent))}%` }}
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
      onClick={handleClick}
    >
      {/* Connector line to the central axis */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 w-[1px] bg-slate-600/60 group-hover:bg-cyan-400 transition-colors ${
          isAbove ? "bottom-full h-4" : "top-full h-4"
        }`}
      />

      {/* Pin node on axis */}
      <div
        className={`w-3.5 h-3.5 rounded-full border-2 transition-all transform group-hover:scale-125 ${
          colors.border
        } ${
          isSelected
            ? `bg-cyan-400 scale-125 shadow-lg ${colors.glow}`
            : "bg-slate-900 group-hover:bg-cyan-500/20"
        }`}
      />

      {/* Floating Card: Alternates Above or Below */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 w-44 p-2 rounded-lg bg-slate-950/90 backdrop-blur-md border border-slate-700/70 shadow-xl transition-all duration-200 pointer-events-none group-hover:pointer-events-auto z-30 ${
          isAbove ? "bottom-7" : "top-7"
        } ${
          isSelected
            ? "opacity-100 ring-1 ring-cyan-400"
            : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <div className="flex items-center justify-between text-[10px] mb-0.5">
          <span className={`font-mono font-bold ${colors.text}`}>{year}</span>
          {exactDate && <span className="text-slate-400 text-[9px]">{exactDate}</span>}
        </div>
        <div className="text-xs font-semibold text-slate-100 line-clamp-1">{title}</div>
        <div className="text-[10px] text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
          {summary}
        </div>
      </div>
    </div>
  );
};
