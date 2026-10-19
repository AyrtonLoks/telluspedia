"use client";

import React, { useEffect, useRef } from "react";
import { X, Globe, BookOpen, ExternalLink, Quote } from "lucide-react";
import { MilestoneCategoryType } from "@/stores/timelineStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useReaderStore } from "@/stores/readerStore";
import { getSourceUrl } from "@/lib/citations";
import { getCountryData } from "@/lib/country-data";

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

const CATEGORY_COLORS: Record<MilestoneCategoryType, { border: string; glow: string; text: string }> = {
  POLITICS_REGIMES: { border: "border-cyan-400", glow: "shadow-cyan-500/50", text: "text-cyan-300" },
  ECONOMY: { border: "border-amber-400", glow: "shadow-amber-500/50", text: "text-amber-300" },
  WAR_MILITARY: { border: "border-rose-400", glow: "shadow-rose-500/50", text: "text-rose-300" },
  SCIENCE_CULTURE: { border: "border-emerald-400", glow: "shadow-emerald-500/50", text: "text-emerald-300" },
  HEALTH_PANDEMICS: { border: "border-purple-400", glow: "shadow-purple-500/50", text: "text-purple-300" },
};

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
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.POLITICS_REGIMES;
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
          className={`w-[1px] h-full mx-auto transition-colors ${
            isSelected
              ? "bg-cyan-400"
              : "bg-slate-600/60 group-hover:bg-cyan-400"
          }`}
        />
      </div>

      {/* Pin node on axis */}
      <div
        className={`w-3.5 h-3.5 rounded-full border-2 transition-all transform group-hover:scale-125 ${
          colors.border
        } ${
          isSelected
            ? `bg-cyan-400 scale-125 shadow-lg ${colors.glow}`
            : "bg-slate-900 group-hover:bg-cyan-500/20"
        }`}
      />

      {/* Floating Card: Staggers Upwards (bottom-7 or bottom-24) */}
      <div
        className={`absolute ${horizontalAlignmentClass} w-52 p-2.5 rounded-xl bg-slate-950/95 backdrop-blur-md border border-slate-700/80 shadow-2xl transition-all duration-200 ${
          isHigh ? "bottom-24" : "bottom-7"
        } ${
          isSelected
            ? "opacity-100 ring-1 ring-cyan-400 pointer-events-auto z-50"
            : "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-30 group-hover:z-50"
        }`}
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between text-[10px] mb-1 gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`font-mono font-bold ${colors.text}`}>{year}</span>
            {exactDate && <span className="text-slate-400 text-[9px] truncate">{exactDate}</span>}
          </div>
          {isSelected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                selectMilestone(null);
              }}
              className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-auto"
              title="Fechar (Esc)"
              aria-label="Fechar milestone"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="text-xs font-semibold text-slate-100 line-clamp-1 leading-snug">{title}</div>
        <div className="text-[10px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
          {summary}
        </div>
        {sourcePrimary && (
          <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between gap-1">
            <a
              href={getSourceUrl(sourcePrimary)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[9px] text-cyan-300 hover:text-cyan-100 hover:underline font-mono border border-slate-800 truncate max-w-[130px] transition-colors"
              title={`Repositório da fonte primária: ${sourcePrimary}`}
            >
              <span className="truncate">Fonte: {sourcePrimary}</span>
              <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
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
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800/50 text-[9px] text-cyan-300 hover:text-white transition-colors"
              title={`Gerar citação acadêmica para '${title}'`}
            >
              <Quote className="w-2.5 h-2.5" />
              <span>Citar</span>
            </button>
          </div>
        )}
        <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center gap-1.5 flex-wrap">
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
              className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-[10px] font-medium transition-colors"
              title={`Explorar ${effectiveCountryIso} no globo`}
            >
              <Globe className="w-3 h-3" />
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
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[10px] font-medium transition-colors flex items-center gap-1"
              title="Aprofundar Dossiê do País (História)"
            >
              <BookOpen className="w-3 h-3 text-cyan-400" />
              <span>Dossiê</span>
            </button>
          )}
          <a
            href={`https://pt.wikipedia.org/wiki/${encodeURIComponent(title)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-1.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-cyan-300 text-[10px] font-medium transition-colors flex items-center gap-1"
            title={`Abrir '${title}' em fonte enciclopédica externa`}
          >
            <ExternalLink className="w-3 h-3 text-cyan-400" />
            <span>Info</span>
          </a>
        </div>
      </div>
    </div>
  );
};
