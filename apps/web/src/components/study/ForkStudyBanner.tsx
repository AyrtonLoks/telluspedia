"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowUpLeft,
  BarChart2,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  GitFork,
  Library,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { StudyExportActions } from "@/components/study/StudyExportActions";
import type { StudyLineageInfo, StudyRecord } from "@/lib/studies-store";
import { useComparatorStore } from "@/stores/comparatorStore";

export interface ForkStudyBannerProps {
  studyId: string;
  parentId?: string | null;
  title: string;
  study?: StudyRecord;
  lineage?: StudyLineageInfo | null;
}

export interface ForkStudyBannerViewProps extends ForkStudyBannerProps {
  onNavigate: (url: string) => void;
}

export const ForkStudyBannerView: React.FC<ForkStudyBannerViewProps> = ({
  studyId,
  parentId,
  title,
  study,
  lineage = null,
  onNavigate,
}) => {
  const [forking, setForking] = useState<boolean>(false);
  const [forkSuccess, setForkSuccess] = useState<boolean>(false);
  const [showForks, setShowForks] = useState<boolean>(false);
  const [showNotes, setShowNotes] = useState<boolean>(false);

  const effectiveParentId = lineage?.parent?.id ?? parentId ?? null;
  const effectiveParentTitle = lineage?.parent?.title ?? effectiveParentId;
  const forks = lineage?.forks ?? [];
  const forkCount = lineage?.forkCount ?? forks.length;
  const studyIsos = study?.selectedCountryIsos ?? [];
  const hasNotes = Boolean(study?.description?.trim() || study?.markdownNotes?.trim());
  const predatesWorldBank = Boolean(study && study.timelineStartYear < 1990);

  const handleOpenComparator = () => {
    const comparator = useComparatorStore.getState();
    if (studyIsos.length > 0) {
      comparator.setSelectedIsos(studyIsos.slice(0, 4));
    }
    comparator.openComparator();
  };

  const handleFork = async () => {
    setForking(true);
    try {
      const res = await fetch(`/api/studies/${encodeURIComponent(studyId)}/fork`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setForkSuccess(true);
        setTimeout(() => {
          onNavigate(`/study/${data.id}`);
        }, 800);
      }
    } catch (err) {
      console.error("Fork error:", err);
    } finally {
      setForking(false);
    }
  };

  return (
    <Panel
      data-testid="fork-study-banner"
      className="pointer-events-auto max-w-[min(94vw,52rem)] flex-col gap-2 px-3 py-2 text-label animate-fade-in sm:px-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <GitFork aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
          <div className="min-w-0">
            <span className="block truncate font-semibold text-fg" title={title}>
              {title}
            </span>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-caption text-fg-muted">
              {effectiveParentId ? (
                <Link
                  href={`/study/${encodeURIComponent(effectiveParentId)}`}
                  data-testid="study-parent-link"
                  className="inline-flex max-w-full items-center gap-1 truncate text-accent hover:text-accent-hover hover:underline"
                >
                  <ArrowUpLeft aria-hidden="true" className="size-3 shrink-0" />
                  <span className="truncate">Fork de {effectiveParentTitle}</span>
                </Link>
              ) : (
                <span>Estudo compartilhado original</span>
              )}

              {forkCount > 0 && (
                <button
                  type="button"
                  data-testid="study-forks-toggle"
                  aria-expanded={showForks}
                  onClick={() => setShowForks((open) => !open)}
                  className="inline-flex items-center gap-1 font-mono text-caption text-fg-secondary tabular-nums transition-colors duration-fast ease-out hover:text-fg"
                >
                  <span>
                    {forkCount} {forkCount === 1 ? "fork derivado" : "forks derivados"}
                  </span>
                  {showForks ? (
                    <ChevronUp aria-hidden="true" className="size-3" />
                  ) : (
                    <ChevronDown aria-hidden="true" className="size-3" />
                  )}
                </button>
              )}

              {hasNotes && (
                <button
                  type="button"
                  data-testid="study-notes-toggle"
                  aria-expanded={showNotes}
                  onClick={() => setShowNotes((open) => !open)}
                  className="inline-flex items-center gap-1 text-caption text-fg-secondary transition-colors duration-fast ease-out hover:text-fg"
                >
                  <FileText aria-hidden="true" className="size-3" />
                  <span>{showNotes ? "Ocultar notas" : "Notas do estudo"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {studyIsos.length >= 2 && (
            <Button
              variant="secondary"
              size="sm"
              data-testid="study-open-comparator"
              onClick={handleOpenComparator}
              title="Abrir comparador multidimensional com os países deste estudo (inclui séries reais 1990–2024)"
            >
              <BarChart2 aria-hidden="true" className="size-3.5" />
              <span>Comparar ({Math.min(studyIsos.length, 4)})</span>
            </Button>
          )}

          <Link
            href="/studies"
            className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface-raised px-2.5 text-caption font-medium text-fg-secondary transition-colors duration-fast ease-out hover:border-line-strong hover:text-fg"
            title="Explorar Galeria de Estudos Públicos"
          >
            <Library aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">Galeria</span>
          </Link>

          {study && <StudyExportActions study={study} lineage={lineage} compact />}

          <Button
            variant="primary"
            size="sm"
            className="shrink-0"
            onClick={handleFork}
            disabled={forking || forkSuccess}
          >
            {forkSuccess ? (
              <>
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
                <span>Fork criado!</span>
              </>
            ) : (
              <>
                <GitFork aria-hidden="true" className="h-3.5 w-3.5" />
                <span>{forking ? "Derivando..." : "Fazer fork"}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {showNotes && study && (
        <div
          data-testid="study-notes-panel"
          className="space-y-1.5 border-t border-line pt-2 text-caption text-fg-secondary"
        >
          {study.description?.trim() && <p className="text-fg">{study.description.trim()}</p>}
          {study.markdownNotes?.trim() && (
            <p className="whitespace-pre-line text-fg-secondary">{study.markdownNotes.trim()}</p>
          )}
          {predatesWorldBank && (
            <p className="text-fg-muted">
              Nota de cobertura (RN02): o recorte inicia em{" "}
              <span className="font-mono tabular-nums">{study.timelineStartYear}</span>, enquanto as
              séries quantitativas do Banco Mundial no comparador cobrem leituras anuais reais a
              partir de <span className="font-mono tabular-nums">1990</span>.
            </p>
          )}
        </div>
      )}

      {showForks && forks.length > 0 && (
        <div
          data-testid="study-forks-list"
          className="border-t border-line pt-2 text-caption"
        >
          <p className="mb-1.5 font-medium text-fg-secondary">
            Estudos derivados deste snapshot:
          </p>
          <ul className="flex max-h-36 flex-col gap-1 overflow-y-auto">
            {forks.map((fork) => (
              <li key={fork.id} className="flex items-center justify-between gap-3">
                <Link
                  href={`/study/${encodeURIComponent(fork.id)}`}
                  className="truncate text-accent hover:text-accent-hover hover:underline"
                >
                  {fork.title}
                </Link>
                <span className="shrink-0 font-mono text-fg-muted tabular-nums">
                  {fork.id}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
};

export const ForkStudyBanner: React.FC<ForkStudyBannerProps> = (props) => {
  const router = useRouter();
  return <ForkStudyBannerView {...props} onNavigate={(url) => router.push(url)} />;
};
