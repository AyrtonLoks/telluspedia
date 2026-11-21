"use client";

import Link from "next/link";
import { StudyContext } from "@/components/tellus-bridge/StudyContext";
import React, { useMemo } from "react";
import {
  BookOpen,
  BarChart2,
  Share2,
  ExternalLink,
  Quote,
  History,
} from "lucide-react";
import { useGlobeStore } from "@/stores/globeStore";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useStudyStore } from "@/stores/studyStore";
import { useReaderStore } from "@/stores/readerStore";
import { getCountryData, findMilestoneById } from "@/lib/country-data";
import { resolveEffectiveHistoricalYear } from "@/lib/historical-entities";
import { getSourceUrl } from "@/lib/citations";
import {
  preloadCitationModal,
  preloadCountryComparator,
  preloadReaderMode,
  preloadStudyShareModal,
} from "@/lib/panel-preload";
import { CountryHeader } from "./CountryHeader";
import { LocalClockWidget } from "./LocalClockWidget";
import { LiveWeatherWidget } from "./LiveWeatherWidget";
import { CountryMetricsGrid } from "./CountryMetricsGrid";
import { CountryMiniTimeline } from "./CountryMiniTimeline";
import { Button, buttonClasses } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/components/ui/cn";

export interface InspectorHUDProps {
  selectedIso?: string | null;
  selectedYear?: number | null;
}

export const InspectorHUD: React.FC<InspectorHUDProps> = (props) => {
  const storeSelectedIso = useGlobeStore((s) => s.selectedIso);
  const storeIsReaderOpen = useGlobeStore((s) => s.isReaderOpen);

  const selectedIso =
    props.selectedIso !== undefined
      ? props.selectedIso
      : typeof window === "undefined"
      ? useGlobeStore.getState().selectedIso
      : storeSelectedIso;

  const isReaderOpen =
    typeof window === "undefined"
      ? useGlobeStore.getState().isReaderOpen
      : storeIsReaderOpen;


  const setReaderOpen = useGlobeStore((s) => s.setReaderOpen);

  const toggleCountry = useComparatorStore((s) => s.toggleCountry);
  const openComparator = useComparatorStore((s) => s.openComparator);
  const storeComparatorIsos = useComparatorStore((s) => s.selectedIsos);
  const comparatorIsos =
    typeof window === "undefined"
      ? useComparatorStore.getState().selectedIsos
      : storeComparatorIsos;

  const setShareModalOpen = useStudyStore((s) => s.setShareModalOpen);

  const resetActiveDimension = useReaderStore((s) => s.resetActiveDimension);
  const setActiveDimension = useReaderStore((s) => s.setActiveDimension);
  const setCitationModalOpen = useReaderStore((s) => s.setCitationModalOpen);

  // Synchronize with active historical timeline reference year
  const storeSelectedYear = useTimelineStore((s) => s.selectedYear);
  const storeMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);
  const storeStartYear = useTimelineStore((s) => s.startYear);
  const storeEndYear = useTimelineStore((s) => s.endYear);

  const selectedYear =
    props.selectedYear !== undefined
      ? props.selectedYear
      : typeof window === "undefined"
      ? useTimelineStore.getState().selectedYear
      : storeSelectedYear;

  const selectedMilestoneId =
    typeof window === "undefined"
      ? useTimelineStore.getState().selectedMilestoneId
      : storeMilestoneId;

  const startYear =
    typeof window === "undefined"
      ? useTimelineStore.getState().startYear
      : storeStartYear;

  const endYear =
    typeof window === "undefined"
      ? useTimelineStore.getState().endYear
      : storeEndYear;

  const effectiveYear = useMemo(() => {
    const milestoneYear = selectedMilestoneId
      ? findMilestoneById(selectedMilestoneId)?.year ?? null
      : null;
    return resolveEffectiveHistoricalYear({
      selectedYear,
      milestoneYear,
      startYear,
      endYear,
    });
  }, [selectedYear, selectedMilestoneId, startYear, endYear]);

  const currentCountry = useMemo(() => {
    if (!selectedIso) return null;
    return getCountryData(selectedIso, effectiveYear);
  }, [selectedIso, effectiveYear]);

  if (!selectedIso || isReaderOpen || !currentCountry) return null;

  const isCompared = comparatorIsos.includes(currentCountry.isoCode);

  const handleDeepReading = () => {
    if (currentCountry.dossierSections && currentCountry.dossierSections.length > 0) {
      resetActiveDimension();
    } else if (!currentCountry.isHistoricalEntity) {
      setActiveDimension("ANALYTICAL_PROFILE");
    } else {
      resetActiveDimension();
    }
    setReaderOpen(true);
  };

  const handleCompare = () => {
    if (!isCompared) {
      toggleCountry(currentCountry.isoCode);
    }
    openComparator();
  };

  const handleShare = () => {
    setShareModalOpen(true);
  };

  const primarySourceName =
    currentCountry.indicators?.[0]?.sourcePrimary ||
    (currentCountry.isHistoricalEntity
      ? "Maddison Project Database"
      : currentCountry.completeness === "none"
      ? "Natural Earth"
      : "ONU");

  return (
    <aside
      data-inspector-hud="true"
      data-completeness={currentCountry.completeness}
      // Posicionamento e convivência com outros painéis: RightDock (D15). Aqui o painel só preenche o dock.
      className="min-h-0 flex-1 overflow-y-auto p-4"
    >
      {/* Country Identification Header */}
      <CountryHeader
        nameCommon={currentCountry.nameCommon}
        nameOfficial={currentCountry.nameOfficial}
        capital={currentCountry.capital}
        continent={currentCountry.continent}
        region={currentCountry.region}
        flagSvgUrl={currentCountry.flagSvgUrl}
        isoCode={currentCountry.isoCode}
        completeness={currentCountry.completeness}
      />

      {/* Real-time Environment: Local Clock + Open-Meteo Weather (Contemporary) OR Historical Vigência/Leadership Context (Extinct Entities) */}
      {currentCountry.isHistoricalEntity ? (
        <div className="grid grid-cols-2 gap-2 my-3">
          <LocalClockWidget timezone={currentCountry.timezone} />
          <div
            data-historical-context="true"
            className="flex flex-col justify-between rounded-card border border-line bg-surface-raised p-2.5"
          >
            <div className="flex items-center gap-1.5 text-caption font-medium text-fg-secondary">
              <History aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
              <span className="truncate">Entidade Histórica</span>
            </div>
            <div className="my-0.5 font-mono text-label font-medium tabular-nums text-fg">
              Vigência: {currentCountry.startYear} – {currentCountry.endYear}
            </div>
            <div
              className="line-clamp-1 text-caption text-fg-secondary"
              title={`${currentCountry.leaderTitle || "Líder"}: ${currentCountry.historicalLeader || currentCountry.headOfState || "Indisponível"}`}
            >
              <span className="text-fg-muted">
                {currentCountry.leaderTitle ? `${currentCountry.leaderTitle}: ` : "Líder: "}
              </span>
              <strong className="font-medium text-fg">
                {currentCountry.historicalLeader || currentCountry.headOfState || "Indisponível"}
              </strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 my-3">
          <LocalClockWidget timezone={currentCountry.timezone} />
          <LiveWeatherWidget
            key={currentCountry.isoCode}
            lat={currentCountry.latitude}
            lng={currentCountry.longitude}
            referenceName={currentCountry.completeness === "full" ? currentCountry.capital : null}
          />
        </div>
      )}

      {/* Summary Narrative with Primary Source citation (only when real summary exists) */}
      <div className="mb-3">
        {currentCountry.summary ? (
          <p className="text-label text-fg-secondary">
            {currentCountry.summary}{" "}
            <a
              href={getSourceUrl(primarySourceName)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-sm text-caption text-accent hover:text-accent-hover hover:underline"
              title={`Fonte Primária: ${primarySourceName} / Base TellusPedia (${currentCountry.isoCode}) - Acessar Repositório`}
            >
              <span>
                [Fonte:{" "}
                {currentCountry.isHistoricalEntity
                  ? (primarySourceName.length > 18
                      ? primarySourceName.slice(0, 16) + "…"
                      : primarySourceName)
                  : "ONU"}
                ]
              </span>
              <ExternalLink aria-hidden="true" className="h-3 w-3" />
            </a>
          </p>
        ) : (
          <p
            data-testid="inspector-summary-unavailable"
            className="text-label text-fg-secondary"
          >
            Resumo descritivo indisponível para {currentCountry.nameCommon}.{" "}
            {currentCountry.indicators.length > 0 ? (
              <>
                Indicadores oficiais obtidos do{" "}
                <a
                  href={`https://data.worldbank.org/country/${encodeURIComponent(currentCountry.isoCode)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-accent hover:text-accent-hover hover:underline"
                >
                  Banco Mundial (WDI)
                </a>{" "}
                e geografia de{" "}
                <a
                  href={getSourceUrl("Natural Earth")}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-accent hover:text-accent-hover hover:underline"
                >
                  Natural Earth (1:110m)
                </a>
                {currentCountry.referenceDate ? ` (ref. ${currentCountry.referenceDate})` : ""}.
              </>
            ) : (
              <>
                Identificação geográfica e coordenadas fornecidas por{" "}
                <a
                  href={currentCountry.sourceUrl || getSourceUrl("Natural Earth")}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-accent hover:text-accent-hover hover:underline"
                >
                  Natural Earth (1:110m)
                </a>
                {currentCountry.referenceDate ? ` (ref. ${currentCountry.referenceDate})` : ""}.
              </>
            )}
          </p>
        )}
      </div>

      {/* Metrics & Indicator Grid */}
      <CountryMetricsGrid
        countryName={currentCountry.nameCommon}
        isoCode={currentCountry.isoCode}
        population={currentCountry.population}
        areaKm2={currentCountry.areaKm2}
        currencyCode={currentCountry.currencyCode}
        currencyName={currentCountry.currencyName}
        governmentType={currentCountry.governmentType}
        headOfState={currentCountry.headOfState}
        historicalLeader={currentCountry.historicalLeader}
        leaderTitle={currentCountry.leaderTitle}
        isHistoricalEntity={currentCountry.isHistoricalEntity}
        completeness={currentCountry.completeness}
        indicators={currentCountry.indicators}
      />

      {/* Historical Milestones */}
      <CountryMiniTimeline
        milestones={currentCountry.milestones}
        countryName={currentCountry.nameCommon}
      />

      <StudyContext entityId={`country:${currentCountry.isoCode}`} />
      {currentCountry.isoCode === "BRA" && selectedMilestoneId === "bra-1889" && (
        <div>
          <Link className="text-label text-accent hover:text-accent-hover hover:underline" href="/dossies/dom-pedro-ii">Dom Pedro II</Link>
          <StudyContext entityId="figure:dom-pedro-ii" />
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
        <Button
          variant="primary"
          className="flex-1"
          onMouseEnter={preloadReaderMode}
          onFocus={preloadReaderMode}
          onClick={handleDeepReading}
        >
          <BookOpen aria-hidden="true" className="h-4 w-4" />
          <span>Aprofundar Estudo</span>
        </Button>

        <button
          type="button"
          onMouseEnter={preloadCountryComparator}
          onFocus={preloadCountryComparator}
          onClick={handleCompare}
          aria-pressed={isCompared}
          className={buttonClasses("secondary", "md", cn("gap-1.5 px-3", isCompared && "border-accent/40 bg-accent/15"))}
          title="Comparar com outros países"
        >
          <BarChart2 aria-hidden="true" className="h-4 w-4" />
          <span>{isCompared ? "Comparando" : "Comparar"}</span>
        </button>

        <IconButton
          label="Compartilhar estudo deste país"
          icon={<Share2 />}
          variant="secondary"
          onMouseEnter={preloadStudyShareModal}
          onFocus={preloadStudyShareModal}
          onClick={handleShare}
        />
      </div>

      {/* Subtle Permanent Institutional Footer with Cited Sources */}
      <footer className="mt-3 border-t border-line pt-2.5 text-caption text-fg-muted">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-fg-secondary">Fontes Primárias Auditadas:</span>
          <button
            type="button"
            onMouseEnter={preloadCitationModal}
            onFocus={preloadCitationModal}
            onClick={() => {
              const url =
                typeof window !== "undefined"
                  ? `${window.location.origin}/pais/${currentCountry.isoCode}`
                  : `https://telluspedia.org/pais/${currentCountry.isoCode}`;
              setCitationModalOpen(true, {
                title: `Dossiê Geral e Indicadores: ${currentCountry.nameCommon}`,
                countryName: currentCountry.nameCommon,
                url,
                accessDate: new Date(),
                publicationYear: 2026,
              });
            }}
            className="inline-flex items-center gap-1 text-accent hover:text-accent-hover hover:underline"
            title="Gerar Citação Oficial deste País"
          >
            <Quote aria-hidden="true" className="h-3 w-3" />
            <span>Gerar Citação</span>
          </button>
        </div>
        <p className="space-x-1">
          {currentCountry.isHistoricalEntity ? (
            <>
              <a
                href={getSourceUrl("Maddison")}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-fg hover:underline"
              >
                Maddison Project Database
              </a>
              ,
              <a
                href={getSourceUrl("Correlates of War")}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-fg hover:underline"
              >
                Correlates of War
              </a>
              ,
              <a
                href={getSourceUrl("Natural Earth")}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-fg hover:underline"
              >
                Cartografia Natural Earth
              </a>
              .
            </>
          ) : currentCountry.completeness === "none" ? (
            <>
              <a
                href={currentCountry.sourceUrl || getSourceUrl("Natural Earth")}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-fg hover:underline"
              >
                Cartografia Natural Earth (1:110m)
              </a>
              {" "}e padrão ISO 3166-1 / Unicode CLDR
              {currentCountry.referenceDate ? ` (ref. ${currentCountry.referenceDate})` : ""}.
            </>
          ) : (
            <>
              <a
                href={getSourceUrl("Banco Mundial")}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-fg hover:underline"
              >
                Banco Mundial
              </a>
              ,
              <a
                href={getSourceUrl("ONU")}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-fg hover:underline"
              >
                Divisão de Estatística da ONU
              </a>
              ,
              <a
                href={getSourceUrl("IBGE")}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-fg hover:underline"
              >
                IBGE
              </a>
              ,
              <a
                href={getSourceUrl("Natural Earth")}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-fg hover:underline"
              >
                Cartografia Natural Earth (1:110m)
              </a>
              .
            </>
          )}
        </p>
      </footer>
    </aside>
  );
};
