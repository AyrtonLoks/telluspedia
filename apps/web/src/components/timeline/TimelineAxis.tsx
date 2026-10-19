"use client";

import React, { useMemo } from "react";
import { useTimelineStore } from "@/stores/timelineStore";
import { MilestonePin } from "./MilestonePin";
import { GLOBAL_MILESTONES, PILOT_COUNTRIES, MilestoneItem } from "@/lib/country-data";
import { useGlobeStore } from "@/stores/globeStore";

export const TimelineAxis: React.FC = () => {
  const startYear = useTimelineStore((s) => s.startYear);
  const endYear = useTimelineStore((s) => s.endYear);
  const activeCategories = useTimelineStore((s) => s.activeCategories);
  const selectMilestone = useTimelineStore((s) => s.selectMilestone);
  const selectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);
  const timelineMode = useTimelineStore((s: any) => s.timelineMode);
  const geologicalMa = useTimelineStore((s: any) => s.geologicalMa);
  const selectGeologicalMa = useTimelineStore((s: any) => s.selectGeologicalMa);
  const selectedIso = useGlobeStore((s) => s.selectedIso);

  const isGeological =
    timelineMode === "GEOLOGICAL" ||
    (geologicalMa !== null && geologicalMa !== undefined && geologicalMa > 0);

  const span = Math.max(1, endYear - startYear);

  // 1. Geological Deep-Time Nodes & Ticks (RN10 & RN11)
  const geologicalTicks = useMemo(() => [
    { ma: 300, label: "300 Ma", percent: 0 },
    { ma: 250, label: "250 Ma", percent: 16.67 },
    { ma: 200, label: "200 Ma", percent: 33.33 },
    { ma: 150, label: "150 Ma", percent: 50.0 },
    { ma: 100, label: "100 Ma", percent: 66.67 },
    { ma: 66, label: "66 Ma", percent: 78.0 },
    { ma: 0, label: "0 Ma (Hoje)", percent: 100 },
  ], []);

  const geologicalMilestones = useMemo(() => [
    {
      id: "pangea-250ma",
      title: "Pangeia (~250 Ma)",
      subtitle: "Permo-Triássico",
      summary: "Supercontinente unificado cercado pelo oceano Panthalassa e Mar de Tétis.",
      ageMa: 250,
      percent: 16.67,
      emoji: "🌋",
      badgeColor: "border-amber-500 bg-amber-500/20 text-amber-300",
    },
    {
      id: "breakup-200ma",
      title: "Fragmentação Inicial (~200 Ma)",
      subtitle: "Triássico-Jurássico",
      summary: "Rifteamento continental e abertura primordial do Atlântico Central.",
      ageMa: 200,
      percent: 33.33,
      emoji: "🌊",
      badgeColor: "border-sky-500 bg-sky-500/20 text-sky-300",
    },
    {
      id: "gondwana-150ma",
      title: "Gondwana & Laurásia (~150 Ma)",
      subtitle: "Jurássico Tardio",
      summary: "Separação dos blocos norte e sul; apogeu dos grandes dinossauros.",
      ageMa: 150,
      percent: 50.0,
      emoji: "🦖",
      badgeColor: "border-emerald-500 bg-emerald-500/20 text-emerald-300",
    },
    {
      id: "kpg-66ma",
      title: "Extinção Cretáceo K-Pg (~66 Ma)",
      subtitle: "Cretáceo Tardio",
      summary: "Impacto de asteroide em Chicxulub e extinção em massa dos dinossauros.",
      ageMa: 66,
      percent: 78.0,
      emoji: "☄️",
      badgeColor: "border-rose-500 bg-rose-500/20 text-rose-300",
    },
    {
      id: "contemporary-0ma",
      title: "Geografia Atual (0 Ma)",
      subtitle: "Quaternário / Holoceno",
      summary: "Conformação moderna dos 177 países e civilização humana contemporânea.",
      ageMa: 0,
      percent: 100,
      emoji: "🌍",
      badgeColor: "border-cyan-500 bg-cyan-500/20 text-cyan-300",
    },
  ], []);

  // Generate Year Ticks
  const ticks = useMemo(() => {
    let step = 10;
    if (span <= 20) step = 2;
    else if (span <= 50) step = 5;
    else if (span <= 100) step = 10;
    else step = 25;

    const items: { year: number; percent: number }[] = [];
    const firstTick = Math.ceil(startYear / step) * step;

    for (let yr = firstTick; yr <= endYear; yr += step) {
      const percent = ((yr - startYear) / span) * 100;
      items.push({ year: yr, percent });
    }
    return items;
  }, [startYear, endYear, span]);

  // Aggregate Milestones (Global + Selected Country if any)
  const milestones = useMemo(() => {
    const all: MilestoneItem[] = [...GLOBAL_MILESTONES];

    if (selectedIso && PILOT_COUNTRIES[selectedIso]) {
      const countryMilestones = PILOT_COUNTRIES[selectedIso].milestones;
      for (const cm of countryMilestones) {
        if (!all.some((m) => m.id === cm.id)) {
          all.push({
            ...cm,
            countryIso: cm.countryIso || selectedIso,
          });
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

  const handleAxisBackgroundClick = () => {
    selectMilestone(null);
  };

  if (isGeological) {
    return (
      <div
        className="relative w-full h-16 my-1 select-none cursor-default"
        onClick={handleAxisBackgroundClick}
        data-testid="geological-timeline-axis"
      >
        {/* Central Axis Line in Terracotta / Amber Gradient */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-700/60 via-amber-500/80 to-cyan-500/60" />

        {/* Geological Ticks & Labels */}
        {geologicalTicks.map((t) => (
          <div
            key={t.ma}
            style={{ left: `${t.percent}%` }}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
          >
            <div className="w-[1px] h-3 bg-amber-600/70" />
            <span className="mt-1 font-mono text-[9px] text-amber-300/80 whitespace-nowrap">
              {t.label}
            </span>
          </div>
        ))}

        {/* Geological Milestone Nodes */}
        {geologicalMilestones.map((m, idx) => {
          const isTop = idx % 2 === 0;
          const isSelected =
            (m.ageMa > 0 && geologicalMa === m.ageMa) ||
            selectedMilestoneId === m.id;

          const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (m.ageMa === 0) {
              const timeline = useTimelineStore.getState();
              timeline.setGeologicalMa(null);
              timeline.setTimelineMode("HISTORICAL");
              timeline.selectYear(2024);
              timeline.setYearRange(1974, 2024);
              timeline.selectMilestone(null);
            } else {
              selectGeologicalMa(m.ageMa);
              selectMilestone(m.id);
            }
          };

          return (
            <div
              key={m.id}
              style={{ left: `${m.percent}%` }}
              className={`absolute -translate-x-1/2 z-10 ${
                isTop ? "top-1" : "bottom-1"
              }`}
            >
              <button
                onClick={handleClick}
                title={`${m.title} — ${m.subtitle}`}
                className={`group relative flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium transition-all shadow-md ${
                  isSelected
                    ? "bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 scale-105"
                    : "bg-slate-900/90 text-amber-300 border-amber-500/40 hover:bg-slate-800 hover:border-amber-400"
                }`}
              >
                <span>{m.emoji}</span>
                <span className="hidden sm:inline font-mono">{m.ageMa > 0 ? `${m.ageMa} Ma` : "Hoje"}</span>
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-16 my-1 select-none cursor-default"
      onClick={handleAxisBackgroundClick}
    >
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
        const percent = ((m.year - startYear) / span) * 100;
        return (
          <MilestonePin
            key={m.id}
            id={m.id}
            title={m.title}
            summary={m.summary}
            year={m.year}
            exactDate={m.exactDate}
            category={m.category as any}
            sourcePrimary={m.sourcePrimary}
            latitude={m.latitude}
            longitude={m.longitude}
            countryIso={m.countryIso}
            blocIsos={m.blocIsos}
            preferredAltitude={m.preferredAltitude}
            index={idx}
            percent={percent}
          />
        );
      })}
    </div>
  );
};
