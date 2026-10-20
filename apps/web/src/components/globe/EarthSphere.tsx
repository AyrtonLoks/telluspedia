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
import { resolveGeologicalEra } from "@/lib/paleo-data";
import { useStudyStore } from "@/stores/studyStore";
import { useCosmicStore } from "@/stores/cosmicStore";

/**
 * Generates an authentic equirectangular DataTexture of Pangea (~250 Ma)
 * featuring the Panthalassa superocean, continental shelf gradients, Tethys Sea,
 * and Permian terracotta landmass with organic harmonic coastlines.
 */
function createProceduralPangeaTexture(width = 512, height = 256): THREE.DataTexture {
  const size = width * height * 4;
  const data = new Uint8Array(size);

  for (let y = 0; y < height; y++) {
    const lat = 90 - (y / height) * 180;
    const phi = (90 - lat) * (Math.PI / 180);

    for (let x = 0; x < width; x++) {
      const lng = (x / width) * 360 - 180;
      const theta = (lng + 180) * (Math.PI / 180);
      const idx = (y * width + x) * 4;

      // Harmonic spherical perturbation for natural organic coastlines
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);

      const harmonic =
        Math.sin(nx * 5.0 + ny * 3.0) * 0.25 +
        Math.cos(ny * 7.0 + nz * 6.0) * 0.15 +
        Math.sin(nz * 11.0 + nx * 9.0) * 0.08;

      const pLat = lat + harmonic * 12.0;
      const pLng = lng + harmonic * 15.0;

      // 1. Tethys Sea (Equatorial triangular embayment)
      const inTethys =
        pLng > 15 &&
        pLng < 90 &&
        pLat > -20 &&
        pLat < 30 &&
        pLng > (28 - Math.abs(pLat) * 0.8);

      // 2. Pangea continuous supercontinent envelope
      const inCore = pLng > -55 && pLng < 45 && pLat > -45 && pLat < 55;
      const inSouthGondwana = pLng > -65 && pLng < 100 && pLat >= -80 && pLat <= -35;
      const inNorthLaurasia = pLng > -25 && pLng < 110 && pLat >= 45 && pLat < 78;

      let elevation = -0.5;
      if ((inCore || inSouthGondwana || inNorthLaurasia) && !inTethys) {
        const dist = Math.hypot(pLng * 0.015, pLat * 0.015);
        elevation = 0.25 - dist * 0.12 + harmonic * 0.4;
      }

      if (elevation > 0.04) {
        // Terracotta / ochre Permian arid landmass with mountain orogeny shading
        const m = Math.sin(nx * 14.0 + ny * 12.0) * Math.cos(nz * 15.0);
        const isMtn = m > 0.45 && elevation > 0.15;
        if (isMtn) {
          data[idx] = Math.floor(145 + harmonic * 30);
          data[idx + 1] = Math.floor(115 + harmonic * 25);
          data[idx + 2] = Math.floor(90 + harmonic * 20);
        } else if (Math.abs(pLat) > 65) {
          // Glossopteris wetlands
          data[idx] = Math.floor(80 + harmonic * 20);
          data[idx + 1] = Math.floor(100 + harmonic * 25);
          data[idx + 2] = Math.floor(65 + harmonic * 15);
        } else {
          // Arid desert interior
          data[idx] = Math.floor(185 + harmonic * 35);
          data[idx + 1] = Math.floor(120 + harmonic * 25);
          data[idx + 2] = Math.floor(70 + harmonic * 20);
        }
        data[idx + 3] = 255;
      } else if (elevation > -0.12) {
        // Turquoise continental shelf / lagoon
        const shelf = (elevation + 0.12) / 0.16;
        data[idx] = Math.floor(12 + shelf * 20);
        data[idx + 1] = Math.floor(65 + shelf * 55);
        data[idx + 2] = Math.floor(110 + shelf * 50);
        data[idx + 3] = 255;
      } else {
        // Deep Panthalassa ocean
        const depth = Math.min(1.0, (-elevation - 0.12) * 1.8);
        data[idx] = Math.floor(10 * (1.0 - depth * 0.5));
        data[idx + 1] = Math.floor(32 * (1.0 - depth * 0.5));
        data[idx + 2] = Math.floor(68 * (1.0 - depth * 0.5));
        data[idx + 3] = 255;
      }
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

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

  // Geological mode and era detection
  const timelineMode = useTimelineStore((s: any) => s.timelineMode);
  const geologicalMa = useTimelineStore((s: any) => s.geologicalMa);
  const selectedGeologicalMa = useTimelineStore((s: any) => s.selectedGeologicalMa);
  const isStudyGeologicalActive = useStudyStore(
    (s: any) => s.geologicalMa !== undefined && s.geologicalMa !== null
  );

  const effectiveGeologicalMa = useMemo(() => {
    if (selectedGeologicalMa && selectedGeologicalMa > 0) return selectedGeologicalMa;
    if (geologicalMa && geologicalMa > 0) return geologicalMa;
    if (selectedMilestoneId === "pangea-250ma") return 250;
    if (selectedMilestoneId === "gondwana-150ma") return 150;
    if (selectedMilestoneId === "kpg-66ma") return 66;
    if (timelineMode === "GEOLOGICAL") return 250;
    return null;
  }, [selectedGeologicalMa, geologicalMa, selectedMilestoneId, timelineMode]);

  const isGeologicalActive = useMemo(() => {
    return (
      timelineMode === "GEOLOGICAL" ||
      isStudyGeologicalActive ||
      effectiveGeologicalMa !== null ||
      selectedMilestoneId === "pangea-250ma" ||
      selectedMilestoneId === "gondwana-150ma" ||
      selectedMilestoneId === "kpg-66ma"
    );
  }, [timelineMode, isStudyGeologicalActive, effectiveGeologicalMa, selectedMilestoneId]);

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

  // Procedural Pangea texture initialized immediately as base fallback
  const proceduralPaleoTexture = useMemo(() => {
    return createProceduralPangeaTexture();
  }, []);

  // Initialize shader material
  const earthMaterial = useMemo(() => {
    const mat = createEarthMaterial(dayTexture, nightTexture, proceduralPaleoTexture);
    const initialSubsolar = calculateSubsolarPoint(new Date());
    mat.uniforms.uSunDirection.value.copy(
      getSunDirectionVector(initialSubsolar.latitude, initialSubsolar.longitude)
    );
    return mat;
  }, [dayTexture, nightTexture, proceduralPaleoTexture]);

  // Ref to track loaded raster paleogeographic texture for proper WebGL GPU disposal
  const loadedPaleoTextureRef = useRef<THREE.Texture | null>(null);

  // Load raster paleogeographic texture from public directory if available
  useEffect(() => {
    let isMounted = true;
    const loader = new THREE.TextureLoader();
    const paleoEra = effectiveGeologicalMa ? resolveGeologicalEra(effectiveGeologicalMa) : null;
    const texturePath = paleoEra?.textureUrl || "/textures/paleo_pangea.png";

    loader.load(
      texturePath,
      (tex) => {
        if (!isMounted) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        // Dispose previously loaded raster texture to prevent VRAM accumulation
        if (
          loadedPaleoTextureRef.current &&
          loadedPaleoTextureRef.current !== proceduralPaleoTexture
        ) {
          loadedPaleoTextureRef.current.dispose();
        }
        loadedPaleoTextureRef.current = tex;
        earthMaterial.uniforms.uPaleoTexture.value = tex;
        earthMaterial.needsUpdate = true;
        invalidate();
      },
      undefined,
      () => {
        // Fallback procedural texture already loaded
      }
    );

    return () => {
      isMounted = false;
    };
  }, [earthMaterial, effectiveGeologicalMa, proceduralPaleoTexture, invalidate]);

  useEffect(() => {
    if (dayTexture) earthMaterial.uniforms.uDayTexture.value = dayTexture;
    if (nightTexture) earthMaterial.uniforms.uNightTexture.value = nightTexture;
    earthMaterial.needsUpdate = true;
  }, [earthMaterial, dayTexture, nightTexture]);

  // Dispose earth material, planetary textures, and procedural texture on unmount
  useEffect(() => {
    return () => {
      earthMaterial.dispose();
      proceduralPaleoTexture.dispose();
      dayTexture?.dispose();
      nightTexture?.dispose();
      if (
        loadedPaleoTextureRef.current &&
        loadedPaleoTextureRef.current !== proceduralPaleoTexture
      ) {
        loadedPaleoTextureRef.current.dispose();
      }
    };
  }, [earthMaterial, proceduralPaleoTexture, dayTexture, nightTexture]);

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

  // Update shader animation frame & smooth 60 FPS lerp for paleogeographic cross-fade
  useFrame((_, delta) => {
    earthMaterial.uniforms.uTime.value += delta;

    const targetPaleoFactor = isGeologicalActive ? 1.0 : 0.0;
    const currentPaleoFactor = earthMaterial.uniforms.uPaleoFactor.value;

    if (Math.abs(currentPaleoFactor - targetPaleoFactor) > 0.001) {
      earthMaterial.uniforms.uPaleoFactor.value = THREE.MathUtils.lerp(
        currentPaleoFactor,
        targetPaleoFactor,
        Math.min(delta * 3.5, 1.0)
      );
      invalidate();
    } else if (currentPaleoFactor !== targetPaleoFactor) {
      earthMaterial.uniforms.uPaleoFactor.value = targetPaleoFactor;
      invalidate();
    }
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
    if (useCosmicStore.getState().isCosmicMode) {
      useCosmicStore.getState().setHoveredBody("EARTH");
      setHoveredIso(null);
      return;
    }
    if (isGeologicalActive) {
      setHoveredIso(null);
      return;
    }
    if (!e.point || !activeSpatialIndex) return;

    const { lat, lng } = vector3ToLatLng(e.point);
    const feature = activeSpatialIndex([lng, lat]);
    const iso = resolveIsoFromFeature(feature);

    setHoveredIso(iso);
  };

  const handlePointerOut = () => {
    if (useCosmicStore.getState().isCosmicMode) {
      useCosmicStore.getState().setHoveredBody(null);
    }
    setHoveredIso(null);
  };

  // Handle Click & FlyTo
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // In Cosmic Mode, clicking Earth selects Earth as a celestial body
    if (useCosmicStore.getState().isCosmicMode) {
      useCosmicStore.getState().focusBody("EARTH");
      return;
    }

    // In Normal Mode, if Moon was focused, clicking Earth restores focus to Earth
    if (useCosmicStore.getState().focusedBodyId === "MOON") {
      useCosmicStore.getState().focusBody(null);
    }

    if (isGeologicalActive) {
      setSelectedIso(null);
      setHoveredIso(null);
      return;
    }
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
