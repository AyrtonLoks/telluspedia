"use client";

import React from "react";
import { History, Calendar, Globe, BookOpen, ExternalLink, Quote } from "lucide-react";
import { useTimelineStore } from "@/stores/timelineStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useReaderStore } from "@/stores/readerStore";
import { MilestoneItem } from "@/lib/country-data";
import { getSourceUrl } from "@/lib/citations";

interface CountryMiniTimelineProps {
  milestones: MilestoneItem[];
  countryName?: string;
}

export const CountryMiniTimeline: React.FC<CountryMiniTimelineProps> = ({ milestones, countryName }) => {
  const selectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);
  const selectMilestone = useTimelineStore((s) => s.selectMilestone);
  const selectYear = useTimelineStore((s) => s.selectYear);
  const flyTo = useGlobeStore((s) => s.flyTo);
  const setReaderOpen = useGlobeStore((s) => s.setReaderOpen);
  const setActiveDimension = useReaderStore((s) => s.setActiveDimension);
  const setCitationModalOpen = useReaderStore((s) => s.setCitationModalOpen);

  if (!milestones || milestones.length === 0) return null;

  const handleMilestoneClick = (e: React.MouseEvent, m: MilestoneItem) => {
    e.stopPropagation();
    if (selectedMilestoneId === m.id) {
      selectMilestone(null);
    } else {
      selectMilestone(m.id);
      selectYear(m.year);
      if (m.latitude !== undefined && m.longitude !== undefined) {
        flyTo(m.latitude, m.longitude, m.preferredAltitude ?? 1.8);
      }
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-700/60">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
        <History className="w-3.5 h-3.5 text-cyan-400" />
        <span>Marcos Históricos Decisivos</span>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {milestones.map((m) => {
          const isSelected = selectedMilestoneId === m.id;
          return (
            <div
              key={m.id}
              onClick={(e) => handleMilestoneClick(e, m)}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all group ${
                isSelected
                  ? "bg-cyan-950/50 border-cyan-400 ring-1 ring-cyan-400/80 shadow-lg shadow-cyan-950/60"
                  : "bg-slate-900/50 hover:bg-slate-800/80 border-slate-800/80 hover:border-cyan-500/40"
              }`}
            >
              <div className="flex items-center justify-between text-xs gap-1">
                <span
                  className={`font-semibold transition-colors ${
                    isSelected ? "text-cyan-300" : "text-slate-200 group-hover:text-cyan-300"
                  }`}
                >
                  {m.title}
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded shrink-0 border border-cyan-800/50">
                  <Calendar className="w-3 h-3" />
                  {m.year}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {m.summary}
              </p>
              <div className="mt-2 pt-1.5 border-t border-slate-800/70 flex items-center justify-between text-[10px] gap-2">
                <span className="text-slate-500 shrink-0">Fonte Primária:</span>
                <a
                  href={getSourceUrl(m.sourcePrimary)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="font-mono text-[9px] text-cyan-400/90 hover:text-cyan-200 hover:underline bg-cyan-950/50 hover:bg-cyan-900/60 px-1.5 py-0.5 rounded border border-cyan-800/40 truncate max-w-[150px] inline-flex items-center gap-1 transition-colors"
                  title={`Abrir repositório da fonte primária: ${m.sourcePrimary || "Arquivo Histórico / Registro Oficial"}`}
                >
                  <span className="truncate">{m.sourcePrimary || "Arquivo Histórico"}</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                </a>
              </div>

              {/* Action buttons & links accessible directly */}
              <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectMilestone(m.id);
                    selectYear(m.year);
                    if (m.latitude !== undefined && m.longitude !== undefined) {
                      flyTo(m.latitude, m.longitude, m.preferredAltitude ?? 1.8);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 text-[10px] font-medium transition-colors"
                  title="Focar este evento no globo 3D"
                >
                  <Globe className="w-3 h-3" />
                  <span>Focar</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDimension("HISTORY");
                    setReaderOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[10px] font-medium transition-colors"
                  title="Abrir seção de História no Dossiê do País"
                >
                  <BookOpen className="w-3 h-3 text-cyan-400" />
                  <span>Ler Dossiê</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCitationModalOpen(true, {
                      title: `${m.title} (${m.year}) - ${m.summary}`,
                      countryName: countryName || m.countryIso || "TellusPedia",
                      url: getSourceUrl(m.sourcePrimary),
                      accessDate: new Date(),
                      publicationYear: 2026,
                    });
                  }}
                  className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 text-[10px] font-medium transition-colors"
                  title={`Gerar citação acadêmica para '${m.title}'`}
                >
                  <Quote className="w-3 h-3 text-cyan-400" />
                  <span>Citar</span>
                </button>

                <a
                  href={`https://pt.wikipedia.org/wiki/${encodeURIComponent(m.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 text-[10px] font-medium transition-colors"
                  title={`Pesquisar '${m.title}' na Wikipédia`}
                >
                  <ExternalLink className="w-3 h-3 text-cyan-400" />
                  <span>Info</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
