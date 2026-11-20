"use client";

import React from "react";
import { History, Calendar, Globe, BookOpen, ExternalLink, Quote } from "lucide-react";
import { useTimelineStore } from "@/stores/timelineStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useReaderStore } from "@/stores/readerStore";
import { MilestoneItem } from "@/lib/country-data";
import { getSourceUrl } from "@/lib/citations";
import { cn } from "@/components/ui/cn";

const ACTION = "flex items-center justify-center gap-1 rounded-control border border-line bg-surface px-2 py-1 text-caption font-medium text-fg-secondary transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-fg";

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
    <div className="mt-3 border-t border-line pt-3">
      <div className="mb-2 flex items-center gap-1.5 text-label font-semibold text-fg">
        <History aria-hidden="true" className="h-4 w-4 text-fg-muted" />
        <span>Marcos Históricos Decisivos</span>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {milestones.map((m) => {
          const isSelected = selectedMilestoneId === m.id;
          return (
            <div
              key={m.id}
              onClick={(e) => handleMilestoneClick(e, m)}
              className={cn(
                "group cursor-pointer rounded-card border p-2.5 transition-colors duration-base ease-out",
                isSelected ? "border-accent/40 bg-accent/10" : "border-line bg-surface-raised hover:bg-surface-hover"
              )}
            >
              <div className="flex items-center justify-between gap-1 text-label">
                <span className="font-medium text-fg">
                  {m.title}
                </span>
                <span className="flex shrink-0 items-center gap-1 font-mono text-caption tabular-nums text-fg-secondary">
                  <Calendar aria-hidden="true" className="h-3 w-3" />
                  {m.year}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-caption text-fg-secondary">
                {m.summary}
              </p>
              {m.sourcePrimary && (
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-1.5 text-caption">
                  <span className="shrink-0 text-fg-muted">Fonte Primária:</span>
                  <a
                    href={getSourceUrl(m.sourcePrimary)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex max-w-[150px] items-center gap-1 truncate text-accent hover:text-accent-hover hover:underline"
                    title={`Abrir repositório da fonte primária: ${m.sourcePrimary}`}
                  >
                    <span className="truncate">{m.sourcePrimary}</span>
                    <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}

              {/* Action buttons & links accessible directly */}
              <div className="mt-2 flex items-center gap-1.5 border-t border-line pt-1.5">
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
                  className={cn(ACTION, "flex-1")}
                  title="Focar este evento no globo 3D"
                >
                  <Globe aria-hidden="true" className="h-3 w-3" />
                  <span>Focar</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDimension("HISTORY");
                    setReaderOpen(true);
                  }}
                  className={cn(ACTION, "flex-1")}
                  title="Abrir seção de História no Dossiê do País"
                >
                  <BookOpen aria-hidden="true" className="h-3 w-3" />
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
                  className={ACTION}
                  title={`Gerar citação acadêmica para '${m.title}'`}
                >
                  <Quote aria-hidden="true" className="h-3 w-3" />
                  <span>Citar</span>
                </button>

                <a
                  href={`https://pt.wikipedia.org/wiki/${encodeURIComponent(m.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={ACTION}
                  title={`Pesquisar '${m.title}' na Wikipédia`}
                >
                  <ExternalLink aria-hidden="true" className="h-3 w-3" />
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
