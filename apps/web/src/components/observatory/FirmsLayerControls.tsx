"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useGlobeStore } from "@/stores/globeStore";
import { FIRMS_WINDOWS, type FirmsWindowDays } from "@/lib/firms-aggregate";
import { FIRMS_FRP_STOPS } from "@/lib/firms-display";
import { BRAZILIAN_BIOMES, INPE_BDQUEIMADAS_PORTAL_URL } from "@/lib/inpe-data";
import type { FireSourceProvider } from "@/lib/inpe-types";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/useT";
import { formatNumber } from "@/lib/i18n/format";

const WINDOW_LABEL: Record<FirmsWindowDays, string> = { 1: "24 h", 2: "48 h", 5: "5 dias" };

/** Gradiente da legenda a partir da mesma escala usada pelo shader do globo. */
const LEGEND_GRADIENT = `linear-gradient(to right, ${FIRMS_FRP_STOPS.map(
  (s, i) => `${s.hex} ${Math.round((i / (FIRMS_FRP_STOPS.length - 1)) * 100)}%`
).join(", ")})`;

const FIRE_PROVIDERS: readonly { id: FireSourceProvider; labelPt: string; labelEn: string }[] = [
  { id: "firms", labelPt: "NASA FIRMS", labelEn: "NASA FIRMS" },
  { id: "inpe", labelPt: "INPE BDQueimadas", labelEn: "INPE BDQueimadas" },
];

/** Janela temporal, alternância NASA FIRMS / INPE BDQueimadas (D30), filtro e legenda (D05). */
export const FirmsLayerControls: React.FC = () => {
  const { locale, t } = useI18n();
  const ssr = typeof window === "undefined" ? useObservatoryStore.getState() : null;
  const storeWindow = useObservatoryStore((s) => s.firmsWindow);
  const storeFireSource = useObservatoryStore((s) => s.fireSource);
  const storeInpeFires = useObservatoryStore((s) => s.inpeFires);

  const firmsWindow = ssr?.firmsWindow ?? storeWindow;
  const fireSource = ssr?.fireSource ?? storeFireSource;
  const inpeFires = ssr ? ssr.inpeFires : storeInpeFires;

  const setFirmsWindow = useObservatoryStore((s) => s.setFirmsWindow);
  const setFireSource = useObservatoryStore((s) => s.setFireSource);
  const isLoading = useObservatoryStore((s) => s.isLoading.NASA_FIRMS);
  const flyTo = useGlobeStore((s) => s.flyTo);

  return (
    <div data-testid="firms-controls" className="space-y-2.5">
      {/* Seletor de provedor oficial: NASA FIRMS (Global) vs. INPE BDQueimadas (Am. Sul / Biomas BR) */}
      <div
        role="group"
        aria-label={t("obs.firms.providerAria", "Fonte de dados de queimadas")}
        className="grid grid-cols-2 gap-1 rounded-control border border-line bg-surface p-0.5"
      >
        {FIRE_PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            data-testid={`fires-source-${provider.id}`}
            aria-pressed={fireSource === provider.id}
            disabled={isLoading}
            onClick={() => setFireSource(provider.id)}
            className={cn(
              "h-7 rounded-control px-2 text-caption font-medium transition-colors duration-fast ease-out disabled:opacity-60",
              fireSource === provider.id
                ? "bg-accent/15 text-accent"
                : "text-fg-secondary hover:bg-surface-hover/60 hover:text-fg"
            )}
          >
            {locale === "en" ? provider.labelEn : provider.labelPt}
          </button>
        ))}
      </div>

      {fireSource === "firms" ? (
        <>
          <div role="group" aria-label={t("obs.firms.windowAria", "Janela temporal das queimadas")} className="flex items-center gap-1">
            <span className="mr-1 text-caption text-fg-muted">{t("obs.firms.period", "Período")}</span>
            {FIRMS_WINDOWS.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={firmsWindow.days === d}
                disabled={isLoading}
                onClick={() => setFirmsWindow({ days: d })}
                className={cn(
                  "h-7 rounded-control px-2.5 text-caption font-medium transition-colors duration-fast ease-out disabled:opacity-60",
                  firmsWindow.days === d ? "bg-surface-hover text-fg" : "text-fg-secondary hover:bg-surface-hover/60 hover:text-fg"
                )}
              >
                {d === 5 ? t("obs.firms.days5", "5 dias") : WINDOW_LABEL[d]}
              </button>
            ))}
          </div>

          <Chip
            tone="layer-fires"
            pressed={firmsWindow.confidence === "all"}
            disabled={isLoading}
            onClick={() => setFirmsWindow({ confidence: firmsWindow.confidence === "all" ? "nominal" : "all" })}
          >
            {t("obs.firms.lowConf", "Incluir focos de baixa confiança")}
          </Chip>
        </>
      ) : (
        <div
          data-testid="inpe-biome-summary"
          className="space-y-2 rounded-card border border-line bg-surface p-2.5"
        >
          <div className="flex items-center justify-between gap-2 text-caption">
            <span className="font-medium text-fg">
              {t("obs.inpe.biomesTitle", "Focos por bioma brasileiro (INPE)")}
            </span>
            {inpeFires?.referenceDate && (
              <span className="font-mono tabular-nums text-fg-muted">{inpeFires.referenceDate}</span>
            )}
          </div>

          {inpeFires && inpeFires.total > 0 ? (
            <ul className="space-y-1">
              {inpeFires.byBiome.map((b) => {
                const meta = BRAZILIAN_BIOMES.find((item) => item.id === b.id);
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      data-testid={`inpe-fire-biome-${b.id}`}
                      onClick={() => meta && flyTo(meta.lat, meta.lng, 2.05)}
                      className="flex w-full items-center justify-between gap-2 rounded-control px-1.5 py-1 text-left text-caption transition-colors duration-fast ease-out hover:bg-surface-hover/60"
                    >
                      <span className="truncate text-fg-secondary">
                        {locale === "en" ? b.nameEn : b.namePt}
                      </span>
                      <span className="shrink-0 font-mono tabular-nums text-fg">
                        {formatNumber(b.count, locale)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-caption text-warning">
              {t(
                "obs.inpe.firesUnavailable",
                "Sem focos publicados ou servidor INPE BDQueimadas indisponível no momento (nenhum foco sintético exibido)."
              )}
            </p>
          )}

          <a
            href={inpeFires?.sourceUrl ?? INPE_BDQUEIMADAS_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-caption text-accent hover:underline"
          >
            <span>INPE / MCTI · BDQueimadas</span>
            <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />
          </a>
        </div>
      )}

      <div className="space-y-1" aria-label={t("obs.firms.legendAria", "Legenda: potência radiativa do fogo (FRP)")}>
        <div aria-hidden="true" className="h-1.5 w-full rounded-full" style={{ background: LEGEND_GRADIENT }} />
        <div className="flex justify-between font-mono text-caption tabular-nums text-fg-muted">
          <span>0</span>
          <span>20</span>
          <span>80</span>
          <span>300+ MW</span>
        </div>
        <p className="text-caption text-fg-muted">
          {t(
            "obs.firms.desc",
            "Cada marcador é um foco de calor detectado por satélite; cor e tamanho indicam a potência radiativa (FRP). Enquanto esta camada está ligada, as luzes das cidades no lado noturno ficam atenuadas."
          )}
        </p>
      </div>
    </div>
  );
};
