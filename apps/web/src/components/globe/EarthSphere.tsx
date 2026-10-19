"use client";

import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as topojson from "topojson-client";
import whichPolygon from "which-polygon";
import worldAtlas from "world-atlas/countries-110m.json";
import { createEarthMaterial } from "./EarthShaderMaterial";
import { calculateSubsolarPoint, getSunDirectionVector } from "@/lib/astronomy";
import { vector3ToLatLng } from "@/lib/geo-spatial";
import { useGlobeStore } from "@/stores/globeStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { NUMERIC_TO_ISO, NAME_TO_ISO, PILOT_COUNTRIES, GLOBAL_MILESTONES } from "@/lib/country-data";

export const EarthSphere: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const setSelectedIso = useGlobeStore((s) => s.setSelectedIso);
  const setHoveredIso = useGlobeStore((s) => s.setHoveredIso);
  const flyTo = useGlobeStore((s) => s.flyTo);

  // Initialize shader material
  const earthMaterial = useMemo(() => createEarthMaterial(), []);

  // Initialize spatial index for ultra-fast picking (<0.2ms)
  const spatialIndex = useMemo(() => {
    try {
      const topology = worldAtlas as any;
      const featureCollection = topojson.feature(topology, topology.objects.countries) as any;
      featureCollection.features.forEach((f: any) => {
        if (f.properties) f.properties.id = f.id;
      });
      return whichPolygon(featureCollection);
    } catch (err) {
      console.error("Failed to initialize spatial index:", err);
      return null;
    }
  }, []);

  // Listen to timeline selection for astronomical synchronization (RN10)
  const selectedYear = useTimelineStore((s) => s.selectedYear);
  const selectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);

  // Update shader animation frame
  useFrame((state, delta) => {
    earthMaterial.uniforms.uTime.value += delta;
  });

  useEffect(() => {
    const updateSun = () => {
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
      const sunDir = getSunDirectionVector(subsolar.latitude, subsolar.longitude);
      earthMaterial.uniforms.uSunDirection.value.copy(sunDir);
    };

    updateSun();
    const interval = setInterval(updateSun, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [earthMaterial, selectedYear, selectedMilestoneId]);

  // Handle Raycasting Pointer Movement
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!e.point || !spatialIndex) return;

    const { lat, lng } = vector3ToLatLng(e.point);
    const feature = spatialIndex([lng, lat]);

    if (feature) {
      const numericId = feature.id ? String(feature.id).padStart(3, "0") : "";
      const iso =
        NUMERIC_TO_ISO[numericId] ||
        (feature.name && NAME_TO_ISO[feature.name]) ||
        feature.name ||
        null;
      setHoveredIso(iso);
    } else {
      setHoveredIso(null);
    }
  };

  const handlePointerOut = () => {
    setHoveredIso(null);
  };

  // Handle Click & FlyTo
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!e.point || !spatialIndex) return;

    const { lat, lng } = vector3ToLatLng(e.point);
    const feature = spatialIndex([lng, lat]);

    if (feature) {
      const numericId = feature.id ? String(feature.id).padStart(3, "0") : "";
      const iso =
        NUMERIC_TO_ISO[numericId] ||
        (feature.name && NAME_TO_ISO[feature.name]) ||
        feature.name ||
        null;
      if (iso) {
        setSelectedIso(iso);
        const pilot = PILOT_COUNTRIES[iso];
        if (pilot) {
          flyTo(pilot.latitude, pilot.longitude, 2.0);
        } else {
          flyTo(lat, lng, 2.0);
        }
      }
    }
  };

  return (
    <group>
      {/* Visual Earth Sphere with Custom Day/Night Shader */}
      <mesh ref={meshRef} material={earthMaterial}>
        <sphereGeometry args={[1.0, 64, 64]} />
      </mesh>

      {/* Physics & Picking Invisible Collyder Sphere */}
      <mesh
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        visible={false}
      >
        <sphereGeometry args={[1.001, 32, 32]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
};
