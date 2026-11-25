"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { BookOpen, Compass, ExternalLink, Layers, Plane, Satellite, Ship, X } from "lucide-react";
import {
  buildMtciDataset,
  CRITICAL_GEO_LENS_LIST,
  CRITICAL_GEO_LENSES,
  FOUR_BRAZILS_LIST,
  FOUR_BRAZILS_REGIONS,
  MTCI_PALETTE,
  VERTICALITY_HUBS,
} from "@/lib/critical-geo-catalog";
import { buildPaletteGradientCss, CHOROPLETH_MISSING_SWATCH_CSS } from "@/lib/choropleth";
import { WORLD_COUNTRIES_CATALOG } from "@/lib/country-data";
import { formatCountryName } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/useT";
import { useCriticalGeoStore } from "@/stores/criticalGeoStore";
import { useChoroplethStore } from "@/stores/choroplethStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useLayoutStore } from "@/stores/layoutStore";
import type { ObservatoryLayer } from "@/lib/observatory-data";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Panel } from "@/components/ui/Panel";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/components/ui/cn";

/**
 * HUD analítico flutuante (D14) das Lentes de Geografia Crítica — Legado de Milton Santos (D36).
 * Carregado sob demanda em `GlobeExperienceShell.tsx` (0 bytes em `/` quando fechado).
 */
export const CriticalGeoHud: React.FC = () => {
  const { locale, t } = useI18n();
  const isEn = locale === "en";

  const storeActiveLens = useCriticalGeoStore((s) => s.activeLens);
  const storeSelectedRegionId = useCriticalGeoStore((s) => s.selectedRegionId);
  const storeShowIbgeComparison = useCriticalGeoStore((s) => s.showIbgeComparison);
  const storeOpacity = useCriticalGeoStore((s) => s.opacity);
  const activeLens =
    typeof window === "undefined" ? useCriticalGeoStore.getState().activeLens : storeActiveLens;
  const selectedRegionId =
    typeof window === "undefined"
      ? useCriticalGeoStore.getState().selectedRegionId
      : storeSelectedRegionId;
  const showIbgeComparison =
    typeof window === "undefined"
      ? useCriticalGeoStore.getState().showIbgeComparison
      : storeShowIbgeComparison;
  const opacity =
    typeof window === "undefined" ? useCriticalGeoStore.getState().opacity : storeOpacity;
  const setLens = useCriticalGeoStore((s) => s.setLens);
  const clearLens = useCriticalGeoStore((s) => s.clearLens);
  const setSelectedRegion = useCriticalGeoStore((s) => s.setSelectedRegion);
  const setShowIbgeComparison = useCriticalGeoStore((s) => s.setShowIbgeComparison);
  const setOpacity = useCriticalGeoStore((s) => s.setOpacity);

  const storeIsCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const isCosmicMode =
    typeof window === "undefined" ? useCosmicStore.getState().isCosmicMode : storeIsCosmicMode;
  const hoveredIso = useGlobeStore((s) => s.hoveredIso);
  const selectedIso = useGlobeStore((s) => s.selectedIso);
  const flyTo = useGlobeStore((s) => s.flyTo);

  const activeObsLayers = useObservatoryStore((s) => s.activeLayers);
  const setObsLayerActive = useObservatoryStore((s) => s.setLayerActive);
  const flightsCount = useObservatoryStore((s) => s.aircraftFleet.length);
  const vesselsCount = useObservatoryStore((s) => s.ais.vessels.length);
  const satellitesCount = useObservatoryStore((s) => s.satellites.length);

  const mtciDataset = useMemo(() => (activeLens === "MTCI" ? buildMtciDataset() : null), [activeLens]);

  if (!activeLens || isCosmicMode) return null;

  const meta = CRITICAL_GEO_LENSES[activeLens];
  const focusIso = hoveredIso || selectedIso;
  const mtciEntry = focusIso && mtciDataset ? mtciDataset.entries[focusIso] ?? null : null;
  const activeRegion =
    selectedRegionId ? FOUR_BRAZILS_REGIONS[selectedRegionId] : FOUR_BRAZILS_REGIONS.CONCENTRADA;

  const handleSelectLens = (id: typeof activeLens) => {
    useChoroplethStore.getState().clearIndicator();
    setLens(id);
    if (id === "FOUR_BRAZILS") {
      flyTo(-14.2, -51.9, 1.95);
    }
  };

  const toggleObservatoryCrossLayer = (layer: ObservatoryLayer) => {
    const isOn = activeObsLayers.includes(layer);
    setObsLayerActive(layer, !isOn);
    if (!isOn) {
      useObservatoryStore.getState().setPanelOpen(true);
      useLayoutStore.getState().setActiveRightPanel("observatory");
    }
  };

  return (
    <div
      data-testid="critical-geo-hud"
      className="pointer-events-none fixed bottom-[calc(var(--timeline-height)+1rem)] left-3 z-20 flex max-w-[min(calc(100vw-1.5rem),24rem)] flex-col gap-2 xl:left-6"
    >
      <Panel
        role="region"
        aria-label={t("criticalGeo.hudAria", "Lente de Geografia Crítica — Milton Santos")}
        className="pointer-events-auto flex max-h-[min(66vh,32rem)] flex-col overflow-hidden shadow-e2"
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-2 border-b border-line px-3.5 py-2.5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Compass aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
              <span className="text-caption font-medium text-accent">
                {t("criticalGeo.brand", "Geografia Crítica · Milton Santos")}
              </span>
            </div>
            <h2
              data-testid="critical-geo-title"
              className="mt-0.5 text-label font-semibold text-fg"
            >
              {isEn ? meta.titleEn : meta.titlePt}
            </h2>
          </div>
          <IconButton
            size="sm"
            label={t("criticalGeo.close", "Desativar lente de Geografia Crítica")}
            icon={<X />}
            onClick={clearLens}
          />
        </div>

        {/* Alternador rápido entre as 3 lentes */}
        <div
          role="tablist"
          aria-label={t("criticalGeo.lensSwitcherAria", "Escolher lente espacial")}
          className="grid grid-cols-3 gap-1 border-b border-line bg-surface-sunken/70 p-1.5"
        >
          {CRITICAL_GEO_LENS_LIST.map((lens) => {
            const active = lens.id === activeLens;
            return (
              <button
                key={lens.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`critical-geo-tab-${lens.id}`}
                onClick={() => handleSelectLens(lens.id)}
                className={cn(
                  "rounded-control px-2 py-1 text-caption font-medium transition-colors duration-fast ease-out",
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-fg-secondary hover:bg-surface-hover hover:text-fg"
                )}
              >
                {isEn ? lens.shortEn : lens.shortPt}
              </button>
            );
          })}
        </div>

        {/* Corpo rolável específico da lente */}
        <div className="space-y-3 overflow-y-auto px-3.5 py-3 text-caption">
          <p className="leading-relaxed text-fg-secondary">
            {isEn ? meta.conceptSummaryEn : meta.conceptSummaryPt}
          </p>

          {/* Lente 1: MTCI */}
          {activeLens === "MTCI" && mtciDataset && (
            <div className="space-y-2.5" data-testid="critical-geo-mtci-panel">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-caption text-fg-muted">
                  <span>{t("criticalGeo.mtciOpaque", "Espaços opacos")}</span>
                  <span>{t("criticalGeo.mtciLuminous", "Espaços luminosos")}</span>
                </div>
                <div
                  aria-hidden="true"
                  className="h-2.5 w-full rounded-full border border-line"
                  style={{ backgroundImage: buildPaletteGradientCss(MTCI_PALETTE) }}
                />
                <div className="flex items-center justify-between text-caption text-fg-muted">
                  <span className="font-mono tabular-nums">
                    {mtciDataset.availableCount}/{mtciDataset.totalCountries}{" "}
                    {t("criticalGeo.countriesCovered", "países com dados WDI")}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span
                      aria-hidden="true"
                      className="inline-block h-2.5 w-2.5 rounded-sm border border-line"
                      style={{ backgroundImage: CHOROPLETH_MISSING_SWATCH_CSS }}
                    />
                    {t("choropleth.noData", "Sem dado")}
                  </span>
                </div>
              </div>

              {mtciEntry && (
                <div
                  data-testid="critical-geo-mtci-readout"
                  className="space-y-1 rounded-card border border-line bg-surface-raised p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-label font-semibold text-fg">
                      {formatCountryName(
                        WORLD_COUNTRIES_CATALOG[mtciEntry.isoCode]?.iso2,
                        mtciEntry.nameCommon,
                        locale
                      )}
                    </span>
                    {mtciEntry.available && mtciEntry.score !== null ? (
                      <Badge tone="accent">
                        <span className="font-mono tabular-nums">
                          {mtciEntry.score}/100 · #{mtciEntry.rank}
                        </span>
                      </Badge>
                    ) : (
                      <Badge tone="neutral">{t("criticalGeo.insufficientData", "Sem dado suficiente")}</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-caption text-fg-secondary">
                    <div>
                      <span className="text-fg-muted">{t("criticalGeo.gdpPerCapita", "PIB per capita")}: </span>
                      <span className="font-mono tabular-nums text-fg">
                        {mtciEntry.gdpPerCapita !== null
                          ? `$${Math.round(mtciEntry.gdpPerCapita).toLocaleString(isEn ? "en-US" : "pt-BR")}`
                          : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-fg-muted">{t("criticalGeo.lifeExp", "Exp. vida")}: </span>
                      <span className="font-mono tabular-nums text-fg">
                        {mtciEntry.lifeExpectancy !== null
                          ? `${mtciEntry.lifeExpectancy.toFixed(1)} ${isEn ? "yr" : "anos"}`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <p className="rounded-card border border-line bg-surface-sunken/80 p-2.5 leading-relaxed text-fg-muted">
                {isEn ? meta.methodologyNoteEn : meta.methodologyNotePt}
              </p>
            </div>
          )}

          {/* Lente 2: Horizontalidades vs. Verticalidades */}
          {activeLens === "VERTICALITIES" && (
            <div className="space-y-2.5" data-testid="critical-geo-verticalities-panel">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-card border border-accent/40 bg-accent/10 p-2.5">
                  <div className="text-label font-semibold text-accent">
                    {t("criticalGeo.upperCircuit", "Verticalidades")}
                  </div>
                  <p className="mt-1 leading-relaxed text-fg-secondary">
                    {t(
                      "criticalGeo.upperCircuitDesc",
                      "Circuito superior: finanças globais, aviação, rotas marítimas e redes de informação que conectam nós distantes."
                    )}
                  </p>
                </div>
                <div className="rounded-card border border-line bg-surface-raised p-2.5">
                  <div className="text-label font-semibold text-fg">
                    {t("criticalGeo.lowerCircuit", "Horizontalidades")}
                  </div>
                  <p className="mt-1 leading-relaxed text-fg-secondary">
                    {t(
                      "criticalGeo.lowerCircuitDesc",
                      "Circuito inferior: contiguidade territorial, trabalho local, solidariedade cotidiana e território usado."
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-caption font-medium text-fg">
                  {t("criticalGeo.crossWithFlows", "Cruzar ao vivo com fluxos reais do Observatório:")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: "FLIGHTS_OPENSKY", labelPt: "Aviação", labelEn: "Aviation", icon: Plane, count: flightsCount },
                      { id: "MARITIME_ROUTES", labelPt: "Marítimo AIS", labelEn: "AIS Maritime", icon: Ship, count: vesselsCount },
                      { id: "ISS_SATELLITES", labelPt: "Satélites", labelEn: "Satellites", icon: Satellite, count: satellitesCount },
                    ] as const
                  ).map((item) => {
                    const active = activeObsLayers.includes(item.id);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={active}
                        data-testid={`verticalities-cross-${item.id}`}
                        onClick={() => toggleObservatoryCrossLayer(item.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1 text-caption font-medium transition-colors duration-fast ease-out",
                          active
                            ? "border-accent/50 bg-accent/15 text-accent"
                            : "border-line bg-surface-raised text-fg-secondary hover:bg-surface-hover hover:text-fg"
                        )}
                      >
                        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                        <span>{isEn ? item.labelEn : item.labelPt}</span>
                        {active && item.count > 0 && (
                          <span className="font-mono tabular-nums">({item.count})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-card border border-line bg-surface-sunken/80 p-2.5 text-fg-muted">
                {t("criticalGeo.hubsCountPrefix", "Eixos destacados entre")}{" "}
                <span className="font-mono tabular-nums text-fg">{VERTICALITY_HUBS.length}</span>{" "}
                {t("criticalGeo.hubsCountSuffix", "metrópoles de comando global (Nova Iorque, Londres, Frankfurt, Tóquio, Xangai, Singapura, São Paulo e Joanesburgo).")}
              </div>
            </div>
          )}

          {/* Lente 3: Os Quatro Brasis */}
          {activeLens === "FOUR_BRAZILS" && (
            <div className="space-y-2.5" data-testid="critical-geo-four-brazils-panel">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("criticalGeo.fourBrazilsGroup", "Selecionar uma das 4 regiões")}>
                {FOUR_BRAZILS_LIST.map((region) => {
                  const selected = activeRegion.id === region.id;
                  return (
                    <button
                      key={region.id}
                      type="button"
                      aria-pressed={selected}
                      data-testid={`four-brazils-btn-${region.id}`}
                      onClick={() => {
                        setSelectedRegion(region.id);
                        flyTo(region.center[0], region.center[1], 1.85);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1 text-caption font-medium transition-colors duration-fast ease-out",
                        selected
                          ? "border-accent/60 bg-accent/15 text-fg"
                          : "border-line bg-surface-raised text-fg-secondary hover:bg-surface-hover hover:text-fg"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: region.hex }}
                      />
                      <span>{isEn ? region.nameEn : region.namePt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Ficha conceitual da região selecionada */}
              <div
                data-testid="four-brazils-region-card"
                className="space-y-1.5 rounded-card border border-line bg-surface-raised p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: activeRegion.hex }}
                    />
                    <span className="text-label font-semibold text-fg">
                      {isEn ? activeRegion.nameEn : activeRegion.namePt}
                    </span>
                  </div>
                  <span className="font-mono text-caption text-fg-muted">
                    {activeRegion.states.join(" · ")}
                  </span>
                </div>
                <div className="text-caption font-medium text-accent">
                  {isEn ? activeRegion.densityLevelEn : activeRegion.densityLevelPt}
                </div>
                <p className="leading-relaxed text-fg-secondary">
                  {isEn ? activeRegion.summaryEn : activeRegion.summaryPt}
                </p>
                <p className="border-t border-line pt-1.5 text-caption text-fg-muted">
                  <strong className="font-medium text-fg-secondary">IBGE: </strong>
                  {isEn ? activeRegion.ibgeContrastEn : activeRegion.ibgeContrastPt}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-card border border-line bg-surface-sunken/70 px-3 py-2">
                <div className="flex items-center gap-2 text-caption text-fg-secondary">
                  <Layers aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
                  <span>{t("criticalGeo.compareIbge", "Comparar com 5 Regiões IBGE")}</span>
                </div>
                <Switch
                  checked={showIbgeComparison}
                  onCheckedChange={setShowIbgeComparison}
                  label={t("criticalGeo.compareIbge", "Comparar com 5 Regiões IBGE")}
                />
              </div>

              <Button
                size="sm"
                variant="secondary"
                className="w-full justify-center"
                onClick={() => flyTo(-14.2, -51.9, 1.95)}
              >
                {t("criticalGeo.focusBrazil", "Focar Brasil")}
              </Button>
            </div>
          )}

          {/* Opacidade */}
          <div className="flex items-center gap-3 border-t border-line pt-2.5">
            <label htmlFor="critical-geo-opacity" className="text-caption text-fg-muted">
              {t("choropleth.opacity", "Opacidade da camada")}
            </label>
            <input
              id="critical-geo-opacity"
              type="range"
              min={35}
              max={100}
              step={5}
              value={Math.round(opacity * 100)}
              onChange={(e) => setOpacity(Number(e.target.value) / 100)}
              className="h-1.5 flex-1 cursor-pointer accent-accent"
            />
            <span className="font-mono text-caption tabular-nums text-fg">
              {Math.round(opacity * 100)}%
            </span>
          </div>

          {/* Referência bibliográfica e link para o dossiê completo */}
          <div className="space-y-1.5 border-t border-line pt-2.5">
            <p className="text-caption leading-snug text-fg-muted">{meta.primaryReference}</p>
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/dossies/milton-santos"
                data-testid="critical-geo-open-dossier"
                className="inline-flex items-center gap-1 text-caption font-medium text-accent hover:text-accent-hover hover:underline"
              >
                <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
                <span>{t("criticalGeo.readDossier", "Ler Dossiê Milton Santos (1926–2026)")}</span>
              </Link>
              <a
                href={meta.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-caption text-fg-muted hover:text-fg hover:underline"
              >
                <span>{t("common.source", "Fonte")}</span>
                <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
};
