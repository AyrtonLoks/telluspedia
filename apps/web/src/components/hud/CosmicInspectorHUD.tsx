"use client";

import { StudyContext } from "@/components/tellus-bridge/StudyContext";
import React, { useState } from "react";
import {
  X,
  Rocket,
  ExternalLink,
  BookOpen,
  Check,
  RotateCw,
  RotateCcw,
  Globe,
  Layers,
} from "lucide-react";
import { useCosmicStore, CosmicLayerId } from "@/stores/cosmicStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { getLunarPhase } from "@/lib/astronomy";
import {
  ASTROPHYSICAL_CATALOG,
  HALLEY_TAIL_ACTIVATION_AU,
  computeAllPlanetaryPositions,
  calculateHalleyPosition,
  HalleyPosition,
} from "@/lib/astronomy-planets";
import { cn } from "@/components/ui/cn";
import { Button, buttonClasses } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { useRightDock } from "@/components/layout/useRightDock";
import { clearCelestialFocus } from "@/stores/actions";

const HALLEY_EPOCH_PRESETS = [
  { id: "perihelion-1986", label: "Periélio 1986", sublabel: "0,59 UA · cauda máx.", year: 1986.1081 },
  { id: "approach-1986", label: "Aprox. Terra", sublabel: "0,42 UA · Abr 1986", year: 1986.274 },
  { id: "aphelion-2026", label: "Afélio 2026", sublabel: "35 UA · sem cauda", year: 2026 },
] as const;

function formatCosmicEpoch(decimalYear: number): string {
  const wholeYear = Math.floor(decimalYear);
  const frac = decimalYear - wholeYear;
  if (Math.abs(frac) < 1e-4) return String(wholeYear);
  const start = Date.UTC(wholeYear, 0, 1);
  const end = Date.UTC(wholeYear + 1, 0, 1);
  const date = new Date(start + frac * (end - start));
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getUTCFullYear()}`;
}

export interface CosmicInspectorHUDProps {
  /**
   * D15: "dock" = só o painel do corpo focado (renderizado pelo RightDock); "floating" = só o botão
   * flutuante de camadas (quando nenhum corpo está focado). Sem valor: os dois, como antes.
   */
  placement?: "dock" | "floating";
}

export const CosmicInspectorHUD: React.FC<CosmicInspectorHUDProps> = ({ placement }) => {
  const isDockVisible = useRightDock().visible;
  const storeIsCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const isCosmicMode =
    typeof window === "undefined"
      ? useCosmicStore.getState().isCosmicMode
      : storeIsCosmicMode;

  const storeFocusedBodyId = useCosmicStore((s) => s.focusedBodyId);
  const focusedBodyId =
    typeof window === "undefined"
      ? useCosmicStore.getState().focusedBodyId
      : storeFocusedBodyId;

  const storeIsInspectorOpen = useCosmicStore((s) => s.isInspectorOpen);
  const isInspectorOpen =
    typeof window === "undefined"
      ? useCosmicStore.getState().isInspectorOpen
      : storeIsInspectorOpen;

  const storeActiveLayers = useCosmicStore((s) => s.activeCosmicLayers);
  const activeCosmicLayers =
    typeof window === "undefined"
      ? useCosmicStore.getState().activeCosmicLayers
      : storeActiveLayers;

  const focusBody = useCosmicStore((s) => s.focusBody);
  const toggleLayer = useCosmicStore((s) => s.toggleLayer);
  const scaleMode = useCosmicStore((s) => s.scaleMode);
  const setScaleMode = useCosmicStore((s) => s.setScaleMode);

  const storeSelectedYear = useTimelineStore((s) => s.selectedYear);
  const selectedYear =
    (typeof window === "undefined"
      ? useTimelineStore.getState().selectedYear
      : storeSelectedYear) || new Date().getUTCFullYear();

  const [copiedCitation, setCopiedCitation] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  const isNormalModeMoon = !isCosmicMode && focusedBodyId === "MOON";
  const lunarPhase = focusedBodyId === "MOON" ? getLunarPhase(new Date()) : null;

  if (!isCosmicMode && !isNormalModeMoon) return null;

  // Botão flutuante de camadas cósmicas: disponível em todo o modo Cosmos, inclusive com um corpo
  // focado (o painel do corpo fica no dock, então não disputa mais o mesmo lugar).
  const layersToggle = (
    <aside
      className={cn(
        "fixed top-20 z-20 flex flex-col items-end gap-2",
        isDockVisible ? "right-6 lg:right-[26.5rem]" : "right-6"
      )}
    >
      <button
        type="button"
        onClick={() => setShowLayerPanel(!showLayerPanel)}
        data-testid="cosmic-layers-toggle"
        aria-expanded={showLayerPanel}
        className={cn(
          "flex items-center gap-2 rounded-panel border bg-surface/86 px-3.5 py-2 text-label font-medium shadow-e1 backdrop-blur-md transition-colors duration-fast ease-out",
          showLayerPanel
            ? "border-accent text-accent"
            : "border-line text-fg hover:border-line-strong hover:bg-surface-hover"
        )}
        title="Alternar camadas cósmicas"
      >
        <Layers aria-hidden="true" className="h-4 w-4 text-accent" />
        <span>Camadas Cósmicas</span>
      </button>

      {showLayerPanel && (
        <Panel className="w-56 space-y-3 p-3 text-label">
          <div className="space-y-1.5">
            <h4 className="text-caption font-medium text-fg-muted">Camadas visuais</h4>
            <div className="flex flex-col gap-1">
              {(
                [
                  ["ORBITS", "Órbitas Keplerianas"],
                  ["CONSTELLATIONS", "88 Constelações IAU"],
                  ["ASTEROIDS", "Cinturão de Asteroides"],
                  ["LABELS", "Rótulos do céu e dos planetas"],
                  ["COMETS", "Cometa 1P/Halley"],
                  ["METEORS", "Chuvas de Meteoros"],
                ] as Array<[CosmicLayerId, string]>
              ).map(([layerId, label]) => {
                const isActive = activeCosmicLayers.includes(layerId);
                return (
                  <button
                    key={layerId}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => toggleLayer(layerId)}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-control border px-2.5 py-1.5 text-left text-caption transition-colors duration-fast ease-out",
                      isActive
                        ? "border-accent/50 bg-accent/15 text-accent"
                        : "border-transparent bg-surface-raised text-fg-secondary hover:border-line hover:bg-surface-hover hover:text-fg"
                    )}
                  >
                    <span>{label}</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        isActive ? "bg-accent" : "bg-control"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 border-t border-line pt-2.5">
            <h4 id="cosmic-scale-heading" className="text-caption font-medium text-fg-muted">
              Tamanho dos corpos
            </h4>
            <div role="group" aria-labelledby="cosmic-scale-heading" className="grid grid-cols-2 gap-1">
              {(
                [
                  ["visual", "Visual"],
                  ["real", "Real"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={scaleMode === mode}
                  data-testid={`cosmic-scale-${mode}`}
                  onClick={() => setScaleMode(mode)}
                  className={cn(
                    "rounded-control border px-2 py-1.5 text-caption font-medium transition-colors duration-fast ease-out",
                    scaleMode === mode
                      ? "border-accent/50 bg-accent/15 text-accent"
                      : "border-line bg-surface-raised text-fg-secondary hover:bg-surface-hover hover:text-fg"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-caption text-fg-muted">
              {scaleMode === "real"
                ? "Raios na proporção real entre os corpos. As distâncias continuam comprimidas."
                : "Raios exagerados por um fator único para todos ficarem visíveis. Distâncias comprimidas."}
            </p>
          </div>

          <a
            href="https://github.com/AyrtonLoks/telluspedia/blob/master/docs/DATA_SOURCES.md#catálogo-estelar-e-via-láctea-d09"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-caption text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            Fontes do céu
          </a>
        </Panel>
      )}
    </aside>
  );

  if (placement === "floating") return layersToggle;
  if (!isInspectorOpen || !focusedBodyId) return placement === "dock" ? null : layersToggle;

  const meta = ASTROPHYSICAL_CATALOG[focusedBodyId];

  // Dynamic telemetry
  let distanceSunAu = 0;
  let distanceSunMkm = 0;
  let distanceEarthAu = 0;
  let distanceEarthMkm = 0;
  let halleyTelemetry: HalleyPosition | null = null;

  if (focusedBodyId === "SUN") {
    distanceSunAu = 0;
    distanceSunMkm = 0;
    distanceEarthAu = 1.0;
    distanceEarthMkm = 149.6;
  } else if (focusedBodyId === "HALLEY") {
    const h = calculateHalleyPosition(selectedYear);
    halleyTelemetry = h;
    distanceSunAu = h.distanceSunAu;
    distanceSunMkm = h.distanceSunMkm;
    distanceEarthAu = h.distanceEarthAu;
    distanceEarthMkm = h.distanceEarthMkm;
  } else if (focusedBodyId === "MOON") {
    distanceSunAu = 1.0;
    distanceSunMkm = 149.6;
    distanceEarthAu = 0.00257;
    distanceEarthMkm = 0.384;
  } else {
    const planets = computeAllPlanetaryPositions(selectedYear);
    const p = planets[focusedBodyId];
    if (p) {
      distanceSunAu = p.distanceSunAu;
      distanceSunMkm = p.distanceSunMkm;
      distanceEarthAu = p.distanceEarthAu;
      distanceEarthMkm = p.distanceEarthMkm;
    }
  }

  const handleCopyCitation = () => {
    const citation = `NASA / JPL (2026). ${meta.name} Fact Sheet. Consultado em TellusPedia em ${new Date().toLocaleDateString("pt-BR")}. Disponível em: <${meta.citationUrl}>.`;
    navigator.clipboard?.writeText(citation);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  return (
    <aside
      data-testid="cosmic-inspector-hud"
      // Posicionamento e convivência com outros painéis: RightDock (D15). Aqui o painel só preenche o dock.
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-line pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card font-mono text-label font-semibold text-accent-on"
            style={{ backgroundColor: meta.visualColor }}
          >
            {focusedBodyId.slice(0, 2)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-title font-semibold text-fg">{meta.namePt}</h2>
              <Badge tone="neutral">{meta.category}</Badge>
            </div>
            <p className="mt-0.5 font-mono text-caption tabular-nums text-fg-muted">
              Época: {formatCosmicEpoch(selectedYear)}
            </p>
          </div>
        </div>
        <IconButton
          label="Fechar painel e deselecionar"
          icon={<X />}
          size="sm"
          onClick={clearCelestialFocus}
        />
      </div>

      {/* Real-time Telemetry Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-card border border-line bg-surface-raised p-2.5">
          <span className="block text-caption text-fg-secondary">Distância até o Sol</span>
          <span className="mt-0.5 block font-mono text-body font-medium tabular-nums text-warning">
            {distanceSunAu} UA
          </span>
          <span className="font-mono text-caption tabular-nums text-fg-muted">
            {distanceSunMkm.toLocaleString("pt-BR")} mi km
          </span>
        </div>

        <div className="rounded-card border border-line bg-surface-raised p-2.5">
          <span className="block text-caption text-fg-secondary">Distância até a Terra</span>
          <span className="mt-0.5 block font-mono text-body font-medium tabular-nums text-fg">
            {distanceEarthAu} UA
          </span>
          <span className="font-mono text-caption tabular-nums text-fg-muted">
            {distanceEarthMkm.toLocaleString("pt-BR")} mi km
          </span>
        </div>
      </div>

      {/* Halley Cometary Activity & Epoch Controls */}
      {halleyTelemetry && (
        <div
          data-testid="halley-activity-panel"
          className="space-y-2.5 rounded-card border border-line bg-surface-raised p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-medium text-fg-secondary">
              Atividade cometária
            </span>
            <span
              data-testid="halley-tail-status"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-control border px-2 py-0.5 text-caption font-medium",
                halleyTelemetry.hasTail
                  ? "border-accent/50 bg-accent/15 text-accent"
                  : "border-line bg-surface text-fg-muted"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  halleyTelemetry.hasTail ? "bg-accent" : "bg-fg-muted"
                )}
              />
              {halleyTelemetry.hasTail ? "Cauda dupla ativa" : "Sem cauda (afélio)"}
            </span>
          </div>

          {halleyTelemetry.hasTail ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-caption">
                <span className="text-fg-secondary">
                  Sublimação solar (&lt; {HALLEY_TAIL_ACTIVATION_AU} UA)
                </span>
                <span className="font-mono tabular-nums text-accent">
                  {Math.round(halleyTelemetry.activityFactor * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-base ease-out"
                  style={{ width: `${Math.max(4, Math.round(halleyTelemetry.activityFactor * 100))}%` }}
                />
              </div>
              <p className="text-caption text-fg-muted">
                Cauda iônica azulada (anti-solar) e cauda de poeira amarelada curvada.
              </p>
            </div>
          ) : (
            <p className="text-caption text-fg-muted">
              Acima de {HALLEY_TAIL_ACTIVATION_AU} UA o gelo não sublima; apenas o núcleo rochoso e uma coma residual ficam visíveis.
            </p>
          )}

          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {HALLEY_EPOCH_PRESETS.map((preset) => {
              const isActivePreset = Math.abs(selectedYear - preset.year) < 0.05;
              return (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`halley-epoch-${preset.id}`}
                  aria-pressed={isActivePreset}
                  onClick={() => useTimelineStore.getState().selectYear(preset.year)}
                  className={cn(
                    "flex flex-col items-start rounded-control border px-2 py-1.5 text-left transition-colors duration-fast ease-out",
                    isActivePreset
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-line bg-surface text-fg hover:border-line-strong"
                  )}
                >
                  <span className="text-caption font-medium leading-tight">{preset.label}</span>
                  <span className="font-mono text-caption leading-tight tabular-nums text-fg-muted">
                    {preset.sublabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Astrophysical Fact Sheet */}
      <div className="space-y-1.5 text-label">
        <h3 className="text-caption font-medium text-fg-muted">Propriedades Astrofísicas</h3>
        <div className="divide-y divide-line rounded-card border border-line bg-surface-raised p-2.5 text-caption">
          <div className="flex items-center justify-between py-1">
            <span className="text-fg-secondary">Raio equatorial</span>
            <span className="font-mono tabular-nums text-fg">
              {meta.equatorialRadiusKm.toLocaleString("pt-BR")} km
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-fg-secondary">Massa</span>
            <span className="font-mono tabular-nums text-fg">{meta.massKg} kg</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-fg-secondary">Gravidade superficial</span>
            <span className="font-mono tabular-nums text-fg">{meta.surfaceGravityMs2} m/s²</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-fg-secondary">Período orbital</span>
            <span className="font-mono tabular-nums text-fg">
              {meta.orbitalPeriodDays > 0 ? `${meta.orbitalPeriodDays} dias` : "Centro Heliocêntrico"}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-fg-secondary">Duração do dia (rotação)</span>
            <span className="font-mono tabular-nums text-fg">{meta.rotationPeriodHours} h</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-fg-secondary">Temperatura média</span>
            <span className="font-mono tabular-nums text-fg">{meta.meanTemperatureC} °C</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-fg-secondary">Luas confirmadas</span>
            <span className="font-mono font-semibold tabular-nums text-fg">
              {meta.confirmedMoons}
            </span>
          </div>
          {lunarPhase && (
            <div className="flex items-center justify-between py-1">
              <span className="text-fg-secondary">Fase Lunar:</span>
              <span className="font-mono font-medium tabular-nums text-accent">
                {lunarPhase.phaseName} ({Math.round(lunarPhase.illumination * 100)}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Atmospheric Composition */}
      {meta.atmosphere && meta.atmosphere.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-caption font-medium text-fg-muted">Composição atmosférica</h3>
          <div className="flex flex-wrap gap-1.5">
            {meta.atmosphere.map((gas, i) => (
              <span
                key={i}
                className="rounded-control border border-line bg-surface-raised px-2 py-0.5 font-mono text-caption text-fg-secondary"
              >
                {gas}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notable Space Missions */}
      {meta.missions && meta.missions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-caption font-medium text-fg-muted">
            <Rocket aria-hidden="true" className="h-3.5 w-3.5 text-fg-muted" />
            <span>Missões espaciais históricas</span>
          </div>
          <div className="space-y-1.5">
            {meta.missions.map((mission, idx) => (
              <div
                key={idx}
                className="rounded-card border border-line bg-surface-raised p-2.5 transition-colors duration-fast ease-out hover:border-line-strong"
              >
                <div className="flex items-center justify-between gap-2 text-label">
                  <span className="font-medium text-fg">{mission.name}</span>
                  <span className="shrink-0 font-mono text-caption tabular-nums text-fg-muted">
                    {mission.year} · {mission.agency}
                  </span>
                </div>
                <p className="mt-0.5 text-caption text-fg-secondary">{mission.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contextual Action Buttons for Earth Landing & Moon Navigation */}
      {isCosmicMode && focusedBodyId === "EARTH" && (
        <Button
          variant="primary"
          className="w-full"
          data-testid="cosmic-land-earth-button"
          onClick={() => {
            useCosmicStore.getState().exitToEarthView();
          }}
        >
          <Globe aria-hidden="true" className="h-4 w-4" />
          <span>Explorar Superfície / Países</span>
        </Button>
      )}

      {isNormalModeMoon && (
        <Button
          variant="primary"
          className="w-full"
          data-testid="moon-return-earth-button"
          onClick={() => focusBody(null)}
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          <span>Voltar à Terra</span>
        </Button>
      )}

      {isCosmicMode && focusedBodyId === "MOON" && (
        <Button
          variant="secondary"
          className="w-full"
          data-testid="moon-focus-earth-button"
          onClick={() => focusBody("EARTH")}
        >
          <Globe aria-hidden="true" className="h-4 w-4" />
          <span>Focar na Terra (Planeta-mãe)</span>
        </Button>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 border-t border-line pt-3">
        <Button variant="secondary" className="flex-1" onClick={() => focusBody(null)}>
          <RotateCw aria-hidden="true" className="h-3.5 w-3.5" />
          <span>Visão Geral</span>
        </Button>

        <Button
          variant="secondary"
          onClick={handleCopyCitation}
          title="Copiar Citação Acadêmica (RN02)"
        >
          {copiedCitation ? (
            <>
              <Check aria-hidden="true" className="h-3.5 w-3.5 text-success" />
              <span>Copiado!</span>
            </>
          ) : (
            <>
              <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
              <span>Citação</span>
            </>
          )}
        </Button>

        <a
          href={meta.citationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses("secondary", "sm", "px-2")}
          title="Abrir Fonte Primária NASA"
          aria-label="Abrir Fonte Primária NASA"
        >
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
        </a>
      </div>
      {isCosmicMode && <StudyContext entityId="observatory:COSMOS" />}
    </aside>
  );
};
