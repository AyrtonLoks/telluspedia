"use client";

import React from "react";
import { ChevronUp, ChevronDown, Clock } from "lucide-react";
import { useTimelineStore } from "@/stores/timelineStore";
import { useGlobeStore } from "@/stores/globeStore";
import { PresetSelector } from "./PresetSelector";
import { CategoryFilterPills } from "./CategoryFilterPills";
import { TimelineAxis } from "./TimelineAxis";

export const TimelineBar: React.FC = () => {
  const isExpanded = useTimelineStore((s) => s.isExpanded);
  const toggleExpanded = useTimelineStore((s) => s.toggleExpanded);
  const startYear = useTimelineStore((s) => s.startYear);
  const endYear = useTimelineStore((s) => s.endYear);
  const setYearRange = useTimelineStore((s) => s.setYearRange);
  const isReaderOpen = useGlobeStore((s) => s.isReaderOpen);

  // If reader is open, hide timeline to maximize reading immersion
  if (isReaderOpen) return null;

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (val < endYear) {
      setYearRange(val, endYear);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (val > startYear) {
      setYearRange(startYear, val);
    }
  };

  return (
    <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[95vw] max-w-6xl glass-panel rounded-2xl px-5 py-3 transition-all duration-300">
      {/* Header bar: Presets, Range Indicator, Category Filters, Collapse Toggle */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-700/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
            <Clock className="w-4 h-4" />
            <span>Linha do Tempo</span>
          </div>

          <PresetSelector />
        </div>

        {/* Year Range Inputs */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <input
            type="number"
            value={startYear}
            onChange={handleStartChange}
            className="w-16 px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-slate-100 text-center"
            min={1500}
            max={endYear - 1}
          />
          <span className="text-slate-500">—</span>
          <input
            type="number"
            value={endYear}
            onChange={handleEndChange}
            className="w-16 px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-slate-100 text-center"
            min={startYear + 1}
            max={2030}
          />
          <span className="text-[10px] text-slate-400 font-sans">
            ({endYear - startYear} anos)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <CategoryFilterPills />

          <button
            onClick={toggleExpanded}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isExpanded ? "Recolher timeline" : "Expandir timeline"}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Axis and Milestone Markers (collapsible) */}
      {isExpanded && <TimelineAxis />}
    </footer>
  );
};
