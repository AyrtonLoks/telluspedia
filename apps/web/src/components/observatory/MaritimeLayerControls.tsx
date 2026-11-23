"use client";

import React from "react";
import { Crosshair } from "lucide-react";
import { AIS_REGIONS, vesselIsMoving } from "@/lib/ais-data";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { useI18n } from "@/lib/i18n/useT";

export function MaritimeLayerControls() {
  const { t } = useI18n();
  const { vessels } = useObservatoryStore((state) => state.ais);
  const movingOnly = useObservatoryStore((state) => state.vesselsMovingOnly);
  const setMovingOnly = useObservatoryStore((state) => state.setVesselsMovingOnly);
  const flyTo = useGlobeStore((state) => state.flyTo);
  const select = useObservatoryStore((state) => state.setSelectedEntity);
  const moving = vessels.filter(vesselIsMoving);
  const shown = movingOnly ? moving : vessels;

  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between gap-2 text-caption text-fg">
        <span>{t("obs.maritime.moving", "Em movimento")} ({moving.length})</span>
        <Switch label={t("obs.maritime.movingSwitchAria", "Mostrar somente embarcações em movimento")} checked={movingOnly} onCheckedChange={setMovingOnly} />
      </label>
      <p className="text-caption text-fg-muted">
        {t(
          "obs.maritime.desc",
          "Filtro a partir de 1 nó. A proa acompanha o rumo quando informado. Selecione um número no mapa para abrir o grupo."
        )}
      </p>
      <ul aria-label={t("obs.maritime.regionsAria", "Regiões com cobertura AIS")} className="grid grid-cols-2 gap-1">
        {AIS_REGIONS.map(({ id, name, south, north, west, east }) => {
          const region = shown.filter((vessel) => vessel.region === id);
          return (
            <li key={id} className="min-w-0">
              <Button
                variant="secondary"
                size="sm"
                className="h-auto min-h-8 w-full justify-between gap-1 px-2 py-1 text-left text-caption"
                aria-label={`${name}, ${region.length} ${t("obs.maritime.inSample", "na amostra")}`}
                onClick={() => {
                  const lat = (south + north) / 2;
                  const lng = (west + east) / 2;
                  flyTo(lat, lng, 1.5);
                  const { layerMeta } = useObservatoryStore.getState();
                  select(region.length ? {
                    type: "VESSEL_GROUP",
                    data: { title: name, lat, lng, vessels: region },
                    meta: layerMeta.MARITIME_ROUTES,
                  } : null);
                }}
              >
                <span className="leading-tight">{name}</span>
                <span className="flex shrink-0 items-center gap-1 tabular-nums text-fg-muted">
                  {region.length}
                  <Crosshair aria-hidden className="size-3" />
                </span>
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
