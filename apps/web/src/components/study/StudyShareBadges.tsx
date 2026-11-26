"use client";

import React from "react";
import type { ChoroplethIndicatorMeta } from "@/lib/choropleth";
import { GIBS_PRODUCTS, formatGibsMonth, type GibsProductId } from "@/lib/gibs";
import type { Locale } from "@/lib/i18n/types";
import { useI18n } from "@/lib/i18n/useT";

export interface StudyShareBadgesProps {
  locale: Locale;
  isHistoricalEraActive: boolean;
  historicalEraLabel: string;
  isApollo11Active: boolean;
  geologicalMa: number | null | undefined;
  geologicalEraName: string | null;
  activeRouteId: string | null;
  historicalRouteTitle: string | null;
  effectiveObservatoryLayers: readonly string[];
  choroplethMeta: ChoroplethIndicatorMeta | null;
  activeChoroplethYear: number | null;
  gibsOn: boolean;
  gibsProduct: GibsProductId;
  gibsMonth: string | null;
  is2dSnapshot: boolean;
  projectionShortLabel: string;
  isCosmicMode: boolean;
  focusedBodyId: string | null;
  activeCosmicLayers: readonly string[];
  annotationsCount: number;
}

export const StudyShareBadges: React.FC<StudyShareBadgesProps> = ({
  locale,
  isHistoricalEraActive,
  historicalEraLabel,
  isApollo11Active,
  geologicalMa,
  geologicalEraName,
  activeRouteId,
  historicalRouteTitle,
  effectiveObservatoryLayers,
  choroplethMeta,
  activeChoroplethYear,
  gibsOn,
  gibsProduct,
  gibsMonth,
  is2dSnapshot,
  projectionShortLabel,
  isCosmicMode,
  focusedBodyId,
  activeCosmicLayers,
  annotationsCount,
}) => {
  const { t } = useI18n();

  return (
    <>
      {isHistoricalEraActive && (
        <div
          data-testid="modal-historical-era-badge"
          className="flex items-center gap-2.5 rounded-card border border-warning/40 bg-warning/10 p-3 text-label"
        >
          <span aria-hidden="true" className="select-none text-title">🏛️</span>
          <div className="flex-1">
            <div className="font-semibold text-fg">
              {t("study.badge.historical", "Cartografia Histórica Ativa Capturada")}
            </div>
            <div className="text-caption text-warning">{historicalEraLabel}</div>
          </div>
        </div>
      )}

      {isApollo11Active && (
        <div
          data-testid="modal-apollo11-badge"
          className="flex items-center gap-2.5 rounded-card border border-accent/40 bg-accent/10 p-3 text-label"
        >
          <span aria-hidden="true" className="select-none text-title">🚀</span>
          <div className="flex-1">
            <div className="font-semibold text-fg">
              {t("study.badge.apolloTitle", "Missão Espacial Apollo 11 (1969)")}
            </div>
            <div className="text-caption text-accent">
              {t("study.badge.apolloDesc", "Trajetória Translunar 3D e telemetria incluídas no estudo.")}
            </div>
          </div>
        </div>
      )}

      {geologicalMa && (
        <div
          data-testid="modal-geological-era-badge"
          className="flex items-center gap-2.5 rounded-card border border-success/40 bg-success/10 p-3 text-label"
        >
          <span aria-hidden="true" className="select-none text-title">🌋</span>
          <div className="flex-1">
            <div className="font-semibold text-fg">
              {t("study.badge.geoTitle", "Paleogeografia & Deriva Continental Ativa")}
            </div>
            <div className="text-caption text-success">
              {geologicalEraName || `${geologicalMa} Ma`}
            </div>
          </div>
        </div>
      )}

      {activeRouteId && (
        <div
          data-testid="modal-historical-route-badge"
          className="flex items-center gap-2.5 rounded-card border border-cat-politics/40 bg-cat-politics/10 p-3 text-label"
        >
          <span aria-hidden="true" className="select-none text-title">⛵</span>
          <div className="flex-1">
            <div className="font-semibold text-fg">
              {t("study.badge.routeTitle", "Rota de Expedição Histórica 3D")}
            </div>
            <div className="text-caption text-cat-politics">
              {historicalRouteTitle || activeRouteId}
            </div>
          </div>
        </div>
      )}

      {effectiveObservatoryLayers.length > 0 && (
        <div
          data-testid="modal-observatory-badge"
          className="flex items-center gap-2.5 rounded-card border border-accent/40 bg-accent/10 p-3 text-label"
        >
          <span aria-hidden="true" className="select-none text-title">📡</span>
          <div className="flex-1">
            <div className="font-semibold text-fg">
              {t("study.badge.obsTitle", "Observatório Planetário Ativo")}
            </div>
            <div className="text-caption text-accent">
              {effectiveObservatoryLayers.length}{" "}
              {t("study.badge.obsCaptured", "camada(s) científica(s) capturada(s)")} (
              {effectiveObservatoryLayers.join(", ")}).
            </div>
          </div>
        </div>
      )}

      {choroplethMeta && (
        <div
          data-testid="modal-choropleth-badge"
          className="flex items-center gap-2.5 rounded-card border border-accent/40 bg-accent/10 p-3 text-label"
        >
          <span aria-hidden="true" className="select-none text-title">🗺️</span>
          <div className="flex-1">
            <div className="font-semibold text-fg">
              {t("study.badge.choroplethTitle", "Mapa Temático Coroplético Capturado")}
            </div>
            <div className="text-caption text-accent">
              {t(`choropleth.ind.${choroplethMeta.id}.label`, choroplethMeta.label)}
              {activeChoroplethYear !== null ? ` · ${activeChoroplethYear}` : ""} (
              {choroplethMeta.sourcePrimary}) —{" "}
              {t("study.badge.choroplethRestored", "restaurado automaticamente ao abrir o link.")}
            </div>
          </div>
        </div>
      )}

      {gibsOn && (
        <div
          data-testid="modal-gibs-badge"
          className="flex items-center gap-2.5 rounded-card border border-line bg-surface p-3 text-label"
        >
          <span aria-hidden="true" className="select-none text-title">🛰️</span>
          <div className="flex-1">
            <div className="font-semibold text-fg">
              {t("study.badge.gibsTitle", "Imagem de Satélite Capturada")}
            </div>
            <div className="text-caption text-fg-secondary">
              {t(`obs.gibs.${gibsProduct}.name`, GIBS_PRODUCTS[gibsProduct].name)}
              {gibsMonth ? ` · ${formatGibsMonth(gibsMonth, locale)}` : ""} (NASA GIBS) —{" "}
              {t("study.badge.gibsRestored", "restaurada ao abrir o link.")}
            </div>
          </div>
        </div>
      )}

      {is2dSnapshot && (
        <div
          data-testid="modal-map2d-badge"
          className="flex items-center gap-2.5 rounded-card border border-accent/40 bg-accent/10 p-3 text-label"
        >
          <span aria-hidden="true" className="select-none text-title">🧭</span>
          <div className="flex-1">
            <div className="font-semibold text-fg">
              {t("study.badge.map2dTitle", "Mapa 2D & Projeção Capturada")}
            </div>
            <div className="text-caption text-accent">
              {projectionShortLabel} —{" "}
              {t("study.badge.map2dRestored", "restaurada automaticamente ao abrir o link.")}
            </div>
          </div>
        </div>
      )}

      {annotationsCount > 0 && !isCosmicMode && (
        <div
          data-testid="modal-annotations-badge"
          className="flex items-center gap-2.5 rounded-card border border-accent/40 bg-accent/10 p-3 text-label"
        >
          <span aria-hidden="true" className="select-none text-title">📍</span>
          <div className="flex-1">
            <div className="font-semibold text-fg">
              {t("study.badge.pinsTitle", "Pinos Georreferenciados Capturados")}
            </div>
            <div className="text-caption text-accent">
              {annotationsCount}{" "}
              {t(
                "study.badge.pinsDesc",
                "pino(s) anotado(s) com coordenadas (lat, lng) imutáveis e herdados em forks."
              )}
            </div>
          </div>
        </div>
      )}

      {isCosmicMode && (
        <div
          data-testid="modal-cosmic-badge"
          className="flex items-center gap-2.5 rounded-card border border-warning/40 bg-warning/10 p-3 text-label"
        >
          <span aria-hidden="true" className="select-none text-title">🪐</span>
          <div className="flex-1">
            <div className="font-semibold text-fg">
              {t("study.badge.cosmicTitle", "Estudo Cósmico / Sistema Solar Ativo")}
            </div>
            <div className="text-caption text-warning">
              {focusedBodyId
                ? `${t("study.badge.orbitalFocus", "Foco Orbital")}: ${focusedBodyId}`
                : t("study.badge.heliocentricOverview", "Visão Panorâmica Heliocêntrica")}{" "}
              · {activeCosmicLayers.length}{" "}
              {t("study.badge.cosmicCaptured", "camadas cósmicas capturadas.")}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
