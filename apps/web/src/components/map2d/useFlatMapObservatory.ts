"use client";

import { useEffect, useMemo, useState } from "react";
import { getBiomeTopologySync, loadBiomeTopology, type BiomeTopology } from "@/lib/biomes-data";
import { getContemporarySpatialIndex } from "@/lib/historical-topology";
import { simulateDriftTrajectories } from "@/lib/marine-debris-data";
import type { GibsImagePixels, Observatory2dRenderState } from "@/lib/map-2d-observatory";
import type { SatelliteSnapshot } from "@/lib/observatory-data";
import { ISS_NORAD_ID } from "@/lib/satellite-catalog";
import { filterSpeciesCatalog } from "@/lib/species-catalog";
import { getTectonicPlatesSync, loadTectonicPlates } from "@/lib/seismic-data";
import type { TectonicPlatesCollection } from "@/lib/seismic-types";
import { getSubmarineCablesSync, loadSubmarineCables } from "@/lib/submarine-cables-data";
import type { SubmarineCablesDataset } from "@/lib/submarine-cables-types";
import { loadSatelliteLib, useObservatoryStore } from "@/stores/observatoryStore";
import { speciesCacheKey, useSpeciesStore } from "@/stores/speciesStore";

const GIBS_SAMPLE_WIDTH = 512;
const GIBS_SAMPLE_HEIGHT = 256;

/**
 * Conecta o Modo 2D a todas as 11 camadas do Observatório Planetário (`useObservatoryStore`
 * + `useSpeciesStore`), garantindo carga sob demanda da imagem NASA GIBS, dos biomas IBGE
 * para o mapa de calor INPE, da propagação SGP4 de satélites e das trajetórias Lagrangianas.
 */
export function useFlatMapObservatory(enabled: boolean): Observatory2dRenderState {
  const activeLayers = useObservatoryStore((s) => s.activeLayers);
  const layerOpacity = useObservatoryStore((s) => s.layerOpacity);
  const layerMeta = useObservatoryStore((s) => s.layerMeta);
  const gibs = useObservatoryStore((s) => s.gibs);
  const firmsHotspots = useObservatoryStore((s) => s.firmsHotspots);
  const eonetEvents = useObservatoryStore((s) => s.eonetEvents);
  const eonetCategory = useObservatoryStore((s) => s.eonetCategory);
  const issTelemetry = useObservatoryStore((s) => s.issTelemetry);
  const showIssGroundTrack = useObservatoryStore((s) => s.showIssGroundTrack);
  const satellites = useObservatoryStore((s) => s.satellites);
  const satelliteCategories = useObservatoryStore((s) => s.satelliteCategories);
  const aircraftFleet = useObservatoryStore((s) => s.aircraftFleet);
  const maritimeRoutes = useObservatoryStore((s) => s.maritimeRoutes);
  const aisVessels = useObservatoryStore((s) => s.ais.vessels);
  const vesselsMovingOnly = useObservatoryStore((s) => s.vesselsMovingOnly);
  const flowMode = useObservatoryStore((s) => s.flowMode);
  const winds = useObservatoryStore((s) => s.winds);
  const windAltitude = useObservatoryStore((s) => s.windAltitude);
  const currents = useObservatoryStore((s) => s.currents);
  const selectedGyreId = useObservatoryStore((s) => s.selectedGyreId);
  const marineDebrisReleasePoint = useObservatoryStore((s) => s.marineDebrisReleasePoint);
  const marineDebrisWindage = useObservatoryStore((s) => s.marineDebrisWindage);
  const marineDebrisHorizonMonths = useObservatoryStore((s) => s.marineDebrisHorizonMonths);
  const prodesBiome = useObservatoryStore((s) => s.prodesBiome);
  const inpeDeforestation = useObservatoryStore((s) => s.inpeDeforestation);
  const earthquakes = useObservatoryStore((s) => s.earthquakes);
  const showTectonicPlates = useObservatoryStore((s) => s.showTectonicPlates);
  const cableBasinFilter = useObservatoryStore((s) => s.cableBasinFilter);
  const showCableChokePoints = useObservatoryStore((s) => s.showCableChokePoints);
  const airQualityStations = useObservatoryStore((s) => s.airQualityStations);
  const aqiScaleMode = useObservatoryStore((s) => s.aqiScaleMode);

  const selectedSpeciesId = useSpeciesStore((s) => s.selectedSpeciesId);
  const hoveredSpeciesId = useSpeciesStore((s) => s.hoveredSpeciesId);
  const taxonFilter = useSpeciesStore((s) => s.taxonFilter);
  const iucnFilter = useSpeciesStore((s) => s.iucnFilter);
  const biomeFilter = useSpeciesStore((s) => s.biomeFilter);
  const countryFilter = useSpeciesStore((s) => s.countryFilter);
  const occurrencesByKey = useSpeciesStore((s) => s.occurrencesByKey);

  const isGibsActive = enabled && activeLayers.includes("NASA_GIBS");
  const isIssActive = enabled && activeLayers.includes("ISS_SATELLITES");
  const isInpeDeforestActive = enabled && activeLayers.includes("INPE_DEFORESTATION");
  const isDebrisActive = enabled && activeLayers.includes("MARINE_DEBRIS");
  const isPlates2dActive = enabled && activeLayers.includes("USGS_EARTHQUAKES") && showTectonicPlates;
  const isCables2dActive = enabled && activeLayers.includes("SUBMARINE_CABLES");

  // 1. Amostra equiretangular em memória da imagem NASA GIBS ativa para reprojeção 2D
  const [gibsPixels, setGibsPixels] = useState<GibsImagePixels | null>(null);
  const gibsUrl = isGibsActive ? (gibs?.imageUrl ?? null) : null;
  useEffect(() => {
    if (!gibsUrl || typeof Image === "undefined" || typeof document === "undefined") {
      setGibsPixels(null);
      return;
    }
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!alive) return;
      try {
        const off = document.createElement("canvas");
        off.width = GIBS_SAMPLE_WIDTH;
        off.height = GIBS_SAMPLE_HEIGHT;
        const octx = off.getContext("2d");
        if (!octx) return;
        octx.drawImage(img, 0, 0, GIBS_SAMPLE_WIDTH, GIBS_SAMPLE_HEIGHT);
        const imgData = octx.getImageData(0, 0, GIBS_SAMPLE_WIDTH, GIBS_SAMPLE_HEIGHT);
        setGibsPixels({
          url: gibsUrl,
          width: GIBS_SAMPLE_WIDTH,
          height: GIBS_SAMPLE_HEIGHT,
          data: imgData.data,
        });
      } catch {
        setGibsPixels(null);
      }
    };
    img.onerror = () => {
      if (alive) setGibsPixels(null);
    };
    img.src = gibsUrl;
    return () => {
      alive = false;
    };
  }, [gibsUrl]);

  // 2. Contorno dos 6 biomas IBGE para a camada INPE Desmatamento
  const [brazilBiomesTopology, setBrazilBiomesTopology] = useState<BiomeTopology | null>(() =>
    isInpeDeforestActive ? getBiomeTopologySync("brazil") : null
  );
  useEffect(() => {
    if (!isInpeDeforestActive) return;
    const cached = getBiomeTopologySync("brazil");
    if (cached) {
      setBrazilBiomesTopology(cached);
      return;
    }
    let alive = true;
    void loadBiomeTopology("brazil").then((topo) => {
      if (alive && topo) setBrazilBiomesTopology(topo);
    });
    return () => {
      alive = false;
    };
  }, [isInpeDeforestActive]);

  const [tectonicPlates, setTectonicPlates] = useState<TectonicPlatesCollection | null>(() =>
    isPlates2dActive ? getTectonicPlatesSync() : null
  );
  useEffect(() => {
    if (!isPlates2dActive) return;
    const cached = getTectonicPlatesSync();
    if (cached) {
      setTectonicPlates(cached);
      return;
    }
    let alive = true;
    void loadTectonicPlates().then((loaded) => {
      if (alive && loaded) setTectonicPlates(loaded);
    });
    return () => {
      alive = false;
    };
  }, [isPlates2dActive]);

  const [cablesDataset, setCablesDataset] = useState<SubmarineCablesDataset | null>(() =>
    isCables2dActive ? getSubmarineCablesSync() : null
  );
  useEffect(() => {
    if (!isCables2dActive) return;
    const cached = getSubmarineCablesSync();
    if (cached) {
      setCablesDataset(cached);
      return;
    }
    let alive = true;
    void loadSubmarineCables().then((loaded) => {
      if (alive && loaded) setCablesDataset(loaded);
    });
    return () => {
      alive = false;
    };
  }, [isCables2dActive]);

  // 3. Propagação periódica leve (2s) da ISS e satélites artificiais no Modo 2D
  const [satelliteSnapshots, setSatelliteSnapshots] = useState<SatelliteSnapshot[]>([]);
  useEffect(() => {
    if (!isIssActive) {
      setSatelliteSnapshots([]);
      return;
    }
    let alive = true;
    const refresh = async () => {
      try {
        const lib = await loadSatelliteLib();
        if (!alive) return;
        const now = Date.now();
        useObservatoryStore.getState().refreshIssTelemetry(now);
        const allowed = new Set(satelliteCategories);
        const next: SatelliteSnapshot[] = [];
        for (const tle of satellites) {
          if (tle.noradId === ISS_NORAD_ID || !allowed.has(tle.category)) continue;
          const rec = lib.toSatrec(tle);
          if (!rec) continue;
          const state = lib.propagateState(rec, new Date(now));
          if (!state) continue;
          next.push({
            name: tle.name,
            noradId: tle.noradId,
            category: tle.category,
            lat: state.lat,
            lng: state.lng,
            altKm: state.altKm,
            velocityKmh: state.velocityKmh,
            tleEpoch: tle.epoch,
            timestamp: now,
          });
        }
        if (alive) setSatelliteSnapshots(next);
      } catch {
        // Ignora falha silenciosa de propagação SGP4
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 2500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [isIssActive, satellites, satelliteCategories]);

  // 4. Trajetória Lagrangiana de lixo marítimo
  const driftSimulation = useMemo(() => {
    if (!isDebrisActive || !marineDebrisReleasePoint) return null;
    return simulateDriftTrajectories({
      origin: marineDebrisReleasePoint,
      currents,
      surfaceWind: winds?.surface ?? null,
      windage: marineDebrisWindage,
      horizonMonths: marineDebrisHorizonMonths,
      spatialIndex: getContemporarySpatialIndex(),
    });
  }, [
    isDebrisActive,
    marineDebrisReleasePoint,
    currents,
    winds,
    marineDebrisWindage,
    marineDebrisHorizonMonths,
  ]);

  // 5. Espécies filtradas e ocorrências GBIF
  const speciesEntries = useMemo(
    () =>
      filterSpeciesCatalog({
        taxonGroup: taxonFilter,
        iucnStatus: iucnFilter,
        biomeId: biomeFilter,
        countryIso3: countryFilter,
      }),
    [taxonFilter, iucnFilter, biomeFilter, countryFilter]
  );

  const selectedSpeciesOccurrences = useMemo(() => {
    if (!selectedSpeciesId) return [];
    const payload = occurrencesByKey[speciesCacheKey(selectedSpeciesId, null)];
    return payload?.points ?? [];
  }, [selectedSpeciesId, occurrencesByKey]);

  return {
    activeLayers: enabled ? activeLayers : [],
    layerOpacity,
    layerMeta,
    gibsPixels,
    firmsHotspots,
    eonetEvents,
    eonetCategory,
    issTelemetry,
    showIssGroundTrack,
    satelliteSnapshots,
    aircraftFleet,
    maritimeRoutes,
    aisVessels,
    vesselsMovingOnly,
    flowMode,
    winds,
    windAltitude,
    currents,
    selectedGyreId,
    driftSimulation,
    prodesBiome,
    deterAlerts: inpeDeforestation?.deterAlerts ?? [],
    brazilBiomesTopology,
    speciesEntries,
    selectedSpeciesId,
    hoveredSpeciesId,
    selectedSpeciesOccurrences,
    seismicEvents: earthquakes?.events ?? [],
    showTectonicPlates,
    tectonicPlates,
    submarineCables: cablesDataset
      ? cableBasinFilter === "all"
        ? cablesDataset.cables
        : cablesDataset.cables.filter((c) => c.basin === cableBasinFilter)
      : [],
    cableChokePoints: showCableChokePoints && cablesDataset ? cablesDataset.chokePoints : [],
    airQualityStations: airQualityStations?.stations ?? [],
    aqiScaleMode,
  };
}
