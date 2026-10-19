"use client";

import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EarthSphere } from "./EarthSphere";
import { CountryBorders } from "./CountryBorders";
import { OrbitingMoon } from "./OrbitingMoon";
import { SkyStars } from "./SkyStars";
import { CameraFlyToController } from "./CameraFlyToController";
import { useGlobeStore } from "@/stores/globeStore";
import { calculateSubsolarPoint, getSunDirectionVector } from "@/lib/astronomy";

import { useTimelineStore } from "@/stores/timelineStore";
import { GLOBAL_MILESTONES, PILOT_COUNTRIES } from "@/lib/country-data";

export const GlobeCanvas: React.FC = () => {
  const isThrottled = useGlobeStore((s) => s.isThrottled);
  const selectedYear = useTimelineStore((s) => s.selectedYear);
  const selectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);

  // Compute primary solar light position synchronized with active date
  const sunPosition = useMemo(() => {
    let targetDate = new Date();

    if (selectedMilestoneId) {
      let milestone = GLOBAL_MILESTONES.find((m) => m.id === selectedMilestoneId);
      if (!milestone) {
        for (const c of Object.values(PILOT_COUNTRIES)) {
          const found = c.milestones.find((m) => m.id === selectedMilestoneId);
          if (found) {
            milestone = found as any;
            break;
          }
        }
      }
      if (milestone) {
        if (milestone.exactDate) {
          targetDate = new Date(milestone.exactDate);
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

  return (
    <div className="absolute inset-0 w-full h-full bg-[#030712] overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        frameloop={isThrottled ? "demand" : "always"}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        {/* Ambient & Directional Sun Lighting */}
        <ambientLight intensity={0.15} />
        <directionalLight position={sunPosition} intensity={2.2} color="#ffffff" />

        {/* Orbit Controls with Natural Inertia */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={1.3}
          maxDistance={6.0}
          rotateSpeed={0.65}
          zoomSpeed={0.8}
          dampingFactor={0.06}
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
      </Canvas>
    </div>
  );
};
