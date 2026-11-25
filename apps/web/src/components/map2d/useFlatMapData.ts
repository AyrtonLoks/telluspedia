"use client";

import { useEffect, useMemo, useState } from "react";
import { buildChoroplethDataset } from "@/lib/choropleth-dataset";
import {
  getBiomeTopologySync,
  loadBiomeTopology,
  type BiomeTopology,
} from "@/lib/biomes-data";
import type { BiomeId, BiomeScope } from "@/lib/biomes-types";
import {
  getContemporarySpatialIndexForLod,
  getHighResTopologySync,
  loadHighResTopology,
} from "@/lib/borders-lod";
import { PILOT_COUNTRIES, WORLD_COUNTRIES_CATALOG } from "@/lib/country-data";
import { useEpochState } from "@/lib/epoch/useEpochState";
import {
  HISTORICAL_ENTITIES,
  HISTORICAL_ERAS,
  resolveHistoricalEntity,
} from "@/lib/historical-entities";
import {
  contemporaryTopology,
  getHistoricalSpatialIndex,
  getHistoricalTopologySync,
  loadHistoricalTopology,
  type CountrySpatialIndex,
  type CountryTopology,
} from "@/lib/historical-topology";
import { formatCountryName } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/types";
import type { MapProjectionId } from "@/lib/map-projections-types";
import { findMilestoneById } from "@/lib/milestones";
import { selectCountry } from "@/stores/actions";
import { useChoroplethStore } from "@/stores/choroplethStore";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useTimelineStore } from "@/stores/timelineStore";

function addHighlight(
  isos: Set<string>,
  iso: string | null | undefined,
  effectiveYear: number | null
) {
  if (!iso) return;
  isos.add(iso);
  const historicalIso = resolveHistoricalEntity(iso, effectiveYear);
  if (historicalIso) isos.add(historicalIso);
}

export interface FlatMapBiomesState {
  scope: BiomeScope;
  topology: BiomeTopology;
  filterBiomeId: BiomeId | null;
  selectedBiomeId: BiomeId | null;
  hoveredBiomeId: BiomeId | null;
  opacity: number;
}

export function useFlatMapData(
  projectionId: MapProjectionId,
  zoom: number,
  azimuthalFollowSelected: boolean,
  locale: Locale
) {
  const selectedIso = useGlobeStore((s) => s.selectedIso);
  const hoveredIso = useGlobeStore((s) => s.hoveredIso);
  const setHighResBordersReady = useGlobeStore((s) => s.setHighResBordersReady);

  const isComparatorOpen = useComparatorStore((s) => s.isOpen);
  const comparatorIsos = useComparatorStore((s) => s.selectedIsos);
  const selectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);

  const activeChoropleth = useChoroplethStore((s) => s.activeIndicator);
  const choroplethOpacity = useChoroplethStore((s) => s.opacity);

  const activeObservatoryLayers = useObservatoryStore((s) => s.activeLayers);
  const firmsByCountry = useObservatoryStore((s) => s.firmsByCountry);
  const biomeScope = useObservatoryStore((s) => s.biomeScope);
  const biomeFilterId = useObservatoryStore((s) => s.biomeFilterId);
  const selectedBiomeId = useObservatoryStore((s) => s.selectedBiomeId);
  const hoveredBiomeId = useObservatoryStore((s) => s.hoveredBiomeId);
  const biomeOpacity = useObservatoryStore((s) => s.layerOpacity.BIOMES_MAP ?? 0.85);
  const isBiomesActive = activeObservatoryLayers.includes("BIOMES_MAP");

  const epoch = useEpochState();
  const isGeological = epoch.mode === "GEOLOGICAL";
  const effectiveYear = epoch.effectiveYear;
  const era = HISTORICAL_ERAS[epoch.historicalEraId];
  const isHistorical = era.id !== "CONTEMPORARY" && !isGeological;

  // Carregamento sob demanda da topologia histórica quando fora da era contemporânea
  const [historicalTopology, setHistoricalTopology] = useState<CountryTopology | null>(() =>
    isHistorical && era.topoJsonPath ? getHistoricalTopologySync(era.topoJsonPath) : null
  );
  useEffect(() => {
    if (!isHistorical || !era.topoJsonPath) {
      setHistoricalTopology(null);
      return;
    }
    const cached = getHistoricalTopologySync(era.topoJsonPath);
    if (cached) {
      setHistoricalTopology(cached);
      return;
    }
    let alive = true;
    void loadHistoricalTopology(era.topoJsonPath).then((topo) => {
      if (alive && topo) setHistoricalTopology(topo);
    });
    return () => {
      alive = false;
    };
  }, [isHistorical, era.topoJsonPath]);

  // Upgrade progressivo Natural Earth 1:50m ao dar zoom no mapa 2D (reuso direto de T49)
  const [highResTopology, setHighResTopology] = useState<CountryTopology | null>(() =>
    getHighResTopologySync()
  );
  useEffect(() => {
    if (isHistorical || isGeological || zoom < 2.2 || highResTopology) return;
    const cached = getHighResTopologySync();
    if (cached) {
      setHighResTopology(cached);
      setHighResBordersReady(true);
      return;
    }
    let alive = true;
    void loadHighResTopology().then((loaded) => {
      if (alive && loaded) {
        setHighResTopology(loaded);
        setHighResBordersReady(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [isHistorical, isGeological, zoom, highResTopology, setHighResBordersReady]);

  // Carregamento sob demanda da topologia oficial de biomas quando BIOMES_MAP está ativa
  const [biomeTopology, setBiomeTopology] = useState<BiomeTopology | null>(() =>
    isBiomesActive ? getBiomeTopologySync(biomeScope) : null
  );
  useEffect(() => {
    if (!isBiomesActive || isHistorical || isGeological) return;
    const cached = getBiomeTopologySync(biomeScope);
    if (cached) {
      setBiomeTopology(cached);
      return;
    }
    let alive = true;
    void loadBiomeTopology(biomeScope).then((loaded) => {
      if (alive && loaded) setBiomeTopology(loaded);
    });
    return () => {
      alive = false;
    };
  }, [isBiomesActive, biomeScope, isHistorical, isGeological]);

  // Continuidade histórica ao mudar o ano na Timeline estando em modo 2D
  useEffect(() => {
    const currentIso = useGlobeStore.getState().selectedIso;
    if (!currentIso) return;
    const resolved = resolveHistoricalEntity(currentIso, effectiveYear);
    if (resolved && resolved !== currentIso) {
      selectCountry(resolved);
    }
  }, [effectiveYear]);

  const activeTopology = useMemo(() => {
    if (isHistorical && historicalTopology) return historicalTopology;
    if (zoom >= 2.2 && highResTopology) return highResTopology;
    return contemporaryTopology;
  }, [isHistorical, historicalTopology, zoom, highResTopology]);

  const activeSpatialIndex = useMemo<CountrySpatialIndex | null>(() => {
    if (isHistorical && historicalTopology) {
      return getHistoricalSpatialIndex(era.id, historicalTopology);
    }
    return getContemporarySpatialIndexForLod(zoom >= 2.2 && highResTopology ? "50m" : "110m");
  }, [isHistorical, era.id, historicalTopology, zoom, highResTopology]);

  const choroplethDataset = useMemo(() => {
    if (!activeChoropleth || isHistorical || isGeological) return null;
    return buildChoroplethDataset(
      activeChoropleth,
      activeChoropleth === "NASA_FIRMS" ? firmsByCountry : undefined
    );
  }, [activeChoropleth, isHistorical, isGeological, firmsByCountry]);

  const selectedCenter = useMemo<{ label: string; center: readonly [number, number] } | null>(() => {
    if (!selectedIso) return null;
    const hist = HISTORICAL_ENTITIES[selectedIso];
    if (hist) return { label: hist.nameCommon, center: [hist.longitude, hist.latitude] };
    const data = WORLD_COUNTRIES_CATALOG[selectedIso] ?? PILOT_COUNTRIES[selectedIso];
    if (!data || data.longitude === null || data.latitude === null) return null;
    return {
      label: formatCountryName(data.iso2, data.nameCommon, locale),
      center: [data.longitude, data.latitude] as const,
    };
  }, [selectedIso, locale]);

  const azimuthalCenter = useMemo<readonly [number, number] | null>(() => {
    if (projectionId !== "azimuthal") return null;
    if (azimuthalFollowSelected && selectedCenter) return selectedCenter.center;
    return [0, 0];
  }, [projectionId, azimuthalFollowSelected, selectedCenter]);

  const selectedSet = useMemo(() => {
    const isos = new Set<string>();
    addHighlight(isos, selectedIso, effectiveYear);
    return isos;
  }, [selectedIso, effectiveYear]);

  const hoveredSet = useMemo(() => {
    const isos = new Set<string>();
    addHighlight(isos, hoveredIso, effectiveYear);
    for (const iso of selectedSet) isos.delete(iso);
    return isos;
  }, [hoveredIso, effectiveYear, selectedSet]);

  const relatedSet = useMemo(() => {
    const isos = new Set<string>();
    if (isComparatorOpen) {
      for (const iso of comparatorIsos) addHighlight(isos, iso, effectiveYear);
    }
    const milestone = selectedMilestoneId ? findMilestoneById(selectedMilestoneId) : null;
    addHighlight(isos, milestone?.countryIso, effectiveYear);
    for (const iso of milestone?.blocIsos ?? []) addHighlight(isos, iso, effectiveYear);
    for (const iso of selectedSet) isos.delete(iso);
    return isos;
  }, [isComparatorOpen, comparatorIsos, selectedMilestoneId, effectiveYear, selectedSet]);

  const biomesRenderData = useMemo<FlatMapBiomesState | null>(() => {
    if (!isBiomesActive || !biomeTopology || isHistorical || isGeological) return null;
    return {
      scope: biomeScope,
      topology: biomeTopology,
      filterBiomeId: biomeFilterId,
      selectedBiomeId,
      hoveredBiomeId,
      opacity: biomeOpacity,
    };
  }, [
    isBiomesActive,
    biomeTopology,
    isHistorical,
    isGeological,
    biomeScope,
    biomeFilterId,
    selectedBiomeId,
    hoveredBiomeId,
    biomeOpacity,
  ]);

  return {
    activeTopology,
    activeSpatialIndex,
    isHistorical,
    isGeological,
    effectiveYear,
    activeChoropleth,
    choroplethDataset,
    choroplethOpacity,
    isBiomesActive,
    biomesRenderData,
    selectedCenter,
    azimuthalCenter,
    selectedSet,
    hoveredSet,
    relatedSet,
  };
}
