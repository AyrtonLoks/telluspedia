"use client";

import React, { useState } from "react";
import { Globe, Search, BarChart2, Share2, RotateCcw, Radio, Orbit } from "lucide-react";
import { useGlobeStore } from "@/stores/globeStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useStudyStore } from "@/stores/studyStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { PILOT_COUNTRIES, getCountryData } from "@/lib/country-data";

export const TopNavBar: React.FC = () => {
  const setSelectedIso = useGlobeStore((s) => s.setSelectedIso);
  const flyTo = useGlobeStore((s) => s.flyTo);
  const resetView = useGlobeStore((s) => s.resetView);
  const openComparator = useComparatorStore((s) => s.openComparator);
  const setShareModalOpen = useStudyStore((s) => s.setShareModalOpen);
  const storeIsPanelOpen = useObservatoryStore((s) => s.isPanelOpen);
  const isObservatoryPanelOpen =
    typeof window === "undefined"
      ? useObservatoryStore.getState().isPanelOpen
      : storeIsPanelOpen;
  const toggleObservatoryPanel = useObservatoryStore((s) => s.togglePanel);
  const storeActiveLayers = useObservatoryStore((s) => s.activeLayers);
  const activeObservatoryLayers =
    typeof window === "undefined"
      ? useObservatoryStore.getState().activeLayers
      : storeActiveLayers;
  const hasActiveLayers = activeObservatoryLayers.length > 0;

  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const toggleCosmicMode = useCosmicStore((s) => s.toggleCosmicMode);

  const [searchQuery, setSearchQuery] = useState("");

  const handleCountrySelect = (iso: string) => {
    setSelectedIso(iso);
    useTimelineStore.getState().selectMilestone(null);
    const country = PILOT_COUNTRIES[iso] || getCountryData(iso);
    if (country && country.latitude && country.longitude) {
      flyTo(country.latitude, country.longitude, 2.0);
    }
    setSearchQuery("");
  };

  const filteredCountries = searchQuery
    ? Object.values(PILOT_COUNTRIES).filter(
        (c) =>
          c.nameCommon.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.isoCode.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <header className="fixed top-4 left-6 z-20 flex items-center gap-3">
      {/* Brand Badge */}
      <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl glass-panel shadow-lg">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-700 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/30">
          <Globe className="w-5 h-5 text-slate-950" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-slate-100 tracking-tight leading-none">
            TellusPedia
          </h1>
          <span className="text-[10px] text-cyan-400 font-mono tracking-wider">
            PLANETARY CORE
          </span>
        </div>
      </div>

      {/* Country Quick Search / Selector */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl glass-panel text-xs w-56">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar país ou ISO..."
            className="w-full bg-transparent border-none text-slate-100 placeholder-slate-500 focus:outline-none"
          />
        </div>

        {filteredCountries.length > 0 && (
          <div className="absolute top-full left-0 mt-2 w-64 glass-panel rounded-xl p-1.5 shadow-2xl z-30 space-y-1">
            {filteredCountries.map((c) => (
              <button
                key={c.isoCode}
                onClick={() => handleCountrySelect(c.isoCode)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 text-left text-xs transition-colors"
              >
                <img
                  src={c.flagSvgUrl}
                  alt=""
                  className="w-5 h-3.5 object-cover rounded"
                />
                <span className="font-medium text-slate-200">{c.nameCommon}</span>
                <span className="text-[10px] text-cyan-400 font-mono ml-auto">
                  {c.isoCode}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <button
        onClick={toggleCosmicMode}
        data-testid="top-nav-cosmos-button"
        className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl glass-panel text-xs font-medium transition-all relative ${
          isCosmicMode
            ? "border-amber-500/80 text-amber-300 shadow-md shadow-amber-950/40 bg-amber-950/20"
            : "hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300"
        }`}
        title="Alternar entre Terra e Sistema Solar / Cosmos"
      >
        <Orbit className="w-4 h-4 text-amber-400" />
        <span className="hidden sm:inline">{isCosmicMode ? "Sistema Solar" : "Cosmos"}</span>
        {isCosmicMode && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>
        )}
      </button>

      <button
        onClick={toggleObservatoryPanel}
        data-testid="top-nav-observatory-button"
        className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl glass-panel text-xs font-medium transition-all relative ${
          isObservatoryPanelOpen || hasActiveLayers
            ? "border-cyan-500/70 text-cyan-300 shadow-md shadow-cyan-950/40 bg-cyan-950/20"
            : "hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300"
        }`}
        title="Abrir Observatório Planetário (NASA / Tráfego Global)"
      >
        <Radio
          className={`w-4 h-4 text-cyan-400 ${hasActiveLayers ? "animate-pulse" : ""}`}
        />
        <span className="hidden sm:inline">Observatório</span>
        {hasActiveLayers && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
          </span>
        )}
      </button>

      <button
        onClick={openComparator}
        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl glass-panel hover:border-cyan-500/50 text-xs font-medium text-slate-200 transition-all hover:text-cyan-300"
      >
        <BarChart2 className="w-4 h-4 text-cyan-400" />
        <span className="hidden sm:inline">Comparador</span>
      </button>

      <button
        onClick={() => setShareModalOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl glass-panel hover:border-cyan-500/50 text-xs font-medium text-slate-200 transition-all hover:text-cyan-300"
      >
        <Share2 className="w-4 h-4 text-amber-400" />
        <span className="hidden sm:inline">Compartilhar</span>
      </button>

      <button
        onClick={resetView}
        className="p-2 rounded-2xl glass-panel hover:border-cyan-500/50 text-slate-400 hover:text-white transition-all"
        title="Resetar visão da Terra"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </header>
  );
};
