"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTimelineStore, TimelinePreset } from "@/stores/timelineStore";
import { useHistoricalRouteStore } from "@/stores/historicalRouteStore";

export const PresetSelector: React.FC = () => {
  const startYear = useTimelineStore((s) => s.startYear);
  const endYear = useTimelineStore((s) => s.endYear);
  const geologicalMa = useTimelineStore((s) => s.geologicalMa);
  const activeRouteId = useTimelineStore((s) => s.activeRouteId);
  const setPreset = useTimelineStore((s) => s.setPreset);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(maxScroll - el.scrollLeft > 2);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => updateScrollState());
      ro.observe(el);
    }
    window.addEventListener("resize", updateScrollState);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const scrollByAmount = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
    }
  };

  const humanPresets = [
    {
      id: "LAST_50_YEARS" as TimelinePreset,
      label: "50 Anos Padrão",
      shortLabel: "50 Anos",
      start: 1974,
      end: 2024,
    },
    {
      id: "21ST_CENTURY" as TimelinePreset,
      label: "Século XXI",
      shortLabel: "Séc. XXI",
      start: 2000,
      end: 2026,
    },
    {
      id: "COLD_WAR" as TimelinePreset,
      label: "Guerra Fria",
      shortLabel: "Guerra Fria",
      start: 1947,
      end: 1991,
    },
    {
      id: "WORLD_WARS" as TimelinePreset,
      label: "Guerras Mundiais",
      shortLabel: "Guerras Mund.",
      start: 1914,
      end: 1945,
    },
  ];

  const geologicalPresets = [
    {
      id: "PANGEA_250MA" as TimelinePreset,
      label: "🌋 Pangeia (250 Ma)",
      shortLabel: "🌋 Pangeia",
      ma: 250,
    },
    {
      id: "GONDWANA_150MA" as TimelinePreset,
      label: "🦖 Gondwana & Laurásia (150 Ma)",
      shortLabel: "🦖 Gondwana",
      ma: 150,
    },
    {
      id: "KPG_66MA" as TimelinePreset,
      label: "☄️ Cretáceo K-Pg (66 Ma)",
      shortLabel: "☄️ Cretáceo",
      ma: 66,
    },
  ];

  const routePresets = [
    {
      id: "MAGELLAN_1519" as TimelinePreset,
      label: "⛵ Circum-navegação de Magalhães (1519–1522)",
      shortLabel: "⛵ Magalhães",
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
    <div className="relative flex items-center min-w-0 flex-1">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount(-180)}
          aria-label="Rolar períodos para a esquerda"
          className="absolute left-0 z-10 h-full px-1 flex items-center bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-transparent text-slate-300 hover:text-cyan-300 transition-colors rounded-l"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        onWheel={handleWheel}
        data-testid="preset-scroll-container"
        className="flex items-center gap-1 flex-nowrap overflow-x-auto scroll-smooth min-w-0 w-full py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
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
              type="button"
              onClick={() => handleSelectPreset(p.id)}
              title={p.label}
              aria-label={p.label}
              aria-pressed={isSelected}
              className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap shrink-0 transition-all ${
                isSelected
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
              }`}
            >
              {p.shortLabel}
            </button>
          );
        })}

        <div className="h-3 w-[1px] bg-slate-700/50 shrink-0 mx-0.5" aria-hidden="true" />

        {/* 2. Geological Deep-Time Presets (RN10 & RN11) */}
        {geologicalPresets.map((p) => {
          const isSelected = geologicalMa === p.ma;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p.id)}
              title={p.label}
              aria-label={p.label}
              aria-pressed={isSelected}
              className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap shrink-0 transition-all ${
                isSelected
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/20"
                  : "text-amber-400/70 hover:text-amber-300 hover:bg-amber-950/30 border border-amber-900/40"
              }`}
            >
              {p.shortLabel}
            </button>
          );
        })}

        <div className="h-3 w-[1px] bg-slate-700/50 shrink-0 mx-0.5" aria-hidden="true" />

        {/* 3. Historical Expeditions Presets (RN12) */}
        {routePresets.map((p) => {
          const isSelected = activeRouteId === p.routeId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p.id)}
              title={p.label}
              aria-label={p.label}
              aria-pressed={isSelected}
              className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap shrink-0 transition-all ${
                isSelected
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-500/20"
                  : "text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-950/30 border border-emerald-900/40"
              }`}
            >
              {p.shortLabel}
            </button>
          );
        })}
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount(180)}
          aria-label="Rolar períodos para a direita"
          className="absolute right-0 z-10 h-full px-1 flex items-center bg-gradient-to-l from-slate-950/95 via-slate-950/80 to-transparent text-slate-300 hover:text-cyan-300 transition-colors rounded-r"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
