"use client";

import React, { useState } from "react";
import {
  Compass,
  Crosshair,
  Grid,
  Info,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Ruler,
  X,
} from "lucide-react";
import {
  MAP_PROJECTION_CATALOG,
  MAP_PROJECTION_LIST,
  MAX_2D_ZOOM,
  MIN_2D_ZOOM,
  type MapProjectionId,
} from "@/lib/map-projections";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/useT";
import { useStudioToolsStore } from "@/stores/studioToolsStore";
import { useStudyStore } from "@/stores/studyStore";

export interface ProjectionSelectorHudProps {
  projectionId: MapProjectionId;
  onSelectProjection: (id: MapProjectionId) => void;
  showGraticule: boolean;
  onToggleGraticule: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  selectedCountryLabel: string | null;
  azimuthalFollowSelected: boolean;
  onToggleAzimuthalCenter: () => void;
}

const TOOL_BUTTON =
  "flex h-9 items-center gap-1.5 rounded-control border border-line bg-surface/86 px-2.5 text-caption font-medium text-fg-secondary shadow-e1 backdrop-blur-md transition-colors duration-fast ease-out hover:border-line-strong hover:text-fg aria-pressed:border-accent/50 aria-pressed:bg-surface-raised aria-pressed:text-accent disabled:cursor-not-allowed disabled:opacity-45";

export const ProjectionSelectorHud: React.FC<ProjectionSelectorHudProps> = ({
  projectionId,
  onSelectProjection,
  showGraticule,
  onToggleGraticule,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  selectedCountryLabel,
  azimuthalFollowSelected,
  onToggleAzimuthalCenter,
}) => {
  const { locale, t } = useI18n();
  const [showInfoCard, setShowInfoCard] = useState(true);
  const isRulerActive = useStudioToolsStore((s) => s.isRulerActive);
  const toggleRuler = useStudioToolsStore((s) => s.toggleRuler);
  const isPinsPanelOpen = useStudioToolsStore((s) => s.isPinsPanelOpen);
  const togglePinsPanel = useStudioToolsStore((s) => s.togglePinsPanel);
  const annotationsCount = useStudyStore((s) => s.annotations.length);
  const activeMeta = MAP_PROJECTION_CATALOG[projectionId];
  const isEn = locale === "en";

  return (
    <div
      data-testid="map-2d-controls"
      className="pointer-events-none fixed left-3 top-[var(--map-tools-top)] z-20 flex max-w-[calc(100vw-1.5rem)] flex-col gap-2 xl:left-6"
    >
      {/* Barra compacta: 4 projeções + gratícula + zoom + nota didática */}
      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
        <div
          role="radiogroup"
          aria-label={t("map2d.projectionsAria", "Projeções cartográficas 2D")}
          data-testid="projection-selector-group"
          className="flex flex-wrap items-center gap-1 rounded-panel border border-line bg-surface/86 p-1 shadow-e1 backdrop-blur-md"
        >
          {MAP_PROJECTION_LIST.map((item) => {
            const selected = item.id === projectionId;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid={`projection-option-${item.id}`}
                onClick={() => onSelectProjection(item.id)}
                className={cn(
                  "flex h-7 items-center rounded-control px-2.5 text-caption font-medium transition-colors duration-fast ease-out",
                  selected
                    ? "bg-accent/15 text-accent"
                    : "text-fg-secondary hover:bg-surface-hover hover:text-fg"
                )}
              >
                {isEn ? item.shortNameEn : item.shortName}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-pressed={showGraticule}
          data-testid="map-2d-graticule-toggle"
          onClick={onToggleGraticule}
          title={t("map2d.graticuleTitle", "Exibir ou ocultar gratícula de meridianos e paralelos")}
          className={TOOL_BUTTON}
        >
          <Grid aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">{t("map2d.graticule", "Gratícula")}</span>
        </button>

        <div
          aria-label={t("map2d.zoomGroupAria", "Controles de zoom do mapa 2D")}
          className="flex items-center gap-0.5 rounded-control border border-line bg-surface/86 p-0.5 shadow-e1 backdrop-blur-md"
        >
          <IconButton
            size="sm"
            label={t("map2d.zoomOut", "Afastar mapa 2D")}
            icon={<Minus />}
            disabled={zoom <= MIN_2D_ZOOM + 0.01}
            onClick={onZoomOut}
          />
          <span
            data-testid="map-2d-zoom-level"
            className="min-w-10 text-center font-mono text-caption text-fg-secondary tabular-nums"
          >
            {zoom.toFixed(1)}×
          </span>
          <IconButton
            size="sm"
            label={t("map2d.zoomIn", "Aproximar mapa 2D")}
            icon={<Plus />}
            disabled={zoom >= MAX_2D_ZOOM - 0.01}
            onClick={onZoomIn}
          />
          <IconButton
            size="sm"
            label={t("map2d.resetZoom", "Enquadrar mapa completo")}
            icon={<RotateCcw />}
            onClick={onResetView}
          />
        </div>

        <button
          type="button"
          aria-pressed={showInfoCard}
          data-testid="projection-info-toggle"
          onClick={() => setShowInfoCard((open) => !open)}
          title={t("map2d.infoToggleTitle", "Exibir nota didática da projeção cartográfica")}
          className={TOOL_BUTTON}
        >
          <Info aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline">{t("map2d.aboutProjection", "Propriedades")}</span>
        </button>

        <button
          type="button"
          data-testid="map-2d-ruler-toggle"
          aria-pressed={isRulerActive}
          onClick={toggleRuler}
          title={t("studio.rulerToggleTitle", "Régua geodésica: medir distância ortodrômica (km / nm) e azimute")}
          className={TOOL_BUTTON}
        >
          <Ruler aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline">{t("studio.rulerShort", "Régua")}</span>
        </button>

        <button
          type="button"
          data-testid="map-2d-pins-toggle"
          aria-pressed={isPinsPanelOpen}
          onClick={togglePinsPanel}
          title={t("studio.pinsToggleTitle", "Pinos anotados do estudo: fixar marcadores (lat, lng) compartilháveis")}
          className={TOOL_BUTTON}
        >
          <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline">
            {t("studio.pinsShort", "Pinos")}
            {annotationsCount > 0 ? ` (${annotationsCount})` : ""}
          </span>
        </button>
      </div>

      {/* Cartão didático compacto sobre propriedades e distorções da projeção ativa */}
      {showInfoCard && (
        <Panel
          role="region"
          aria-label={t("map2d.didacticAria", "Propriedades da projeção cartográfica")}
          data-testid="projection-didactic-card"
          className="pointer-events-auto flex w-[min(calc(100vw-1.5rem),24rem)] flex-col gap-2 px-3 py-2.5 shadow-e2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Compass aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" />
                <h2 className="text-label font-semibold text-fg">
                  {isEn ? activeMeta.nameEn : activeMeta.name}
                </h2>
                <Badge tone="accent">
                  {isEn ? activeMeta.propertyBadgeEn : activeMeta.propertyBadge}
                </Badge>
              </div>
              <p className="text-caption text-fg-muted">{activeMeta.authorYear}</p>
            </div>
            <IconButton
              size="sm"
              label={t("map2d.closeInfo", "Recolher propriedades da projeção")}
              icon={<X />}
              onClick={() => setShowInfoCard(false)}
            />
          </div>

          <p className="text-caption leading-relaxed text-fg-secondary">
            {isEn ? activeMeta.didacticNoteEn : activeMeta.didacticNote}
          </p>

          <div className="grid grid-cols-1 gap-1 rounded-card border border-line bg-surface-sunken/80 p-2 text-caption">
            <div>
              <span className="font-medium text-success">
                {t("map2d.preservesLabel", "Preserva:")}{" "}
              </span>
              <span className="text-fg-secondary">
                {isEn ? activeMeta.preservesEn : activeMeta.preserves}
              </span>
            </div>
            <div>
              <span className="font-medium text-warning">
                {t("map2d.distortsLabel", "Distorce:")}{" "}
              </span>
              <span className="text-fg-secondary">
                {isEn ? activeMeta.distortsEn : activeMeta.distorts}
              </span>
            </div>
          </div>

          <p className="text-caption text-fg-muted">
            {isEn ? activeMeta.comparisonExampleEn : activeMeta.comparisonExample}
          </p>

          {projectionId === "azimuthal" && (
            <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
              <span className="truncate text-caption text-fg-secondary">
                {azimuthalFollowSelected && selectedCountryLabel
                  ? `${t("map2d.centeredOn", "Centro:")} ${selectedCountryLabel}`
                  : t("map2d.centeredOrigin", "Centro: Equador / Greenwich (0°, 0°)")}
              </span>
              <button
                type="button"
                data-testid="azimuthal-center-toggle"
                disabled={!selectedCountryLabel}
                onClick={onToggleAzimuthalCenter}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1 rounded-control border px-2 text-caption font-medium transition-colors duration-fast ease-out disabled:cursor-not-allowed disabled:opacity-45",
                  azimuthalFollowSelected && selectedCountryLabel
                    ? "border-accent/50 bg-accent/15 text-accent"
                    : "border-line bg-surface-raised text-fg-secondary hover:text-fg"
                )}
              >
                <Crosshair aria-hidden="true" className="h-3 w-3" />
                <span>
                  {azimuthalFollowSelected && selectedCountryLabel
                    ? t("map2d.resetCenter", "Voltar a 0°, 0°")
                    : t("map2d.centerOnSelected", "Focar país")}
                </span>
              </button>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
};
