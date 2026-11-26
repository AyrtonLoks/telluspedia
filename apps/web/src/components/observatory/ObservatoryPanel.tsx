"use client";

import { EonetLayerControls } from "./EonetLayerControls";
import { StudyContext } from "@/components/tellus-bridge/StudyContext";
import dynamic from "next/dynamic";
import React, { useId, useState } from "react";
import {
  X,
  Radio,
  AlertTriangle,
  RotateCcw,
  Layers,
  ChevronDown,
} from "lucide-react";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { DataSourceBadge } from "./DataSourceBadge";
import { MaritimeLayerControls } from "./MaritimeLayerControls";
import { FirmsLayerControls } from "./FirmsLayerControls";
import { FirmsCountrySummary } from "./FirmsCountrySummary";
import { SatelliteLayerControls } from "./SatelliteLayerControls";
import { LAYER_OPTIONS, type LayerOption } from "./observatory-layer-options";
import { useGlobeStore } from "@/stores/globeStore";
import type { ObservatoryLayer } from "@/lib/observatory-data";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { getScene } from "@/lib/scenes/catalog";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { PanelFooter, PanelHeader } from "@/components/ui/Panel";
import { Switch } from "@/components/ui/Switch";
import { Skeleton } from "@/components/ui/Skeleton";
import { TONES } from "@/components/ui/tones";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/useT";

// Controles do GIBS só baixam quando a camada é aberta (D25: não pesar no primeiro carregamento).
const GibsLayerControls = dynamic(() => import("./GibsLayerControls").then((m) => m.GibsLayerControls), {
  ssr: false,
  loading: () => <div className="h-24" aria-hidden="true" />,
});
// Controles dos Ventos Globais (D27a) só baixam quando a camada é aberta.
const WindLayerControls = dynamic(() => import("./WindLayerControls").then((m) => m.WindLayerControls), {
  ssr: false,
  loading: () => <div className="h-20" aria-hidden="true" />,
});
// Controles de Lixo Marítimo & Giros Oceânicos (D29) só baixam quando a camada é aberta.
const MarineDebrisControls = dynamic(
  () => import("./MarineDebrisControls").then((m) => m.MarineDebrisControls),
  {
    ssr: false,
    loading: () => <div className="h-24" aria-hidden="true" />,
  }
);
// Controles INPE TerraBrasilis DETER/PRODES (D30) só baixam quando a camada é aberta.
const InpeDeforestationControls = dynamic(
  () => import("./InpeDeforestationControls").then((m) => m.InpeDeforestationControls),
  {
    ssr: false,
    loading: () => <div className="h-24" aria-hidden="true" />,
  }
);
// Controles do Mapa dos Biomas (Global 14 WWF + Brasil 6 IBGE — D31) só baixam quando a camada é aberta.
const BiomesLayerControls = dynamic(
  () => import("./BiomesLayerControls").then((m) => m.BiomesLayerControls),
  {
    ssr: false,
    loading: () => <div className="h-24" aria-hidden="true" />,
  }
);
// Controles do Mapa de Espécies & Biodiversidade (GBIF + IUCN — D32) só baixam quando a camada é aberta.
const SpeciesLayerControls = dynamic(
  () => import("./SpeciesLayerControls").then((m) => m.SpeciesLayerControls),
  {
    ssr: false,
    loading: () => <div className="h-24" aria-hidden="true" />,
  }
);
// Controles Sísmicos & Placas Tectônicas (USGS GeoJSON + PB2002 — D39) só baixam quando abertos.
const SeismicLayerControls = dynamic(
  () => import("./SeismicLayerControls").then((m) => m.SeismicLayerControls),
  {
    ssr: false,
    loading: () => <div className="h-24" aria-hidden="true" />,
  }
);

/** Opacidade da camada no globo (o store guarda 0–1; as camadas já leem `layerOpacity`). */
const LayerOpacity: React.FC<{ layer: LayerOption }> = ({ layer }) => {
  const { t } = useI18n();
  const id = useId();
  const storeValue = useObservatoryStore((s) => s.layerOpacity[layer.id] ?? 1);
  const value = typeof window === "undefined" ? (useObservatoryStore.getState().layerOpacity[layer.id] ?? 1) : storeValue;
  const setLayerOpacity = useObservatoryStore((s) => s.setLayerOpacity);
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="w-16 shrink-0 text-caption text-fg-secondary">{t("obs.opacity", "Opacidade")}</label>
      <input
        id={id}
        data-testid={`layer-opacity-${layer.id}`}
        type="range"
        min={0.1}
        max={1}
        step={0.05}
        value={value}
        aria-valuetext={`${pct}%`}
        onChange={(e) => setLayerOpacity(layer.id, Number(e.target.value))}
        className="h-1 min-w-0 flex-1 cursor-pointer accent-accent"
      />
      <span className="w-9 shrink-0 text-right font-mono text-caption tabular-nums text-fg-secondary">{pct}%</span>
    </div>
  );
};

export const ObservatoryPanel: React.FC<{ initialExpanded?: ObservatoryLayer[] }> = ({ initialExpanded }) => {
  const { locale, t } = useI18n();
  // Opções de cada camada (descrição, controles, opacidade, TellusLab) ficam recolhidas (D16).
  const [expanded, setExpanded] = useState<ReadonlySet<ObservatoryLayer>>(() => new Set(initialExpanded));
  const toggleExpanded = (id: ObservatoryLayer) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
  const activeSceneData = epoch.activeScene ? getScene(epoch.activeScene) : undefined;

  // País selecionado: mostra o resumo de focos do país na seção de queimadas.
  const storeSelectedIso = useGlobeStore((s) => s.selectedIso);
  const selectedIso = typeof window === "undefined" ? useGlobeStore.getState().selectedIso : storeSelectedIso;
  const isContemporary = epoch.isContemporary;
  const effectiveMa = epoch.geologicalMa;

  if (!isPanelOpen) return null;

  // Posicionamento e convivência com outros painéis: RightDock (D15). Aqui o painel só preenche o dock.
  return (
    <aside aria-label={t("obs.title", "Observatório Planetário")} data-testid="observatory-panel" className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title={t("obs.title", "Observatório Planetário")}
        subtitle="NASA · USGS · OpenSky · CelesTrak"
        icon={<Radio />}
        actions={<IconButton label={t("obs.closeAria", "Fechar painel do observatório")} icon={<X />} size="sm" onClick={() => setPanelOpen(false)} />}
      />

      {/* Aviso de anacronismo (RN09 & RN10) */}
      {!isContemporary && (
        <div
          data-testid="observatory-anachronism-banner"
          className="mx-4 mt-3 flex shrink-0 items-start gap-2.5 rounded-card border border-warning/40 bg-warning/10 p-3"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="space-y-1">
            <div className="text-label font-semibold text-fg">{t("obs.anachronismTitle", "Telemetria Contemporânea Pausada")}</div>
            <div className="text-caption text-fg-secondary">
              {effectiveMa
                ? `${t("obs.anachronismGeoPrefix", "A era geológica ativa")} (${effectiveMa} ${t("obs.anachronismGeoSuffix", "Ma atrás) precede a formação da atmosfera moderna e da civilização.")}`
                : activeSceneData
                ? `${activeSceneData.title} ${t("obs.anachronismSceneSuffix", "precede a Era Espacial (1957).")}`
                : `${t("obs.anachronismYearPrefix", "O ano selecionado")} (${epoch.effectiveYear}) ${t("obs.anachronismYearSuffix", "precede a Era Espacial (1957).")}`}
              {" "}{t("obs.anachronismNote", "Satélites artificiais, queimadas orbitais e tráfego aéreo estão suprimidos nesta época.")}
            </div>
          </div>
        </div>
      )}

      {/* Lista de camadas */}
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {LAYER_OPTIONS.map((layer) => {
          const isActive = activeLayers.includes(layer.id);
          const isOpen = isActive && expanded.has(layer.id);
          const Icon = layer.icon;
          const tone = TONES[layer.tone];
          const optionsId = `layer-options-${layer.id}`;
          const layerName = t(`obs.layer.${layer.id}.name`, layer.name);
          const layerDesc = t(`obs.layer.${layer.id}.desc`, layer.description);

          return (
            <li
              key={layer.id}
              data-testid={`layer-card-${layer.id}`}
              className={cn(
                "rounded-card px-3 py-2 transition-colors duration-base ease-out",
                isActive ? "bg-surface-raised" : "hover:bg-surface-hover/60"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon aria-hidden className={cn("h-4 w-4 shrink-0", tone.text, !isActive && "opacity-60")} />
                <div className="flex min-w-0 flex-1 flex-col" title={layerDesc}>
                  <h3 className="truncate text-label font-medium text-fg">{layerName}</h3>
                  {isActive ? (
                    <span className="flex min-w-0 items-center gap-2">
                      {storeState.isLoading[layer.id] && !storeState.hasLoaded[layer.id] ? (
                        <Skeleton className="h-3 w-20" />
                      ) : (
                        <span className="truncate font-mono text-caption tabular-nums text-fg-secondary">{layer.badgeText(storeState, locale, t)}</span>
                      )}
                      <DataSourceBadge
                        testId={`layer-source-${layer.id}`}
                        meta={
                          layer.id === "GLOBAL_WINDS" && storeState.flowMode === "currents"
                            ? storeState.currentsMeta
                            : layer.id === "GLOBAL_WINDS" &&
                                storeState.flowMode === "both" &&
                                storeState.currentsMeta.source === "fallback" &&
                                storeState.layerMeta.GLOBAL_WINDS.source === "live"
                              ? storeState.currentsMeta
                              : storeState.layerMeta[layer.id]
                        }
                        isLoading={
                          layer.id === "GLOBAL_WINDS" && storeState.flowMode === "currents"
                            ? storeState.currentsLoading
                            : layer.id === "GLOBAL_WINDS" && storeState.flowMode === "both"
                              ? storeState.isLoading.GLOBAL_WINDS || storeState.currentsLoading
                              : storeState.isLoading[layer.id] &&
                                (layer.id !== "MARITIME_ROUTES" || !storeState.hasLoaded[layer.id])
                        }
                        isOffline={
                          layer.id === "GLOBAL_WINDS" && storeState.flowMode === "currents"
                            ? storeState.currentsError
                            : layer.id === "GLOBAL_WINDS" && storeState.flowMode === "both"
                              ? storeState.layerError.GLOBAL_WINDS || storeState.currentsError
                              : storeState.layerError[layer.id] && layer.id !== "MARITIME_ROUTES"
                        }
                      />
                    </span>
                  ) : (
                    <span className="truncate text-caption text-fg-muted">{layer.source}</span>
                  )}
                </div>
                {isActive && (
                  <IconButton
                    label={
                      isOpen
                        ? `${t("obs.hideOptions", "Ocultar opções de")} ${layerName}`
                        : `${t("obs.showOptions", "Opções de")} ${layerName}`
                    }
                    aria-expanded={isOpen}
                    aria-controls={optionsId}
                    data-testid={`layer-options-toggle-${layer.id}`}
                    size="sm"
                    icon={<ChevronDown className={cn("transition-transform duration-fast ease-out", isOpen && "rotate-180")} />}
                    onClick={() => toggleExpanded(layer.id)}
                  />
                )}
                <Switch
                  data-testid={`layer-toggle-${layer.id}`}
                  checked={isActive}
                  label={layerName}
                  onCheckedChange={() => toggleLayer(layer.id)}
                />
              </div>

              {isOpen && (
                <div id={optionsId} data-testid={optionsId} className="mt-2 space-y-3 border-t border-line pb-1 pl-7 pt-2">
                  <p className="text-caption text-fg-secondary">
                    {layerDesc} <span className="text-fg-muted">{t("common.source", "Fonte")}: {layer.source}.</span>
                  </p>
                  {layer.id === "USGS_EARTHQUAKES" && <SeismicLayerControls />}
                  {layer.id === "NASA_EONET" && <EonetLayerControls />}
                  {layer.id === "ISS_SATELLITES" && <SatelliteLayerControls />}
                  {layer.id === "NASA_GIBS" && <GibsLayerControls />}
                  {layer.id === "GLOBAL_WINDS" && <WindLayerControls />}
                  {layer.id === "MARINE_DEBRIS" && <MarineDebrisControls />}
                  {layer.id === "INPE_DEFORESTATION" && <InpeDeforestationControls />}
                  {layer.id === "BIOMES_MAP" && <BiomesLayerControls />}
                  {layer.id === "SPECIES_MAP" && <SpeciesLayerControls />}
                  {layer.id === "MARITIME_ROUTES" && isContemporary && <MaritimeLayerControls />}
                  {layer.id === "NASA_FIRMS" && (
                    <>
                      {selectedIso && <FirmsCountrySummary iso={selectedIso} />}
                      <FirmsLayerControls />
                    </>
                  )}
                  <LayerOpacity layer={layer} />
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
          {activeLayers.length} {t("obs.activeLayersCount", "camadas ativas")}
        </span>
        {activeLayers.length > 0 && (
          <Button variant="ghost" size="sm" onClick={resetObservatory}>
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            {t("obs.clearLayers", "Limpar Camadas")}
          </Button>
        )}
      </PanelFooter>
    </aside>
  );
};
