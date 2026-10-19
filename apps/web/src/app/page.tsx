"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { TopNavBar } from "@/components/nav/TopNavBar";
import { HistoricalEraBadge } from "@/components/globe/HistoricalEraBadge";
import { InspectorHUD } from "@/components/hud/InspectorHUD";
import { TimelineBar } from "@/components/timeline/TimelineBar";
import { ReaderMode } from "@/components/reader/ReaderMode";
import { CountryComparator } from "@/components/comparator/CountryComparator";
import { StudyShareModal } from "@/components/study/StudyShareModal";
import { CitationModal } from "@/components/reader/CitationModal";

// Load 3D WebGL Canvas client-side only (disables SSR for R3F / Three.js)
const GlobeCanvas = dynamic(
  () => import("@/components/globe/GlobeCanvas").then((m) => m.GlobeCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-[#030712] text-cyan-400 font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span>INICIALIZANDO OBSERVATÓRIO PLANETÁRIO...</span>
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#030712] select-none">
      {/* 3D WebGL Canvas Layer */}
      <GlobeCanvas />

      {/* Top Floating Navigation Bar */}
      <Suspense fallback={null}>
        <TopNavBar />
      </Suspense>

      {/* Floating Historical Era Badge */}
      <HistoricalEraBadge />

      {/* Camada 1: Inspector HUD (Floating Right Glassmorphism Drawer) */}
      <InspectorHUD />

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
  );
}
