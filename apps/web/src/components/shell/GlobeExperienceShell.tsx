"use client";

import React, { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Gauge } from "lucide-react";
import { TopNavBar } from "@/components/nav/TopNavBar";
import { TimelineBar } from "@/components/timeline/TimelineBar";
import { useShellObstruction } from "@/components/layout/useShellObstruction";
import { useRightDock } from "@/components/layout/useRightDock";
import { DockSkeleton } from "@/components/layout/DockSkeleton";
import { ModalSkeleton } from "@/components/ui/Skeleton";
import { usePresence, useLastDefined } from "@/components/ui/motion";
import { useEpochState } from "@/lib/epoch/useEpochState";
import type { StudyLineageInfo, StudyRecord } from "@/lib/studies-store";
import { restoreStudySnapshot, selectCountry } from "@/stores/actions";
import { SceneLinkSync } from "@/components/scenes/SceneLinkSync";
import { ExplorerUrlSync } from "@/components/explore/ExplorerUrlSync";
import { WebGLErrorBoundary } from "@/components/globe/WebGLErrorBoundary";
import { DEFAULT_CAMERA_OFFSET, type ViewCamera } from "@/lib/explore/view-camera";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useChoroplethStore } from "@/stores/choroplethStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useGraphicsQualityStore } from "@/stores/graphicsQualityStore";
import { preloadEnMessages, useLocaleStore } from "@/stores/localeStore";
import { useI18n } from "@/lib/i18n/useT";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useReaderStore } from "@/stores/readerStore";
import { useStudyStore } from "@/stores/studyStore";
import { preloadGraphicsQualityPanel } from "@/lib/panel-preload";
import { getQualityProfile } from "@/lib/webgl-quality";
import { cn } from "@/components/ui/cn";

// Load 3D WebGL Canvas client-side only (disables SSR for R3F / Three.js)
const GlobeCanvas = dynamic(
  () => import("@/components/globe/GlobeCanvas").then((m) => m.GlobeCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-bg text-accent font-mono text-caption">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span>Inicializando observatório planetário…</span>
        </div>
      </div>
    ),
  }
);

// Painéis, modais e overlays fechados por padrão são carregados sob demanda (T25)
const EntityLaunch = dynamic(
  () => import("@/components/tellus-bridge/EntityLaunch").then((m) => m.EntityLaunch),
  { ssr: false }
);
const HistoricalEraBadge = dynamic(
  () => import("@/components/globe/HistoricalEraBadge").then((m) => m.HistoricalEraBadge),
  { ssr: false }
);
const PaleoEraBadge = dynamic(
  () => import("@/components/globe/PaleoEraBadge").then((m) => m.PaleoEraBadge),
  { ssr: false }
);
const ScenePlayerOverlay = dynamic(
  () => import("@/components/scenes/ScenePlayerOverlay").then((m) => m.ScenePlayerOverlay),
  { ssr: false }
);
const RightDock = dynamic(
  () => import("@/components/layout/RightDock").then((m) => m.RightDock),
  { ssr: false, loading: () => <DockSkeleton /> }
);
const CosmicInspectorHUD = dynamic(
  () => import("@/components/hud/CosmicInspectorHUD").then((m) => m.CosmicInspectorHUD),
  { ssr: false }
);
const ReaderMode = dynamic(
  () => import("@/components/reader/ReaderMode").then((m) => m.ReaderMode),
  { ssr: false, loading: () => <ModalSkeleton label="Carregando o dossiê" /> }
);
const CountryComparator = dynamic(
  () => import("@/components/comparator/CountryComparator").then((m) => m.CountryComparator),
  { ssr: false, loading: () => <ModalSkeleton label="Carregando o comparador" /> }
);
const StudyShareModal = dynamic(
  () => import("@/components/study/StudyShareModal").then((m) => m.StudyShareModal),
  { ssr: false, loading: () => <ModalSkeleton label="Carregando o compartilhamento" /> }
);
const CitationModal = dynamic(
  () => import("@/components/reader/CitationModal").then((m) => m.CitationModal),
  { ssr: false, loading: () => <ModalSkeleton label="Carregando a citação" /> }
);
const ForkStudyBanner = dynamic(
  () => import("@/components/study/ForkStudyBanner").then((m) => m.ForkStudyBanner),
  { ssr: false }
);
const ChoroplethHud = dynamic(
  () => import("@/components/choropleth/ChoroplethHud").then((m) => m.ChoroplethHud),
  { ssr: false }
);
const GraphicsQualityPanel = dynamic(
  () => import("@/components/globe/GraphicsQualityPanel").then((m) => m.GraphicsQualityPanel),
  { ssr: false }
);

function EntityLaunchGate() {
  const searchParams = useSearchParams();
  if (!searchParams.has("entity")) return null;
  return <EntityLaunch />;
}

export type InitialGlobeState =
  | { kind: "default" }
  | { kind: "study"; study: StudyRecord; lineage?: StudyLineageInfo }
  | { kind: "country"; iso: string; latitude: number | null; longitude: number | null }
  | { kind: "compare"; isos: string[] };

export function getInitialGlobeStateKey(state: InitialGlobeState): string {
  switch (state.kind) {
    case "study":
      return `study:${state.study.id}`;
    case "country":
      return `country:${state.iso}`;
    case "compare":
      return `compare:${state.isos.join(",")}`;
    default:
      return "default";
  }
}

/**
 * Hydrates Zustand stores synchronously from server-loaded route state so the first
 * SSR HTML pass and the first client render already reflect the target study, country,
 * or comparison without flashing the default landing state.
 */
export function applyInitialGlobeState(initialState: InitialGlobeState): void {
  if (typeof window === "undefined") {
    // Evita vazamento de estado de stores Zustand entre requisições SSR consecutivas
    // no mesmo processo Node (ex.: `/pais/GRL` seguido de `/`, que causaria erro React #418).
    selectCountry(null);
    useComparatorStore.getState().closeComparator();
    useChoroplethStore.getState().restoreIndicator(null);
    useStudyStore.getState().setCurrentStudyId(null);
  }

  if (initialState.kind === "study") {
    restoreStudySnapshot(initialState.study);
    useChoroplethStore.getState().restoreIndicator(initialState.study.choroplethIndicator);
    return;
  }

  if (initialState.kind === "country") {
    selectCountry(initialState.iso);
    if (
      initialState.latitude !== null &&
      initialState.longitude !== null &&
      (initialState.latitude !== 0 || initialState.longitude !== 0)
    ) {
      useGlobeStore.getState().flyTo(initialState.latitude, initialState.longitude, 2.0);
    }
    return;
  }

  if (initialState.kind === "compare") {
    const comparator = useComparatorStore.getState();
    if (initialState.isos.length > 0) {
      comparator.setSelectedIsos(initialState.isos);
    }
    comparator.openComparator();
  }
}

/** Vira `true` depois da primeira montagem do shell no cliente (fim da hidratação inicial). */
let clientHydrated = false;

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface GlobeExperienceShellProps {
  initialState?: InitialGlobeState;
}

export const GlobeExperienceShell: React.FC<GlobeExperienceShellProps> = ({
  initialState = { kind: "default" },
}) => {
  const stateKey = getInitialGlobeStateKey(initialState);
  const annotations = useRef<HTMLDivElement>(null);
  useShellObstruction(annotations, "--annotation-obstruction");
  const viewCamera = useRef<ViewCamera>({ offset: DEFAULT_CAMERA_OFFSET, restore: null, onChange: null }).current;
  const hydratedKeyRef = useRef<string | null>(null);
  const observedStudyActiveRef = useRef<string | null>(null);
  const [dismissedStudyKey, setDismissedStudyKey] = useState<string | null>(null);

  // SSR: hidrata stores sincronamente antes dos filhos renderizarem (sem assinantes client montados).
  // Na hidratação inicial do cliente também (T41): ainda não há nenhum assinante montado, e os
  // filhos que leem o store com `useStoreSnapshot` precisam ver o mesmo estado que o servidor viu.
  // Depois disso (navegação entre rotas), evita mutar stores durante o render (React 19: "Cannot
  // update a component while rendering a different component", ex. de /study/[a] para /study/[fork]).
  if ((typeof window === "undefined" || !clientHydrated) && hydratedKeyRef.current !== stateKey) {
    hydratedKeyRef.current = stateKey;
    applyInitialGlobeState(initialState);
  }
  useEffect(() => {
    clientHydrated = true;
  }, []);

  // No cliente, aplica antes da pintura (useLayoutEffect) na montagem inicial e nas transições de rota.
  useIsomorphicLayoutEffect(() => {
    if (hydratedKeyRef.current === stateKey) return;
    hydratedKeyRef.current = stateKey;
    applyInitialGlobeState(initialState);
  }, [stateKey, initialState]);

  const dock = useRightDock();
  const epoch = useEpochState();
  const hasTelemetry = useObservatoryStore((s) => s.selectedEntity !== null);
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const isReaderOpen = useGlobeStore((s) => s.isReaderOpen);
  const selectedIso = useGlobeStore((s) => s.selectedIso);
  const isComparatorOpen = useComparatorStore((s) => s.isOpen);
  const isShareModalOpen = useStudyStore((s) => s.isShareModalOpen);
  const currentStudyId = useStudyStore((s) => s.currentStudyId);
  const studyHistoricalEra = useStudyStore((s) => s.historicalEra);
  const isCitationModalOpen = useReaderStore((s) => s.isCitationModalOpen);
  const activeChoropleth = useChoroplethStore((s) => s.activeIndicator);
  const isChoroplethSelectorOpen = useChoroplethStore((s) => s.isSelectorOpen);
  const qualityPreset = useGraphicsQualityStore((s) => s.preset);
  const adaptiveDprScale = useGraphicsQualityStore((s) => s.adaptiveDprScale);
  const isQualityPanelOpen = useGraphicsQualityStore((s) => s.isPanelOpen);
  const toggleQualityPanel = useGraphicsQualityStore((s) => s.togglePanel);
  const toggleLocale = useLocaleStore((s) => s.toggleLocale);
  const { locale, t } = useI18n();

  useEffect(() => {
    useGraphicsQualityStore.getState().hydrateFromStorage();
    useLocaleStore.getState().hydrateFromStorage();
  }, []);

  const isStudyActive = initialState.kind === "study" && dismissedStudyKey !== stateKey;

  const dismissStudyBanner = useCallback(() => {
    setDismissedStudyKey(stateKey);
    useStudyStore.getState().resetStudy();
    if (initialState.kind === "study" && initialState.study.choroplethIndicator) {
      useChoroplethStore.getState().resetChoropleth();
    }
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/study/")) {
      window.history.replaceState(null, "", "/");
    }
  }, [stateKey, initialState]);

  // Ao voltar à era atual (Restaurar Cartografia Atual / Geografia Contemporânea / Resetar visão),
  // encerra o modo de visualização do snapshot imutável e oculta o cartão do estudo imediatamente.
  useEffect(() => {
    if (initialState.kind !== "study") return;
    if (dismissedStudyKey === stateKey) return;

    const originalEra = initialState.study.historicalEra;
    const expectsHistoricalEra = Boolean(originalEra && originalEra !== "CONTEMPORARY");
    const expectsGeologicalEra = Boolean(
      initialState.study.geologicalMa && initialState.study.geologicalMa > 0
    );

    // Só ativa a detecção de saída depois que o estado do estudo já foi refletido no render atual
    // (evita falso disparo no primeiro ciclo antes do useLayoutEffect propagar o estado do store).
    if (observedStudyActiveRef.current !== stateKey) {
      const studySynced = currentStudyId === initialState.study.id;
      const eraSynced = !expectsHistoricalEra || studyHistoricalEra !== null;
      const geoSynced = !expectsGeologicalEra || epoch.mode === "GEOLOGICAL";
      if (studySynced && eraSynced && geoSynced) {
        observedStudyActiveRef.current = stateKey;
      }
      return;
    }

    const studyCleared = currentStudyId !== initialState.study.id;
    const leftHistoricalStudyEra =
      expectsHistoricalEra &&
      (studyHistoricalEra === null || epoch.historicalEraId === "CONTEMPORARY");
    const leftGeologicalStudyEra = expectsGeologicalEra && epoch.mode !== "GEOLOGICAL";

    if (studyCleared || leftHistoricalStudyEra || leftGeologicalStudyEra) {
      dismissStudyBanner();
    }
  }, [
    initialState,
    stateKey,
    dismissedStudyKey,
    currentStudyId,
    studyHistoricalEra,
    epoch.historicalEraId,
    epoch.mode,
    dismissStudyBanner,
  ]);

  const showHistoricalBadge =
    epoch.mode !== "GEOLOGICAL" && epoch.historicalEraId !== "CONTEMPORARY";
  const showPaleoBadge = epoch.mode === "GEOLOGICAL";
  // Abertura e fechamento animados (D17): cada painel fica montado durante a saída.
  // Painel do player de cenas (D12c): só com uma cena ativa (carregado sob demanda — T25).
  const scenePresence = usePresence(epoch.activeScene !== null);
  const sceneId = useLastDefined(epoch.activeScene, scenePresence.closing);
  const dockPresence = usePresence(dock.visible);
  const readerPresence = usePresence(isReaderOpen && Boolean(selectedIso));
  const comparatorPresence = usePresence(isComparatorOpen);
  const sharePresence = usePresence(isShareModalOpen);
  const citationPresence = usePresence(isCitationModalOpen);

  return (
    <>
      <main
        data-map-shell=""
        data-map-dock={dockPresence.mounted}
        data-map-stacked={scenePresence.mounted && epoch.isContemporary && hasTelemetry}
        className="relative h-dvh w-full overflow-hidden bg-bg select-none"
      >
        {/* Top Floating Navigation Bar — fora de Suspense para hidratar antes de ExplorerUrlSync (T41) */}
        <TopNavBar />
        <Suspense fallback={null}>
          <EntityLaunchGate />
        </Suspense>

        <WebGLErrorBoundary>
          <GlobeCanvas viewCamera={viewCamera} />
        </WebGLErrorBoundary>

        {/* Utilitários discretos no canto superior direito: Idioma (D28a) + Qualidade WebGL (T39) */}
        <div
          className={cn(
            "fixed right-3 top-[var(--map-tools-top)] z-20 flex items-center gap-1.5 lg:top-3 xl:right-6 xl:top-4",
            dockPresence.mounted && "lg:right-[27.5rem]"
          )}
        >
          <button
            type="button"
            data-testid="locale-switcher"
            aria-label={
              locale === "pt-BR"
                ? t("locale.switchToEn", "Switch language to English")
                : t("locale.switchToPt", "Mudar idioma para Português (Brasil)")
            }
            onClick={toggleLocale}
            onMouseEnter={preloadEnMessages}
            onFocus={preloadEnMessages}
            title={t("locale.title", "Idioma da interface (Português / English)")}
            className="inline-flex h-9 items-center justify-center rounded-panel border border-line bg-surface/86 px-2.5 font-mono text-caption font-medium tabular-nums text-fg-secondary shadow-e1 backdrop-blur-md transition-colors duration-fast ease-out hover:border-line-strong hover:bg-surface-hover hover:text-fg"
          >
            {locale === "en" ? "EN" : "PT"}
          </button>

          <button
            type="button"
            data-testid="graphics-quality-trigger"
            aria-label={`${t("quality.title", "Qualidade gráfica")}: ${t(`quality.${qualityPreset}.label`, getQualityProfile(qualityPreset).label)}`}
            aria-pressed={isQualityPanelOpen}
            aria-haspopup="dialog"
            onClick={toggleQualityPanel}
            onMouseEnter={preloadGraphicsQualityPanel}
            onFocus={preloadGraphicsQualityPanel}
            title={t("quality.triggerTitle", "Qualidade gráfica WebGL (Auto / Alto / Médio / Baixo)")}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-panel border border-line bg-surface/86 px-2.5 text-caption font-medium text-fg-secondary shadow-e1 backdrop-blur-md transition-colors duration-fast ease-out hover:border-line-strong hover:bg-surface-hover hover:text-fg",
              isQualityPanelOpen && "border-accent/50 bg-accent/15 text-fg"
            )}
          >
            <Gauge aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
            <span className="hidden sm:inline">
              {t(`quality.${qualityPreset}.label`, getQualityProfile(qualityPreset).label)}
            </span>
            {qualityPreset === "auto" && adaptiveDprScale < 0.99 && (
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-warning" />
            )}
          </button>
        </div>

        {isQualityPanelOpen && <GraphicsQualityPanel dockMounted={dockPresence.mounted} />}
        {/* Link de cena (?cena=<id>) e endereço em sincronia com a cena aberta (D12d) */}
        <SceneLinkSync />
        <ExplorerUrlSync view={viewCamera} immutable={isStudyActive} />

        <div ref={annotations} className="map-annotations pointer-events-none fixed z-20 flex w-max -translate-x-1/2 flex-col items-center gap-2">
          {isStudyActive && initialState.kind === "study" && (
            <ForkStudyBanner
              studyId={initialState.study.id}
              parentId={initialState.study.parentId}
              title={initialState.study.title}
              study={initialState.study}
              lineage={initialState.lineage}
              onDismiss={dismissStudyBanner}
            />
          )}
          {showHistoricalBadge && <HistoricalEraBadge />}
          {showPaleoBadge && <PaleoEraBadge />}
        </div>

        {/* Floating Historical Expedition / Magellan Route HUD Overlay (RN12) */}
        {scenePresence.mounted && sceneId && <ScenePlayerOverlay sceneId={sceneId} closing={scenePresence.closing} />}

        {/* Dock direito (D15): Inspector do país, Observatório e Inspector cósmico num único lugar */}
        {dockPresence.mounted && <RightDock closing={dockPresence.closing} />}

        {/* Botão flutuante de camadas cósmicas (quando nenhum corpo está focado) */}
        {isCosmicMode && <CosmicInspectorHUD placement="floating" />}

        {/* Seletor, legenda contínua e tooltip do modo coroplético (D22 — carregado sob demanda) */}
        {(activeChoropleth !== null || isChoroplethSelectorOpen) && <ChoroplethHud />}

        {/* Bottom Semantic Dynamic Timeline (50 Years Default) */}
        <TimelineBar />

        {/* Camada 2: Deep Reading Mode Overlay with TOC & Academic Citations */}
        {readerPresence.mounted && <ReaderMode />}

        {/* Multidimensional Country Comparator (Up to 4 Nations & Recharts) */}
        {comparatorPresence.mounted && <CountryComparator />}

        {/* Shareable Study Snapshot & Fork Modal */}
        {sharePresence.mounted && <StudyShareModal />}

        {/* Citation Generator Modal (Global) */}
        {citationPresence.mounted && <CitationModal />}
      </main>
    </>
  );
};
