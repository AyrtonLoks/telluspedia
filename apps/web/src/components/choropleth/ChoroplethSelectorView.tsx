"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Check, Compass, Layers, X } from "lucide-react";
import {
  buildPaletteGradientCss,
  CHOROPLETH_INDICATOR_LIST,
  type ChoroplethIndicatorId,
} from "@/lib/choropleth";
import {
  CRITICAL_GEO_LENS_IDS,
  type CriticalGeoLensId,
} from "@/lib/critical-geo-ids";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/components/ui/cn";
import { useI18n, type TranslateFn } from "@/lib/i18n/useT";
import type { EnMessageKey } from "@/lib/i18n/en";

function indLabel(t: TranslateFn, id: ChoroplethIndicatorId, fallback: string) {
  return t(`choropleth.ind.${id}.label` as EnMessageKey, fallback);
}
function indDesc(t: TranslateFn, id: ChoroplethIndicatorId, fallback: string) {
  return t(`choropleth.ind.${id}.desc` as EnMessageKey, fallback);
}
function indUnit(t: TranslateFn, id: ChoroplethIndicatorId, fallback: string) {
  if (
    id === "SP.DYN.LE00.IN" ||
    id === "SP.POP.TOTL" ||
    id === "NASA_FIRMS" ||
    id === "EN.GHG.CO2.PC.CE.AR5" ||
    id === "EG.FEC.RNEW.ZS"
  ) {
    return t(`choropleth.ind.${id}.unit` as EnMessageKey, fallback);
  }
  return fallback;
}

const CRITICAL_LENS_ITEMS: ReadonlyArray<{
  id: CriticalGeoLensId;
  labelPt: string;
  labelEn: string;
  descPt: string;
  descEn: string;
}> = [
  {
    id: "MTCI",
    labelPt: "Meio Técnico-Científico-Informacional",
    labelEn: "Technical-Scientific-Informational Milieu",
    descPt: "Espaços luminosos vs. opacos (dados reais WDI).",
    descEn: "Luminous vs. opaque spaces (real WDI data).",
  },
  {
    id: "VERTICALITIES",
    labelPt: "Horizontalidades vs. Verticalidades",
    labelEn: "Horizontalities vs. Verticalities",
    descPt: "Fluxos globais de comando e circuito superior/inferior.",
    descEn: "Global command flows & upper/lower urban circuits.",
  },
  {
    id: "FOUR_BRAZILS",
    labelPt: "Os Quatro Brasis (Santos & Silveira, 2001)",
    labelEn: "The Four Brazils (Santos & Silveira, 2001)",
    descPt: "Regionalização crítica comparada às 5 regiões do IBGE.",
    descEn: "Critical regionalization compared to IBGE's 5 regions.",
  },
];

export interface ChoroplethSelectorViewProps {
  activeIndicator: ChoroplethIndicatorId | null;
  activeCriticalLens?: CriticalGeoLensId | null;
  opacity: number;
  isGlobeEligible: boolean;
  onSelect: (id: ChoroplethIndicatorId) => void;
  onSelectCriticalLens?: (id: CriticalGeoLensId) => void;
  onClear: () => void;
  onOpacityChange: (opacity: number) => void;
  onReturnToContemporaryEarth: () => void;
  onClose: () => void;
}

export const ChoroplethSelectorView: React.FC<ChoroplethSelectorViewProps> = ({
  activeIndicator,
  activeCriticalLens = null,
  opacity,
  isGlobeEligible,
  onSelect,
  onSelectCriticalLens,
  onClear,
  onOpacityChange,
  onReturnToContemporaryEarth,
  onClose,
}) => {
  const { locale, t } = useI18n();
  const isEn = locale === "en";
  return (
    <Panel
      role="dialog"
      aria-label={t("choropleth.selectorAria", "Seletor de mapa temático coroplético")}
      data-testid="choropleth-selector"
      className="pointer-events-auto flex max-h-[var(--map-overlay-height)] w-[min(calc(100vw-1.5rem),22rem)] flex-col overflow-hidden shadow-e2"
    >
      <div className="flex items-start justify-between gap-2 border-b border-line px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Layers aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
            <h2 className="text-label font-semibold text-fg">
              {t("choropleth.selectorTitle", "Mapa temático coroplético")}
            </h2>
          </div>
          <p className="text-caption text-fg-muted">
            {t("choropleth.selectorSubtitle", "Colore os 177 países no globo por indicador real.")}
          </p>
        </div>
        <IconButton
          size="sm"
          label={t("choropleth.closeSelector", "Fechar seletor de mapa temático")}
          icon={<X />}
          onClick={onClose}
        />
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto p-3">
        {!isGlobeEligible && (
          <div className="flex flex-col gap-2 rounded-card border border-warning/40 bg-warning/10 p-2.5 text-caption text-fg-secondary">
            <span>
              {t(
                "choropleth.geoWarning",
                "A camada coroplética é exibida na Terra contemporânea. Volte ao mapa atual para visualizar o preenchimento."
              )}
            </span>
            <div>
              <Button size="sm" variant="secondary" onClick={onReturnToContemporaryEarth}>
                {t("choropleth.returnEarth", "Voltar à Terra contemporânea")}
              </Button>
            </div>
          </div>
        )}

        <div
          className="flex flex-col gap-1.5"
          role="radiogroup"
          aria-label={t("choropleth.indicatorsAria", "Indicadores coropléticos")}
        >
          {CHOROPLETH_INDICATOR_LIST.map((item) => {
            const isSelected = activeIndicator === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`choropleth-option-${item.id}`}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "flex flex-col gap-1.5 rounded-card border px-3 py-2 text-left transition-colors duration-fast ease-out",
                  isSelected
                    ? "border-accent/60 bg-accent/10 text-fg"
                    : "border-line bg-surface-raised/60 text-fg-secondary hover:border-line-strong hover:bg-surface-hover hover:text-fg"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-label font-medium text-fg">
                    {indLabel(t, item.id, item.label)}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-caption text-fg-muted">
                    {isSelected && <Check aria-hidden="true" className="h-3.5 w-3.5 text-accent" />}
                    <span>{indUnit(t, item.id, item.unit)}</span>
                  </span>
                </div>
                <p className="text-caption text-fg-muted">{indDesc(t, item.id, item.description)}</p>
                <div className="flex items-center justify-between gap-2">
                  <span
                    aria-hidden="true"
                    className="h-1.5 flex-1 rounded-full border border-line"
                    style={{ backgroundImage: buildPaletteGradientCss(item.palette) }}
                  />
                  <span className="shrink-0 text-caption text-fg-muted">{item.sourcePrimary}</span>
                </div>
              </button>
            );
          })}
        </div>

        {onSelectCriticalLens && (
          <div className="mt-1 space-y-1.5 border-t border-line pt-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-caption font-semibold text-fg">
                <Compass aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
                <span>{t("criticalGeo.brand", "Geografia Crítica · Milton Santos")}</span>
              </div>
              <Link
                href="/dossies/milton-santos"
                className="inline-flex items-center gap-1 text-caption text-accent hover:text-accent-hover hover:underline"
              >
                <BookOpen aria-hidden="true" className="h-3 w-3" />
                <span>{t("criticalGeo.dossierShort", "Dossiê")}</span>
              </Link>
            </div>
            <div className="flex flex-col gap-1.5" role="group" aria-label={t("criticalGeo.brand", "Geografia Crítica · Milton Santos")}>
              {CRITICAL_LENS_ITEMS.filter((item) => CRITICAL_GEO_LENS_IDS.includes(item.id)).map((item) => {
                const isSelected = activeCriticalLens === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isSelected}
                    data-testid={`critical-geo-option-${item.id}`}
                    onClick={() => onSelectCriticalLens(item.id)}
                    className={cn(
                      "flex flex-col gap-0.5 rounded-card border px-3 py-2 text-left transition-colors duration-fast ease-out",
                      isSelected
                        ? "border-accent/60 bg-accent/10 text-fg"
                        : "border-line bg-surface-raised/60 text-fg-secondary hover:border-line-strong hover:bg-surface-hover hover:text-fg"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-label font-medium text-fg">
                        {isEn ? item.labelEn : item.labelPt}
                      </span>
                      {isSelected && <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" />}
                    </div>
                    <p className="text-caption text-fg-muted">
                      {isEn ? item.descEn : item.descPt}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeIndicator !== null && (
          <div className="mt-1 flex flex-col gap-2 border-t border-line pt-2.5">
            <div className="flex items-center justify-between gap-2 text-caption">
              <label htmlFor="choropleth-opacity-range" className="text-fg-secondary">
                {t("choropleth.opacity", "Opacidade da camada")}
              </label>
              <span className="font-mono text-fg tabular-nums">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <input
              id="choropleth-opacity-range"
              type="range"
              min={40}
              max={100}
              step={5}
              value={Math.round(opacity * 100)}
              onChange={(event) => onOpacityChange(Number(event.target.value) / 100)}
              className="h-1.5 w-full cursor-pointer accent-accent"
            />
            <Button
              size="sm"
              variant="ghost"
              data-testid="choropleth-clear-button"
              onClick={onClear}
              className="w-full justify-center text-fg-secondary hover:text-fg"
            >
              {t("choropleth.disable", "Desativar mapa temático")}
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
};
