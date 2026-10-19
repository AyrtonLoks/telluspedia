"use client";

import React from "react";
import {
  useTimelineStore,
  MilestoneCategoryType,
  ALL_CATEGORIES,
} from "@/stores/timelineStore";

const CATEGORY_CONFIG: Record<
  MilestoneCategoryType,
  { label: string; activeClass: string; dotColor: string }
> = {
  POLITICS_REGIMES: {
    label: "Política",
    activeClass: "bg-cyan-950/80 text-cyan-300 border-cyan-500/50",
    dotColor: "bg-cyan-400",
  },
  ECONOMY: {
    label: "Economia",
    activeClass: "bg-amber-950/80 text-amber-300 border-amber-500/50",
    dotColor: "bg-amber-400",
  },
  WAR_MILITARY: {
    label: "Guerras",
    activeClass: "bg-rose-950/80 text-rose-300 border-rose-500/50",
    dotColor: "bg-rose-400",
  },
  SCIENCE_CULTURE: {
    label: "Ciência",
    activeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-500/50",
    dotColor: "bg-emerald-400",
  },
  HEALTH_PANDEMICS: {
    label: "Saúde",
    activeClass: "bg-purple-950/80 text-purple-300 border-purple-500/50",
    dotColor: "bg-purple-400",
  },
};

export const CategoryFilterPills: React.FC = () => {
  const activeCategories = useTimelineStore((s) => s.activeCategories);
  const toggleCategory = useTimelineStore((s) => s.toggleCategory);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {ALL_CATEGORIES.map((cat) => {
        const config = CATEGORY_CONFIG[cat];
        const isActive = activeCategories.includes(cat);

        return (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
              isActive
                ? config.activeClass
                : "bg-slate-900/40 text-slate-500 border-slate-800 hover:text-slate-300"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive ? config.dotColor : "bg-slate-600"
              }`}
            />
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
};
