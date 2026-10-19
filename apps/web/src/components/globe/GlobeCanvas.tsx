"use client";

import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EarthSphere } from "./EarthSphere";
import { CountryBorders } from "./CountryBorders";
import { OrbitingMoon } from "./OrbitingMoon";
import { SkyStars } from "./SkyStars";
import { CameraFlyToController } from "./CameraFlyToController";
import { Apollo11Trajectory } from "./Apollo11Trajectory";
import { Apollo11TelemetryOverlay } from "./Apollo11TelemetryOverlay";
import { HistoricalRouteTrajectory } from "./HistoricalRouteTrajectory";
import { PaleoPlatesLayer } from "./PaleoPlatesLayer";
import { useGlobeStore, MIN_CAMERA_ALTITUDE, MAX_CAMERA_ALTITUDE } from "@/stores/globeStore";
import { calculateSubsolarPoint, getSunDirectionVector } from "@/lib/astronomy";

import { useTimelineStore } from "@/stores/timelineStore";
import { useStudyStore } from "@/stores/studyStore";
import { findMilestoneById } from "@/lib/country-data";

export const GlobeCanvas: React.FC = () => {
  const isThrottled = useGlobeStore((s) => s.isThrottled);
  const selectedYear = useTimelineStore((s) => s.selectedYear);
  const selectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);
  const timelineMode = useTimelineStore((s: any) => s.timelineMode);
  const selectedGeologicalMa = useTimelineStore((s: any) => s.selectedGeologicalMa);
  const selectedRouteId = useTimelineStore((s: any) => s.selectedRouteId);

  const isStudyApolloActive = useStudyStore((s: any) => s.isApollo11Active);
  const isStudyRouteActive = useStudyStore((s: any) => s.activeRouteId);
  const isStudyGeologicalActive = useStudyStore(
    (s: any) => s.geologicalMa !== undefined && s.geologicalMa !== null
  );

  const isApolloActive =
    isStudyApolloActive ||
    selectedYear === 1969 ||
    selectedMilestoneId === "usa-1969" ||
    selectedMilestoneId === "glo-1969";

  const isMagellanActive =
    selectedRouteId === "magellan-1519" ||
    isStudyRouteActive === "magellan-1519" ||
    selectedMilestoneId === "magellan-1519" ||
    selectedMilestoneId === "esp-1519" ||
    selectedYear === 1519;

  const isGeologicalActive =
    timelineMode === "GEOLOGICAL" ||
    isStudyGeologicalActive ||
    (selectedGeologicalMa !== null && selectedGeologicalMa !== undefined && selectedGeologicalMa > 0) ||
    selectedMilestoneId === "pangea-250ma" ||
    selectedMilestoneId === "gondwana-150ma" ||
    selectedMilestoneId === "kpg-66ma";

  // Compute primary solar light position synchronized with active date
  const sunPosition = useMemo(() => {
    let targetDate = new Date();

    if (selectedMilestoneId) {
      const milestone = findMilestoneById(selectedMilestoneId);
      if (milestone) {
        if (milestone.exactDate) {
          targetDate = milestone.exactDate.includes("T")
            ? new Date(milestone.exactDate)
            : new Date(`${milestone.exactDate}T12:00:00Z`);
        } else if (milestone.year) {
          targetDate = new Date(Date.UTC(milestone.year, 5, 21, 12, 0, 0));
        }
      }
    } else if (selectedYear && selectedYear !== new Date().getFullYear()) {
      targetDate = new Date(Date.UTC(selectedYear, 5, 21, 12, 0, 0));
    }

    const subsolar = calculateSubsolarPoint(targetDate);
    const dir = getSunDirectionVector(subsolar.latitude, subsolar.longitude);
    return [dir.x * 10, dir.y * 10, dir.z * 10] as [number, number, number];
  }, [selectedYear, selectedMilestoneId]);

  // Click-outside handler on celestial vault to deselect active selection
  const handlePointerMissed = (event: MouseEvent) => {
    if (event.button !== undefined && event.button !== 0) return;
    useGlobeStore.getState().setSelectedIso(null);
    useGlobeStore.getState().setHoveredIso(null);
    useTimelineStore.getState().selectMilestone(null);
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-[#030712] overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        frameloop={isThrottled ? "demand" : "always"}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onPointerMissed={handlePointerMissed}
      >
        {/* Ambient & Directional Sun Lighting */}
        <ambientLight intensity={0.15} />
        <directionalLight position={sunPosition} intensity={2.2} color="#ffffff" />

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

        {/* Camera FlyTo Interpolator */}
        <CameraFlyToController />

        {/* Deep Space Celestial Vault */}
        <SkyStars />

        {/* Realistic Moon Orbit */}
        <OrbitingMoon />

        {/* 3D Earth Mesh with Shader */}
        <EarthSphere />

        {/* High-Resolution TopoJSON Borders */}
        <CountryBorders />

        {/* Paleogeographic Tectonic Plates & Suture Zones (Pangea) */}
        {isGeologicalActive && <PaleoPlatesLayer />}

        {/* 3D Circumnavigation Trajectory & Animated Nau Victoria */}
        {isMagellanActive && <HistoricalRouteTrajectory />}

        {/* 3D Translunar Trajectory & Animated Apollo 11 Spacecraft */}
        {isApolloActive && <Apollo11Trajectory />}
      </Canvas>

      {/* Floating Apollo 11 Space Flight Telemetry HUD Overlay */}
      <Apollo11TelemetryOverlay />
    </div>
  );
};
