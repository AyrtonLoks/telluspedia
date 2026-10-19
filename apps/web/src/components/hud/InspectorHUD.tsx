"use client";

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
import { CountryHeader } from "./CountryHeader";
import { LocalClockWidget } from "./LocalClockWidget";
import { LiveWeatherWidget } from "./LiveWeatherWidget";
import { CountryMetricsGrid } from "./CountryMetricsGrid";
import { CountryMiniTimeline } from "./CountryMiniTimeline";

export interface InspectorHUDProps {
  selectedIso?: string | null;
  selectedYear?: number | null;
}

export const InspectorHUD: React.FC<InspectorHUDProps> = (props) => {
  const storeSelectedIso = useGlobeStore((s) => s.selectedIso);
  const storeIsReaderOpen = useGlobeStore((s) => s.isReaderOpen);
  const storeIsTimelineExpanded = useTimelineStore((s) => s.isExpanded);

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

  const isTimelineExpanded =
    typeof window === "undefined"
      ? useTimelineStore.getState().isExpanded
      : storeIsTimelineExpanded;

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
    resetActiveDimension();
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

  const maxHeightClass = isTimelineExpanded
    ? "max-h-[calc(100vh-13rem)]"
    : "max-h-[calc(100vh-5.5rem)]";

  const primarySourceName =
    currentCountry.indicators?.[0]?.sourcePrimary ||
    (currentCountry.isHistoricalEntity ? "Maddison Project Database" : "ONU");

  return (
    <aside
      data-inspector-hud="true"
      className={`fixed top-5 right-5 z-20 w-96 max-w-[calc(100vw-2.5rem)] ${maxHeightClass} overflow-y-auto glass-panel rounded-2xl p-4 shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-right-4`}
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
      />

      {/* Real-time Environment: Local Clock + Open-Meteo Weather (Contemporary) OR Historical Vigência/Leadership Context (Extinct Entities) */}
      {currentCountry.isHistoricalEntity ? (
        <div className="grid grid-cols-2 gap-2 my-3">
          <LocalClockWidget timezone={currentCountry.timezone} />
          <div
            data-historical-context="true"
            className="p-2.5 rounded-xl bg-slate-900/60 border border-amber-500/30 flex flex-col justify-between shadow-inner shadow-amber-950/20"
          >
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
              <History className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Entidade Histórica</span>
            </div>
            <div className="text-xs text-slate-100 font-semibold my-0.5">
              Vigência: {currentCountry.startYear} – {currentCountry.endYear}
            </div>
            <div
              className="text-[10px] text-amber-300/90 line-clamp-1"
              title={`${currentCountry.leaderTitle || "Líder"}: ${currentCountry.historicalLeader || currentCountry.headOfState}`}
            >
              <span className="text-slate-400">
                {currentCountry.leaderTitle ? `${currentCountry.leaderTitle}: ` : "Líder: "}
              </span>
              <strong className="text-slate-200 font-semibold">
                {currentCountry.historicalLeader || currentCountry.headOfState}
              </strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 my-3">
          <LocalClockWidget timezone={currentCountry.timezone} />
          <LiveWeatherWidget
            lat={currentCountry.latitude}
            lng={currentCountry.longitude}
          />
        </div>
      )}

      {/* Summary Narrative with Primary Source citation */}
      <div className="mb-3">
        <p className="text-xs text-slate-300 leading-relaxed">
          {currentCountry.summary}{" "}
          <a
            href={getSourceUrl(primarySourceName)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan-400/90 hover:text-cyan-200 hover:underline bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/50 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
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
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>
        </p>
      </div>

      {/* Metrics & Indicator Grid */}
      <CountryMetricsGrid
        countryName={currentCountry.nameCommon}
        population={currentCountry.population}
        areaKm2={currentCountry.areaKm2}
        currencyCode={currentCountry.currencyCode}
        currencyName={currentCountry.currencyName}
        governmentType={currentCountry.governmentType}
        headOfState={currentCountry.headOfState}
        historicalLeader={currentCountry.historicalLeader}
        leaderTitle={currentCountry.leaderTitle}
        isHistoricalEntity={currentCountry.isHistoricalEntity}
        indicators={currentCountry.indicators}
      />

      {/* Historical Milestones */}
      <CountryMiniTimeline
        milestones={currentCountry.milestones}
        countryName={currentCountry.nameCommon}
      />

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center gap-2">
        <button
          onClick={handleDeepReading}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white font-medium text-xs shadow-lg shadow-cyan-950/50 transition-all active:scale-[0.98]"
        >
          <BookOpen className="w-4 h-4" />
          <span>Aprofundar Estudo</span>
        </button>

        <button
          onClick={handleCompare}
          className={`px-3 py-2.5 rounded-xl border font-medium text-xs transition-all flex items-center gap-1.5 ${
            isCompared
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : "glass-button text-slate-200"
          }`}
          title="Comparar com outros países"
        >
          <BarChart2 className="w-4 h-4 text-amber-400" />
          <span>{isCompared ? "Comparando" : "Comparar"}</span>
        </button>

        <button
          onClick={handleShare}
          className="p-2.5 rounded-xl glass-button text-slate-300 hover:text-white"
          title="Compartilhar estudo deste país"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Subtle Permanent Institutional Footer with Cited Sources */}
      <footer className="mt-3 pt-2.5 border-t border-slate-700/60 text-[10px] text-slate-400 leading-relaxed">
        <div className="flex items-center justify-between mb-1">
          <span className="text-cyan-400 font-medium">Fontes Primárias Auditadas:</span>
          <button
            type="button"
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
            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline font-mono text-[9px]"
            title="Gerar Citação Oficial deste País"
          >
            <Quote className="w-3 h-3" />
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
                className="hover:text-cyan-300 hover:underline"
              >
                Maddison Project Database
              </a>
              ,
              <a
                href={getSourceUrl("Correlates of War")}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cyan-300 hover:underline"
              >
                Correlates of War
              </a>
              ,
              <a
                href={getSourceUrl("Natural Earth")}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cyan-300 hover:underline"
              >
                Cartografia Natural Earth
              </a>
              .
            </>
          ) : (
            <>
              <a
                href={getSourceUrl("Banco Mundial")}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cyan-300 hover:underline"
              >
                Banco Mundial
              </a>
              ,
              <a
                href={getSourceUrl("ONU")}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cyan-300 hover:underline"
              >
                Divisão de Estatística da ONU
              </a>
              ,
              <a
                href={getSourceUrl("IBGE")}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cyan-300 hover:underline"
              >
                IBGE
              </a>
              ,
              <a
                href={getSourceUrl("Natural Earth")}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cyan-300 hover:underline"
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
