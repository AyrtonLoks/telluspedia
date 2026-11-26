"use client";

import Link from "next/link";
import React, { useMemo } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Globe,
  Layers,
  UserCheck,
  X,
} from "lucide-react";
import { selectCountry } from "@/stores/actions";
import { WORLD_COUNTRIES_CATALOG } from "@/lib/country-data";
import {
  TRANSVERSAL_ENTITIES_META,
  TRANSVERSAL_META_BY_ID,
} from "@/lib/transversal-meta";
import type {
  TransversalKind,
  TransversalMilestone,
} from "@/lib/transversal-types";
import { useGlobeStore } from "@/stores/globeStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useTransversalStore } from "@/stores/transversalStore";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/components/ui/cn";
import { formatCountryName } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/useT";
import { StudyTrailBar } from "./StudyTrailBar";

export const TransversalHud: React.FC = () => {
  const { locale, t } = useI18n();
  const activeEntityId = useTransversalStore((s) => s.activeEntityId);
  const activeEntity = useTransversalStore((s) => s.activeEntity);
  const isSelectorOpen = useTransversalStore((s) => s.isSelectorOpen);
  const filterKind = useTransversalStore((s) => s.filterKind);
  const isLoadingCatalog = useTransversalStore((s) => s.isLoadingCatalog);
  const trail = useTransversalStore((s) => s.trail);

  const openSelector = useTransversalStore((s) => s.openSelector);
  const closeSelector = useTransversalStore((s) => s.closeSelector);
  const setFilterKind = useTransversalStore((s) => s.setFilterKind);
  const activateEntity = useTransversalStore((s) => s.activateEntity);
  const clearEntity = useTransversalStore((s) => s.clearEntity);
  const pushTrailStep = useTransversalStore((s) => s.pushTrailStep);

  const selectedIso = useGlobeStore((s) => s.selectedIso);
  const flyTo = useGlobeStore((s) => s.flyTo);
  const selectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);
  const selectMilestone = useTimelineStore((s) => s.selectMilestone);
  const selectYear = useTimelineStore((s) => s.selectYear);

  const filteredList = useMemo(() => {
    if (filterKind === "all") return TRANSVERSAL_ENTITIES_META;
    return TRANSVERSAL_ENTITIES_META.filter((item) => item.kind === filterKind);
  }, [filterKind]);

  if (!isSelectorOpen && !activeEntityId && trail.length === 0) return null;

  // Modo compacto: apenas a Trilha de Estudo (RN04) quando nenhuma entidade transversal está aberta
  if (!isSelectorOpen && !activeEntityId && trail.length > 0) {
    return (
      <Panel
        data-testid="transversal-trail-only-hud"
        className="fixed left-3 top-[var(--map-annotation-top)] z-20 w-[min(23rem,calc(100vw-1.5rem))] p-3 shadow-e2 xl:left-6"
      >
        <StudyTrailBar />
      </Panel>
    );
  }

  // Modo 1: Seletor de Personalidades & Temas Transversais
  if (isSelectorOpen || !activeEntityId) {
    const filterOptions: Array<{ id: "all" | TransversalKind; label: string }> = [
      { id: "all", label: t("transversal.filterAll", "Todos") },
      { id: "personality", label: t("transversal.filterPersonalities", "Personalidades") },
      { id: "theme", label: t("transversal.filterThemes", "Temas") },
    ];

    return (
      <Panel
        data-testid="transversal-selector-hud"
        aria-label={t("transversal.selectorTitle", "Linha do Tempo Transversal")}
        className="fixed left-3 top-[var(--map-annotation-top)] z-20 flex max-h-[min(32rem,calc(100dvh-11rem))] w-[min(24rem,calc(100vw-1.5rem))] flex-col p-3.5 shadow-e2 xl:left-6"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-caption font-medium text-accent">
              <GitBranch aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span>{t("transversal.eyebrow", "Pesquisa Transversal · RN14")}</span>
            </div>
            <h2 className="mt-0.5 text-title font-semibold text-fg">
              {t("transversal.selectorTitle", "Personalidades & Temas")}
            </h2>
          </div>
          <IconButton
            label={t("transversal.closeAria", "Fechar")}
            icon={<X />}
            size="sm"
            onClick={() => {
              if (activeEntityId) closeSelector();
              else clearEntity();
            }}
          />
        </div>

        <p className="mt-1.5 text-caption leading-relaxed text-fg-secondary">
          {t(
            "transversal.selectorDescription",
            "Selecione uma biografia ou tema transnacional para destacar simultaneamente os países envolvidos no globo e filtrar a linha do tempo."
          )}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {filterOptions.map((opt) => (
            <Chip
              key={opt.id}
              pressed={filterKind === opt.id}
              onClick={() => setFilterKind(opt.id)}
              data-testid={`transversal-filter-${opt.id}`}
            >
              {opt.label}
            </Chip>
          ))}
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {filteredList.map((item) => {
            const isCurrent = activeEntityId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`transversal-option-${item.id}`}
                onClick={() => void activateEntity(item.id)}
                className={cn(
                  "flex w-full flex-col gap-1 rounded-card border p-2.5 text-left transition-colors duration-fast ease-out",
                  isCurrent
                    ? "border-accent/50 bg-accent/15 text-fg"
                    : "border-line bg-surface-raised hover:border-line-strong hover:bg-surface-hover"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={item.kind === "personality" ? "accent" : "neutral"}>
                    {item.kind === "personality"
                      ? t("transversal.kindPersonality", "Personalidade")
                      : t("transversal.kindTheme", "Tema")}
                  </Badge>
                  <span className="font-mono text-caption tabular-nums text-fg-muted">
                    {item.spanLabel} · {item.countryIsos.length}{" "}
                    {t("transversal.countriesCount", "países")}
                  </span>
                </div>
                <span className="text-label font-semibold text-fg">
                  {locale === "en" ? item.titleEn : item.titlePt}
                </span>
              </button>
            );
          })}
        </div>

        {trail.length > 0 && (
          <div className="mt-2.5">
            <StudyTrailBar />
          </div>
        )}
      </Panel>
    );
  }

  // Modo 2: Entidade Transversal Ativa
  const meta = TRANSVERSAL_META_BY_ID[activeEntityId];
  const milestones = activeEntity?.milestones ?? [];
  const activeIdx = milestones.findIndex((m) => m.id === selectedMilestoneId);

  const handleSelectCountryChip = (iso: string) => {
    const entry = WORLD_COUNTRIES_CATALOG[iso];
    const labelPt = entry?.nameCommon ?? iso;
    const labelEn = formatCountryName(entry?.iso2 ?? null, labelPt, "en");
    selectCountry(iso);
    useLayoutStore.getState().setActiveRightPanel("country");
    if (entry && entry.latitude !== null && entry.longitude !== null) {
      flyTo(entry.latitude, entry.longitude, 2.0);
    }
    pushTrailStep({
      key: `country:${iso}`,
      kind: "country",
      id: iso,
      labelPt,
      labelEn,
      lat: entry?.latitude ?? undefined,
      lng: entry?.longitude ?? undefined,
      altitude: 2.0,
    });
  };

  const handleSelectMilestoneStep = (m: TransversalMilestone) => {
    selectYear(m.year);
    selectMilestone(m.id);
    useTimelineStore.getState().setExpanded(true);
    if (m.latitude !== undefined && m.longitude !== undefined) {
      flyTo(m.latitude, m.longitude, m.preferredAltitude ?? 1.9);
    }
    pushTrailStep({
      key: `milestone:${m.id}`,
      kind: "milestone",
      id: m.id,
      labelPt: m.title,
      labelEn: m.titleEn,
      year: m.year,
      lat: m.latitude,
      lng: m.longitude,
      altitude: m.preferredAltitude ?? 1.9,
    });
  };

  const stepByDelta = (delta: number) => {
    if (milestones.length === 0) return;
    const base = activeIdx >= 0 ? activeIdx : 0;
    const nextIdx = (base + delta + milestones.length) % milestones.length;
    const target = milestones[nextIdx];
    if (target) handleSelectMilestoneStep(target);
  };

  return (
    <Panel
      data-testid="transversal-active-hud"
      aria-label={locale === "en" ? meta.titleEn : meta.titlePt}
      className="fixed left-3 top-[var(--map-annotation-top)] z-20 flex max-h-[min(34rem,calc(100dvh-11rem))] w-[min(24.5rem,calc(100vw-1.5rem))] flex-col p-3.5 shadow-e2 xl:left-6"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">
              {meta.kind === "personality" ? (
                <UserCheck aria-hidden="true" className="mr-1 inline h-3 w-3" />
              ) : (
                <Layers aria-hidden="true" className="mr-1 inline h-3 w-3" />
              )}
              {meta.kind === "personality"
                ? t("transversal.kindPersonality", "Personalidade")
                : t("transversal.kindTheme", "Tema")}
            </Badge>
            <span className="font-mono text-caption tabular-nums text-fg-muted">
              {meta.spanLabel}
            </span>
          </div>
          <h2 className="mt-1 text-title font-semibold leading-snug text-fg">
            {locale === "en" ? meta.titleEn : meta.titlePt}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            data-testid="transversal-switch-button"
            onClick={() => openSelector()}
          >
            <span>{t("transversal.switch", "Trocar")}</span>
          </Button>
          <IconButton
            label={t("transversal.exitAria", "Sair da visão transversal")}
            icon={<X />}
            size="sm"
            onClick={clearEntity}
          />
        </div>
      </div>

      <div className="mt-2 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {activeEntity && (
          <p className="text-caption leading-relaxed text-fg-secondary">
            {locale === "en" ? activeEntity.summaryEn : activeEntity.summaryPt}
          </p>
        )}

        {/* Países destacados simultaneamente no globo */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-caption">
            <span className="inline-flex items-center gap-1.5 font-medium text-fg">
              <Globe aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
              <span>
                {t("transversal.highlightedCountries", "Países em destaque simultâneo")}
              </span>
            </span>
            <span className="font-mono tabular-nums text-fg-muted">
              {meta.countryIsos.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {meta.countryIsos.map((iso) => {
              const c = WORLD_COUNTRIES_CATALOG[iso];
              const name = formatCountryName(c?.iso2 ?? null, c?.nameCommon ?? iso, locale);
              const isSelected = selectedIso === iso;
              return (
                <button
                  key={iso}
                  type="button"
                  data-testid={`transversal-country-${iso}`}
                  onClick={() => handleSelectCountryChip(iso)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-control border px-2 py-0.5 text-caption font-medium transition-colors duration-fast ease-out",
                    isSelected
                      ? "border-accent/50 bg-accent/15 text-accent"
                      : "border-line bg-surface-raised text-fg-secondary hover:bg-surface-hover hover:text-fg"
                  )}
                >
                  <span>{name}</span>
                  <span className="font-mono text-fg-muted">{iso}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de Marcos Transversais */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-medium text-fg">
              {t("transversal.milestonesHeading", "Marcos na linha do tempo filtrada")}
            </span>
            <div className="flex items-center gap-1">
              <IconButton
                label={t("transversal.prevMilestone", "Marco anterior")}
                icon={<ChevronLeft />}
                size="sm"
                onClick={() => stepByDelta(-1)}
              />
              <IconButton
                label={t("transversal.nextMilestone", "Próximo marco")}
                icon={<ChevronRight />}
                size="sm"
                onClick={() => stepByDelta(1)}
              />
            </div>
          </div>

          {isLoadingCatalog && milestones.length === 0 ? (
            <p className="text-caption text-fg-muted">
              {t("transversal.loadingCatalog", "Carregando marcos históricos…")}
            </p>
          ) : (
            <ol className="space-y-1">
              {milestones.map((m) => {
                const isSelected = selectedMilestoneId === m.id;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      data-testid={`transversal-milestone-${m.id}`}
                      onClick={() => handleSelectMilestoneStep(m)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-control border px-2.5 py-1.5 text-left transition-colors duration-fast ease-out",
                        isSelected
                          ? "border-accent/50 bg-accent/15 text-fg"
                          : "border-line bg-surface-raised text-fg-secondary hover:bg-surface-hover hover:text-fg"
                      )}
                    >
                      <span className="shrink-0 font-mono text-caption font-semibold tabular-nums text-accent">
                        {m.year}
                      </span>
                      <span className="line-clamp-2 text-caption font-medium leading-snug">
                        {locale === "en" ? m.titleEn : m.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {meta.dossierSlug && (
          <div className="pt-0.5">
            <Link
              href={`/dossies/${meta.dossierSlug}`}
              className={buttonClasses("secondary", "sm", "w-full justify-center")}
            >
              <BookOpen aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
              <span>{t("transversal.openDossier", "Abrir dossiê temático completo")}</span>
            </Link>
          </div>
        )}
      </div>

      <div className="mt-2.5">
        <StudyTrailBar />
      </div>
    </Panel>
  );
};
