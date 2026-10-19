"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import * as topojson from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import { latLngToVector3 } from "@/lib/geo-spatial";
import { useGlobeStore } from "@/stores/globeStore";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useTimelineStore } from "@/stores/timelineStore";
import {
  NUMERIC_TO_ISO,
  NAME_TO_ISO,
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
} from "@/lib/historical-topology";

export const CountryBorders: React.FC = () => {
  const selectedIso = useGlobeStore((s) => s.selectedIso);
  const hoveredIso = useGlobeStore((s) => s.hoveredIso);
  const isComparatorOpen = useComparatorStore((s) => s.isOpen);
  const comparatorIsos = useComparatorStore((s) => s.selectedIsos);

  const selectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);
  const selectedYear = useTimelineStore((s) => s.selectedYear);
  const startYear = useTimelineStore((s) => s.startYear);
  const endYear = useTimelineStore((s) => s.endYear);

  // Material refs for smooth cross-fading via useFrame
  const baseMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const historicalMaterialRef = useRef<THREE.LineBasicMaterial>(null);

  // Determine active era
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

  // Asynchronous state for historical topology with instant sync cache initialization
  const [historicalTopology, setHistoricalTopology] = useState<any>(() => {
    return era.topoJsonPath ? getHistoricalTopologySync(era.topoJsonPath) : null;
  });

  // Track mounting state to allow full opacity fade-out before unmounting
  const [isHistoricalMounted, setIsHistoricalMounted] = useState<boolean>(
    () => era.id !== "CONTEMPORARY" && !!(era.topoJsonPath ? getHistoricalTopologySync(era.topoJsonPath) : null)
  );

  useEffect(() => {
    if (era.id === "CONTEMPORARY" || !era.topoJsonPath) {
      // Do NOT immediately unmount or nullify! Let useFrame lerp opacity down to 0 first!
      return;
    }

    setIsHistoricalMounted(true);

    const syncTopo = getHistoricalTopologySync(era.topoJsonPath);
    if (syncTopo) {
      setHistoricalTopology(syncTopo);
      return;
    }

    let isMounted = true;
    loadHistoricalTopology(era.topoJsonPath).then((topo) => {
      if (isMounted && topo) {
        setHistoricalTopology(topo);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [era.id, era.topoJsonPath]);

  // Contemporary base borders geometry (World Atlas 110m)
  const baseBordersGeometry = useMemo(() => {
    const topology = worldAtlas as any;
    const mesh = topojson.mesh(topology, topology.objects.countries);
    const points: THREE.Vector3[] = [];

    if (mesh && mesh.coordinates) {
      for (const line of mesh.coordinates) {
        for (let i = 0; i < line.length - 1; i++) {
          const [lng1, lat1] = line[i];
          const [lng2, lat2] = line[i + 1];
          points.push(latLngToVector3(lat1, lng1, 1.002));
          points.push(latLngToVector3(lat2, lng2, 1.002));
        }
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setFromPoints(points);
    return geom;
  }, []);

  // Historical borders geometry of active era
  const historicalBordersGeometry = useMemo(() => {
    if (!historicalTopology || !isHistoricalMounted) return null;

    try {
      const mesh = topojson.mesh(
        historicalTopology,
        historicalTopology.objects.countries
      );
      const points: THREE.Vector3[] = [];

      if (mesh && mesh.coordinates) {
        for (const line of mesh.coordinates) {
          for (let i = 0; i < line.length - 1; i++) {
            const [lng1, lat1] = line[i];
            const [lng2, lat2] = line[i + 1];
            points.push(latLngToVector3(lat1, lng1, 1.002));
            points.push(latLngToVector3(lat2, lng2, 1.002));
          }
        }
      }

      if (points.length === 0) return null;

      const geom = new THREE.BufferGeometry();
      geom.setFromPoints(points);
      return geom;
    } catch (err) {
      console.error("Failed to build historical borders geometry:", err);
      return null;
    }
  }, [historicalTopology, isHistoricalMounted]);

  // Highlighted borders for selected / hovered / comparator entities and active milestone bloc
  const highlightGeometry = useMemo(() => {
    const isHistorical = era.id !== "CONTEMPORARY" && !!historicalTopology;
    const topology = isHistorical ? historicalTopology : (worldAtlas as any);
    if (!topology || !topology.objects?.countries?.geometries) return null;

    const geometries = topology.objects.countries.geometries;
    const activeIsos = new Set<string>();

    if (selectedIso) {
      activeIsos.add(selectedIso);
      const hist = resolveHistoricalEntity(selectedIso, effectiveYear);
      if (hist) activeIsos.add(hist);
    }
    if (hoveredIso) {
      activeIsos.add(hoveredIso);
      const hist = resolveHistoricalEntity(hoveredIso, effectiveYear);
      if (hist) activeIsos.add(hist);
    }
    if (isComparatorOpen) {
      for (const iso of comparatorIsos) {
        activeIsos.add(iso);
        const hist = resolveHistoricalEntity(iso, effectiveYear);
        if (hist) activeIsos.add(hist);
      }
    }

    if (selectedMilestoneId) {
      const milestone = findMilestoneById(selectedMilestoneId);
      if (milestone) {
        if (milestone.blocIsos && milestone.blocIsos.length > 0) {
          for (const iso of milestone.blocIsos) {
            activeIsos.add(iso);
            const hist = resolveHistoricalEntity(iso, effectiveYear);
            if (hist) activeIsos.add(hist);
          }
        }
        if (milestone.countryIso) {
          activeIsos.add(milestone.countryIso);
          const hist = resolveHistoricalEntity(milestone.countryIso, effectiveYear);
          if (hist) activeIsos.add(hist);
        }
      }
    }

    if (activeIsos.size === 0) return null;

    const points: THREE.Vector3[] = [];

    for (const geom of geometries) {
      const rawId =
        geom.id !== undefined && geom.id !== null ? String(geom.id) : "";
      const numId = rawId.padStart(3, "0");
      const countryName = geom.properties?.name;

      const iso =
        (HISTORICAL_ENTITIES[rawId] ? rawId : undefined) ||
        NUMERIC_TO_ISO[numId] ||
        (countryName ? NAME_TO_ISO[countryName] : undefined) ||
        rawId;

      if (iso && activeIsos.has(iso)) {
        const countryMesh = topojson.mesh(topology, geom);
        if (countryMesh && countryMesh.coordinates) {
          for (const line of countryMesh.coordinates) {
            for (let i = 0; i < line.length - 1; i++) {
              const [lng1, lat1] = line[i];
              const [lng2, lat2] = line[i + 1];
              // Elevated slightly more to prevent z-fighting
              points.push(latLngToVector3(lat1, lng1, 1.004));
              points.push(latLngToVector3(lat2, lng2, 1.004));
            }
          }
        }
      }
    }

    if (points.length === 0) return null;

    const geom = new THREE.BufferGeometry();
    geom.setFromPoints(points);
    return geom;
  }, [
    selectedIso,
    hoveredIso,
    isComparatorOpen,
    comparatorIsos,
    selectedMilestoneId,
    era.id,
    effectiveYear,
    historicalTopology,
  ]);

  // Clean up WebGL buffer geometries on update/unmount to prevent GPU memory leaks
  useEffect(() => {
    return () => {
      baseBordersGeometry.dispose();
    };
  }, [baseBordersGeometry]);

  useEffect(() => {
    return () => {
      historicalBordersGeometry?.dispose();
    };
  }, [historicalBordersGeometry]);

  useEffect(() => {
    return () => {
      highlightGeometry?.dispose();
    };
  }, [highlightGeometry]);

  // Smooth cross-fade of border opacities via useFrame with THREE.MathUtils.lerp
  useFrame((_, delta) => {
    const isHistoricalActive = era.id !== "CONTEMPORARY";
    const targetBaseOpacity = isHistoricalActive ? 0.0 : 0.35;
    const targetHistOpacity = isHistoricalActive ? 0.45 : 0.0;
    const lerpSpeed = Math.min(delta * 4, 1.0);

    if (baseMaterialRef.current) {
      baseMaterialRef.current.opacity = THREE.MathUtils.lerp(
        baseMaterialRef.current.opacity,
        targetBaseOpacity,
        lerpSpeed
      );
      baseMaterialRef.current.visible = baseMaterialRef.current.opacity > 0.005;
    }

    if (historicalMaterialRef.current) {
      historicalMaterialRef.current.opacity = THREE.MathUtils.lerp(
        historicalMaterialRef.current.opacity,
        targetHistOpacity,
        lerpSpeed
      );
      const isVisible = historicalMaterialRef.current.opacity > 0.005;
      historicalMaterialRef.current.visible = isVisible;

      // When fully faded out and in CONTEMPORARY era, cleanly unmount and dispose historical mesh
      if (!isVisible && !isHistoricalActive && isHistoricalMounted) {
        setIsHistoricalMounted(false);
        setHistoricalTopology(null);
      }
    }
  });

  return (
    <group>
      {/* Contemporary Base Borders */}
      <lineSegments geometry={baseBordersGeometry} raycast={() => null}>
        <lineBasicMaterial
          ref={baseMaterialRef}
          color="#38bdf8"
          transparent
          opacity={era.id === "CONTEMPORARY" ? 0.35 : 0.0}
          linewidth={1}
          depthWrite={false}
        />
      </lineSegments>

      {/* Historical Era Borders */}
      {historicalBordersGeometry && (
        <lineSegments
          geometry={historicalBordersGeometry}
          raycast={() => null}
        >
          <lineBasicMaterial
            ref={historicalMaterialRef}
            color="#38bdf8"
            transparent
            opacity={0.0}
            linewidth={1}
            depthWrite={false}
          />
        </lineSegments>
      )}

      {/* Active Highlights */}
      {highlightGeometry && (
        <lineSegments geometry={highlightGeometry} raycast={() => null}>
          <lineBasicMaterial
            color="#22d3ee"
            transparent
            opacity={0.95}
            linewidth={2}
            depthWrite={false}
          />
        </lineSegments>
      )}
    </group>
  );
};
