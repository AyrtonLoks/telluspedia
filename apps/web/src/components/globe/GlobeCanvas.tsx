"use client";

import React, { useEffect, useMemo, useState } from "react";
import { handleCanvasPointerMissed } from "@/stores/actions";
import * as THREE from "three";
import { CloudSun, Sun } from "lucide-react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EarthSphere } from "./EarthSphere";
import { Atmosphere } from "./Atmosphere";

/** Botões de alternância sobre o globo (tokens do design system — D14). */
const GLOBE_TOGGLE =
  "flex h-9 items-center gap-2 rounded-control border border-line bg-surface/86 px-3 text-label font-medium text-fg-secondary shadow-e1 backdrop-blur-md transition-colors duration-fast ease-out hover:text-fg aria-pressed:border-accent/40 aria-pressed:bg-accent/15 aria-pressed:text-fg";
import { CountryBorders } from "./CountryBorders";
import { OrbitingMoon } from "./OrbitingMoon";
import { SkyStars } from "./SkyStars";
import { CameraFlyToController } from "./CameraFlyToController";
import { Apollo11Trajectory } from "./Apollo11Trajectory";
import { Apollo11TelemetryOverlay } from "./Apollo11TelemetryOverlay";
import { HistoricalRouteTrajectory } from "./HistoricalRouteTrajectory";
import { PaleoPlatesLayer } from "./PaleoPlatesLayer";
import { NasaFirmsLayer } from "./NasaFirmsLayer";
import { NasaEonetLayer } from "./NasaEonetLayer";
import { IssOrbitLayer } from "./IssOrbitLayer";
import { AirTrafficLayer } from "./AirTrafficLayer";
import { MaritimeRoutesLayer } from "./MaritimeRoutesLayer";
import { ObservatoryTelemetryHUD } from "@/components/observatory/ObservatoryTelemetryHUD";
import { CosmicCameraController } from "./CosmicCameraController";
import { SunCore } from "./SunCore";
import { PlanetarySystem } from "./PlanetarySystem";
import { AsteroidBeltLayer } from "./AsteroidBeltLayer";
import { CometHalleyTrajectory } from "./CometHalleyTrajectory";
import { MeteorShowersLayer } from "./MeteorShowersLayer";

import { useGlobeStore, MIN_CAMERA_ALTITUDE, MAX_CAMERA_ALTITUDE } from "@/stores/globeStore";
import { calculatePlanetaryPosition } from "@/lib/astronomy-planets";

import { useTimelineStore } from "@/stores/timelineStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { useSunDirection } from "@/lib/epoch/useSunDirection";

/**
 * Primary directional sunlight synchronized with EarthSphere and OrbitingMoon via
 * the single-source-of-truth `useSunDirection()` hook (T14). Invalidates R3F on
 * every solar clock tick and when exiting Reader Mode (`frameloop="demand"`).
 */
const SolarDirectionalLight: React.FC = () => {
  const sun = useSunDirection();
  const isThrottled = useGlobeStore((s) => s.isThrottled);
  const { invalidate } = useThree();

  useEffect(() => {
    invalidate();
  }, [sun.timestamp, isThrottled, invalidate]);

  return <directionalLight position={sun.lightPosition} intensity={2.2} color="#ffffff" />;
};

export const GlobeCanvas: React.FC = () => {
  const [studyLighting, setStudyLighting] = useState(false);
  // D02: atmosfera com espalhamento (ligada por padrão; desativável).
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const isThrottled = useGlobeStore((s) => s.isThrottled);
  const selectedYear = useTimelineStore((s) => s.selectedYear);
  // Época ativa: fonte única (T12). Cenas só por seleção explícita, nunca pelo ano.
  const epoch = useEpochState();
  const isGeological = epoch.mode === "GEOLOGICAL";
  const activeScene = epoch.activeScene;
  const isContemporary = epoch.isContemporary;

  const activeObservatoryLayers = useObservatoryStore((s) => s.activeLayers);

  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);

  // Compute Earth's position in cosmic space or origin for earth mode
  const earthPosition = useMemo(() => {
    if (!isCosmicMode) return [0, 0, 0] as [number, number, number];
    const pos = calculatePlanetaryPosition("EARTH", selectedYear || new Date().getUTCFullYear()).scenePosition;
    return [pos.x, pos.y, pos.z] as [number, number, number];
  }, [isCosmicMode, selectedYear]);

  // Click-outside handler on celestial vault to deselect active selection
  const handlePointerMissed = (event: MouseEvent) => {
    if (event.button !== undefined && event.button !== 0) return;
    handleCanvasPointerMissed();
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-[#030712] overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        frameloop={isThrottled ? "demand" : "always"}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onPointerMissed={handlePointerMissed}
      >
        {/* Ambient & Directional Sun Lighting */}
        <ambientLight intensity={isCosmicMode ? 0.25 : 0.15} />
        {!isCosmicMode && <SolarDirectionalLight />}

        {/* Orbit Controls with Natural Inertia & Calibrated Damping */}
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={true}
          minDistance={MIN_CAMERA_ALTITUDE}
          maxDistance={MAX_CAMERA_ALTITUDE}
          rotateSpeed={0.65}
          zoomSpeed={0.8}
          dampingFactor={0.05}
          enableDamping={true}
        />

        {/* Earth Camera FlyTo Interpolator (Active in Earth Mode) */}
        {!isCosmicMode && <CameraFlyToController />}

        {/* Cosmic Camera Target Handover Controller (Active in Cosmic Mode) */}
        <CosmicCameraController />

        {/* Deep Space Celestial Vault (HYG 3,500+ Stars & IAU Constellations) */}
        <SkyStars />

        {/* Solar System Components (Active in Cosmic Mode) */}
        {isCosmicMode && (
          <>
            <SunCore />
            <PlanetarySystem />
            <AsteroidBeltLayer />
            <CometHalleyTrajectory />
            <MeteorShowersLayer />
          </>
        )}

        {/* Earth Core Entities Group (Positioned at Origin in Earth View, or Orbit in Cosmic View) */}
        <group position={earthPosition}>
          {/* Realistic Moon Orbit */}
          <OrbitingMoon />

          {/* 3D Earth Mesh with Shader */}
          <EarthSphere studyLighting={studyLighting} atmosphere={showAtmosphere} />
          {showAtmosphere && <Atmosphere />}

          {/* High-Resolution TopoJSON Borders */}
          <CountryBorders />

          {/* Paleogeographic Tectonic Plates & Suture Zones (Pangea) */}
          {isGeological && <PaleoPlatesLayer />}

          {/* 3D Circumnavigation Trajectory & Animated Nau Victoria */}
          {activeScene === "MAGELLAN" && <HistoricalRouteTrajectory />}

          {/* 3D Translunar Trajectory & Animated Apollo 11 Spacecraft */}
          {activeScene === "APOLLO11" && <Apollo11Trajectory />}

          {/* Camadas do Observatório Planetário (NASA & Tráfego Global) */}
          {isContemporary && activeObservatoryLayers.includes("NASA_FIRMS") && <NasaFirmsLayer />}
          {isContemporary && activeObservatoryLayers.includes("NASA_EONET") && <NasaEonetLayer />}
          {isContemporary && activeObservatoryLayers.includes("ISS_SATELLITES") && <IssOrbitLayer />}
          {isContemporary && activeObservatoryLayers.includes("FLIGHTS_OPENSKY") && <AirTrafficLayer />}
          {isContemporary && activeObservatoryLayers.includes("MARITIME_ROUTES") && <MaritimeRoutesLayer />}
        </group>
      </Canvas>

      <div className="absolute left-3 top-[4.75rem] z-10 flex items-center gap-2 sm:left-6">
        <button
          type="button"
          aria-pressed={studyLighting}
          onClick={() => setStudyLighting((enabled) => !enabled)}
          className={GLOBE_TOGGLE}
        >
          <Sun aria-hidden="true" className="size-4" />
          Iluminação de estudo
        </button>
        <button
          type="button"
          aria-pressed={showAtmosphere}
          onClick={() => setShowAtmosphere((enabled) => !enabled)}
          className={GLOBE_TOGGLE}
          title="Atmosfera com espalhamento (azul no limbo diurno, laranja no terminador)"
        >
          <CloudSun aria-hidden="true" className="size-4" />
          Atmosfera
        </button>
      </div>

      {/* Floating Apollo 11 Space Flight Telemetry HUD Overlay */}
      {activeScene === "APOLLO11" && <Apollo11TelemetryOverlay />}

      {/* Floating Planetary Observatory Telemetry HUD Overlay */}
      {isContemporary && <ObservatoryTelemetryHUD />}
    </div>
  );
};
