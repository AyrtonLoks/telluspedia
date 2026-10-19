"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { createEarthMaterial } from "./EarthShaderMaterial";
import { calculateSubsolarPoint, getSunDirectionVector } from "@/lib/astronomy";
import { vector3ToLatLng } from "@/lib/geo-spatial";
import { useGlobeStore } from "@/stores/globeStore";
import { useTimelineStore } from "@/stores/timelineStore";
import {
  NUMERIC_TO_ISO,
  NAME_TO_ISO,
  PILOT_COUNTRIES,
  findMilestoneById,
} from "@/lib/country-data";
import {
  resolveHistoricalEra,
  resolveEffectiveHistoricalYear,
  resolveHistoricalEntity,
  HISTORICAL_ENTITIES,
} from "@/lib/historical-entities";
import {
  loadHistoricalTopology,
  getHistoricalTopologySync,
  getHistoricalSpatialIndex,
  getContemporarySpatialIndex,
} from "@/lib/historical-topology";

export const EarthSphere: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { invalidate } = useThree();

  const setSelectedIso = useGlobeStore((s) => s.setSelectedIso);
  const setHoveredIso = useGlobeStore((s) => s.setHoveredIso);
  const flyTo = useGlobeStore((s) => s.flyTo);

  // Listen to timeline selection for era resolution & astronomical synchronization (RN10)
  const selectedYear = useTimelineStore((s) => s.selectedYear);
  const selectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);
  const startYear = useTimelineStore((s) => s.startYear);
  const endYear = useTimelineStore((s) => s.endYear);

  // Determine active reference year using canonical multi-parameter resolver
  const milestoneYear = useMemo(() => {
    if (!selectedMilestoneId) return null;
    return findMilestoneById(selectedMilestoneId)?.year ?? null;
  }, [selectedMilestoneId]);

  const effectiveYear = useMemo(() => {
    return resolveEffectiveHistoricalYear({
      selectedYear,
      milestoneYear,
      startYear,
      endYear,
    });
  }, [selectedYear, milestoneYear, startYear, endYear]);

  const era = useMemo(() => {
    return resolveHistoricalEra(effectiveYear);
  }, [effectiveYear]);

  // Load NASA planetary textures with immediate render invalidation on load
  const [dayTexture, nightTexture] = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const day = loader.load("/textures/earth_day.jpg", () => invalidate());
    const night = loader.load("/textures/earth_night.png", () => invalidate());
    day.colorSpace = THREE.SRGBColorSpace;
    night.colorSpace = THREE.SRGBColorSpace;
    return [day, night];
  }, [invalidate]);

  // Initialize shader material
  const earthMaterial = useMemo(() => {
    const mat = createEarthMaterial(dayTexture, nightTexture);
    const initialSubsolar = calculateSubsolarPoint(new Date());
    mat.uniforms.uSunDirection.value.copy(
      getSunDirectionVector(initialSubsolar.latitude, initialSubsolar.longitude)
    );
    return mat;
  }, [dayTexture, nightTexture]);

  useEffect(() => {
    if (dayTexture) earthMaterial.uniforms.uDayTexture.value = dayTexture;
    if (nightTexture) earthMaterial.uniforms.uNightTexture.value = nightTexture;
    earthMaterial.needsUpdate = true;
  }, [earthMaterial, dayTexture, nightTexture]);

  // Dynamic spatial index (<0.2ms) switching seamlessly between contemporary and historical eras
  const [historicalSpatialIndex, setHistoricalSpatialIndex] = useState<any>(() => {
    if (era.id !== "CONTEMPORARY" && era.topoJsonPath) {
      const cached = getHistoricalTopologySync(era.topoJsonPath);
      return cached ? getHistoricalSpatialIndex(era.id, cached) : null;
    }
    return null;
  });

  useEffect(() => {
    if (era.id === "CONTEMPORARY" || !era.topoJsonPath) {
      setHistoricalSpatialIndex(null);
      return;
    }

    const syncTopo = getHistoricalTopologySync(era.topoJsonPath);
    if (syncTopo) {
      const idx = getHistoricalSpatialIndex(era.id, syncTopo);
      setHistoricalSpatialIndex(() => idx);
      return;
    }

    let isMounted = true;
    loadHistoricalTopology(era.topoJsonPath).then((topo) => {
      if (!isMounted || !topo) return;
      const index = getHistoricalSpatialIndex(era.id, topo);
      setHistoricalSpatialIndex(() => index);
    });

    return () => {
      isMounted = false;
    };
  }, [era.id, era.topoJsonPath]);

  const activeSpatialIndex = useMemo(() => {
    if (era.id !== "CONTEMPORARY") {
      if (historicalSpatialIndex) return historicalSpatialIndex;
      if (era.topoJsonPath) {
        const syncTopo = getHistoricalTopologySync(era.topoJsonPath);
        if (syncTopo) {
          const idx = getHistoricalSpatialIndex(era.id, syncTopo);
          if (idx) return idx;
        }
      }
    }
    return getContemporarySpatialIndex();
  }, [era.id, era.topoJsonPath, historicalSpatialIndex]);

  // Continuity transition: when timeline moves across eras, smoothly resolve selected modern country to historical entity
  useEffect(() => {
    const currentIso = useGlobeStore.getState().selectedIso;
    if (!currentIso) return;

    const resolved = resolveHistoricalEntity(currentIso, effectiveYear);
    if (resolved && resolved !== currentIso) {
      setSelectedIso(resolved);
    }
  }, [effectiveYear, setSelectedIso]);

  // Update shader animation frame
  useFrame((_, delta) => {
    earthMaterial.uniforms.uTime.value += delta;
  });

  // Astronomical Sun Synchronization (RN10)
  useEffect(() => {
    const updateSun = () => {
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
      } else if (effectiveYear && effectiveYear !== new Date().getFullYear()) {
        targetDate = new Date(Date.UTC(effectiveYear, 5, 21, 12, 0, 0));
      }

      const subsolar = calculateSubsolarPoint(targetDate);
      const sunDir = getSunDirectionVector(subsolar.latitude, subsolar.longitude);
      earthMaterial.uniforms.uSunDirection.value.copy(sunDir);
    };

    updateSun();
    const interval = setInterval(updateSun, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [earthMaterial, effectiveYear, selectedMilestoneId]);

  // Helper to resolve ISO / canonical historical entity from picked TopoJSON feature
  const resolveIsoFromFeature = (feature: any): string | null => {
    if (!feature) return null;
    const rawId = feature.id ?? feature.properties?.id ?? feature.iso;
    const numId =
      rawId !== undefined && rawId !== null ? String(rawId).padStart(3, "0") : "";
    const name = feature.name ?? feature.properties?.name;

    const matchedIso =
      (rawId && HISTORICAL_ENTITIES[String(rawId)] ? String(rawId) : undefined) ||
      NUMERIC_TO_ISO[numId] ||
      (name && NAME_TO_ISO[name]) ||
      rawId ||
      null;

    if (!matchedIso) return null;

    return resolveHistoricalEntity(matchedIso, effectiveYear) || matchedIso;
  };

  // Handle Raycasting Pointer Movement (<0.2ms in-memory lookup)
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!e.point || !activeSpatialIndex) return;

    const { lat, lng } = vector3ToLatLng(e.point);
    const feature = activeSpatialIndex([lng, lat]);
    const iso = resolveIsoFromFeature(feature);

    setHoveredIso(iso);
  };

  const handlePointerOut = () => {
    setHoveredIso(null);
  };

  // Handle Click & FlyTo
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!e.point || !activeSpatialIndex) return;

    const { lat, lng } = vector3ToLatLng(e.point);
    const feature = activeSpatialIndex([lng, lat]);
    const iso = resolveIsoFromFeature(feature);

    if (iso) {
      setSelectedIso(iso);
      useTimelineStore.getState().selectMilestone(null);

      const pilot = PILOT_COUNTRIES[iso];
      const hist = HISTORICAL_ENTITIES[iso];

      if (pilot) {
        flyTo(pilot.latitude, pilot.longitude, 2.0);
      } else if (hist) {
        flyTo(hist.latitude, hist.longitude, 2.0);
      } else {
        flyTo(lat, lng, 2.0);
      }
    } else {
      setSelectedIso(null);
      setHoveredIso(null);
      useTimelineStore.getState().selectMilestone(null);
    }
  };

  return (
    <mesh
      ref={meshRef}
      material={earthMaterial}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <sphereGeometry args={[1.0, 64, 64]} />
    </mesh>
  );
};
