"use client";

import React, { useMemo } from "react";
import { useTimelineStore } from "@/stores/timelineStore";
import { MilestonePin } from "./MilestonePin";
import { GLOBAL_MILESTONES, PILOT_COUNTRIES } from "@/lib/country-data";
import { useGlobeStore } from "@/stores/globeStore";

export const TimelineAxis: React.FC = () => {
  const startYear = useTimelineStore((s) => s.startYear);
  const endYear = useTimelineStore((s) => s.endYear);
  const activeCategories = useTimelineStore((s) => s.activeCategories);
  const selectedIso = useGlobeStore((s) => s.selectedIso);

  // Generate Year Ticks
  const ticks = useMemo(() => {
    const range = endYear - startYear;
    let step = 10;
    if (range <= 20) step = 2;
    else if (range <= 50) step = 5;
    else if (range <= 100) step = 10;
    else step = 25;

    const items: { year: number; percent: number }[] = [];
    const firstTick = Math.ceil(startYear / step) * step;

    for (let yr = firstTick; yr <= endYear; yr += step) {
      const percent = ((yr - startYear) / (endYear - startYear)) * 100;
      items.push({ year: yr, percent });
    }
    return items;
  }, [startYear, endYear]);

  // Aggregate Milestones (Global + Selected Country if any)
  const milestones = useMemo(() => {
    const all: any[] = [...GLOBAL_MILESTONES];

    if (selectedIso && PILOT_COUNTRIES[selectedIso]) {
      const countryMilestones = PILOT_COUNTRIES[selectedIso].milestones;
      for (const cm of countryMilestones) {
        if (!all.some((m) => m.id === cm.id)) {
          all.push(cm);
        }
      }
    }

    // Filter by year range and active categories
    const filtered = all.filter(
      (m) =>
        m.year >= startYear &&
        m.year <= endYear &&
        activeCategories.includes(m.category as any)
    );

    // Sort chronologically
    return filtered.sort((a, b) => a.year - b.year);
  }, [startYear, endYear, activeCategories, selectedIso]);

  return (
    <div className="relative w-full h-16 my-1 select-none">
      {/* Central Axis Line */}
      <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-900/40 via-cyan-500/50 to-cyan-900/40" />

      {/* Year Ticks & Labels */}
      {ticks.map((t) => (
        <div
          key={t.year}
          style={{ left: `${t.percent}%` }}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
        >
          <div className="w-[1px] h-3 bg-slate-600/70" />
          <span className="mt-1 font-mono text-[9px] text-slate-400">
            {t.year}
          </span>
        </div>
      ))}

      {/* Alternating Milestone Nodes */}
      {milestones.map((m, idx) => {
        const percent = ((m.year - startYear) / (endYear - startYear)) * 100;
        return (
          <MilestonePin
            key={m.id}
            id={m.id}
            title={m.title}
            summary={m.summary}
            year={m.year}
            exactDate={m.exactDate}
            category={m.category as any}
            latitude={m.latitude}
            longitude={m.longitude}
            index={idx}
            percent={percent}
          />
        );
      })}
    </div>
  );
};
