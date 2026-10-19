"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import * as topojson from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import { latLngToVector3 } from "@/lib/geo-spatial";
import { useGlobeStore } from "@/stores/globeStore";
import { useComparatorStore } from "@/stores/comparatorStore";
import { NUMERIC_TO_ISO, NAME_TO_ISO } from "@/lib/country-data";

export const CountryBorders: React.FC = () => {
  const selectedIso = useGlobeStore((s) => s.selectedIso);
  const hoveredIso = useGlobeStore((s) => s.hoveredIso);
  const comparatorIsos = useComparatorStore((s) => s.selectedIsos);

  // Global borders line geometry
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

  // Highlighted borders for selected / hovered / comparator countries
  const highlightGeometry = useMemo(() => {
    const topology = worldAtlas as any;
    const geometries = topology.objects.countries.geometries;
    const activeIsos = new Set<string>();

    if (selectedIso) activeIsos.add(selectedIso);
    if (hoveredIso) activeIsos.add(hoveredIso);
    for (const iso of comparatorIsos) activeIsos.add(iso);

    const points: THREE.Vector3[] = [];

    for (const geom of geometries) {
      const numId = geom.id !== undefined && geom.id !== null ? String(geom.id).padStart(3, "0") : "";
      const countryName = geom.properties?.name;
      const iso = NUMERIC_TO_ISO[numId] || (countryName ? NAME_TO_ISO[countryName] : undefined);
      if (iso && activeIsos.has(iso)) {
        const countryMesh = topojson.mesh(topology, geom);
        if (countryMesh && countryMesh.coordinates) {
          for (const line of countryMesh.coordinates) {
            for (let i = 0; i < line.length - 1; i++) {
              const [lng1, lat1] = line[i];
              const [lng2, lat2] = line[i + 1];
              // Elevated slightly more to prevent any z-fighting
              points.push(latLngToVector3(lat1, lng1, 1.004));
              points.push(latLngToVector3(lat2, lng2, 1.004));
            }
          }
        }
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setFromPoints(points);
    return geom;
  }, [selectedIso, hoveredIso, comparatorIsos]);

  return (
    <group>
      {/* Base Borders */}
      <lineSegments geometry={baseBordersGeometry}>
        <lineBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.35}
          linewidth={1}
          depthWrite={false}
        />
      </lineSegments>

      {/* Active Highlights */}
      {highlightGeometry && (
        <lineSegments geometry={highlightGeometry}>
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
