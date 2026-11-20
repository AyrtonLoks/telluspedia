"use client";

import { EonetLayerControls } from "./EonetLayerControls";
import { StudyContext } from "@/components/tellus-bridge/StudyContext";
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
import { DataSourceBadge } from "./DataSourceBadge";
import { MaritimeLayerControls } from "./MaritimeLayerControls";
import { FirmsLayerControls } from "./FirmsLayerControls";
import { FirmsCountrySummary } from "./FirmsCountrySummary";
import { SatelliteLayerControls } from "./SatelliteLayerControls";
import { useGlobeStore } from "@/stores/globeStore";
import { ObservatoryLayerId } from "@/lib/observatory-data";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { PanelFooter, PanelHeader } from "@/components/ui/Panel";
import { Switch } from "@/components/ui/Switch";
import { TONES, type Tone } from "@/components/ui/tones";
import { cn } from "@/components/ui/cn";

interface LayerOption {
  id: ObservatoryLayerId;
  name: string;
  source: string;
  description: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone: Tone;
  badgeText: (state: any) => string;
}

const LAYER_OPTIONS: LayerOption[] = [
  {
    id: "NASA_FIRMS",
    name: "Queimadas Ativas (FIRMS)",
    source: "NASA MODIS / VIIRS",
    description: "Anomalias térmicas globais detectadas por satélite (VIIRS/MODIS): focos de calor ativos.",
    icon: Flame,
    tone: "layer-fires",
    badgeText: (s) => `${(s.firmsTotal ?? s.firmsHotspots?.length ?? 0).toLocaleString("pt-BR")} focos ativos`,
  },
  {
    id: "NASA_EONET",
    name: "Eventos Severos (EONET)",
    source: "NASA Earth Observatory",
    description: "Monitoramento de tempestades, vulcões, secas e eventos naturais.",
    icon: Activity,
    tone: "layer-events",
    badgeText: (s: ReturnType<typeof useObservatoryStore.getState>) => {
      const count = s.eonetCategory === "all"
        ? s.eonetEvents.length
        : s.eonetEvents.filter((event) => event.category === s.eonetCategory).length;
      return `${count.toLocaleString("pt-BR")} eventos`;
    },
  },
  {
    id: "ISS_SATELLITES",
    name: "ISS & Satélites Artificiais",
    source: "CelesTrak (TLE) + SGP4",
    description: "Estação Espacial Internacional e satélites: posição real, órbita e rastro na superfície.",
    icon: Radio,
    tone: "layer-satellites",
    badgeText: (s) => `Altitude: ${s.issTelemetry?.altitudeKm || 408} km`,
  },
  {
    id: "FLIGHTS_OPENSKY",
    name: "Tráfego Aéreo",
    source: "OpenSky Network (ADS-B)",
    description: "Amostra global de aeronaves em voo. A posição entre transmissões é estimada.",
    icon: Plane,
    tone: "layer-aircraft",
    badgeText: (s) => `${s.aircraftFleet?.length || 0} voos rastreados`,
  },
  {
    id: "MARITIME_ROUTES",
    name: "Tráfego Marítimo",
    source: "AIS Stream",
    description: "Amostra AIS em seis regiões monitoradas. Os números variam conforme as posições recebidas.",
    icon: Anchor,
    tone: "layer-maritime",
    badgeText: (s) => `${s.ais.vessels.length} embarcações na amostra`,
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

  // Época ativa: fonte única (T12)
  const epoch = useEpochState();

  // País selecionado: mostra o resumo de focos do país na seção de queimadas.
  const storeSelectedIso = useGlobeStore((s) => s.selectedIso);
  const selectedIso = typeof window === "undefined" ? useGlobeStore.getState().selectedIso : storeSelectedIso;
  const isContemporary = epoch.isContemporary;
  const effectiveMa = epoch.geologicalMa;

  if (!isPanelOpen) return null;

  // Posicionamento e convivência com outros painéis: RightDock (D15). Aqui o painel só preenche o dock.
  return (
    <aside aria-label="Observatório Planetário" data-testid="observatory-panel" className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Observatório Planetário"
        subtitle="NASA · OpenSky · CelesTrak"
        icon={<Radio />}
        actions={<IconButton label="Fechar painel do observatório" icon={<X />} size="sm" onClick={() => setPanelOpen(false)} />}
      />

      {/* Aviso de anacronismo (RN09 & RN10) */}
      {!isContemporary && (
        <div
          data-testid="observatory-anachronism-banner"
          className="mx-4 mt-3 flex shrink-0 items-start gap-2.5 rounded-card border border-warning/40 bg-warning/10 p-3"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="space-y-1">
            <div className="text-label font-semibold text-fg">Telemetria Contemporânea Pausada</div>
            <div className="text-caption text-fg-secondary">
              {effectiveMa
                ? `A era geológica ativa (${effectiveMa} Ma atrás) precede a formação da atmosfera moderna e da civilização.`
                : epoch.activeScene === "MAGELLAN"
                ? "A expedição de Magalhães (1519–1522) precede a Era Espacial (1957)."
                : `O ano selecionado (${epoch.effectiveYear}) precede a Era Espacial (1957).`}
              {" "}Satélites artificiais, queimadas orbitais e tráfego aéreo estão suprimidos nesta época.
            </div>
          </div>
        </div>
      )}

      {/* Lista de camadas */}
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {LAYER_OPTIONS.map((layer) => {
          const isActive = activeLayers.includes(layer.id);
          const Icon = layer.icon;
          const badge = layer.badgeText(storeState);
          const tone = TONES[layer.tone];

          return (
            <li
              key={layer.id}
              className={cn(
                "rounded-card p-3 transition-colors duration-base ease-out",
                isActive ? "bg-surface-raised" : "hover:bg-surface-hover/60"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon aria-hidden className={cn("h-4 w-4 shrink-0", tone.text, !isActive && "opacity-60")} />
                <div className="flex min-w-0 flex-1 flex-col" title={layer.description}>
                  <h3 className="truncate text-label font-medium text-fg">{layer.name}</h3>
                  <span className="truncate text-caption text-fg-muted">{layer.source}</span>
                </div>
                <Switch
                  data-testid={`layer-toggle-${layer.id}`}
                  checked={isActive}
                  label={layer.name}
                  onCheckedChange={() => toggleLayer(layer.id)}
                />
              </div>

              {isActive && (
                <div className="mt-2 space-y-2 pl-7">
                  <p className="text-caption text-fg-secondary">{layer.description}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-caption tabular-nums text-fg-secondary">{badge}</span>
                    <DataSourceBadge
                      testId={`layer-source-${layer.id}`}
                      meta={storeState.layerMeta[layer.id]}
                      isLoading={storeState.isLoading[layer.id] && (layer.id !== "MARITIME_ROUTES" || !storeState.hasLoaded[layer.id])}
                      isOffline={storeState.layerError[layer.id] && layer.id !== "MARITIME_ROUTES"}
                    />
                  </div>
                  {layer.id === "NASA_EONET" && <EonetLayerControls />}
                  {layer.id === "ISS_SATELLITES" && <SatelliteLayerControls />}
                  {layer.id === "MARITIME_ROUTES" && isContemporary && <MaritimeLayerControls />}
                  {layer.id === "NASA_FIRMS" && (
                    <>
                      {selectedIso && <FirmsCountrySummary iso={selectedIso} />}
                      <FirmsLayerControls />
                    </>
                  )}
                  <StudyContext entityId={`observatory:${layer.id}`} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <PanelFooter className="justify-between">
        <span className="flex items-center gap-1.5 text-caption text-fg-muted">
          <Layers aria-hidden="true" className="h-4 w-4" />
          {activeLayers.length} camadas ativas
        </span>
        {activeLayers.length > 0 && (
          <Button variant="ghost" size="sm" onClick={resetObservatory}>
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Limpar Camadas
          </Button>
        )}
      </PanelFooter>
    </aside>
  );
};
