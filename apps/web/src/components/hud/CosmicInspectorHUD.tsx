"use client";

import { StudyContext } from "@/components/tellus-bridge/StudyContext";
import React, { useState } from "react";
import {
  X,
  Compass,
  Rocket,
  ExternalLink,
  BookOpen,
  Check,
  RotateCw,
  RotateCcw,
  Globe,
  Eye,
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
  CelestialBodyId,
  HalleyPosition,
} from "@/lib/astronomy-planets";
import { cn } from "@/components/ui/cn";
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

  const setInspectorOpen = useCosmicStore((s) => s.setInspectorOpen);
  const focusBody = useCosmicStore((s) => s.focusBody);
  const toggleLayer = useCosmicStore((s) => s.toggleLayer);

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
      <aside className={`fixed top-20 z-20 flex flex-col gap-2 ${isDockVisible ? "right-6 lg:right-[26.5rem]" : "right-6"}`}>
        <button
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          data-testid="cosmic-layers-toggle"
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl glass-panel text-xs font-medium text-slate-200 hover:text-cyan-300 hover:border-cyan-500/50 shadow-xl transition-all"
          title="Alternar Camadas Cósmicas"
        >
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Camadas Cósmicas</span>
        </button>

        {showLayerPanel && (
          <div className="glass-panel rounded-2xl p-3 shadow-2xl w-52 space-y-2 text-xs">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Camadas Visuais
            </h4>
            <div className="flex flex-col gap-1.5">
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
                    aria-pressed={isActive}
                    onClick={() => toggleLayer(layerId)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors ${
                      isActive
                        ? "bg-cyan-950/60 text-cyan-300 border border-cyan-800/40"
                        : "bg-slate-900/40 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isActive ? "bg-cyan-400 shadow-sm shadow-cyan-400" : "bg-slate-700"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <a
              href="https://github.com/AyrtonLoks/telluspedia/blob/master/docs/DATA_SOURCES.md#catálogo-estelar-e-via-láctea-d09"
              target="_blank"
              rel="noreferrer"
              className="inline-block text-slate-400 hover:text-cyan-300 underline underline-offset-2"
            >
              Fontes do céu
            </a>
          </div>
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
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-700/40 pb-3">
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-slate-950 shadow-lg text-sm shrink-0"
            style={{ backgroundColor: meta.visualColor }}
          >
            {focusedBodyId.slice(0, 2)}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 tracking-tight leading-none">
                {meta.namePt}
              </h2>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                {meta.category}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Época: {formatCosmicEpoch(selectedYear)}
            </p>
          </div>
        </div>
        <button
          onClick={clearCelestialFocus}
          aria-label="Fechar painel e deselecionar"
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          title="Fechar painel de inspeção"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Real-time Telemetry Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 font-medium block">Distância até o Sol</span>
          <span className="text-sm font-bold font-mono text-amber-300 block mt-0.5">
            {distanceSunAu} UA
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {distanceSunMkm.toLocaleString("pt-BR")} mi km
          </span>
        </div>

        <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 font-medium block">Distância até a Terra</span>
          <span className="text-sm font-bold font-mono text-cyan-300 block mt-0.5">
            {distanceEarthAu} UA
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {distanceEarthMkm.toLocaleString("pt-BR")} mi km
          </span>
        </div>
      </div>

      {/* Halley Cometary Activity & Epoch Controls */}
      {halleyTelemetry && (
        <div
          data-testid="halley-activity-panel"
          className="rounded-card border border-line bg-surface-raised/80 p-3 space-y-2.5"
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
                <span className="text-fg-secondary">Sublimação solar (&lt; {HALLEY_TAIL_ACTIVATION_AU} UA)</span>
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
                      : "border-line bg-surface hover:border-line-strong text-fg"
                  )}
                >
                  <span className="text-caption font-medium leading-tight">{preset.label}</span>
                  <span className="text-caption font-mono tabular-nums text-fg-muted leading-tight">
                    {preset.sublabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Astrophysical Fact Sheet */}
      <div className="space-y-1.5 text-xs">
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Propriedades Astrofísicas
        </h3>
        <div className="divide-y divide-slate-800/60 rounded-2xl bg-slate-900/40 border border-slate-800/60 p-2.5">
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400">Raio Equatorial:</span>
            <span className="font-mono text-slate-200">
              {meta.equatorialRadiusKm.toLocaleString("pt-BR")} km
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400">Massa:</span>
            <span className="font-mono text-slate-200">{meta.massKg} kg</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400">Gravidade Superficial:</span>
            <span className="font-mono text-slate-200">{meta.surfaceGravityMs2} m/s²</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400">Período Orbital:</span>
            <span className="font-mono text-slate-200">
              {meta.orbitalPeriodDays > 0 ? `${meta.orbitalPeriodDays} dias` : "Centro Heliocêntrico"}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400">Duração do Dia (Rotação):</span>
            <span className="font-mono text-slate-200">{meta.rotationPeriodHours} h</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400">Temperatura Média:</span>
            <span className="font-mono text-slate-200">{meta.meanTemperatureC} °C</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400">Luas Confirmadas:</span>
            <span className="font-mono text-cyan-300 font-bold">{meta.confirmedMoons}</span>
          </div>
          {lunarPhase && (
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Fase Lunar:</span>
              <span className="font-mono text-cyan-300 font-semibold">
                {lunarPhase.phaseName} ({Math.round(lunarPhase.illumination * 100)}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Atmospheric Composition */}
      {meta.atmosphere && meta.atmosphere.length > 0 && (
        <div className="space-y-1.5 text-xs">
          <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Composição Atmosférica
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {meta.atmosphere.map((gas, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono text-[10px]"
              >
                {gas}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notable Space Missions */}
      {meta.missions && meta.missions.length > 0 && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <Rocket className="w-3.5 h-3.5 text-cyan-400" />
            <span>Missões Espaciais Históricas</span>
          </div>
          <div className="space-y-1.5">
            {meta.missions.map((mission, idx) => (
              <div
                key={idx}
                className="p-2 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-cyan-800/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{mission.name}</span>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {mission.year} • {mission.agency}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  {mission.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contextual Action Buttons for Earth Landing & Moon Navigation */}
      {isCosmicMode && focusedBodyId === "EARTH" && (
        <button
          onClick={() => {
            useCosmicStore.getState().exitToEarthView();
          }}
          data-testid="cosmic-land-earth-button"
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-900/30 transition-all"
        >
          <Globe className="w-4 h-4" />
          <span>Explorar Superfície / Países</span>
        </button>
      )}

      {isNormalModeMoon && (
        <button
          onClick={() => focusBody(null)}
          data-testid="moon-return-earth-button"
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-900/30 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Voltar à Terra</span>
        </button>
      )}

      {isCosmicMode && focusedBodyId === "MOON" && (
        <button
          onClick={() => focusBody("EARTH")}
          data-testid="moon-focus-earth-button"
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-cyan-300 text-xs font-medium transition-all"
        >
          <Globe className="w-4 h-4" />
          <span>Focar na Terra (Planeta-mãe)</span>
        </button>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-700/40">
        <button
          onClick={() => focusBody(null)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Visão Geral</span>
        </button>

        <button
          onClick={handleCopyCitation}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-950/80 border border-cyan-800/60 hover:bg-cyan-900/80 text-cyan-300 text-xs font-medium transition-colors"
          title="Copiar Citação Acadêmica (RN02)"
        >
          {copiedCitation ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copiado!</span>
            </>
          ) : (
            <>
              <BookOpen className="w-3.5 h-3.5" />
              <span>Citação</span>
            </>
          )}
        </button>

        <a
          href={meta.citationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Abrir Fonte Primária NASA"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
      {isCosmicMode && <StudyContext entityId="observatory:COSMOS" />}
    </aside>
  );
};
