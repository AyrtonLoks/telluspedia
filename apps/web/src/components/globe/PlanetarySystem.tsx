"use client";

import React, { useMemo, useEffect } from "react";
import * as THREE from "three";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useTimelineStore } from "@/stores/timelineStore";
import {
  computeAllPlanetaryPositions,
  generateOrbitalPathPoints,
  CelestialBodyId,
  ASTROPHYSICAL_CATALOG,
} from "@/lib/astronomy-planets";
import { bodySceneRadius, celestialLabelPriority, RING_RATIOS } from "@/lib/cosmic-scale";
import { CelestialLabel, CelestialLabelChip } from "./CelestialLabel";

const PLANET_IDS: Array<Exclude<CelestialBodyId, "SUN" | "MOON" | "HALLEY">> = [
  "MERCURY",
  "VENUS",
  "EARTH",
  "MARS",
  "JUPITER",
  "SATURN",
  "URANUS",
  "NEPTUNE",
  "PLUTO",
];

export const PlanetarySystem: React.FC = () => {
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const focusedBodyId = useCosmicStore((s) => s.focusedBodyId);
  const hoveredBodyId = useCosmicStore((s) => s.hoveredBodyId);
  const activeCosmicLayers = useCosmicStore((s) => s.activeCosmicLayers);
  const focusBody = useCosmicStore((s) => s.focusBody);
  const setHoveredBody = useCosmicStore((s) => s.setHoveredBody);
  const scaleMode = useCosmicStore((s) => s.scaleMode);

  const selectedYear = useTimelineStore((s) => s.selectedYear) || new Date().getUTCFullYear();

  const showOrbits = activeCosmicLayers.includes("ORBITS");
  const showLabels = activeCosmicLayers.includes("LABELS");

  // Compute planetary positions for active date
  const planets = useMemo(() => {
    return computeAllPlanetaryPositions(selectedYear);
  }, [selectedYear]);

  // Memoize orbital geometries for all planets
  const orbitalGeometries = useMemo(() => {
    const map = new Map<string, THREE.BufferGeometry>();
    for (const id of PLANET_IDS) {
      const points = generateOrbitalPathPoints(id, 180, 2000);
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      map.set(id, geo);
    }
    return map;
  }, []);

  // Dispose geometries on unmount
  useEffect(() => {
    return () => {
      orbitalGeometries.forEach((geo) => geo.dispose());
    };
  }, [orbitalGeometries]);

  if (!isCosmicMode) return null;

  return (
    <group name="planetary-system">
      {PLANET_IDS.map((id) => {
        const planet = planets[id];
        const meta = ASTROPHYSICAL_CATALOG[id];
        const orbitGeo = orbitalGeometries.get(id);
        const isFocused = focusedBodyId === id;
        const isHovered = hoveredBodyId === id;

        // Raio pela política única de escala (D11) e inclinação axial
        const radius = bodySceneRadius(meta.equatorialRadiusKm, scaleMode);
        const axialTiltRad = (meta.axialTiltDeg * Math.PI) / 180;

        return (
          <group key={id} name={`planet-group-${id}`}>
            {/* Keplerian Orbit Line */}
            {showOrbits && orbitGeo && (
              <lineLoop geometry={orbitGeo}>
                <lineBasicMaterial
                  color={isFocused ? "#38bdf8" : isHovered ? "#93c5fd" : "#475569"}
                  transparent
                  opacity={isFocused ? 0.75 : isHovered ? 0.5 : 0.22}
                  linewidth={1}
                />
              </lineLoop>
            )}

            {/* Planet Body at Calculated Scene Position (Earth is rendered by high-res EarthSphere) */}
            <group position={planet.scenePosition}>
              {id !== "EARTH" && (
                <mesh
                  rotation={[0, 0, axialTiltRad]}
                  onClick={(e) => {
                    e.stopPropagation();
                    focusBody(id);
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    setHoveredBody(id);
                  }}
                  onPointerOut={() => setHoveredBody(null)}
                >
                  <sphereGeometry args={[radius, 32, 32]} />
                  <meshStandardMaterial
                    color={planet.color}
                    roughness={id === "VENUS" ? 0.35 : 0.7}
                    metalness={0.1}
                    emissive={isFocused ? planet.color : "#000000"}
                    emissiveIntensity={isFocused ? 0.2 : 0}
                  />
                </mesh>
              )}

              {/* Rings for Saturn */}
              {id === "SATURN" && meta.hasRings && (
                <mesh rotation={[-Math.PI / 2 + axialTiltRad, 0, 0]}>
                  <ringGeometry args={[radius * RING_RATIOS.SATURN[0], radius * RING_RATIOS.SATURN[1], 64]} />
                  <meshStandardMaterial
                    color="#e2d8b8"
                    side={THREE.DoubleSide}
                    transparent
                    opacity={0.7}
                    roughness={0.8}
                  />
                </mesh>
              )}

              {/* Rings for Uranus */}
              {id === "URANUS" && meta.hasRings && (
                <mesh rotation={[-Math.PI / 2 + axialTiltRad, 0, 0]}>
                  <ringGeometry args={[radius * RING_RATIOS.URANUS[0], radius * RING_RATIOS.URANUS[1], 64]} />
                  <meshStandardMaterial
                    color="#bae6fd"
                    side={THREE.DoubleSide}
                    transparent
                    opacity={0.45}
                    roughness={0.8}
                  />
                </mesh>
              )}

              {/* Selection Halo / Indicator */}
              {isFocused && (
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radius * 1.35, radius * 1.5, 48]} />
                  <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} transparent opacity={0.8} />
                </mesh>
              )}

              {/* Rótulo único (D11): px fixos, anticolisão por prioridade */}
              {showLabels && (
                <CelestialLabel
                  anchorHeight={radius}
                  priority={celestialLabelPriority(meta.equatorialRadiusKm, { focused: isFocused, hovered: isHovered })}
                >
                  <CelestialLabelChip name={planet.namePt} detail={`${planet.distanceSunAu} UA`} focused={isFocused} hovered={isHovered} />
                </CelestialLabel>
              )}
            </group>
          </group>
        );
      })}
    </group>
  );
};

