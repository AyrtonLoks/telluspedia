"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { latLngToVector3, slerpVectors } from "@/lib/geo-spatial";

export const PALEO_PLATES_ALTITUDE = 1.002;

/**
 * Canonical tectonic fracture zones, suture belts, and plate boundaries of Pangea (~250 Ma),
 * reconstructed based on GPlates and PALEOMAP datasets.
 */
export const PANGEA_TECTONIC_ZONES: { name: string; type: "suture" | "rift" | "subduction"; coords: [number, number][] }[] = [
  {
    name: "Sutura Varisca / Herciniana (Colisão Laurentia-Báltica-Gondwana)",
    type: "suture",
    coords: [
      [38.0, -82.0],
      [42.0, -70.0],
      [45.0, -50.0],
      [48.0, -30.0],
      [49.5, -10.0],
      [50.5, 5.0],
      [51.2, 18.0],
      [49.0, 28.0],
      [46.0, 36.0],
    ],
  },
  {
    name: "Sutura Uraliana (União Europa-Sibéria)",
    type: "suture",
    coords: [
      [72.0, 62.0],
      [68.0, 60.0],
      [62.0, 58.0],
      [56.0, 59.0],
      [50.0, 57.0],
      [44.0, 55.0],
      [38.0, 52.0],
    ],
  },
  {
    name: "Rifteamento Inicial do Atlântico Central (Cisão Laurásia-Noroeste Africano)",
    type: "rift",
    coords: [
      [36.0, -48.0],
      [31.0, -42.0],
      [26.0, -36.0],
      [20.0, -32.0],
      [14.0, -30.0],
      [8.0, -28.0],
      [0.0, -29.0],
      [-8.0, -32.0],
    ],
  },
  {
    name: "Zona de Cisalhamento Gondwana Sul-Atlântico (Proto-divisão América do Sul / África)",
    type: "rift",
    coords: [
      [-5.0, -36.0],
      [-12.0, -39.0],
      [-20.0, -43.0],
      [-28.0, -48.0],
      [-36.0, -54.0],
      [-45.0, -62.0],
      [-54.0, -68.0],
    ],
  },
  {
    name: "Margem de Subducção do Mar de Tétis (Cimmeriana)",
    type: "subduction",
    coords: [
      [34.0, 15.0],
      [35.5, 30.0],
      [33.0, 48.0],
      [30.0, 65.0],
      [26.0, 82.0],
      [22.0, 98.0],
      [16.0, 112.0],
      [8.0, 122.0],
    ],
  },
  {
    name: "Anel de Subducção Circumpanthalassa Ocidental (Borda Pacífica Primitiva)",
    type: "subduction",
    coords: [
      [65.0, -150.0],
      [50.0, -135.0],
      [35.0, -122.0],
      [20.0, -112.0],
      [5.0, -102.0],
      [-12.0, -92.0],
      [-28.0, -82.0],
      [-45.0, -75.0],
      [-60.0, -70.0],
    ],
  },
  {
    name: "Anel de Subducção Circumpanthalassa Oriental (Borda Asiática-Austral)",
    type: "subduction",
    coords: [
      [70.0, 160.0],
      [55.0, 150.0],
      [40.0, 142.0],
      [25.0, 138.0],
      [10.0, 136.0],
      [-8.0, 140.0],
      [-25.0, 148.0],
      [-42.0, 156.0],
      [-60.0, 165.0],
    ],
  },
  {
    name: "Cinturão Orogênico de Samfrau (Margem Sul do Gondwana)",
    type: "suture",
    coords: [
      [-54.0, -68.0],
      [-62.0, -45.0],
      [-68.0, -15.0],
      [-70.0, 20.0],
      [-67.0, 55.0],
      [-63.0, 90.0],
      [-58.0, 125.0],
      [-52.0, 145.0],
    ],
  },
  {
    name: "Fratura Tectônica Proto-Indiana / Madagascar",
    type: "rift",
    coords: [
      [-10.0, 48.0],
      [-18.0, 52.0],
      [-28.0, 56.0],
      [-40.0, 62.0],
      [-52.0, 70.0],
    ],
  },
  {
    name: "Cinturão de Sutura Cathaysia / Norte da China",
    type: "suture",
    coords: [
      [42.0, 105.0],
      [38.0, 114.0],
      [34.0, 118.0],
      [28.0, 115.0],
      [22.0, 108.0],
    ],
  },
];

export const PaleoPlatesLayer: React.FC = () => {
  const lineMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const glowMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const [externalPlateLines, setExternalPlateLines] = useState<THREE.Vector3[][]>([]);

  // Attempt to load external GPlates TopoJSON / GeoJSON if available
  useEffect(() => {
    let isMounted = true;
    fetch("/data/paleo/pangea-plates-250ma.json")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!isMounted || !data) return;
        const lines: THREE.Vector3[][] = [];

        // Parse GeoJSON FeatureCollection or TopoJSON
        const features = data.features || (data.objects && Object.values(data.objects)[0]);
        if (Array.isArray(features)) {
          for (const feat of features) {
            const geom = feat.geometry || feat;
            if (geom && (geom.type === "LineString" || geom.type === "MultiLineString")) {
              const multi = geom.type === "MultiLineString" ? geom.coordinates : [geom.coordinates];
              for (const line of multi) {
                const pts: THREE.Vector3[] = [];
                for (let i = 0; i < line.length - 1; i++) {
                  const [lng1, lat1] = line[i];
                  const [lng2, lat2] = line[i + 1];
                  const vA = latLngToVector3(lat1, lng1, PALEO_PLATES_ALTITUDE);
                  const vB = latLngToVector3(lat2, lng2, PALEO_PLATES_ALTITUDE);
                  const steps = 6;
                  for (let s = 0; s < steps; s++) {
                    const t1 = s / steps;
                    const t2 = (s + 1) / steps;
                    const p1 = slerpVectors(vA, vB, t1).normalize().multiplyScalar(PALEO_PLATES_ALTITUDE);
                    const p2 = slerpVectors(vA, vB, t2).normalize().multiplyScalar(PALEO_PLATES_ALTITUDE);
                    pts.push(p1);
                    pts.push(p2);
                  }
                }
                if (pts.length > 1) lines.push(pts);
              }
            }
          }
        }
        if (lines.length > 0) {
          setExternalPlateLines(lines);
        }
      })
      .catch(() => {
        // Graceful fallback to canonical embedded zones
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Construct plate boundaries line segments at radius 1.002
  const { coreGeometry, glowGeometry } = useMemo(() => {
    const points: THREE.Vector3[] = [];

    // 1. Process canonical Pangea tectonic zones
    for (const zone of PANGEA_TECTONIC_ZONES) {
      for (let i = 0; i < zone.coords.length - 1; i++) {
        const [lat1, lng1] = zone.coords[i];
        const [lat2, lng2] = zone.coords[i + 1];

        const vA = latLngToVector3(lat1, lng1, PALEO_PLATES_ALTITUDE);
        const vB = latLngToVector3(lat2, lng2, PALEO_PLATES_ALTITUDE);

        // Subdivide along spherical arc for curvature alignment
        const steps = 6;
        for (let s = 0; s < steps; s++) {
          const t1 = s / steps;
          const t2 = (s + 1) / steps;
          const p1 = slerpVectors(vA, vB, t1).normalize().multiplyScalar(PALEO_PLATES_ALTITUDE);
          const p2 = slerpVectors(vA, vB, t2).normalize().multiplyScalar(PALEO_PLATES_ALTITUDE);
          points.push(p1);
          points.push(p2);
        }
      }
    }

    // 2. Process external loaded lines if any (only if not already duplicating canonical zones)
    if (externalPlateLines.length > 0 && externalPlateLines.length !== PANGEA_TECTONIC_ZONES.length) {
      for (const line of externalPlateLines) {
        points.push(...line);
      }
    }

    const coreGeo = new THREE.BufferGeometry().setFromPoints(points);
    const glowGeo = new THREE.BufferGeometry().setFromPoints(points);

    return {
      coreGeometry: coreGeo,
      glowGeometry: glowGeo,
    };
  }, [externalPlateLines]);

  // Materials with geothermal amber glow
  const { coreMaterial, glowMaterial } = useMemo(() => {
    const core = new THREE.LineBasicMaterial({
      color: "#f59e0b", // Amber gold
      transparent: true,
      opacity: 0.75,
      linewidth: 1.5,
      depthWrite: false,
    });

    const glow = new THREE.LineBasicMaterial({
      color: "#d97706",
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      linewidth: 2,
      depthWrite: false,
    });

    return { coreMaterial: core, glowMaterial: glow };
  }, []);

  // WebGL disposal of geometries and materials on unmount
  useEffect(() => {
    return () => {
      coreGeometry.dispose();
      glowGeometry.dispose();
      coreMaterial.dispose();
      glowMaterial.dispose();
    };
  }, [coreGeometry, glowGeometry, coreMaterial, glowMaterial]);

  // Subtle geothermal energy pulse directly animating materials
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const pulse = 0.65 + Math.sin(time * 2.2) * 0.15;

    coreMaterial.opacity = pulse;
    glowMaterial.opacity = pulse * 0.45;
  });

  return (
    <group name="paleo-plates-layer">
      {/* Soft subterranean glow line */}
      <lineSegments
        geometry={glowGeometry}
        material={glowMaterial}
        ref={glowMaterialRef}
        raycast={() => null}
      />

      {/* Core amber tectonic fracture line */}
      <lineSegments
        geometry={coreGeometry}
        material={coreMaterial}
        ref={lineMaterialRef}
        raycast={() => null}
      />
    </group>
  );
};
