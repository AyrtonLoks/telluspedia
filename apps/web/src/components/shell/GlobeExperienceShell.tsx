"use client";

import React, { Suspense, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { EntityLaunch } from "@/components/tellus-bridge/EntityLaunch";
import { TopNavBar } from "@/components/nav/TopNavBar";
import { HistoricalEraBadge } from "@/components/globe/HistoricalEraBadge";
import { PaleoEraBadge } from "@/components/globe/PaleoEraBadge";
import { HistoricalRouteOverlay } from "@/components/globe/HistoricalRouteOverlay";
import { RightDock } from "@/components/layout/RightDock";
import { CosmicInspectorHUD } from "@/components/hud/CosmicInspectorHUD";
import { TimelineBar } from "@/components/timeline/TimelineBar";
import { ReaderMode } from "@/components/reader/ReaderMode";
import { CountryComparator } from "@/components/comparator/CountryComparator";
import { StudyShareModal } from "@/components/study/StudyShareModal";
import { CitationModal } from "@/components/reader/CitationModal";
import { ForkStudyBanner } from "@/components/study/ForkStudyBanner";
import type { StudyRecord } from "@/lib/studies-store";
import { restoreStudySnapshot, selectCountry } from "@/stores/actions";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useGlobeStore } from "@/stores/globeStore";

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

  return (
    <>
      {initialState.kind === "study" && (
        <ForkStudyBanner
          studyId={initialState.study.id}
          parentId={initialState.study.parentId}
          title={initialState.study.title}
        />
      )}
      <main className="relative h-screen w-screen overflow-hidden bg-bg select-none">
        {/* 3D WebGL Canvas Layer */}
        <GlobeCanvas />

        {/* Top Floating Navigation Bar */}
        <Suspense fallback={null}>
          <TopNavBar />
          <EntityLaunch />
        </Suspense>

        {/* Floating Historical Era Badge */}
        <HistoricalEraBadge />

        {/* Floating Paleogeographical Deep-Time Era Badge (RN10 & RN11) */}
        <PaleoEraBadge />

        {/* Floating Historical Expedition / Magellan Route HUD Overlay (RN12) */}
        <HistoricalRouteOverlay />

        {/* Dock direito (D15): Inspector do país, Observatório e Inspector cósmico num único lugar */}
        <RightDock />

        {/* Botão flutuante de camadas cósmicas (quando nenhum corpo está focado) */}
        <CosmicInspectorHUD placement="floating" />

        {/* Bottom Semantic Dynamic Timeline (50 Years Default) */}
        <TimelineBar />

        {/* Camada 2: Deep Reading Mode Overlay with TOC & Academic Citations */}
        <ReaderMode />

        {/* Multidimensional Country Comparator (Up to 4 Nations & Recharts) */}
        <CountryComparator />

        {/* Shareable Study Snapshot & Fork Modal */}
        <StudyShareModal />

        {/* Citation Generator Modal (Global) */}
        <CitationModal />
      </main>
    </>
  );
};
