"use client";

import React, { useEffect, useState } from "react";
import { Crosshair, ExternalLink, Network } from "lucide-react";
import { getSubmarineCablesSync, loadSubmarineCables } from "@/lib/submarine-cables-data";
import {
  CABLE_BASIN_FILTERS,
  type CableBasinFilter,
  type SubmarineCablesDataset,
} from "@/lib/submarine-cables-types";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Switch } from "@/components/ui/Switch";
import { useI18n } from "@/lib/i18n/useT";

export const SubmarineCablesControls: React.FC = () => {
  const { locale, t } = useI18n();
  const basinFilter = useObservatoryStore((s) => s.cableBasinFilter);
  const showChokePoints = useObservatoryStore((s) => s.showCableChokePoints);
  const setCableBasinFilter = useObservatoryStore((s) => s.setCableBasinFilter);
  const setShowCableChokePoints = useObservatoryStore((s) => s.setShowCableChokePoints);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);
  const flyTo = useGlobeStore((s) => s.flyTo);

  const [dataset, setDataset] = useState<SubmarineCablesDataset | null>(() =>
    getSubmarineCablesSync()
  );

  useEffect(() => {
    const sync = getSubmarineCablesSync();
    if (sync) {
      setDataset(sync);
      return;
    }
    let alive = true;
    void loadSubmarineCables().then((loaded) => {
      if (alive && loaded) setDataset(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  const basinLabels: Record<CableBasinFilter, string> = {
    all: t("obs.cables.basin.all", "Todos"),
    atlantic: t("obs.cables.basin.atlantic", "Atlântico"),
    pacific: t("obs.cables.basin.pacific", "Pacífico"),
    "indo-eurasian": t("obs.cables.basin.indoEurasian", "Indo-Eurásia"),
    "afro-eurasian": t("obs.cables.basin.afroEurasian", "Afro-Eurásia"),
  };

  const cables = dataset
    ? basinFilter === "all"
      ? dataset.cables
      : dataset.cables.filter((c) => c.basin === basinFilter)
    : [];
  const highestCapCable = [...cables].sort(
    (a, b) => b.designCapacityTbps - a.designCapacityTbps
  )[0];

  return (
    <div data-testid="submarine-cables-controls" className="space-y-3">
      <div className="space-y-1.5">
        <span className="text-caption font-medium text-fg">
          {t("obs.cables.basinHeading", "Bacia oceânica")}
        </span>
        <div role="group" data-testid="cables-basin-group" className="flex flex-wrap gap-1.5">
          {CABLE_BASIN_FILTERS.map((id) => (
            <Chip
              key={id}
              data-testid={`cables-basin-${id}`}
              pressed={basinFilter === id}
              onClick={() => setCableBasinFilter(id)}
            >
              {basinLabels[id]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-control border border-line bg-surface p-2">
        <span className="text-caption font-medium text-fg">
          {t("obs.cables.chokeToggle", "Gargalos geopolíticos estratégicos")}
        </span>
        <Switch
          data-testid="cables-choke-switch"
          checked={showChokePoints}
          label={t("obs.cables.chokeToggle", "Gargalos geopolíticos estratégicos")}
          onCheckedChange={setShowCableChokePoints}
        />
      </div>

      {highestCapCable && (
        <Button
          variant="secondary"
          size="sm"
          data-testid="cables-focus-highest"
          className="w-full justify-between"
          onClick={() => {
            setSelectedEntity({ type: "SUBMARINE_CABLE", data: highestCapCable });
            const first = highestCapCable.landingPoints[0];
            if (first) flyTo(first.lat, first.lng, 2.1);
          }}
        >
          <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
            <Network aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" />
            <span className="truncate">{highestCapCable.name}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 font-mono tabular-nums text-accent">
            <span>{highestCapCable.designCapacityTbps} Tbps</span>
            <Crosshair aria-hidden="true" className="h-3.5 w-3.5" />
          </span>
        </Button>
      )}

      {showChokePoints && dataset && dataset.chokePoints.length > 0 && (
        <div className="space-y-1">
          <span className="text-caption text-fg-muted">
            {t("obs.cables.chokeShortcuts", "Inspecionar gargalo estratégico:")}
          </span>
          <div className="flex flex-wrap gap-1">
            {dataset.chokePoints.slice(0, 4).map((cp) => (
              <button
                key={cp.id}
                type="button"
                data-testid={`cables-choke-${cp.id}`}
                onClick={() => {
                  setSelectedEntity({ type: "CABLE_CHOKE_POINT", data: cp });
                  flyTo(cp.lat, cp.lng, 1.9);
                }}
                className="rounded-control border border-line bg-surface px-2 py-0.5 text-caption text-fg-secondary transition-colors duration-fast ease-out hover:border-line-strong hover:text-fg"
              >
                {locale === "en" ? cp.nameEn : cp.namePt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line pt-2 text-caption text-fg-muted">
        <span>TeleGeography (CC BY-SA 4.0)</span>
        <a
          href="https://www.submarinecablemap.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-accent hover:text-accent-hover hover:underline"
        >
          <span>Submarine Cable Map</span>
          <ExternalLink aria-hidden="true" className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
};
