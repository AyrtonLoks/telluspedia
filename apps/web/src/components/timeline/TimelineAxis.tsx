"use client";

import React, { useMemo } from "react";
import { useTimelineStore } from "@/stores/timelineStore";
import { MilestonePin } from "./MilestonePin";
import { GLOBAL_MILESTONES, PILOT_COUNTRIES, findMilestoneById, MilestoneItem } from "@/lib/country-data";
import { useGlobeStore } from "@/stores/globeStore";
import { cn } from "@/components/ui/cn";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { GEOLOGICAL_MILESTONE_IDS } from "@/lib/epoch/constants";

export const TimelineAxis: React.FC = () => {
  const storeStartYear = useTimelineStore((s) => s.startYear);
  const storeEndYear = useTimelineStore((s) => s.endYear);
  const storeActiveCategories = useTimelineStore((s) => s.activeCategories);
  const selectMilestone = useTimelineStore((s) => s.selectMilestone);
  const storeSelectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);
  const selectGeologicalMa = useTimelineStore((s) => s.selectGeologicalMa);
  const storeSelectedIso = useGlobeStore((s) => s.selectedIso);

  const isServer = typeof window === "undefined";
  const startYear = isServer ? useTimelineStore.getState().startYear : storeStartYear;
  const endYear = isServer ? useTimelineStore.getState().endYear : storeEndYear;
  const activeCategories = isServer
    ? useTimelineStore.getState().activeCategories
    : storeActiveCategories;
  const selectedMilestoneId = isServer
    ? useTimelineStore.getState().selectedMilestoneId
    : storeSelectedMilestoneId;
  // Época ativa: fonte única (T12)
  const epoch = useEpochState();
  const geologicalMa = epoch.geologicalMa;
  const selectedIso = isServer ? useGlobeStore.getState().selectedIso : storeSelectedIso;

  const isGeological = epoch.mode === "GEOLOGICAL";

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
      id: GEOLOGICAL_MILESTONE_IDS.PANGEA,
      title: "Pangeia (~250 Ma)",
      subtitle: "Permo-Triássico",
      summary: "Supercontinente unificado cercado pelo oceano Panthalassa e Mar de Tétis.",
      ageMa: 250,
      percent: 16.67,
      emoji: "🌋",
    },
    {
      id: GEOLOGICAL_MILESTONE_IDS.BREAKUP,
      title: "Fragmentação Inicial (~200 Ma)",
      subtitle: "Triássico-Jurássico",
      summary: "Rifteamento continental e abertura primordial do Atlântico Central.",
      ageMa: 200,
      percent: 33.33,
      emoji: "🌊",
    },
    {
      id: GEOLOGICAL_MILESTONE_IDS.GONDWANA,
      title: "Gondwana & Laurásia (~150 Ma)",
      subtitle: "Jurássico Tardio",
      summary: "Separação dos blocos norte e sul; apogeu dos grandes dinossauros.",
      ageMa: 150,
      percent: 50.0,
      emoji: "🦖",
    },
    {
      id: GEOLOGICAL_MILESTONE_IDS.KPG,
      title: "Extinção Cretáceo K-Pg (~66 Ma)",
      subtitle: "Cretáceo Tardio",
      summary: "Impacto de asteroide em Chicxulub e extinção em massa dos dinossauros.",
      ageMa: 66,
      percent: 78.0,
      emoji: "☄️",
    },
    {
      id: GEOLOGICAL_MILESTONE_IDS.CONTEMPORARY,
      title: "Geografia Atual (0 Ma)",
      subtitle: "Quaternário / Holoceno",
      summary: "Conformação moderna dos 177 países e civilização humana contemporânea.",
      ageMa: 0,
      percent: 100,
      emoji: "🌍",
    },
  ], []);

  // Generate Year Ticks
  const ticks = useMemo(() => {
    let step = 10;
    if (span <= 20) step = 2;
    else if (span <= 50) step = 5;
    else if (span <= 100) step = 10;
    else if (span <= 250) step = 25;
    else if (span <= 500) step = 50;
    else step = 100;

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

    const selected = selectedMilestoneId && findMilestoneById(selectedMilestoneId);
    if (selected && !all.some(item => item.id === selected.id)) all.push(selected);

    // Filter by year range and active categories
    const filtered = all.filter(
      (m) =>
        m.year >= startYear &&
        m.year <= endYear &&
        activeCategories.includes(m.category as any)
    );

    // Sort chronologically
    return filtered.sort((a, b) => a.year - b.year);
  }, [startYear, endYear, activeCategories, selectedIso, selectedMilestoneId]);

  const pinPercents = useMemo(
    () => milestones.map((m) => Math.max(2, Math.min(98, ((m.year - startYear) / span) * 100))),
    [milestones, startYear, span]
  );

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
        <div className="absolute left-0 right-0 top-1/2 h-0.5 rounded-full bg-surface-hover" />

        {/* Geological Ticks & Labels (Hang strictly below central line) */}
        {geologicalTicks.map((t) => (
          <div
            key={t.ma}
            style={{
              left: t.percent === 100 ? "auto" : `${t.percent}%`,
              right: t.percent === 100 ? 0 : "auto",
            }}
            className={`absolute top-1/2 pt-1 flex flex-col items-center pointer-events-none ${
              t.percent === 100
                ? "translate-x-0 items-end"
                : t.percent === 0
                ? "translate-x-0 items-start"
                : "-translate-x-1/2"
            }`}
          >
            <div className="h-2 w-px bg-line-strong" />
            <span className="mt-0.5 whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">
              {t.label}
            </span>
          </div>
        ))}

        {/* Geological Milestone Nodes (Float strictly above central line) */}
        {geologicalMilestones.map((m) => {
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
              style={{
                left: m.percent === 100 ? "auto" : `${m.percent}%`,
                right: m.percent === 100 ? 0 : "auto",
              }}
              className={`absolute bottom-1/2 pb-1.5 z-10 ${
                m.percent === 100 ? "translate-x-0" : "-translate-x-1/2"
              }`}
            >
              <button
                type="button"
                onClick={handleClick}
                title={`${m.title} — ${m.subtitle}`}
                aria-pressed={isSelected}
                className={cn(
                  "group relative flex h-7 items-center gap-1 rounded-full border px-2.5 text-caption font-medium shadow-e1 transition-colors duration-fast ease-out",
                  isSelected
                    ? "border-accent bg-accent text-accent-on"
                    : "border-line-strong bg-surface-raised text-fg hover:bg-surface-hover"
                )}
              >
                <span>{m.emoji}</span>
                <span className="font-mono tabular-nums">{m.ageMa > 0 ? `${m.ageMa} Ma` : "Hoje"}</span>
              </button>
              {/* Subtle connector down to axis */}
              <div className="mx-auto h-1.5 w-px bg-line-strong" />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      data-testid="historical-timeline-axis"
      className="relative w-full h-16 my-1 select-none cursor-default"
      onClick={handleAxisBackgroundClick}
    >
      {/* Central Axis Line */}
      <div className="absolute left-0 right-0 top-1/2 h-0.5 rounded-full bg-surface-hover" />

      {/* Year Ticks & Labels (Hang strictly below central axis & pins so labels never collide with pins) */}
      {ticks.map((t) => {
        const isStartEdge = t.percent <= 2;
        const isEndEdge = t.percent >= 98;
        const hasNearbyPin = pinPercents.some((p) => Math.abs(p - t.percent) < 1.5);

        return (
          <div
            key={t.year}
            data-testid="timeline-year-tick"
            data-year={t.year}
            style={{
              left: isEndEdge ? "auto" : `${t.percent}%`,
              right: isEndEdge ? 0 : "auto",
            }}
            className={`absolute top-1/2 flex flex-col pointer-events-none ${
              isEndEdge
                ? "translate-x-0 items-end"
                : isStartEdge
                ? "translate-x-0 items-start"
                : "-translate-x-1/2 items-center"
            }`}
          >
            <div
              className={cn("h-2.5 w-px", hasNearbyPin ? "bg-line" : "bg-line-strong")}
            />
            <span className="mt-1 whitespace-nowrap font-mono text-caption leading-none tabular-nums text-fg-muted">
              {t.year}
            </span>
          </div>
        );
      })}

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
