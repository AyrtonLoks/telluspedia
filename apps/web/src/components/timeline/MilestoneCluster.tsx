"use client";

import React from "react";
import type { MilestoneItem } from "@/lib/country-data";
import { useTimelineStore } from "@/stores/timelineStore";
import { useGlobeStore } from "@/stores/globeStore";
import { CATEGORY_TONE, TONES } from "@/components/ui/tones";
import { cn } from "@/components/ui/cn";

/**
 * Grupo de marcos próximos (D13): contagem no eixo; hover/foco mostra a prévia com a lista;
 * clique aproxima o zoom até separar os marcos (ou, se já não dá para separar, mantém a lista).
 */
export const MilestoneCluster: React.FC<{
  members: MilestoneItem[];
  percent: number;
  /** Aproxima o eixo para separar o grupo; devolve falso quando já está no zoom máximo útil. */
  onExpand: () => boolean;
}> = ({ members, percent, onExpand }) => {
  const selectMilestone = useTimelineStore((s) => s.selectMilestone);
  const selectYear = useTimelineStore((s) => s.selectYear);
  const flyTo = useGlobeStore((s) => s.flyTo);
  const [pinned, setPinned] = React.useState(false);

  // Cor: a categoria de todos, se for uma só; senão neutra.
  const categories = new Set(members.map((m) => m.category));
  const tone = categories.size === 1 ? TONES[CATEGORY_TONE[members[0].category] ?? "cat-politics"] : null;
  const years = members.map((m) => m.year);
  const range = Math.min(...years) === Math.max(...years) ? String(years[0]) : `${Math.min(...years)}–${Math.max(...years)}`;
  const align = percent < 15 ? "left-0" : percent > 78 ? "right-0" : "left-1/2 -translate-x-1/2";

  const open = (m: MilestoneItem) => {
    selectMilestone(m.id);
    selectYear(m.year);
    if (m.latitude !== undefined && m.longitude !== undefined) flyTo(m.latitude, m.longitude, m.preferredAltitude ?? 1.8);
    setPinned(false);
  };

  return (
    <div
      data-testid="timeline-cluster"
      data-count={members.length}
      style={{ left: `${Math.max(2, Math.min(98, percent))}%` }}
      className="group absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 hover:z-40 focus-within:z-40"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label={`${members.length} eventos entre ${range}. Aproximar para separar`}
        aria-expanded={pinned}
        onClick={() => {
          if (!onExpand()) setPinned((p) => !p);
        }}
        className={cn(
          "flex h-5 min-w-5 items-center justify-center rounded-full border-2 bg-surface px-1 font-mono text-caption font-semibold tabular-nums text-fg shadow-e1 transition-transform duration-fast ease-out hover:scale-110",
          tone ? tone.ring : "border-line-strong"
        )}
      >
        {members.length}
      </button>

      {/* Prévia: título, data e categoria de cada marco do grupo */}
      <div
        role="list"
        className={cn(
          "absolute bottom-7 w-60 rounded-card border border-line bg-surface p-2 shadow-e2 transition-opacity duration-base ease-out",
          align,
          pinned
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
        )}
      >
        <div className="mb-1 px-1 font-mono text-caption tabular-nums text-fg-muted">
          {members.length} eventos · {range}
        </div>
        {members.slice(0, 6).map((m) => {
          const t = TONES[CATEGORY_TONE[m.category] ?? "cat-politics"];
          return (
            <button
              key={m.id}
              type="button"
              role="listitem"
              onClick={() => open(m)}
              className="flex w-full items-start gap-2 rounded-control px-1 py-1 text-left transition-colors duration-fast ease-out hover:bg-surface-hover"
            >
              <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", t.dot)} aria-hidden="true" />
              <span className="min-w-0">
                <span className={cn("mr-1 font-mono text-caption tabular-nums", t.text)}>{m.exactDate ?? m.year}</span>
                <span className="line-clamp-1 text-caption text-fg">{m.title}</span>
              </span>
            </button>
          );
        })}
        {members.length > 6 && (
          <div className="px-1 pt-1 text-caption text-fg-muted">+{members.length - 6} — aproxime o zoom para ver todos</div>
        )}
      </div>
    </div>
  );
};
