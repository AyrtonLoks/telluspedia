"use client";

import React from "react";
import {
  X,
  Flame,
  Activity,
  Radio,
  Plane,
  Anchor,
  AlertTriangle,
  RotateCcw,
  Layers,
} from "lucide-react";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useStudyStore } from "@/stores/studyStore";
import { ObservatoryLayerId, isContemporaryEpoch } from "@/lib/observatory-data";

interface LayerOption {
  id: ObservatoryLayerId;
  name: string;
  source: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeText: (state: any) => string;
}

const LAYER_OPTIONS: LayerOption[] = [
  {
    id: "NASA_FIRMS",
    name: "Queimadas Ativas (FIRMS)",
    source: "NASA MODIS / VIIRS",
    description: "Anomalias térmicas globais e focos de calor das últimas 24h.",
    icon: Flame,
    accentColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    badgeText: (s) => `${s.firmsHotspots?.length || 0} focos ativos`,
  },
  {
    id: "NASA_EONET",
    name: "Eventos Severos (EONET)",
    source: "NASA Earth Observatory",
    description: "Monitoramento de tempestades, vulcões, secas e eventos naturais.",
    icon: Activity,
    accentColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    badgeText: (s) => `${s.eonetEvents?.length || 0} eventos severos`,
  },
  {
    id: "ISS_SATELLITES",
    name: "ISS & Satélites Artificiais",
    source: "CelesTrak / Telemetria Orbital",
    description: "Estação Espacial Internacional com propagação em tempo real e rastro.",
    icon: Radio,
    accentColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    badgeText: (s) => `Altitude: ${s.issTelemetry?.altitudeKm || 408} km`,
  },
  {
    id: "FLIGHTS_OPENSKY",
    name: "Tráfego Aéreo Comercial",
    source: "OpenSky Network (ADS-B)",
    description: "Frotas de aviação civil em altitude de cruzeiro e rumo ativo.",
    icon: Plane,
    accentColor: "text-sky-400 bg-sky-500/10 border-sky-500/30",
    badgeText: (s) => `${s.aircraftFleet?.length || 0} voos rastreados`,
  },
  {
    id: "MARITIME_ROUTES",
    name: "Rotas Marítimas Globais",
    source: "AIS / Corredores Mercantes",
    description: "Grandes estreitos, canais e rotas de navegação transoceânicas.",
    icon: Anchor,
    accentColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    badgeText: (s) => `${s.maritimeRoutes?.length || 0} corredores mercantes`,
  },
];

export const ObservatoryPanel: React.FC = () => {
  const storeIsPanelOpen = useObservatoryStore((s) => s.isPanelOpen);
  const isPanelOpen =
    typeof window === "undefined"
      ? (useObservatoryStore.getState().isPanelOpen ?? storeIsPanelOpen)
      : storeIsPanelOpen;
  const setPanelOpen = useObservatoryStore((s) => s.setPanelOpen);
  const storeActiveLayers = useObservatoryStore((s) => s.activeLayers);
  const activeLayers =
    typeof window === "undefined"
      ? (useObservatoryStore.getState().activeLayers ?? storeActiveLayers)
      : storeActiveLayers;
  const toggleLayer = useObservatoryStore((s) => s.toggleLayer);
  const resetObservatory = useObservatoryStore((s) => s.resetObservatory);
  const clientStoreState = useObservatoryStore();
  const storeState = typeof window === "undefined" ? useObservatoryStore.getState() : clientStoreState;

  const storeSelectedYear = useTimelineStore((s) => s.selectedYear);
  const selectedYear =
    typeof window === "undefined"
      ? useTimelineStore.getState().selectedYear
      : storeSelectedYear;
  const storeTimelineMode = useTimelineStore((s: any) => s.timelineMode);
  const timelineMode =
    typeof window === "undefined"
      ? useTimelineStore.getState().timelineMode
      : storeTimelineMode;
  const storeGeologicalMa = useTimelineStore((s: any) => s.selectedGeologicalMa);
  const storeStudyMa = useStudyStore((s: any) => s.geologicalMa);
  const selectedGeologicalMa =
    typeof window === "undefined"
      ? useTimelineStore.getState().selectedGeologicalMa
      : storeGeologicalMa;
  const studyGeologicalMa =
    typeof window === "undefined"
      ? useStudyStore.getState().geologicalMa
      : storeStudyMa;

  const effectiveMa =
    timelineMode === "GEOLOGICAL" ? (selectedGeologicalMa ?? studyGeologicalMa) : null;
  const isContemporary = isContemporaryEpoch(selectedYear, effectiveMa);

  if (!isPanelOpen) return null;

  return (
    <div
      data-testid="observatory-panel"
      className="fixed top-20 right-6 z-30 w-88 max-w-[calc(100vw-3rem)] glass-panel rounded-2xl shadow-2xl border border-cyan-500/30 p-5 animate-in fade-in slide-in-from-top-3 flex flex-col max-h-[calc(100vh-6.5rem)] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 leading-tight">
              Observatório Planetário
            </h2>
            <span className="text-[10px] text-cyan-400 font-mono tracking-wide">
              NASA • OPENSKY • CELESTRAK
            </span>
          </div>
        </div>

        <button
          onClick={() => setPanelOpen(false)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Fechar painel do observatório"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Anachronism Banner (RN09 & RN10) */}
      {!isContemporary && (
        <div
          data-testid="observatory-anachronism-banner"
          className="my-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5 shrink-0"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-200">
              Telemetria Contemporânea Pausada
            </div>
            <div className="text-[11px] text-amber-300/80 leading-relaxed">
              {effectiveMa
                ? `A era geológica ativa (${effectiveMa} Ma atrás) precede a formação da atmosfera moderna e da civilização.`
                : `O ano selecionado (${selectedYear}) precede a Era Espacial (1957).`}
              {" "}Satélites artificiais, queimadas orbitais e tráfego aéreo estão suprimidos nesta época.
            </div>
          </div>
        </div>
      )}

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 my-3 pr-1 scrollbar-thin">
        {LAYER_OPTIONS.map((layer) => {
          const isActive = activeLayers.includes(layer.id);
          const Icon = layer.icon;
          const badge = layer.badgeText(storeState);

          return (
            <div
              key={layer.id}
              className={`p-3 rounded-xl border transition-all ${
                isActive
                  ? "bg-slate-900/90 border-cyan-500/50 shadow-md shadow-cyan-950/20"
                  : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg border ${layer.accentColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-100">
                      {layer.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {layer.source}
                    </span>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  data-testid={`layer-toggle-${layer.id}`}
                  onClick={() => toggleLayer(layer.id)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isActive ? "bg-cyan-500" : "bg-slate-700"
                  }`}
                  role="switch"
                  aria-checked={isActive}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                      isActive ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <p className="text-[11px] text-slate-400 mt-2 leading-tight">
                {layer.description}
              </p>

              {isActive && (
                <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                  <span className="text-cyan-400 font-mono font-medium">
                    {badge}
                  </span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Ao Vivo (SWR)
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>{activeLayers.length} camadas ativas</span>
        </div>

        {activeLayers.length > 0 && (
          <button
            onClick={resetObservatory}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" />
            <span>Limpar Camadas</span>
          </button>
        )}
      </div>
    </div>
  );
};
