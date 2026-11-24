"use client";

import React from "react";
import { enterGeologicalMode, restoreContemporaryTimeline } from "@/stores/actions";
import { GEOLOGICAL_MILESTONE_IDS } from "@/lib/epoch/constants";
import { cn } from "@/components/ui/cn";

const GEOLOGICAL_TICKS = [
  { ma: 300, label: "300 Ma", percent: 0 },
  { ma: 250, label: "250 Ma", percent: 16.67 },
  { ma: 200, label: "200 Ma", percent: 33.33 },
  { ma: 150, label: "150 Ma", percent: 50.0 },
  { ma: 100, label: "100 Ma", percent: 66.67 },
  { ma: 66, label: "66 Ma", percent: 78.0 },
  { ma: 0, label: "0 Ma (Hoje)", percent: 100 },
] as const;

const GEOLOGICAL_MILESTONES = [
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
] as const;

export interface GeologicalTimelineAxisProps {
  geologicalMa: number | null;
  selectedMilestoneId: string | null;
  onBackgroundClick: () => void;
}

/** Eixo de tempo profundo geológico (RN10 & RN11, extraído de TimelineAxis na T45). */
export const GeologicalTimelineAxis: React.FC<GeologicalTimelineAxisProps> = ({
  geologicalMa,
  selectedMilestoneId,
  onBackgroundClick,
}) => {
  return (
    <div
      className="relative my-1 h-16 w-full cursor-default select-none"
      onClick={onBackgroundClick}
      data-testid="geological-timeline-axis"
    >
      {/* Central Axis Line */}
      <div className="absolute left-0 right-0 top-1/2 h-0.5 rounded-full bg-surface-hover" />

      {/* Geological Ticks & Labels (Hang strictly below central line) */}
      {GEOLOGICAL_TICKS.map((t) => (
        <div
          key={t.ma}
          style={{
            left: t.percent === 100 ? "auto" : `${t.percent}%`,
            right: t.percent === 100 ? 0 : "auto",
          }}
          className={`pointer-events-none absolute top-1/2 flex flex-col items-center pt-1 ${
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
      {GEOLOGICAL_MILESTONES.map((m) => {
        const isSelected =
          (m.ageMa > 0 && geologicalMa === m.ageMa) ||
          selectedMilestoneId === m.id;

        const handleClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (m.ageMa === 0) {
            restoreContemporaryTimeline();
          } else {
            enterGeologicalMode(m.ageMa, m.id);
          }
        };

        return (
          <div
            key={m.id}
            style={{
              left: m.percent === 100 ? "auto" : `${m.percent}%`,
              right: m.percent === 100 ? 0 : "auto",
            }}
            className={`absolute bottom-1/2 z-10 pb-1.5 ${
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
            <div className="mx-auto h-1.5 w-px bg-line-strong" />
          </div>
        );
      })}
    </div>
  );
};
