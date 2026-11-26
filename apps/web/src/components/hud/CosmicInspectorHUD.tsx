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
} from "lucide-react";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { getLunarPhase } from "@/lib/astronomy";
import {
  ASTROPHYSICAL_CATALOG,
  computeAllPlanetaryPositions,
  calculateHalleyPosition,
  HalleyPosition,
} from "@/lib/astronomy-planets";
import { Button, buttonClasses } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { useRightDock } from "@/components/layout/useRightDock";
import { clearCelestialFocus } from "@/stores/actions";
import { useI18n } from "@/lib/i18n/useT";
import { formatNumber } from "@/lib/i18n/format";
import { CosmicLayersMenu } from "./CosmicLayersMenu";
import { CosmicHalleyCard } from "./CosmicHalleyCard";
import { CosmicProbeInspectorCard } from "./CosmicProbeInspectorCard";

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
  const { locale, t } = useI18n();
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

  const storeFocusedProbeId = useCosmicStore((s) => s.focusedProbeId);
  const focusedProbeId =
    typeof window === "undefined"
      ? useCosmicStore.getState().focusedProbeId
      : storeFocusedProbeId;

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

  const isNormalModeMoon = !isCosmicMode && focusedBodyId === "MOON";
  const lunarPhase = focusedBodyId === "MOON" ? getLunarPhase(new Date()) : null;

  if (!isCosmicMode && !isNormalModeMoon) return null;

  // Botão flutuante de camadas cósmicas: disponível em todo o modo Cosmos, inclusive com um corpo
  // focado (o painel do corpo fica no dock, então não disputa mais o mesmo lugar).
  const layersToggle = (
    <CosmicLayersMenu
      isDockVisible={isDockVisible}
      activeCosmicLayers={activeCosmicLayers}
      scaleMode={scaleMode}
      onToggleLayer={toggleLayer}
      onSetScaleMode={setScaleMode}
    />
  );

  if (placement === "floating") return layersToggle;
  if (isInspectorOpen && focusedProbeId) {
    return <CosmicProbeInspectorCard probeId={focusedProbeId} selectedYear={selectedYear} />;
  }
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
    const citation =
      locale === "en"
        ? `NASA / JPL (2026). ${meta.name} Fact Sheet. Accessed on TellusPedia on ${new Date().toLocaleDateString("en-US")}. Available at: <${meta.citationUrl}>.`
        : `NASA / JPL (2026). ${meta.name} Fact Sheet. Consultado em TellusPedia em ${new Date().toLocaleDateString("pt-BR")}. Disponível em: <${meta.citationUrl}>.`;
    navigator.clipboard?.writeText(citation);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  const auUnit = t("cosmic.au", "UA");
  const mkmUnit = t("cosmic.mkm", "mi km");

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
              <h2 className="truncate text-title font-semibold text-fg">
                {locale === "en" ? meta.name : meta.namePt}
              </h2>
              <Badge tone="neutral">{meta.category}</Badge>
            </div>
            <p className="mt-0.5 font-mono text-caption tabular-nums text-fg-muted">
              {t("cosmic.epoch", "Época")}: {formatCosmicEpoch(selectedYear)}
            </p>
          </div>
        </div>
        <IconButton
          label={t("cosmic.closeAria", "Fechar painel e deselecionar")}
          icon={<X />}
          size="sm"
          onClick={clearCelestialFocus}
        />
      </div>

      {/* Real-time Telemetry Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-card border border-line bg-surface-raised p-2.5">
          <span className="block text-caption text-fg-secondary">{t("cosmic.distSun", "Distância até o Sol")}</span>
          <span className="mt-0.5 block font-mono text-body font-medium tabular-nums text-warning">
            {distanceSunAu} {auUnit}
          </span>
          <span className="font-mono text-caption tabular-nums text-fg-muted">
            {formatNumber(distanceSunMkm, locale)} {mkmUnit}
          </span>
        </div>

        <div className="rounded-card border border-line bg-surface-raised p-2.5">
          <span className="block text-caption text-fg-secondary">{t("cosmic.distEarth", "Distância até a Terra")}</span>
          <span className="mt-0.5 block font-mono text-body font-medium tabular-nums text-fg">
            {distanceEarthAu} {auUnit}
          </span>
          <span className="font-mono text-caption tabular-nums text-fg-muted">
            {formatNumber(distanceEarthMkm, locale)} {mkmUnit}
          </span>
        </div>
      </div>

      {/* Halley Cometary Activity & Epoch Controls */}
      {halleyTelemetry && (
        <CosmicHalleyCard
          halleyTelemetry={halleyTelemetry}
          selectedYear={selectedYear}
          auUnit={auUnit}
        />
      )}

      {/* Astrophysical Fact Sheet */}
      <div className="space-y-1.5 text-label">
        <h3 className="text-caption font-medium text-fg-muted">{t("cosmic.propsTitle", "Propriedades Astrofísicas")}</h3>
        <div className="divide-y divide-line rounded-card border border-line bg-surface-raised p-2.5 text-caption">
          <div className="flex items-center justify-between py-1">
            <span className="text-fg-secondary">{t("cosmic.equatorialRadius", "Raio equatorial")}</span>
            <span className="font-mono tabular-nums text-fg">
              {formatNumber(meta.equatorialRadiusKm, locale)} km
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-fg-secondary">{t("cosmic.mass", "Massa")}</span>
            <span className="font-mono tabular-nums text-fg">{meta.massKg} kg</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-fg-secondary">{t("cosmic.surfaceGravity", "Gravidade superficial")}</span>
            <span className="font-mono tabular-nums text-fg">{meta.surfaceGravityMs2} m/s²</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-fg-secondary">{t("cosmic.orbitalPeriod", "Período orbital")}</span>
            <span className="font-mono tabular-nums text-fg">
              {meta.orbitalPeriodDays > 0
                ? `${meta.orbitalPeriodDays} ${t("cosmic.days", "dias")}`
                : t("cosmic.heliocentricCenter", "Centro Heliocêntrico")}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-fg-secondary">{t("cosmic.rotationPeriod", "Duração do dia (rotação)")}</span>
            <span className="font-mono tabular-nums text-fg">{meta.rotationPeriodHours} h</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-fg-secondary">{t("cosmic.meanTemp", "Temperatura média")}</span>
            <span className="font-mono tabular-nums text-fg">{meta.meanTemperatureC} °C</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-fg-secondary">{t("cosmic.confirmedMoons", "Luas confirmadas")}</span>
            <span className="font-mono font-semibold tabular-nums text-fg">
              {meta.confirmedMoons}
            </span>
          </div>
          {lunarPhase && (
            <div className="flex items-center justify-between py-1">
              <span className="text-fg-secondary">{t("cosmic.lunarPhase", "Fase Lunar:")}</span>
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
          <h3 className="text-caption font-medium text-fg-muted">{t("cosmic.atmosphere", "Composição atmosférica")}</h3>
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
            <span>{t("cosmic.missions", "Missões espaciais históricas")}</span>
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
          <span>{t("cosmic.exploreEarth", "Explorar Superfície / Países")}</span>
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
          <span>{t("cosmic.returnEarth", "Voltar à Terra")}</span>
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
          <span>{t("cosmic.focusEarth", "Focar na Terra (Planeta-mãe)")}</span>
        </Button>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 border-t border-line pt-3">
        <Button variant="secondary" className="flex-1" onClick={() => focusBody(null)}>
          <RotateCw aria-hidden="true" className="h-3.5 w-3.5" />
          <span>{t("cosmic.overview", "Visão Geral")}</span>
        </Button>

        <Button
          variant="secondary"
          onClick={handleCopyCitation}
          title={t("cosmic.copyCitationTitle", "Copiar Citação Acadêmica (RN02)")}
        >
          {copiedCitation ? (
            <>
              <Check aria-hidden="true" className="h-3.5 w-3.5 text-success" />
              <span>{t("common.copiedBang", "Copiado!")}</span>
            </>
          ) : (
            <>
              <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{t("cosmic.citation", "Citação")}</span>
            </>
          )}
        </Button>

        <a
          href={meta.citationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses("secondary", "sm", "px-2")}
          title={t("cosmic.openNasaSource", "Abrir Fonte Primária NASA")}
          aria-label={t("cosmic.openNasaSource", "Abrir Fonte Primária NASA")}
        >
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
        </a>
      </div>
      {isCosmicMode && <StudyContext entityId="observatory:COSMOS" />}
    </aside>
  );
};
