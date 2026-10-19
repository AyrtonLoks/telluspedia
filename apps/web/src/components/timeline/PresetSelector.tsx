"use client";

import React from "react";
import { useTimelineStore, TimelinePreset } from "@/stores/timelineStore";
import { useHistoricalRouteStore } from "@/stores/historicalRouteStore";

export const PresetSelector: React.FC = () => {
  const startYear = useTimelineStore((s) => s.startYear);
  const endYear = useTimelineStore((s) => s.endYear);
  const geologicalMa = useTimelineStore((s) => s.geologicalMa);
  const activeRouteId = useTimelineStore((s) => s.activeRouteId);
  const setPreset = useTimelineStore((s) => s.setPreset);

  const humanPresets = [
    { id: "LAST_50_YEARS" as TimelinePreset, label: "50 Anos Padrão", start: 1974, end: 2024 },
    { id: "21ST_CENTURY" as TimelinePreset, label: "Século XXI", start: 2000, end: 2026 },
    { id: "COLD_WAR" as TimelinePreset, label: "Guerra Fria", start: 1947, end: 1991 },
    { id: "WORLD_WARS" as TimelinePreset, label: "Guerras Mundiais", start: 1914, end: 1945 },
  ];

  const geologicalPresets = [
    { id: "PANGEA_250MA" as TimelinePreset, label: "🌋 Pangeia (250 Ma)", ma: 250 },
    { id: "GONDWANA_150MA" as TimelinePreset, label: "🦖 Gondwana & Laurásia (150 Ma)", ma: 150 },
    { id: "KPG_66MA" as TimelinePreset, label: "☄️ Cretáceo K-Pg (66 Ma)", ma: 66 },
  ];

  const routePresets = [
    {
      id: "MAGELLAN_1519" as TimelinePreset,
      label: "⛵ Circum-navegação de Magalhães (1519–1522)",
      routeId: "magellan-1519",
    },
  ];

  const handleSelectPreset = (presetId: TimelinePreset) => {
    setPreset(presetId);
    if (presetId === "MAGELLAN_1519") {
      useHistoricalRouteStore.getState().setActiveRouteId("magellan-1519");
    } else {
      useHistoricalRouteStore.getState().setActiveRouteId(null);
    }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* 1. Human History Standard Presets */}
      {humanPresets.map((p) => {
        const isSelected =
          geologicalMa === null &&
          activeRouteId === null &&
          startYear === p.start &&
          endYear === p.end;
        return (
          <button
            key={p.id}
            onClick={() => handleSelectPreset(p.id)}
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

      <div className="h-3 w-[1px] bg-slate-700/50 hidden sm:block mx-0.5" />

      {/* 2. Geological Deep-Time Presets (RN10 & RN11) */}
      {geologicalPresets.map((p) => {
        const isSelected = geologicalMa === p.ma;
        return (
          <button
            key={p.id}
            onClick={() => handleSelectPreset(p.id)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
              isSelected
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/20"
                : "text-amber-400/70 hover:text-amber-300 hover:bg-amber-950/30 border border-amber-900/40"
            }`}
          >
            {p.label}
          </button>
        );
      })}

      <div className="h-3 w-[1px] bg-slate-700/50 hidden sm:block mx-0.5" />

      {/* 3. Historical Expeditions Presets (RN12) */}
      {routePresets.map((p) => {
        const isSelected = activeRouteId === p.routeId;
        return (
          <button
            key={p.id}
            onClick={() => handleSelectPreset(p.id)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
              isSelected
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-500/20"
                : "text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-950/30 border border-emerald-900/40"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
};
