"use client";

import React from "react";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { ISS_NORAD_ID, type SatelliteCategory } from "@/lib/satellites";
import { Chip } from "@/components/ui/Chip";
import { useI18n } from "@/lib/i18n/useT";

const CATEGORY_LABEL: Record<SatelliteCategory, string> = {
  station: "Estações espaciais",
  visual: "Visíveis a olho nu",
};

/** Filtro por categoria e legenda da camada de satélites (D04). */
export const SatelliteLayerControls: React.FC = () => {
  const { t } = useI18n();
  const isServer = typeof window === "undefined";
  const storeSatellites = useObservatoryStore((s) => s.satellites);
  const storeCategories = useObservatoryStore((s) => s.satelliteCategories);
  const satellites = isServer ? useObservatoryStore.getState().satellites : storeSatellites;
  const categories = isServer ? useObservatoryStore.getState().satelliteCategories : storeCategories;
  const toggle = useObservatoryStore((s) => s.toggleSatelliteCategory);
  const storeGroundTrack = useObservatoryStore((s) => s.showIssGroundTrack);
  const showGroundTrack = isServer ? useObservatoryStore.getState().showIssGroundTrack : storeGroundTrack;
  const toggleGroundTrack = useObservatoryStore((s) => s.toggleIssGroundTrack);

  const count = (c: SatelliteCategory) => satellites.filter((s) => s.category === c && s.noradId !== ISS_NORAD_ID).length;

  return (
    <div data-testid="satellite-controls" className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {(["station", "visual"] as const).map((c) => (
          <Chip key={c} tone="accent" pressed={categories.includes(c)} onClick={() => toggle(c)}>
            {t(`obs.sat.${c}`, CATEGORY_LABEL[c])}
            <span className="font-mono tabular-nums text-fg-muted">{count(c)}</span>
          </Chip>
        ))}
        <Chip tone="neutral" pressed={showGroundTrack} onClick={toggleGroundTrack}>
          {t("obs.sat.groundTrack", "Rastro na superfície")}
        </Chip>
      </div>
      <p className="text-caption text-fg-muted">
        {t(
          "obs.sat.desc",
          "Posições calculadas por SGP4 a partir dos TLEs do CelesTrak, com altitude em escala real. O anel é a órbita da ISS, mais forte no trecho recém-percorrido. Passe o mouse sobre um ponto para ver o nome; clique para ver os dados. O rastro na superfície mostra por onde a ISS passou e vai passar (±45 min)."
        )}
      </p>
    </div>
  );
};
