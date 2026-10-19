"use client";

import React from "react";
import { History, Calendar } from "lucide-react";
import { useTimelineStore } from "@/stores/timelineStore";
import { useGlobeStore } from "@/stores/globeStore";

interface MilestoneItem {
  id: string;
  title: string;
  summary: string;
  year: number;
  exactDate?: string;
  category: string;
  latitude?: number;
  longitude?: number;
}

interface CountryMiniTimelineProps {
  milestones: MilestoneItem[];
}

export const CountryMiniTimeline: React.FC<CountryMiniTimelineProps> = ({ milestones }) => {
  const selectMilestone = useTimelineStore((s) => s.selectMilestone);
  const selectYear = useTimelineStore((s) => s.selectYear);
  const flyTo = useGlobeStore((s) => s.flyTo);

  if (!milestones || milestones.length === 0) return null;

  const handleMilestoneClick = (m: MilestoneItem) => {
    selectMilestone(m.id);
    selectYear(m.year);
    if (m.latitude !== undefined && m.longitude !== undefined) {
      flyTo(m.latitude, m.longitude, 1.8);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-700/60">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
        <History className="w-3.5 h-3.5 text-cyan-400" />
        <span>Marcos Históricos Decisivos</span>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
        {milestones.map((m) => (
          <div
            key={m.id}
            onClick={() => handleMilestoneClick(m)}
            className="p-2 rounded bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                {m.title}
              </span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded">
                <Calendar className="w-3 h-3" />
                {m.year}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {m.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
