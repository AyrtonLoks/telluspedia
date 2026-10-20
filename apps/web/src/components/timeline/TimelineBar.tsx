"use client";

import React, { useEffect } from "react";
import { ChevronUp, ChevronDown, Clock, Play, Pause, FastForward } from "lucide-react";
import { useTimelineStore } from "@/stores/timelineStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { PresetSelector } from "./PresetSelector";
import { CategoryFilterPills } from "./CategoryFilterPills";
import { TimelineAxis } from "./TimelineAxis";

export const TimelineBar: React.FC = () => {
  const isExpanded = useTimelineStore((s) => s.isExpanded);
  const toggleExpanded = useTimelineStore((s) => s.toggleExpanded);
  const startYear = useTimelineStore((s) => s.startYear);
  const endYear = useTimelineStore((s) => s.endYear);
  const selectedYear = useTimelineStore((s) => s.selectedYear);
  const selectYear = useTimelineStore((s) => s.selectYear);
  const setYearRange = useTimelineStore((s) => s.setYearRange);
  const timelineMode = useTimelineStore((s: any) => s.timelineMode);
  const geologicalMa = useTimelineStore((s: any) => s.geologicalMa);
  const isReaderOpen = useGlobeStore((s) => s.isReaderOpen);
  const selectedIso = useGlobeStore((s) => s.selectedIso);

  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const isPlaying = useCosmicStore((s) => s.isPlaying);
  const playbackSpeed = useCosmicStore((s) => s.playbackSpeed);
  const setPlayback = useCosmicStore((s) => s.setPlayback);
  const setPlaybackSpeed = useCosmicStore((s) => s.setPlaybackSpeed);

  const isGeological =
    timelineMode === "GEOLOGICAL" ||
    (geologicalMa !== null && geologicalMa !== undefined && geologicalMa > 0);

  // Playback timer loop: increments timeline year smoothly when isPlaying is active
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 100;
    // Advance increment per interval based on speed:
    // 365x: 1 year per second -> 0.1 year per 100ms
    // 30x: ~1 month (0.083 yr) per second -> ~0.0083 yr per 100ms
    // 1x: 1 day per second -> ~0.00027 yr per 100ms
    const step =
      playbackSpeed === 365 ? 0.1 : playbackSpeed === 30 ? 0.015 : 0.003;

    const timer = setInterval(() => {
      const currentYear =
        useTimelineStore.getState().selectedYear ??
        useTimelineStore.getState().startYear;
      const curEnd = useTimelineStore.getState().endYear;
      const curStart = useTimelineStore.getState().startYear;

      let next = currentYear + step;
      if (next > curEnd) {
        next = curStart;
      }
      selectYear(Number(next.toFixed(2)));
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, selectYear]);

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
      {/* Header bar: Presets, Playback, Range Indicator, Category Filters, Collapse Toggle */}
      <div
        className={`flex items-center justify-between gap-2.5 pb-2 border-b border-slate-700/40 flex-wrap ${
          selectedIso ? "2xl:flex-nowrap" : "xl:flex-nowrap"
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Linha do Tempo</span>
          </div>

          <PresetSelector />

          {/* Orbital / Chronological Playback Controls */}
          <div className="flex items-center gap-1 bg-slate-900/70 border border-slate-800 rounded-xl px-1.5 py-0.5">
            <button
              onClick={() => setPlayback(!isPlaying)}
              data-testid="timeline-play-toggle"
              className={`p-1 rounded-lg text-xs transition-colors ${
                isPlaying
                  ? "bg-cyan-500 text-slate-950 font-bold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
              title={isPlaying ? "Pausar reprodução orbital" : "Reproduzir evolução orbital"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => {
                const nextSpeed = playbackSpeed === 1 ? 30 : playbackSpeed === 30 ? 365 : 1;
                setPlaybackSpeed(nextSpeed);
              }}
              data-testid="timeline-speed-toggle"
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold text-cyan-300 hover:bg-slate-800 transition-colors"
              title="Velocidade de reprodução (1x, 30x, 365x)"
            >
              <FastForward className="w-3 h-3 text-cyan-400" />
              <span>{playbackSpeed}x</span>
            </button>
          </div>
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
