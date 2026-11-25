"use client";

import { resetGlobeView } from "@/stores/actions";

import Link from "next/link";
import React from "react";
import { Globe, Search, BarChart2, Share2, RotateCcw, Radio, Orbit, BookOpen, Library, Layers } from "lucide-react";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useStudyStore } from "@/stores/studyStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useChoroplethStore } from "@/stores/choroplethStore";
import { useCriticalGeoStore } from "@/stores/criticalGeoStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { panelButtonAction, useRightDock } from "@/components/layout/useRightDock";
import { useOpenExploreSearch } from "@/components/explore/SearchProvider";
import {
  preloadChoroplethHud,
  preloadCosmicHud,
  preloadCountryComparator,
  preloadRightDock,
  preloadStudyShareModal,
} from "@/lib/panel-preload";
import { IconButton } from "@/components/ui/IconButton";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { useStoreSnapshot } from "@/lib/use-hydrated";
import { useI18n } from "@/lib/i18n/useT";

/** Botão de navegação da barra: neutro; selecionado = tinta do acento. */
function navItemClasses(isActive: boolean) {
  return cn(
    buttonClasses("ghost", "md", "relative w-7 gap-1.5 px-0 sm:w-9 xl:w-auto xl:px-2.5"),
    isActive && "bg-accent/15 text-fg hover:bg-accent/20"
  );
}

export const TopNavBar: React.FC = () => {
  const { t } = useI18n();
  const openSearch = useOpenExploreSearch();
  const openComparator = useComparatorStore((s) => s.openComparator);
  const setShareModalOpen = useStudyStore((s) => s.setShareModalOpen);
  // Mesmo valor no HTML do servidor e na hidratação (T41): a rota /study/<id> já chega com camadas.
  const isObservatoryPanelOpen = useStoreSnapshot(useObservatoryStore, (s) => s.isPanelOpen);
  const togglePanel = useObservatoryStore((s) => s.togglePanel);
  const dock = useRightDock();
  const setActiveRightPanel = useLayoutStore((s) => s.setActiveRightPanel);
  // Aberto mas atrás de outra aba do dock → traz para frente; senão abre/fecha (D15).
  const toggleObservatoryPanel = (event: React.MouseEvent<HTMLButtonElement>) => {
    const focus = panelButtonAction("observatory", isObservatoryPanelOpen, dock) === "focus";
    if (focus) setActiveRightPanel("observatory");
    else togglePanel();
    if (event.detail === 0 && (focus || !isObservatoryPanelOpen)) {
      useLayoutStore.getState().requestRightPanelFocus("observatory");
    }
  };
  const hasActiveLayers = useStoreSnapshot(useObservatoryStore, (s) => s.activeLayers.length > 0);

  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const toggleCosmicMode = useCosmicStore((s) => s.toggleCosmicMode);
  const handleToggleCosmicMode = () => {
    if (!isCosmicMode && useGlobeStore.getState().viewMode === "2d") {
      useGlobeStore.getState().setViewMode("3d");
    }
    toggleCosmicMode();
  };
  const activeChoropleth = useStoreSnapshot(useChoroplethStore, (s) => s.activeIndicator);
  const activeCriticalLens = useStoreSnapshot(useCriticalGeoStore, (s) => s.activeLens);
  const isChoroplethSelectorOpen = useStoreSnapshot(useChoroplethStore, (s) => s.isSelectorOpen);
  const toggleChoroplethSelector = useChoroplethStore((s) => s.toggleSelector);

  const handleResetGlobe = () => {
    resetGlobeView();
    useChoroplethStore.getState().resetChoropleth();
    useCriticalGeoStore.getState().resetCriticalGeo();
    useStudyStore.getState().resetStudy();
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/study/")) {
      window.history.replaceState(null, "", "/");
    }
  };

  return (
    <header className="fixed left-3 top-3 z-20 max-w-[calc(100%-1.5rem)] xl:left-6 xl:top-4 xl:max-w-[calc(100%-3rem)]">
      <nav
        aria-label={t("nav.main", "Principal")}
        className="flex items-center gap-0.5 rounded-panel xl:gap-1 border border-line bg-surface/86 p-1.5 shadow-e2 backdrop-blur-md"
      >
        {/* Marca */}
        <Link
          href="/"
          aria-label="TellusPedia"
          className="flex h-9 w-7 items-center justify-center gap-2 sm:w-9 rounded-control xl:w-auto xl:px-2 text-fg transition-colors duration-base ease-out hover:bg-surface-hover"
        >
          <Globe aria-hidden="true" className="h-5 w-5 text-accent" />
          <h1 className="sr-only text-body font-semibold leading-none xl:not-sr-only">TellusPedia</h1>
        </Link>

        <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-line xl:block" />

        <Link href="/telluslab" aria-label={t("nav.study", "Estudo")} className={navItemClasses(false)}>
          <BookOpen aria-hidden="true" className="h-4 w-4" />
          <span className="hidden xl:inline">{t("nav.study", "Estudo")}</span>
        </Link>

        <Link
          href="/studies"
          aria-label={t("nav.galleryAria", "Galeria de estudos")}
          data-testid="top-nav-studies-link"
          title={t("nav.galleryTitle", "Explorar Galeria de Estudos Públicos")}
          className={navItemClasses(false)}
        >
          <Library aria-hidden="true" className="h-4 w-4" />
          <span className="hidden xl:inline">{t("nav.gallery", "Galeria")}</span>
        </Link>

        <button
          type="button"
          onClick={handleToggleCosmicMode}
          onMouseEnter={() => { preloadCosmicHud(); preloadRightDock(); }}
          onFocus={() => { preloadCosmicHud(); preloadRightDock(); }}
          aria-label={isCosmicMode ? t("nav.solarSystem", "Sistema Solar") : t("nav.cosmos", "Cosmos")}
          data-testid="top-nav-cosmos-button"
          aria-pressed={isCosmicMode}
          className={navItemClasses(isCosmicMode)}
          title={t("nav.cosmosTitle", "Alternar entre Terra e Sistema Solar / Cosmos")}
        >
          <Orbit aria-hidden="true" className="h-4 w-4" />
          <span className="hidden xl:inline">
            {isCosmicMode ? t("nav.solarSystem", "Sistema Solar") : t("nav.cosmos", "Cosmos")}
          </span>
        </button>

        <button
          type="button"
          id="observatory-trigger"
          aria-label={t("nav.observatory", "Observatório")}
          onClick={toggleObservatoryPanel}
          onMouseEnter={preloadRightDock}
          onFocus={preloadRightDock}
          data-testid="top-nav-observatory-button"
          aria-pressed={isObservatoryPanelOpen}
          className={navItemClasses(isObservatoryPanelOpen || hasActiveLayers)}
          title={t("nav.observatoryTitle", "Abrir Observatório Planetário (NASA / Tráfego Global)")}
        >
          <Radio aria-hidden="true" className="h-4 w-4" />
          <span className="hidden xl:inline">{t("nav.observatory", "Observatório")}</span>
          {hasActiveLayers && (
            <span className="absolute right-1 top-1 flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
          )}
        </button>

        <button
          type="button"
          aria-label={t("nav.thematicAria", "Mapa temático")}
          onClick={toggleChoroplethSelector}
          onMouseEnter={preloadChoroplethHud}
          onFocus={preloadChoroplethHud}
          data-testid="top-nav-choropleth-button"
          aria-pressed={isChoroplethSelectorOpen || activeChoropleth !== null || activeCriticalLens !== null}
          className={navItemClasses(isChoroplethSelectorOpen || activeChoropleth !== null || activeCriticalLens !== null)}
          title={t("nav.thematicTitle", "Mapa temático coroplético (colorir os 177 países por indicador real)")}
        >
          <Layers aria-hidden="true" className="h-4 w-4" />
          <span className="hidden xl:inline">{t("nav.thematic", "Temático")}</span>
          {(activeChoropleth !== null || activeCriticalLens !== null) && (
            <span className="absolute right-1 top-1 flex h-2 w-2" aria-hidden="true">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
          )}
        </button>

        <button
          type="button"
          aria-label={t("nav.comparator", "Comparador")}
          onClick={openComparator}
          onMouseEnter={preloadCountryComparator}
          onFocus={preloadCountryComparator}
          className={navItemClasses(false)}
        >
          <BarChart2 aria-hidden="true" className="h-4 w-4" />
          <span className="hidden xl:inline">{t("nav.comparator", "Comparador")}</span>
        </button>

        <div className="relative xl:ml-1">
          <button
            type="button"
            id="explore-search-trigger"
            aria-label={t("nav.searchAria", "Buscar no TellusPedia")}
            aria-keyshortcuts="/ Control+k Meta+k"
            aria-haspopup="dialog"
            onClick={openSearch}
            className={buttonClasses("secondary", "md", "gap-2 w-7 justify-center sm:w-9 px-0 xl:w-48 xl:justify-start xl:bg-surface-sunken xl:px-3.5")}
          >
            <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
            <span className="hidden text-fg-secondary xl:inline">{t("nav.search", "Buscar")}</span>
          </button>
          <kbd aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1 font-mono text-caption text-fg-muted xl:block">⌘/Ctrl K</kbd>
        </div>

        <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-line xl:block" />

        <button
          type="button"
          aria-label={t("nav.share", "Compartilhar")}
          onClick={() => setShareModalOpen(true)}
          onMouseEnter={preloadStudyShareModal}
          onFocus={preloadStudyShareModal}
          className={buttonClasses("secondary", "md", "w-7 gap-1.5 px-0 sm:w-9 xl:w-auto xl:px-3")}
        >
          <Share2 aria-hidden="true" className="h-4 w-4" />
          <span className="hidden xl:inline">{t("nav.share", "Compartilhar")}</span>
        </button>

        <IconButton label={t("nav.resetView", "Resetar visão da Terra")} icon={<RotateCcw />} onClick={handleResetGlobe} />
      </nav>
    </header>
  );
};
