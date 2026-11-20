"use client";

import { selectCountry, resetGlobeView } from "@/stores/actions";

import Link from "next/link";
import React, { useState } from "react";
import { Globe, Search, BarChart2, Share2, RotateCcw, Radio, Orbit, BookOpen } from "lucide-react";
import { useGlobeStore } from "@/stores/globeStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useStudyStore } from "@/stores/studyStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { panelButtonAction, useRightDock } from "@/components/layout/useRightDock";
import { PILOT_COUNTRIES, getCountryData } from "@/lib/country-data";
import { IconButton } from "@/components/ui/IconButton";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

/** Botão de navegação da barra: neutro; selecionado = tinta do acento. */
function navItemClasses(isActive: boolean) {
  return cn(
    buttonClasses("ghost", "md", "relative gap-1.5 px-3"),
    isActive && "bg-accent/15 text-fg hover:bg-accent/20"
  );
}

export const TopNavBar: React.FC = () => {
  const flyTo = useGlobeStore((s) => s.flyTo);
  const openComparator = useComparatorStore((s) => s.openComparator);
  const setShareModalOpen = useStudyStore((s) => s.setShareModalOpen);
  const storeIsPanelOpen = useObservatoryStore((s) => s.isPanelOpen);
  const isObservatoryPanelOpen =
    typeof window === "undefined"
      ? useObservatoryStore.getState().isPanelOpen
      : storeIsPanelOpen;
  const togglePanel = useObservatoryStore((s) => s.togglePanel);
  const dock = useRightDock();
  const setActiveRightPanel = useLayoutStore((s) => s.setActiveRightPanel);
  // Aberto mas atrás de outra aba do dock → traz para frente; senão abre/fecha (D15).
  const toggleObservatoryPanel = () => {
    if (panelButtonAction("observatory", isObservatoryPanelOpen, dock) === "focus") setActiveRightPanel("observatory");
    else togglePanel();
  };
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
    selectCountry(iso);
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
    <header className="fixed left-6 top-4 z-20 max-w-[calc(100vw-3rem)]">
      <nav
        aria-label="Principal"
        className="flex flex-wrap items-center gap-1 rounded-panel border border-line bg-surface/86 p-1.5 shadow-e2 backdrop-blur-md"
      >
        {/* Marca */}
        <Link
          href="/"
          className="flex h-9 items-center gap-2 rounded-control px-2 text-fg transition-colors duration-base ease-out hover:bg-surface-hover"
        >
          <Globe aria-hidden="true" className="h-5 w-5 text-accent" />
          <h1 className="text-body font-semibold leading-none">TellusPedia</h1>
        </Link>

        <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />

        <Link href="/telluslab" className={navItemClasses(false)}>
          <BookOpen aria-hidden="true" className="h-4 w-4" />
          <span className="hidden sm:inline">Estudo</span>
        </Link>

        <button
          type="button"
          onClick={toggleCosmicMode}
          data-testid="top-nav-cosmos-button"
          aria-pressed={isCosmicMode}
          className={navItemClasses(isCosmicMode)}
          title="Alternar entre Terra e Sistema Solar / Cosmos"
        >
          <Orbit aria-hidden="true" className="h-4 w-4" />
          <span className="hidden sm:inline">{isCosmicMode ? "Sistema Solar" : "Cosmos"}</span>
        </button>

        <button
          type="button"
          onClick={toggleObservatoryPanel}
          data-testid="top-nav-observatory-button"
          aria-pressed={isObservatoryPanelOpen}
          className={navItemClasses(isObservatoryPanelOpen || hasActiveLayers)}
          title="Abrir Observatório Planetário (NASA / Tráfego Global)"
        >
          <Radio aria-hidden="true" className="h-4 w-4" />
          <span className="hidden sm:inline">Observatório</span>
          {hasActiveLayers && (
            <span className="absolute right-1 top-1 flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
          )}
        </button>

        <button type="button" onClick={openComparator} className={navItemClasses(false)}>
          <BarChart2 aria-hidden="true" className="h-4 w-4" />
          <span className="hidden sm:inline">Comparador</span>
        </button>

        {/* Busca de país */}
        <div className="relative ml-1">
          <label className="flex h-9 w-56 items-center gap-2 rounded-control border border-line bg-surface-sunken px-3 text-label">
            <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
            <span className="sr-only">Buscar país ou código ISO</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar país ou ISO…"
              className="w-full min-w-0 border-none bg-transparent text-fg placeholder:text-fg-muted focus:outline-none"
            />
          </label>

          {filteredCountries.length > 0 && (
            <div className="absolute left-0 top-full z-30 mt-2 w-64 space-y-0.5 rounded-card border border-line bg-surface p-1.5 shadow-e2">
              {filteredCountries.map((c) => (
                <button
                  type="button"
                  key={c.isoCode}
                  onClick={() => handleCountrySelect(c.isoCode)}
                  className="flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-left text-label transition-colors duration-fast ease-out hover:bg-surface-hover"
                >
                  <img src={c.flagSvgUrl} alt="" className="h-3.5 w-5 rounded-sm object-cover" />
                  <span className="font-medium text-fg">{c.nameCommon}</span>
                  <span className="ml-auto font-mono text-caption text-fg-muted">{c.isoCode}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />

        <button
          type="button"
          onClick={() => setShareModalOpen(true)}
          className={buttonClasses("secondary", "md", "gap-1.5 px-3")}
        >
          <Share2 aria-hidden="true" className="h-4 w-4" />
          <span className="hidden sm:inline">Compartilhar</span>
        </button>

        <IconButton label="Resetar visão da Terra" icon={<RotateCcw />} onClick={resetGlobeView} />
      </nav>
    </header>
  );
};
