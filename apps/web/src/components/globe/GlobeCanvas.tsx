"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { handleCanvasPointerMissed } from "@/stores/actions";
import * as THREE from "three";
import { Cloud, CloudSun, Sun } from "lucide-react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EarthSphere } from "./EarthSphere";
import { EarthOrientationGroup } from "./EarthOrientationGroup";
import { Atmosphere } from "./Atmosphere";
import { CloudLayer } from "./CloudLayer";
import { CelestialLabelManager } from "./CelestialLabel";
import { SolarSystemFrame } from "./SolarSystemFrame";
import { useSolarSystemVisible } from "@/stores/cosmicExitStore";
import { earthSystemScale } from "@/lib/cosmic-scale";

/** Botões de alternância sobre o globo (tokens do design system — D14). */
const GLOBE_TOGGLE =
  "flex h-9 items-center gap-2 rounded-control border border-line bg-surface/86 px-3 text-label font-medium text-fg-secondary shadow-e1 backdrop-blur-md transition-colors duration-fast ease-out hover:text-fg aria-pressed:border-accent/40 aria-pressed:bg-accent/15 aria-pressed:text-fg disabled:cursor-not-allowed disabled:opacity-50";
import { CountryBorders } from "./CountryBorders";
import { OrbitingMoon } from "./OrbitingMoon";
import { SkyStars } from "./SkyStars";
import { CameraFlyToController } from "./CameraFlyToController";
import { GlobeKeyboardControls } from "./GlobeKeyboardControls";
import { CameraUrlBridge } from "./CameraUrlBridge";
import type { ViewCamera } from "@/lib/explore/view-camera";
import { ScenePlayer } from "@/components/scenes/ScenePlayer";
import { getScene } from "@/lib/scenes/catalog";
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

export const GlobeCanvas: React.FC<{ viewCamera: ViewCamera }> = ({ viewCamera }) => {
  const lastEarthFlight = useRef(0);
  const viewport = useRef<HTMLDivElement>(null);
  const instructions = useId();
  const [studyLighting, setStudyLighting] = useState(false);
  // D02: atmosfera com espalhamento (ligada por padrão; desativável).
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  // D02: nuvens reais (MODIS/NASA), ligadas por padrão; somem no modo geológico.
  const [showClouds, setShowClouds] = useState(true);
  const isThrottled = useGlobeStore((s) => s.isThrottled);
  const selectedYear = useTimelineStore((s) => s.selectedYear);
  // Época ativa: fonte única (T12). Cenas só por seleção explícita, nunca pelo ano.
  const epoch = useEpochState();
  const isGeological = epoch.mode === "GEOLOGICAL";
  const activeScene = epoch.activeScene;
  // D12d: a época já traz o id da cena ativa (dados em src/data/scenes/).
  const activeSceneData = activeScene ? getScene(activeScene) : undefined;
  const isContemporary = epoch.isContemporary;

  const activeObservatoryLayers = useObservatoryStore((s) => s.activeLayers);

  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const cosmicScaleMode = useCosmicStore((s) => s.scaleMode);
  // D11: no modo Cosmos o grupo Terra + Lua segue a política única de escala.
  const earthGroupScale = isCosmicMode ? earthSystemScale(cosmicScaleMode) : 1;
  const solarSystemVisible = useSolarSystemVisible();

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
    <div
      ref={viewport}
      role="region"
      aria-label={isCosmicMode ? "Mapa do Sistema Solar" : "Globo interativo"}
      aria-describedby={instructions}
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight /"
      data-globe-keyboard=""
      tabIndex={0}
      className="absolute inset-0 h-full w-full overflow-hidden bg-bg focus-visible:outline-none focus-visible:after:pointer-events-none focus-visible:after:absolute focus-visible:after:inset-1 focus-visible:after:z-10 focus-visible:after:rounded-control focus-visible:after:border-2 focus-visible:after:border-accent"
    >
      <p id={instructions} className="sr-only">Use as setas para girar, mais e menos para ajustar o zoom e barra para abrir a busca.</p>
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
        {!isCosmicMode && <CameraFlyToController lastRequest={lastEarthFlight} />}

        {/* Cosmic Camera Target Handover Controller (Active in Cosmic Mode) */}
        <CosmicCameraController />
        <CameraUrlBridge view={viewCamera} />
        <GlobeKeyboardControls viewport={viewport} />

        {/* Deep Space Celestial Vault (HYG 3,500+ Stars & IAU Constellations) */}
        <SkyStars />

        {/* Sistema solar: no Cosmos e, esmaecendo, durante a descida de volta à Terra (D17) */}
        {solarSystemVisible && (
          <SolarSystemFrame>
            <SunCore />
            <PlanetarySystem />
            <AsteroidBeltLayer />
            <CometHalleyTrajectory />
            <MeteorShowersLayer />
          </SolarSystemFrame>
        )}
        {isCosmicMode && <CelestialLabelManager />}

        {/* Earth Core Entities Group (Positioned at Origin in Earth View, or Orbit in Cosmic View) */}
        <group position={earthPosition} scale={earthGroupScale}>
          {/* Referencial fixo da Terra → eclíptica no Cosmos: eixo inclinado e lado dia voltado ao Sol (D21) */}
          <EarthOrientationGroup cosmic={isCosmicMode} earthPosition={earthPosition}>
            {/* Realistic Moon Orbit */}
            <OrbitingMoon />

            {/* 3D Earth Mesh with Shader */}
            <EarthSphere studyLighting={studyLighting} atmosphere={showAtmosphere} />
            <CloudLayer enabled={showClouds} geological={isGeological} studyLighting={studyLighting} />
            {showAtmosphere && <Atmosphere />}

            {/* High-Resolution TopoJSON Borders */}
            <CountryBorders />

            {/* Paleogeographic Tectonic Plates & Suture Zones (Pangea) */}
            {isGeological && <PaleoPlatesLayer />}

            {/* Player genérico de cenas (trajetórias de Magalhães, Apollo 11 e qualquer cena com dados) */}
            {activeSceneData && <ScenePlayer scene={activeSceneData} />}

            {/* Camadas do Observatório Planetário (NASA & Tráfego Global) */}
            {isContemporary && activeObservatoryLayers.includes("NASA_FIRMS") && <NasaFirmsLayer />}
            {isContemporary && activeObservatoryLayers.includes("NASA_EONET") && <NasaEonetLayer />}
            {isContemporary && activeObservatoryLayers.includes("ISS_SATELLITES") && <IssOrbitLayer />}
            {isContemporary && activeObservatoryLayers.includes("FLIGHTS_OPENSKY") && <AirTrafficLayer />}
            {isContemporary && activeObservatoryLayers.includes("MARITIME_ROUTES") && <MaritimeRoutesLayer />}
          </EarthOrientationGroup>
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
        <button
          type="button"
          aria-pressed={showClouds}
          onClick={() => setShowClouds((enabled) => !enabled)}
          className={GLOBE_TOGGLE}
          disabled={isGeological}
          title={isGeological ? "Nuvens indisponíveis no modo geológico" : "Nuvens reais (composição MODIS/Terra da NASA; imagem estática, não a previsão do tempo)"}
        >
          <Cloud aria-hidden="true" className="size-4" />
          Nuvens
        </button>
      </div>

      {/* Floating Planetary Observatory Telemetry HUD Overlay */}
      {isContemporary && <ObservatoryTelemetryHUD />}
    </div>
  );
};
