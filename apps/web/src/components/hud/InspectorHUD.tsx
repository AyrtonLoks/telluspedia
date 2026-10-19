"use client";

import React, { useMemo } from "react";
import { BookOpen, BarChart2, Share2 } from "lucide-react";
import { useGlobeStore } from "@/stores/globeStore";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useStudyStore } from "@/stores/studyStore";
import { getCountryData, PilotCountryData } from "@/lib/country-data";
import { CountryHeader } from "./CountryHeader";
import { LocalClockWidget } from "./LocalClockWidget";
import { LiveWeatherWidget } from "./LiveWeatherWidget";
import { CountryMetricsGrid } from "./CountryMetricsGrid";
import { CountryMiniTimeline } from "./CountryMiniTimeline";

export const InspectorHUD: React.FC = () => {
  const selectedIso = useGlobeStore((s) => s.selectedIso);
  const isReaderOpen = useGlobeStore((s) => s.isReaderOpen);
  const setReaderOpen = useGlobeStore((s) => s.setReaderOpen);

  const toggleCountry = useComparatorStore((s) => s.toggleCountry);
  const openComparator = useComparatorStore((s) => s.openComparator);
  const comparatorIsos = useComparatorStore((s) => s.selectedIsos);

  const setShareModalOpen = useStudyStore((s) => s.setShareModalOpen);

  const currentCountry = useMemo(() => {
    if (!selectedIso) return null;
    return getCountryData(selectedIso);
  }, [selectedIso]);

  if (!selectedIso || isReaderOpen || !currentCountry) return null;

  const isCompared = comparatorIsos.includes(currentCountry.isoCode);

  const handleDeepReading = () => {
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

  return (
    <aside className="fixed top-5 right-5 z-20 w-96 max-w-[calc(100vw-2.5rem)] max-h-[calc(100vh-7rem)] overflow-y-auto glass-panel rounded-2xl p-4 shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-right-4">
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

      {/* Real-time Environment: Local Clock + Open-Meteo Weather */}
      <div className="grid grid-cols-2 gap-2 my-3">
        <LocalClockWidget timezone={currentCountry.timezone} />
        <LiveWeatherWidget lat={currentCountry.latitude} lng={currentCountry.longitude} />
      </div>

      {/* Summary Narrative */}
      <p className="text-xs text-slate-300 leading-relaxed mb-3">
        {currentCountry.summary}
      </p>

      {/* Metrics & Indicator Grid */}
      <CountryMetricsGrid
        population={currentCountry.population}
        areaKm2={currentCountry.areaKm2}
        currencyCode={currentCountry.currencyCode}
        currencyName={currentCountry.currencyName}
        governmentType={currentCountry.governmentType}
        headOfState={currentCountry.headOfState}
        indicators={currentCountry.indicators}
      />

      {/* Historical Milestones */}
      <CountryMiniTimeline milestones={currentCountry.milestones} />

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
    </aside>
  );
};
