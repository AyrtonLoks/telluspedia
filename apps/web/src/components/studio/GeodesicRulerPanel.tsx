"use client";

import React, { useMemo } from "react";
import { Compass, Crosshair, Ruler, Trash2, Undo2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/components/ui/cn";
import {
  azimuthToCardinal,
  computeGeodesicRulerSummary,
  formatCoordPair,
  MAX_RULER_POINTS,
} from "@/lib/geodesic-ruler";
import { formatNumber } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/useT";
import { useStudioToolsStore } from "@/stores/studioToolsStore";

export const GeodesicRulerPanel: React.FC = () => {
  const { locale, t } = useI18n();
  const storeActive = useStudioToolsStore((s) => s.isRulerActive);
  const storePoints = useStudioToolsStore((s) => s.rulerPoints);
  const isRulerActive =
    typeof window === "undefined" ? useStudioToolsStore.getState().isRulerActive : storeActive;
  const rulerPoints =
    typeof window === "undefined" ? useStudioToolsStore.getState().rulerPoints : storePoints;

  const setRulerActive = useStudioToolsStore((s) => s.setRulerActive);
  const removeLastRulerPoint = useStudioToolsStore((s) => s.removeLastRulerPoint);
  const clearRulerPoints = useStudioToolsStore((s) => s.clearRulerPoints);

  const summary = useMemo(() => computeGeodesicRulerSummary(rulerPoints), [rulerPoints]);

  if (!isRulerActive && rulerPoints.length === 0) return null;

  const handleClose = () => {
    clearRulerPoints();
    setRulerActive(false);
  };

  return (
    <Panel
      role="region"
      aria-label={t("studio.rulerAria", "Régua geodésica 3D")}
      data-testid="geodesic-ruler-panel"
      className="pointer-events-auto flex w-full flex-col gap-2.5 p-3 shadow-e2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Ruler aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
            <h2 className="text-label font-semibold text-fg">
              {t("studio.rulerTitle", "Régua geodésica")}
            </h2>
            <Badge tone={isRulerActive ? "accent" : "neutral"}>
              {rulerPoints.length}/{MAX_RULER_POINTS}
            </Badge>
          </div>
          <p className="text-caption text-fg-muted">
            {t("studio.rulerSubtitle", "Arco ortodrômico real · Haversine (R = 6.371 km)")}
          </p>
        </div>

        <IconButton
          size="sm"
          data-testid="ruler-close-btn"
          label={t("studio.rulerClose", "Fechar e limpar régua geodésica")}
          icon={<X />}
          onClick={handleClose}
        />
      </div>

      <div className="flex items-center justify-between gap-2 rounded-control border border-line bg-surface-sunken px-2.5 py-1.5 text-caption">
        <span className="text-fg-secondary">
          {isRulerActive
            ? rulerPoints.length === 0
              ? t("studio.rulerHintFirst", "Clique no 1º ponto na superfície do globo.")
              : rulerPoints.length === 1
                ? t("studio.rulerHintSecond", "Clique no 2º ponto para traçar a ortodrômica.")
                : t("studio.rulerHintMore", "Clique para adicionar trechos ou pause para navegar.")
            : t("studio.rulerPausedHint", "Marcação pausada — seleção normal de países ativa.")}
        </span>
        <button
          type="button"
          data-testid="ruler-pick-toggle"
          aria-pressed={isRulerActive}
          onClick={() => setRulerActive(!isRulerActive)}
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1 rounded-control border px-2 text-caption font-medium transition-colors duration-fast ease-out",
            isRulerActive
              ? "border-accent/50 bg-accent/15 text-accent"
              : "border-line bg-surface-raised text-fg-secondary hover:text-fg"
          )}
        >
          <Crosshair aria-hidden="true" className="h-3 w-3" />
          <span>
            {isRulerActive
              ? t("studio.rulerCapturing", "Marcando")
              : t("studio.rulerResume", "Marcar")}
          </span>
        </button>
      </div>

      {rulerPoints.length === 1 && (
        <div
          data-testid="ruler-first-point"
          className="flex items-center justify-between rounded-control border border-line bg-surface-raised px-2.5 py-1.5 text-caption"
        >
          <span className="font-medium text-success">
            {t("studio.originPoint", "Origem (P1)")}
          </span>
          <span className="font-mono text-fg-secondary tabular-nums">
            {formatCoordPair(rulerPoints[0]!.lat, rulerPoints[0]!.lng)}
          </span>
        </div>
      )}

      {summary.segments.length >= 1 && (
        <div className="grid grid-cols-2 gap-2 rounded-card border border-accent/30 bg-accent/10 p-2.5">
          <div>
            <span className="block text-caption text-fg-muted">
              {t("studio.totalDistanceKm", "Distância total (km)")}
            </span>
            <span
              data-testid="ruler-total-km"
              className="font-mono text-title font-semibold text-fg tabular-nums"
            >
              {formatNumber(Math.round(summary.totalDistanceKm), locale)} km
            </span>
          </div>
          <div>
            <span className="block text-caption text-fg-muted">
              {t("studio.totalDistanceNm", "Milhas náuticas (nm)")}
            </span>
            <span
              data-testid="ruler-total-nm"
              className="font-mono text-title font-semibold text-accent tabular-nums"
            >
              {formatNumber(Math.round(summary.totalDistanceNm), locale)} nm
            </span>
          </div>
          {summary.directInitialAzimuthDeg !== null && summary.directFinalAzimuthDeg !== null && (
            <div
              data-testid="ruler-azimuth"
              className="col-span-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-1.5 text-caption text-fg-secondary"
            >
              <span className="inline-flex items-center gap-1">
                <Compass aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
                <span>{t("studio.initialAzimuth", "Azimute inicial")}:</span>
                <strong className="font-mono text-fg tabular-nums">
                  {summary.directInitialAzimuthDeg.toFixed(1)}°{" "}
                  {azimuthToCardinal(summary.directInitialAzimuthDeg, locale)}
                </strong>
              </span>
              <span>
                {t("studio.finalAzimuth", "Final")}:{" "}
                <strong className="font-mono text-fg tabular-nums">
                  {summary.directFinalAzimuthDeg.toFixed(1)}°{" "}
                  {azimuthToCardinal(summary.directFinalAzimuthDeg, locale)}
                </strong>
              </span>
            </div>
          )}
        </div>
      )}

      {summary.segments.length >= 1 && (
        <ul
          data-testid="ruler-segments-list"
          className="flex max-h-36 flex-col gap-1.5 overflow-y-auto pr-0.5 text-caption"
        >
          {summary.segments.map((seg) => (
            <li
              key={`${seg.from.id}-${seg.to.id}`}
              className="rounded-control border border-line bg-surface-raised px-2.5 py-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-fg">
                  P{seg.index} → P{seg.index + 1}
                </span>
                <span className="font-mono font-medium text-fg tabular-nums">
                  {formatNumber(Math.round(seg.distanceKm), locale)} km ·{" "}
                  {formatNumber(Math.round(seg.distanceNm), locale)} nm
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2 font-mono text-fg-muted tabular-nums">
                <span>
                  {formatCoordPair(seg.from.lat, seg.from.lng)} →{" "}
                  {formatCoordPair(seg.to.lat, seg.to.lng)}
                </span>
                <span>
                  {seg.initialAzimuthDeg.toFixed(0)}°→{seg.finalAzimuthDeg.toFixed(0)}°
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {rulerPoints.length > 0 && (
        <div className="flex items-center justify-end gap-1.5 border-t border-line pt-2">
          <Button
            size="sm"
            variant="ghost"
            data-testid="ruler-undo-btn"
            onClick={removeLastRulerPoint}
          >
            <Undo2 aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{t("studio.undoPoint", "Desfazer")}</span>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            data-testid="ruler-clear-btn"
            onClick={clearRulerPoints}
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{t("studio.clearRuler", "Limpar")}</span>
          </Button>
        </div>
      )}
    </Panel>
  );
};
