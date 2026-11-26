"use client";

import React from "react";
import { ChevronRight, Compass, Flag, GitBranch, Trash2 } from "lucide-react";
import { selectCountry } from "@/stores/actions";
import { isTransversalEntityId, type StudyTrailStep } from "@/lib/transversal-types";
import { useGlobeStore } from "@/stores/globeStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useTransversalStore } from "@/stores/transversalStore";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/useT";

export const StudyTrailBar: React.FC = () => {
  const { locale, t } = useI18n();
  const trail = useTransversalStore((s) => s.trail);
  const activeTrailKey = useTransversalStore((s) => s.activeTrailKey);
  const setActiveTrailKey = useTransversalStore((s) => s.setActiveTrailKey);
  const activateEntity = useTransversalStore((s) => s.activateEntity);
  const clearTrail = useTransversalStore((s) => s.clearTrail);

  if (trail.length === 0) return null;

  const handleStepClick = (step: StudyTrailStep) => {
    setActiveTrailKey(step.key);
    const globe = useGlobeStore.getState();
    globe.setReaderOpen(false);

    if (step.kind === "transversal" && isTransversalEntityId(step.id)) {
      void activateEntity(step.id);
      return;
    }

    if (step.kind === "country") {
      selectCountry(step.id);
      useLayoutStore.getState().setActiveRightPanel("country");
      if (step.lat !== undefined && step.lng !== undefined) {
        globe.flyTo(step.lat, step.lng, step.altitude ?? 2.0);
      }
      return;
    }

    if (step.kind === "milestone") {
      const timeline = useTimelineStore.getState();
      if (step.year !== undefined) {
        if (step.year < timeline.startYear || step.year > timeline.endYear) {
          timeline.setYearRange(Math.max(1, step.year - 25), step.year + 25);
        }
        timeline.selectYear(step.year);
      }
      timeline.selectMilestone(step.id);
      timeline.setExpanded(true);
      if (step.lat !== undefined && step.lng !== undefined) {
        globe.flyTo(step.lat, step.lng, step.altitude ?? 1.9);
      }
    }
  };

  return (
    <nav
      data-testid="study-trail-breadcrumbs"
      aria-label={t("transversal.trailAria", "Trilha de estudo percorrida")}
      className="space-y-1.5 border-t border-line pt-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-caption font-medium text-fg-muted">
          <Compass aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
          <span>{t("transversal.trailTitle", "Trilha de estudo (RN04)")}</span>
        </span>
        <IconButton
          label={t("transversal.clearTrail", "Limpar trilha de estudo")}
          icon={<Trash2 />}
          size="sm"
          onClick={clearTrail}
        />
      </div>

      <ol className="flex items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {trail.map((step, idx) => {
          const isActive = activeTrailKey === step.key;
          const label = locale === "en" ? step.labelEn : step.labelPt;
          return (
            <li key={step.key} className="flex shrink-0 items-center gap-1">
              {idx > 0 && (
                <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 text-fg-muted" />
              )}
              <button
                type="button"
                data-testid={`trail-step-${step.key}`}
                aria-current={isActive ? "step" : undefined}
                onClick={() => handleStepClick(step)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-control border px-2 py-0.5 text-caption font-medium transition-colors duration-fast ease-out",
                  isActive
                    ? "border-accent/50 bg-accent/15 text-accent"
                    : "border-line bg-surface-raised text-fg-secondary hover:bg-surface-hover hover:text-fg"
                )}
              >
                {step.kind === "transversal" ? (
                  <GitBranch aria-hidden="true" className="h-3 w-3 shrink-0" />
                ) : step.kind === "milestone" ? (
                  <Flag aria-hidden="true" className="h-3 w-3 shrink-0" />
                ) : null}
                <span className="max-w-[9.5rem] truncate">{label}</span>
                {step.year !== undefined && step.kind === "milestone" && (
                  <span className="font-mono tabular-nums text-fg-muted">({step.year})</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
