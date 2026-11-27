"use client";

import React from "react";
import { History, Calendar, BookOpen, ExternalLink, Quote } from "lucide-react";
import { useTimelineStore } from "@/stores/timelineStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useReaderStore } from "@/stores/readerStore";
import type { MilestoneItem } from "@/lib/milestones";
import { getSourceUrl } from "@/lib/citations";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/useT";

const ACTION = "inline-flex items-center justify-center gap-1 rounded-control border border-line bg-surface px-2 py-1 text-caption font-medium text-fg-secondary transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-fg";

interface CountryMiniTimelineProps {
  milestones: MilestoneItem[];
  countryName?: string;
}

export const CountryMiniTimeline: React.FC<CountryMiniTimelineProps> = ({ milestones, countryName }) => {
  const { locale, t, tRaw } = useI18n();
  const storeSelectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);
  // Renderização no servidor (e testes) lê o estado atual; o Zustand devolveria o inicial.
  const selectedMilestoneId =
    typeof window === "undefined" ? useTimelineStore.getState().selectedMilestoneId : storeSelectedMilestoneId;
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
        <span>{t("timeline.countryMilestones", "Marcos Históricos Decisivos")}</span>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {milestones.map((m) => {
          const isSelected = selectedMilestoneId === m.id;
          const wikiHost = locale === "en" ? "en.wikipedia.org" : "pt.wikipedia.org";
          return (
            <div
              key={m.id}
              data-testid={`country-milestone-${m.id}`}
              className={cn(
                "rounded-card border transition-colors duration-base ease-out",
                isSelected ? "border-accent/40 bg-accent/10" : "border-line bg-surface-raised hover:bg-surface-hover"
              )}
            >
              {/* O cartão inteiro é o botão que foca o evento no globo (clicar de novo desfaz). */}
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={(e) => handleMilestoneClick(e, m)}
                title={isSelected ? t("timeline.unselectEvent", "Desmarcar este evento") : t("timeline.focusEvent", "Focar este evento no globo 3D")}
                className="block w-full rounded-card p-2.5 text-left"
              >
                <span className="flex items-center justify-between gap-1 text-label">
                  <span className="font-medium text-fg">{tRaw(`event.${m.id}`, m.title)}</span>
                  <span className="flex shrink-0 items-center gap-1 font-mono text-caption tabular-nums text-fg-secondary">
                    <Calendar aria-hidden="true" className="h-3 w-3" />
                    {m.year}
                  </span>
                </span>
                <span className={cn("mt-1 block text-caption text-fg-secondary", !isSelected && "line-clamp-2")}>
                  {tRaw(`event.${m.id}.summary`, m.summary)}
                </span>
              </button>

              {(m.sourcePrimary || isSelected) && (
                <div className="flex items-center gap-2 px-2.5 pb-2 text-caption">
                  {m.sourcePrimary && (
                    <a
                      href={getSourceUrl(m.sourcePrimary)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex min-w-0 items-center gap-1 text-accent hover:text-accent-hover hover:underline"
                      title={`${t("inspector.sourcePrefix", "Fonte primária:")} ${m.sourcePrimary}`}
                    >
                      <span className="truncate">{m.sourcePrimary}</span>
                      <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />
                    </a>
                  )}
                  {/* Ações secundárias só no marco selecionado (D16). */}
                  {isSelected && (
                    <span className="ml-auto flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDimension("HISTORY");
                          setReaderOpen(true);
                        }}
                        className={ACTION}
                        title={t("timeline.readDossierTitle", "Abrir seção de História no Dossiê do País")}
                      >
                        <BookOpen aria-hidden="true" className="h-3 w-3" />
                        <span>{t("timeline.readDossier", "Ler dossiê")}</span>
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
                        title={t("timeline.citeMilestoneTitle", `Gerar citação acadêmica para '${m.title}'`)}
                      >
                        <Quote aria-hidden="true" className="h-3 w-3" />
                        <span>{t("timeline.cite", "Citar")}</span>
                      </button>
                      <a
                        href={`https://${wikiHost}/wiki/${encodeURIComponent(m.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={ACTION}
                        title={`${t("common.wikipedia", "Wikipédia")}: ${m.title}`}
                      >
                        <ExternalLink aria-hidden="true" className="h-3 w-3" />
                        <span>{t("common.wikipedia", "Wikipédia")}</span>
                      </a>
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
