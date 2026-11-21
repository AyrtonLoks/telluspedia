"use client";

import React, { Suspense, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { TopNavBar } from "@/components/nav/TopNavBar";
import { TimelineBar } from "@/components/timeline/TimelineBar";
import { useShellObstruction } from "@/components/layout/useShellObstruction";
import { useRightDock } from "@/components/layout/useRightDock";
import { DockSkeleton } from "@/components/layout/DockSkeleton";
import { ModalSkeleton } from "@/components/ui/Skeleton";
import { usePresence, useLastDefined } from "@/components/ui/motion";
import { useEpochState } from "@/lib/epoch/useEpochState";
import type { StudyRecord } from "@/lib/studies-store";
import { restoreStudySnapshot, selectCountry } from "@/stores/actions";
import { SceneLinkSync } from "@/components/scenes/SceneLinkSync";
import { ExplorerUrlSync } from "@/components/explore/ExplorerUrlSync";
import { WebGLErrorBoundary } from "@/components/globe/WebGLErrorBoundary";
import { DEFAULT_CAMERA_OFFSET, type ViewCamera } from "@/lib/explore/view-camera";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useReaderStore } from "@/stores/readerStore";
import { useStudyStore } from "@/stores/studyStore";

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

function EntityLaunchGate() {
  const searchParams = useSearchParams();
  if (!searchParams.has("entity")) return null;
  return <EntityLaunch />;
}

export type InitialGlobeState =
  | { kind: "default" }
  | { kind: "study"; study: StudyRecord }
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
  if (initialState.kind === "study") {
    restoreStudySnapshot(initialState.study);
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

  // One-time synchronous hydration before children mount (eliminates default-state flash on SSR & hydration)
  if (hydratedKeyRef.current === null) {
    hydratedKeyRef.current = stateKey;
    applyInitialGlobeState(initialState);
  }

  // Subsequent route transitions while shell remains mounted
  useEffect(() => {
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
  const isCitationModalOpen = useReaderStore((s) => s.isCitationModalOpen);

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
        {/* Top Floating Navigation Bar */}
        <Suspense fallback={null}>
          <TopNavBar />
          <EntityLaunchGate />
        </Suspense>
        <WebGLErrorBoundary>
          <GlobeCanvas viewCamera={viewCamera} />
        </WebGLErrorBoundary>
        {/* Link de cena (?cena=<id>) e endereço em sincronia com a cena aberta (D12d) */}
        <SceneLinkSync />
        <ExplorerUrlSync view={viewCamera} immutable={initialState.kind === "study"} />

        <div ref={annotations} className="map-annotations pointer-events-none fixed z-20 flex w-max -translate-x-1/2 flex-col items-center gap-2">
          {initialState.kind === "study" && (
            <ForkStudyBanner
              studyId={initialState.study.id}
              parentId={initialState.study.parentId}
              title={initialState.study.title}
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
