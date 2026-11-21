"use client";

import { resetGlobeView } from "@/stores/actions";

import Link from "next/link";
import React from "react";
import { Globe, Search, BarChart2, Share2, RotateCcw, Radio, Orbit, BookOpen } from "lucide-react";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useStudyStore } from "@/stores/studyStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { panelButtonAction, useRightDock } from "@/components/layout/useRightDock";
import { useOpenExploreSearch } from "@/components/explore/SearchProvider";
import {
  preloadCosmicHud,
  preloadCountryComparator,
  preloadRightDock,
  preloadStudyShareModal,
} from "@/lib/panel-preload";
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
  const openSearch = useOpenExploreSearch();
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
          onMouseEnter={() => { preloadCosmicHud(); preloadRightDock(); }}
          onFocus={() => { preloadCosmicHud(); preloadRightDock(); }}
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
          onMouseEnter={preloadRightDock}
          onFocus={preloadRightDock}
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

        <button
          type="button"
          onClick={openComparator}
          onMouseEnter={preloadCountryComparator}
          onFocus={preloadCountryComparator}
          className={navItemClasses(false)}
        >
          <BarChart2 aria-hidden="true" className="h-4 w-4" />
          <span className="hidden sm:inline">Comparador</span>
        </button>

        <button
          type="button"
          aria-label="Buscar no TellusPedia"
          aria-keyshortcuts="Control+k Meta+k"
          aria-haspopup="dialog"
          onClick={openSearch}
          className={buttonClasses("secondary", "md", "ml-1 gap-2 sm:w-56 sm:justify-start sm:bg-surface-sunken")}
        >
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
          <span className="hidden text-fg-secondary sm:inline">Buscar no TellusPedia</span>
          <kbd aria-hidden="true" className="ml-auto hidden rounded border border-line px-1 font-mono text-caption text-fg-muted sm:inline">⌘/Ctrl K</kbd>
        </button>

        <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />

        <button
          type="button"
          onClick={() => setShareModalOpen(true)}
          onMouseEnter={preloadStudyShareModal}
          onFocus={preloadStudyShareModal}
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
