"use client";

import { useHistoricalRouteStore } from "@/stores/historicalRouteStore";
import { applyTimelinePreset } from "@/stores/actions";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTimelineStore, TimelinePreset } from "@/stores/timelineStore";
import { cn } from "@/components/ui/cn";
import { MAGELLAN_ROUTE_ID } from "@/lib/epoch/constants";

/** Todos os recortes usam o mesmo estilo; selecionado = superfície elevada (segmento ativo). */
function presetClasses(isSelected: boolean) {
  return cn(
    "h-7 shrink-0 whitespace-nowrap rounded-control px-2.5 text-caption font-medium transition-colors duration-fast ease-out",
    isSelected ? "bg-surface-hover text-fg" : "text-fg-secondary hover:bg-surface-hover/60 hover:text-fg"
  );
}

export const PresetSelector: React.FC = () => {
  const startYear = useTimelineStore((s) => s.startYear);
  const endYear = useTimelineStore((s) => s.endYear);
  const geologicalMa = useTimelineStore((s) => s.geologicalMa);
  const activeRouteId = useHistoricalRouteStore((s) => s.activeRouteId);

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
      routeId: MAGELLAN_ROUTE_ID,
    },
  ];

  return (
    <div className="relative flex items-center min-w-0 flex-1">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount(-180)}
          aria-label="Rolar períodos para a esquerda"
          className="absolute left-0 z-10 flex h-full items-center rounded-l-control bg-gradient-to-r from-surface via-surface/80 to-transparent px-1 text-fg-secondary transition-colors duration-fast ease-out hover:text-fg"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
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
              onClick={() => applyTimelinePreset(p.id)}
              title={p.label}
              aria-label={p.label}
              aria-pressed={isSelected}
              className={presetClasses(isSelected)}
            >
              {p.shortLabel}
            </button>
          );
        })}

        <div className="mx-1 h-4 w-px shrink-0 bg-line-strong" aria-hidden="true" />

        {/* 2. Geological Deep-Time Presets (RN10 & RN11) */}
        {geologicalPresets.map((p) => {
          const isSelected = geologicalMa === p.ma;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => applyTimelinePreset(p.id)}
              title={p.label}
              aria-label={p.label}
              aria-pressed={isSelected}
              className={presetClasses(isSelected)}
            >
              {p.shortLabel}
            </button>
          );
        })}

        <div className="mx-1 h-4 w-px shrink-0 bg-line-strong" aria-hidden="true" />

        {/* 3. Historical Expeditions Presets (RN12) */}
        {routePresets.map((p) => {
          const isSelected = activeRouteId === p.routeId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => applyTimelinePreset(p.id)}
              title={p.label}
              aria-label={p.label}
              aria-pressed={isSelected}
              className={presetClasses(isSelected)}
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
          className="absolute right-0 z-10 flex h-full items-center rounded-r-control bg-gradient-to-l from-surface via-surface/80 to-transparent px-1 text-fg-secondary transition-colors duration-fast ease-out hover:text-fg"
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
