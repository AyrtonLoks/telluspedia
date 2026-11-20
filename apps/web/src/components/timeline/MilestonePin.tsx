"use client";

import Link from "next/link";
import { StudyContext } from "@/components/tellus-bridge/StudyContext";
import React, { useEffect, useRef } from "react";
import { X, Globe, BookOpen, ExternalLink, Quote } from "lucide-react";
import { MilestoneCategoryType } from "@/stores/timelineStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useReaderStore } from "@/stores/readerStore";
import { getSourceUrl } from "@/lib/citations";
import { getCountryData } from "@/lib/country-data";
import { CATEGORY_TONE, TONES } from "@/components/ui/tones";
import { cn } from "@/components/ui/cn";

const ACTION = "flex items-center justify-center gap-1 rounded-control border border-line bg-surface-raised px-2 py-1 text-caption font-medium text-fg-secondary transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-fg";

interface MilestonePinProps {
  id: string;
  title: string;
  summary: string;
  year: number;
  exactDate?: string;
  category: MilestoneCategoryType;
  sourcePrimary?: string;
  latitude?: number;
  longitude?: number;
  countryIso?: string;
  blocIsos?: string[];
  preferredAltitude?: number;
  index: number;
  percent: number;
}


export const MilestonePin: React.FC<MilestonePinProps> = ({
  id,
  title,
  summary,
  year,
  exactDate,
  category,
  sourcePrimary,
  latitude,
  longitude,
  countryIso,
  blocIsos,
  preferredAltitude,
  index,
  percent,
}) => {
  const pinRef = useRef<HTMLDivElement>(null);
  const selectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);
  const selectMilestone = useTimelineStore((s) => s.selectMilestone);
  const selectYear = useTimelineStore((s) => s.selectYear);
  const flyTo = useGlobeStore((s) => s.flyTo);
  const setSelectedIso = useGlobeStore((s) => s.setSelectedIso);
  const setReaderOpen = useGlobeStore((s) => s.setReaderOpen);
  const setActiveDimension = useReaderStore((s) => s.setActiveDimension);
  const setCitationModalOpen = useReaderStore((s) => s.setCitationModalOpen);

  const isSelected = selectedMilestoneId === id;
  // All cards pop upwards to prevent viewport overflow. Stagger heights (bottom-7 vs bottom-24) to avoid collisions
  const isHigh = index % 2 === 1;
  const tone = TONES[CATEGORY_TONE[category] ?? "cat-politics"];
  const effectiveCountryIso = countryIso || (blocIsos && blocIsos.length > 0 ? blocIsos[0] : undefined);
  const country = effectiveCountryIso ? getCountryData(effectiveCountryIso) : null;

  // Escape key and click-outside deselects currently active milestone without eating pointerdown clicks
  useEffect(() => {
    if (!isSelected) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        selectMilestone(null);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      if (pinRef.current && pinRef.current.contains(target)) return;
      // Do not dismiss when interacting with HUD or timeline bar
      if (target.closest("[data-inspector-hud]") || target.closest("[data-timeline-bar]")) return;
      selectMilestone(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    // Use click listener rather than pointerdown to ensure interactive buttons/links register clicks before dismissal
    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClickOutside);
    };
  }, [isSelected, selectMilestone]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Toggle: clicking an already selected pin deselects it
    if (isSelected) {
      selectMilestone(null);
    } else {
      selectMilestone(id);
      selectYear(year);
      if (latitude !== undefined && longitude !== undefined) {
        flyTo(latitude, longitude, preferredAltitude ?? 1.8);
      }
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelected) {
      selectMilestone(id);
      selectYear(year);
      if (latitude !== undefined && longitude !== undefined) {
        flyTo(latitude, longitude, preferredAltitude ?? 1.8);
      }
    }
  };

  // Horizontal alignment helper to prevent card from clipping against viewport edges or overlapping InspectorHUD
  const horizontalAlignmentClass =
    percent < 15
      ? "left-0 translate-x-0"
      : percent > 78
      ? "right-0 left-auto translate-x-0"
      : "left-1/2 -translate-x-1/2";

  return (
    <div
      ref={pinRef}
      style={{ left: `${Math.max(2, Math.min(98, percent))}%` }}
      className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 group cursor-pointer ${
        isSelected ? "z-50" : "z-20 hover:z-40"
      }`}
      onClick={handleClick}
    >
      {/* Invisible hover bridge & visible connector line: pops upward only */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 w-6 ${
          isHigh ? "bottom-full h-20" : "bottom-full h-4"
        }`}
      >
        <div
          className={cn(
            "mx-auto h-full w-px transition-colors duration-fast ease-out",
            isSelected ? "bg-fg-secondary" : "bg-line-strong group-hover:bg-fg-muted"
          )}
        />
      </div>

      {/* Pin node on axis */}
      <div
        className={cn(
          "h-3.5 w-3.5 rounded-full border-2 transition-transform duration-fast ease-out group-hover:scale-125",
          tone.ring,
          isSelected ? cn("scale-125", tone.dot) : "bg-surface"
        )}
      />

      {/* Floating Card: Staggers Upwards (bottom-7 or bottom-24) */}
      <div
        className={`absolute ${horizontalAlignmentClass} w-56 rounded-card border border-line bg-surface p-3 shadow-e2 transition-opacity duration-base ease-out ${
          isHigh ? "bottom-24" : "bottom-7"
        } ${
          isSelected
            ? "pointer-events-auto z-50 border-line-strong opacity-100"
            : "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-30 group-hover:z-50"
        }`}
        onClick={handleCardClick}
      >
        <div className="mb-1 flex items-center justify-between gap-1 text-caption">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn("font-mono font-medium tabular-nums", tone.text)}>{year}</span>
            {exactDate && <span className="truncate text-fg-muted">{exactDate}</span>}
          </div>
          {isSelected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                selectMilestone(null);
              }}
              className="ml-auto rounded-sm p-0.5 text-fg-muted transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-fg"
              title="Fechar (Esc)"
              aria-label="Fechar milestone"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="line-clamp-1 text-label font-semibold text-fg">{title}</div>
        <div className="mt-1 line-clamp-2 text-caption text-fg-secondary">
          {summary}
        </div>
        {sourcePrimary && (
          <div className="mt-2 flex items-center justify-between gap-1 border-t border-line pt-1.5">
            <a
              href={getSourceUrl(sourcePrimary)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex max-w-[140px] items-center gap-1 truncate text-caption text-accent hover:text-accent-hover hover:underline"
              title={`Repositório da fonte primária: ${sourcePrimary}`}
            >
              <span className="truncate">Fonte: {sourcePrimary}</span>
              <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />
            </a>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCitationModalOpen(true, {
                  title: `${title} (${year}) - ${summary}`,
                  countryName: country?.nameCommon || effectiveCountryIso || "TellusPedia",
                  url: getSourceUrl(sourcePrimary),
                  accessDate: new Date(),
                  publicationYear: 2026,
                });
              }}
              className={ACTION}
              title={`Gerar citação acadêmica para '${title}'`}
            >
              <Quote aria-hidden="true" className="h-3 w-3" />
              <span>Citar</span>
            </button>
          </div>
        )}
        {isSelected && <StudyContext entityId={`event:${id}`} />}
        {isSelected && id === "bra-1889" && (
          <Link className="text-caption text-accent hover:text-accent-hover hover:underline" href="/dossies/dom-pedro-ii">Dom Pedro II</Link>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line pt-1.5">
          {effectiveCountryIso && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIso(effectiveCountryIso);
                if (latitude !== undefined && longitude !== undefined) {
                  flyTo(latitude, longitude, preferredAltitude ?? 1.8);
                }
              }}
              className={cn(ACTION, "flex-1")}
              title={`Explorar ${effectiveCountryIso} no globo`}
            >
              <Globe aria-hidden="true" className="h-3 w-3" />
              <span>Ver {effectiveCountryIso}</span>
            </button>
          )}
          {effectiveCountryIso && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIso(effectiveCountryIso);
                setActiveDimension("HISTORY");
                setReaderOpen(true);
              }}
              className={ACTION}
              title="Aprofundar Dossiê do País (História)"
            >
              <BookOpen aria-hidden="true" className="h-3 w-3" />
              <span>Dossiê</span>
            </button>
          )}
          <a
            href={`https://pt.wikipedia.org/wiki/${encodeURIComponent(title)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={ACTION}
            title={`Abrir '${title}' em fonte enciclopédica externa`}
          >
            <ExternalLink aria-hidden="true" className="h-3 w-3" />
            <span>Info</span>
          </a>
        </div>
      </div>
    </div>
  );
};
