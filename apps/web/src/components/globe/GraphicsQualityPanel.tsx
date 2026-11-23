"use client";

import React, { useEffect } from "react";
import { Check, Gauge, X } from "lucide-react";
import {
  GRAPHICS_QUALITY_PRESETS,
  GRAPHICS_QUALITY_PROFILES,
  type GraphicsQualityPreset,
} from "@/lib/webgl-quality";
import { useGraphicsQualityStore } from "@/stores/graphicsQualityStore";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/useT";

export interface GraphicsQualityPanelViewProps {
  preset: GraphicsQualityPreset;
  effectiveDpr: number;
  currentFps: number | null;
  adaptiveDprScale: number;
  onSelect: (preset: GraphicsQualityPreset) => void;
  onClose: () => void;
}

export const GraphicsQualityPanelView: React.FC<GraphicsQualityPanelViewProps> = ({
  preset,
  effectiveDpr,
  currentFps,
  adaptiveDprScale,
  onSelect,
  onClose,
}) => {
  const { t } = useI18n();
  const isAutoDegraded = preset === "auto" && adaptiveDprScale < 0.99;

  return (
    <Panel
      role="dialog"
      aria-label={t("quality.dialogAria", "Qualidade gráfica WebGL")}
      data-testid="graphics-quality-panel"
      className="pointer-events-auto flex w-[min(calc(100vw-1.5rem),21rem)] flex-col overflow-hidden shadow-e2"
    >
      <div className="flex items-start justify-between gap-2 border-b border-line px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Gauge aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
            <h2 className="text-label font-semibold text-fg">{t("quality.title", "Qualidade gráfica")}</h2>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-caption text-fg-muted">
            <span className="font-mono tabular-nums" data-testid="graphics-quality-telemetry">
              DPR {effectiveDpr.toFixed(2)}×
              {currentFps !== null ? ` · ${currentFps} fps` : ""}
            </span>
            {isAutoDegraded && (
              <Badge tone="warning" data-testid="graphics-quality-degraded-badge">
                {t("quality.degraded", "DPR adaptado")}
              </Badge>
            )}
          </div>
        </div>
        <IconButton
          size="sm"
          label={t("quality.closeAria", "Fechar painel de qualidade gráfica")}
          icon={<X />}
          onClick={onClose}
        />
      </div>

      <div className="flex flex-col gap-1.5 p-3" role="radiogroup" aria-label={t("quality.groupAria", "Preset de qualidade gráfica")}>
        {GRAPHICS_QUALITY_PRESETS.map((id) => {
          const profile = GRAPHICS_QUALITY_PROFILES[id];
          const isSelected = preset === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-testid={`graphics-quality-option-${id}`}
              onClick={() => onSelect(id)}
              className={cn(
                "flex flex-col gap-1 rounded-card border px-3 py-2 text-left transition-colors duration-fast ease-out",
                isSelected
                  ? "border-accent/60 bg-accent/10 text-fg"
                  : "border-line bg-surface-raised/60 text-fg-secondary hover:border-line-strong hover:bg-surface-hover hover:text-fg"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-label font-medium text-fg">
                  <span>{t(`quality.${id}.label`, profile.label)}</span>
                  {isSelected && <Check aria-hidden="true" className="h-3.5 w-3.5 text-accent" />}
                </span>
                <span className="font-mono text-caption text-fg-muted tabular-nums">
                  {profile.textureTier.toUpperCase()} · ≤{profile.maxDpr.toFixed(1)}×
                </span>
              </div>
              <p className="text-caption text-fg-muted">{t(`quality.${id}.desc`, profile.description)}</p>
            </button>
          );
        })}

        <p className="mt-1 border-t border-line pt-2 text-caption text-fg-muted">
          {t("quality.footer", "Preferência salva neste navegador e aplicada sem recarregar o globo 3D.")}
        </p>
      </div>
    </Panel>
  );
};

export const GraphicsQualityPanel: React.FC<{ dockMounted: boolean }> = ({ dockMounted }) => {
  const preset = useGraphicsQualityStore((s) => s.preset);
  const effectiveDpr = useGraphicsQualityStore((s) => s.effectiveDpr);
  const currentFps = useGraphicsQualityStore((s) => s.currentFps);
  const adaptiveDprScale = useGraphicsQualityStore((s) => s.adaptiveDprScale);
  const setPreset = useGraphicsQualityStore((s) => s.setPreset);
  const setPanelOpen = useGraphicsQualityStore((s) => s.setPanelOpen);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setPanelOpen]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed right-3 top-[calc(var(--map-annotation-top)+0.25rem)] z-30 lg:top-[var(--map-tools-top)] xl:right-6",
        dockMounted && "lg:right-[27.5rem]"
      )}
    >
      <GraphicsQualityPanelView
        preset={preset}
        effectiveDpr={effectiveDpr}
        currentFps={currentFps}
        adaptiveDprScale={adaptiveDprScale}
        onSelect={setPreset}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  );
};
