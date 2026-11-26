"use client";

import React, { Suspense, lazy } from "react";
import type { ObservatoryLayer } from "@/lib/observatory-data";
import type { CriticalGeoLensId } from "@/lib/critical-geo-ids";
import { AirTrafficLayer } from "./AirTrafficLayer";
import { MaritimeRoutesLayer } from "./MaritimeRoutesLayer";
import { NasaEonetLayer } from "./NasaEonetLayer";
import { NasaFirmsLayer } from "./NasaFirmsLayer";

const WindParticlesLayer = lazy(() =>
  import("./WindParticlesLayer").then((m) => ({ default: m.WindParticlesLayer }))
);
const MarineDebrisLayer = lazy(() =>
  import("./MarineDebrisLayer").then((m) => ({ default: m.MarineDebrisLayer }))
);
const InpeDeforestationLayer = lazy(() =>
  import("./InpeDeforestationLayer").then((m) => ({ default: m.InpeDeforestationLayer }))
);
const BiomesLayer = lazy(() =>
  import("./BiomesLayer").then((m) => ({ default: m.BiomesLayer }))
);
const SpeciesLayer = lazy(() =>
  import("./SpeciesLayer").then((m) => ({ default: m.SpeciesLayer }))
);
const SeismicTectonicLayer = lazy(() =>
  import("./SeismicTectonicLayer").then((m) => ({ default: m.SeismicTectonicLayer }))
);
const SubmarineCablesLayer = lazy(() =>
  import("./SubmarineCablesLayer").then((m) => ({ default: m.SubmarineCablesLayer }))
);
const AirQualityLayer = lazy(() =>
  import("./AirQualityLayer").then((m) => ({ default: m.AirQualityLayer }))
);
const CriticalGeoLayer = lazy(() =>
  import("./CriticalGeoLayer").then((m) => ({ default: m.CriticalGeoLayer }))
);
const GeodesicRulerLayer = lazy(() =>
  import("./GeodesicRulerLayer").then((m) => ({ default: m.GeodesicRulerLayer }))
);
const StudyAnnotationsLayer = lazy(() =>
  import("./StudyAnnotationsLayer").then((m) => ({ default: m.StudyAnnotationsLayer }))
);

export interface GlobeObservatoryLayersProps {
  isContemporary: boolean;
  isCosmicMode: boolean;
  activeObservatoryLayers: readonly ObservatoryLayer[];
  activeCriticalLens: CriticalGeoLensId | null;
  hasRulerPoints: boolean;
  annotationsCount: number;
  hasPendingPin: boolean;
}

/** Subárvore de camadas temáticas, ambientais e de estúdio em torno da Terra (extraída de GlobeCanvas para respeitar T45). */
export const GlobeObservatoryLayers: React.FC<GlobeObservatoryLayersProps> = ({
  isContemporary,
  isCosmicMode,
  activeObservatoryLayers,
  activeCriticalLens,
  hasRulerPoints,
  annotationsCount,
  hasPendingPin,
}) => (
  <>
    {isContemporary && activeObservatoryLayers.includes("NASA_FIRMS") && <NasaFirmsLayer />}
    {isContemporary && activeObservatoryLayers.includes("NASA_EONET") && <NasaEonetLayer />}
    {isContemporary && activeObservatoryLayers.includes("FLIGHTS_OPENSKY") && <AirTrafficLayer />}
    {isContemporary && activeObservatoryLayers.includes("MARITIME_ROUTES") && <MaritimeRoutesLayer />}
    {isContemporary && activeObservatoryLayers.includes("GLOBAL_WINDS") && (
      <Suspense fallback={null}>
        <WindParticlesLayer />
      </Suspense>
    )}
    {isContemporary && activeObservatoryLayers.includes("MARINE_DEBRIS") && (
      <Suspense fallback={null}>
        <MarineDebrisLayer />
      </Suspense>
    )}
    {isContemporary && activeObservatoryLayers.includes("INPE_DEFORESTATION") && (
      <Suspense fallback={null}>
        <InpeDeforestationLayer />
      </Suspense>
    )}
    {isContemporary && activeObservatoryLayers.includes("BIOMES_MAP") && (
      <Suspense fallback={null}>
        <BiomesLayer />
      </Suspense>
    )}
    {isContemporary && activeObservatoryLayers.includes("SPECIES_MAP") && (
      <Suspense fallback={null}>
        <SpeciesLayer />
      </Suspense>
    )}
    {isContemporary && activeObservatoryLayers.includes("USGS_EARTHQUAKES") && (
      <Suspense fallback={null}>
        <SeismicTectonicLayer />
      </Suspense>
    )}
    {isContemporary && activeObservatoryLayers.includes("SUBMARINE_CABLES") && (
      <Suspense fallback={null}>
        <SubmarineCablesLayer />
      </Suspense>
    )}
    {isContemporary && activeObservatoryLayers.includes("AIR_QUALITY") && (
      <Suspense fallback={null}>
        <AirQualityLayer />
      </Suspense>
    )}
    {isContemporary && activeCriticalLens !== null && (
      <Suspense fallback={null}>
        <CriticalGeoLayer />
      </Suspense>
    )}
    {!isCosmicMode && hasRulerPoints && (
      <Suspense fallback={null}>
        <GeodesicRulerLayer />
      </Suspense>
    )}
    {!isCosmicMode && (annotationsCount > 0 || hasPendingPin) && (
      <Suspense fallback={null}>
        <StudyAnnotationsLayer />
      </Suspense>
    )}
  </>
);
