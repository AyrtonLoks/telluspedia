"use client";

import React, { useMemo } from "react";
import {
  Rocket,
  Play,
  Pause,
  RotateCcw,
  Radio,
  Eye,
  Minimize2,
  Maximize2,
  ChevronRight,
  Gauge,
  Milestone,
} from "lucide-react";
import { useTimelineStore } from "@/stores/timelineStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useApollo11Store } from "@/stores/apollo11Store";
import { getMissionTelemetry, APOLLO11_PHASES } from "@/lib/apollo11";

export interface Apollo11TelemetryOverlayProps {
  forceActive?: boolean;
}

export const Apollo11TelemetryOverlay: React.FC<Apollo11TelemetryOverlayProps> = ({
  forceActive = false,
}) => {
  const storeYear = useTimelineStore((s) => s.selectedYear);
  const storeMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);

  // In Node.js SSR / unit tests, useSyncExternalStore calls getServerSnapshot which returns initial state.
  // We fall back to getState() during SSR to ensure server render matches current store state.
  const selectedYear =
    typeof window === "undefined"
      ? (useTimelineStore.getState().selectedYear ?? storeYear)
      : storeYear;
  const selectedMilestoneId =
    typeof window === "undefined"
      ? (useTimelineStore.getState().selectedMilestoneId ?? storeMilestoneId)
      : storeMilestoneId;

  const storeIsPlaying = useApollo11Store((s) => s.isPlaying);
  const isPlaying =
    typeof window === "undefined"
      ? (useApollo11Store.getState().isPlaying ?? storeIsPlaying)
      : storeIsPlaying;

  const storeProgress = useApollo11Store((s) => s.progress);
  const progress =
    typeof window === "undefined"
      ? (useApollo11Store.getState().progress ?? storeProgress)
      : storeProgress;

  const storePlaybackSpeed = useApollo11Store((s) => s.playbackSpeed);
  const playbackSpeed =
    typeof window === "undefined"
      ? (useApollo11Store.getState().playbackSpeed ?? storePlaybackSpeed)
      : storePlaybackSpeed;

  const storeIsMinimized = useApollo11Store((s) => s.isMinimized);
  const isMinimized =
    typeof window === "undefined"
      ? (useApollo11Store.getState().isMinimized ?? storeIsMinimized)
      : storeIsMinimized;

  const togglePlay = useApollo11Store((s) => s.togglePlay);
  const setProgress = useApollo11Store((s) => s.setProgress);
  const setPlaybackSpeed = useApollo11Store((s) => s.setPlaybackSpeed);
  const toggleMinimized = useApollo11Store((s) => s.toggleMinimized);
  const jumpToPhase = useApollo11Store((s) => s.jumpToPhase);
  const resetMission = useApollo11Store((s) => s.resetMission);

  const flyTo = useGlobeStore((s) => s.flyTo);

  const isApolloActive =
    forceActive ||
    selectedYear === 1969 ||
    selectedMilestoneId === "usa-1969" ||
    selectedMilestoneId === "glo-1969";

  const telemetry = useMemo(() => {
    return getMissionTelemetry(progress);
  }, [progress]);

  if (!isApolloActive) return null;

  const handleWideView = () => {
    flyTo(15, -20, 5.2);
  };

  const handleCanaveralView = () => {
    flyTo(28.5721, -80.648, 2.0);
  };

  const handleMoonView = () => {
    // Focus camera directly on the Moon (3.6, 0.4, 0) and Tranquility Base from lunar perspective
    flyTo(6.34, 0, 4.8);
  };

  return (
    <div
      data-apollo-telemetry-overlay="true"
      className="fixed top-20 left-6 z-20 w-88 max-w-[calc(100vw-3rem)] glass-panel rounded-2xl p-4 shadow-2xl border border-cyan-500/30 transition-all duration-300 animate-in fade-in slide-in-from-left-4 text-slate-100 select-none"
    >
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/20">
            <Rocket className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-cyan-400">APOLLO 11</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono">
                1969
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Telemetria de Voo Espacial NASA</p>
          </div>
        </div>

        <button
          onClick={toggleMinimized}
          aria-label={isMinimized ? "Expandir HUD" : "Minimizar HUD"}
          className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 transition-colors"
        >
          {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
      </div>

      {!isMinimized && (
        <>
          {/* 2. Real-time Telemetry Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 my-3">
            {/* Speed Gauge */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2 flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Gauge className="w-3 h-3 text-cyan-400" /> Vel.
              </span>
              <span className="text-xs font-mono font-bold text-cyan-300 mt-1">
                {telemetry.speedKmH.toLocaleString("pt-BR")}
              </span>
              <span className="text-[9px] font-mono text-slate-400">km/h</span>
            </div>

            {/* Distance from Earth */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2 flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Milestone className="w-3 h-3 text-cyan-400" /> Dist.
              </span>
              <span className="text-xs font-mono font-bold text-slate-200 mt-1">
                {telemetry.distanceKm.toLocaleString("pt-BR")}
              </span>
              <span className="text-[9px] font-mono text-slate-400">km</span>
            </div>

            {/* Ground Elapsed Time (GET) */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2 flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Radio className="w-3 h-3 text-amber-400" /> GET
              </span>
              <span className="text-xs font-mono font-bold text-amber-300 mt-1">
                {telemetry.getFormatted}
              </span>
              <span className="text-[9px] font-mono text-slate-400">HHH:MM:SS</span>
            </div>
          </div>

          {/* 3. Mission Phase Stepper */}
          <div className="space-y-1.5 my-3">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Fases da Missão Translunar
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {APOLLO11_PHASES.map((phase) => {
                const isActive = telemetry.phase.id === phase.id;
                return (
                  <button
                    key={phase.id}
                    onClick={() => jumpToPhase(phase.id)}
                    className={`text-left p-2 rounded-xl border text-[11px] transition-all flex flex-col gap-0.5 ${
                      isActive
                        ? "bg-cyan-500/15 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/20"
                        : "bg-slate-900/50 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                      {isActive && <ChevronRight className="w-3 h-3 text-cyan-400 animate-pulse" />}
                      {phase.badge}
                    </span>
                    <span className="truncate text-[10px] font-medium leading-tight">
                      {phase.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Current Phase Description */}
            <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-2 text-[10px] text-slate-300 flex items-start gap-2 mt-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1 shrink-0 animate-ping" />
              <p className="leading-snug">{telemetry.phase.description}</p>
            </div>
          </div>

          {/* 4. Scrubbable Mission Timeline Slider */}
          <div className="my-3 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>0% (Cabo Canaveral)</span>
              <span className="text-cyan-300 font-bold">{Math.round(progress * 100)}%</span>
              <span>100% (Mar da Tranquilidade)</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.002"
              value={progress}
              onChange={(e) => setProgress(parseFloat(e.target.value))}
              aria-label="Progresso da missão Apollo 11"
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 focus:outline-none"
            />
          </div>

          {/* 5. Playback Controls & Speed Multipliers */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5">
              <button
                onClick={togglePlay}
                aria-label={isPlaying ? "Pausar voo orbital" : "Iniciar voo orbital"}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors shadow-md shadow-cyan-500/20"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? "Pausar" : "Reproduzir"}</span>
              </button>

              <button
                onClick={resetMission}
                aria-label="Reiniciar voo"
                title="Reiniciar voo"
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speed Multipliers */}
            <div className="flex items-center gap-1">
              {[0.5, 1.0, 2.0].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors ${
                    playbackSpeed === speed
                      ? "bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-bold"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* 6. Cinematic Camera Presets */}
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Eye className="w-3 h-3 text-cyan-400" /> Câmera:
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleWideView}
                className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-colors"
              >
                Orbital Ampla
              </button>
              <button
                onClick={handleCanaveralView}
                className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-colors"
              >
                Terra
              </button>
              <button
                onClick={handleMoonView}
                className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-colors"
              >
                Lua
              </button>
            </div>
          </div>

          {/* 7. Historical Radio Transmission Pill */}
          {progress >= 0.96 && (
            <div className="mt-3 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[10px] font-mono animate-in fade-in flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
              <span>&ldquo;Houston, Tranquility Base here. The Eagle has landed.&rdquo;</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Apollo11TelemetryOverlay;
