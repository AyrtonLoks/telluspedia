"use client";

import React, { useState } from "react";
import { Layers } from "lucide-react";
import {
  ALL_COSMIC_LAYERS,
  COSMIC_LAYER_LABELS,
  type CosmicLayerId,
} from "@/stores/cosmicStore";
import type { CosmicScaleMode } from "@/lib/cosmic-scale";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/useT";

export interface CosmicLayersMenuProps {
  isDockVisible: boolean;
  activeCosmicLayers: CosmicLayerId[];
  scaleMode: CosmicScaleMode;
  onToggleLayer: (layerId: CosmicLayerId) => void;
  onSetScaleMode: (mode: CosmicScaleMode) => void;
}

/** Botão flutuante e menu de camadas visuais e escala do Modo Cósmico (extraído de CosmicInspectorHUD na T45). */
export const CosmicLayersMenu: React.FC<CosmicLayersMenuProps> = ({
  isDockVisible,
  activeCosmicLayers,
  scaleMode,
  onToggleLayer,
  onSetScaleMode,
}) => {
  const { t } = useI18n();
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  return (
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
        title={t("cosmic.layersTitle", "Alternar camadas cósmicas")}
      >
        <Layers aria-hidden="true" className="h-4 w-4 text-accent" />
        <span>{t("cosmic.layersButton", "Camadas Cósmicas")}</span>
      </button>

      {showLayerPanel && (
        <Panel className="w-56 space-y-3 p-3 text-label">
          <div className="space-y-1.5">
            <h4 className="text-caption font-medium text-fg-muted">
              {t("cosmic.visualLayers", "Camadas visuais")}
            </h4>
            <div className="flex flex-col gap-1">
              {ALL_COSMIC_LAYERS.map((layerId) => {
                const label = t(`cosmic.layer.${layerId}`, COSMIC_LAYER_LABELS[layerId]);
                const isActive = activeCosmicLayers.includes(layerId);
                return (
                  <button
                    key={layerId}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onToggleLayer(layerId)}
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
              {t("cosmic.bodySizes", "Tamanho dos corpos")}
            </h4>
            <div role="group" aria-labelledby="cosmic-scale-heading" className="grid grid-cols-2 gap-1">
              {(
                [
                  ["visual", t("cosmic.scale.visual", "Visual")],
                  ["real", t("cosmic.scale.real", "Real")],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={scaleMode === mode}
                  data-testid={`cosmic-scale-${mode}`}
                  onClick={() => onSetScaleMode(mode)}
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
                ? t("cosmic.scale.realDesc", "Raios na proporção real entre os corpos. As distâncias continuam comprimidas.")
                : t("cosmic.scale.visualDesc", "Raios exagerados por um fator único para todos ficarem visíveis. Distâncias comprimidas.")}
            </p>
          </div>

          <a
            href="https://github.com/AyrtonLoks/telluspedia/blob/master/docs/DATA_SOURCES.md#catálogo-estelar-e-via-láctea-d09"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-caption text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            {t("cosmic.skySources", "Fontes do céu")}
          </a>
        </Panel>
      )}
    </aside>
  );
};
