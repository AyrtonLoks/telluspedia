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
  const timelineMode = useTimelineStore((s: any) => s.timelineMode);
  const geologicalMa = useTimelineStore((s: any) => s.geologicalMa);
  const isReaderOpen = useGlobeStore((s) => s.isReaderOpen);
  const selectedIso = useGlobeStore((s) => s.selectedIso);

  const isGeological =
    timelineMode === "GEOLOGICAL" ||
    (geologicalMa !== null && geologicalMa !== undefined && geologicalMa > 0);

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
    <footer
      data-timeline-bar="true"
      className={`fixed bottom-4 z-20 glass-panel rounded-2xl px-4 md:px-5 py-3 transition-all duration-300 ${
        selectedIso
          ? "left-4 right-4 lg:right-[26.5rem] lg:left-6 max-w-[calc(100vw-2rem)] lg:max-w-[calc(100vw-28.5rem)] translate-x-0"
          : "left-1/2 -translate-x-1/2 right-auto w-[95vw] max-w-6xl"
      }`}
    >
      {/* Header bar: Presets, Range Indicator, Category Filters, Collapse Toggle */}
      <div className={`flex items-center justify-between gap-2.5 pb-2 border-b border-slate-700/40 flex-wrap ${selectedIso ? "2xl:flex-nowrap" : "xl:flex-nowrap"}`}>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Linha do Tempo</span>
          </div>

          <PresetSelector />
        </div>

        {/* Year Range Inputs or Geological Deep-Time Range */}
        {isGeological ? (
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono shrink-0">
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-semibold whitespace-nowrap">300 Ma — 0 Ma</span>
              <span className="text-[10px] text-amber-400/70 font-sans hidden lg:inline whitespace-nowrap">
                (Tempo Geológico Profundo)
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono shrink-0">
            <input
              type="number"
              value={startYear}
              onChange={handleStartChange}
              className="w-14 sm:w-16 px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-slate-100 text-center"
              min={1400}
              max={endYear - 1}
            />
            <span className="text-slate-500">—</span>
            <input
              type="number"
              value={endYear}
              onChange={handleEndChange}
              className="w-14 sm:w-16 px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-slate-100 text-center"
              min={startYear + 1}
              max={2030}
            />
            <span className="text-[10px] text-slate-400 font-sans hidden md:inline">
              ({endYear - startYear} anos)
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
          {!isGeological && <CategoryFilterPills />}

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
