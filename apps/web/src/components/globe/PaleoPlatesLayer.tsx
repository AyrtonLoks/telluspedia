"use client";

import React, { useMemo, useEffect, useRef } from "react";
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
      [62.0, -125.0],
      [48.0, -115.0],
      [32.0, -105.0],
      [16.0, -96.0],
      [0.0, -86.0],
      [-18.0, -78.0],
      [-36.0, -74.0],
      [-54.0, -72.0],
    ],
  },
  {
    name: "Anel de Subducção Circumpanthalassa Oriental (Borda Asiática-Austral)",
    type: "subduction",
    coords: [
      [68.0, 130.0],
      [52.0, 132.0],
      [36.0, 130.0],
      [20.0, 126.0],
      [5.0, 128.0],
      [-15.0, 132.0],
      [-32.0, 138.0],
      [-50.0, 145.0],
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

  // Construct plate boundaries line segments at radius 1.002
  const { coreGeometry, glowGeometry } = useMemo(() => {
    const points: THREE.Vector3[] = [];

    // Process canonical Pangea tectonic zones
    for (const zone of PANGEA_TECTONIC_ZONES) {
      for (let i = 0; i < zone.coords.length - 1; i++) {
        const [lat1, lng1] = zone.coords[i];
        const [lat2, lng2] = zone.coords[i + 1];

        const vA = latLngToVector3(lat1, lng1, PALEO_PLATES_ALTITUDE);
        const vB = latLngToVector3(lat2, lng2, PALEO_PLATES_ALTITUDE);

        // Subdivide along spherical arc for smooth curvature alignment
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

    const coreGeo = new THREE.BufferGeometry().setFromPoints(points);
    const glowGeo = new THREE.BufferGeometry().setFromPoints(points);

    return {
      coreGeometry: coreGeo,
      glowGeometry: glowGeo,
    };
  }, []);

  // Subtle, authentic geothermal materials
  const { coreMaterial, glowMaterial } = useMemo(() => {
    const core = new THREE.LineBasicMaterial({
      color: "#d97706", // Soft warm amber
      transparent: true,
      opacity: 0.32,
      linewidth: 1,
      depthWrite: false,
    });

    const glow = new THREE.LineBasicMaterial({
      color: "#92400e", // Muted terracotta glow
      transparent: true,
      opacity: 0.15,
      blending: THREE.NormalBlending,
      linewidth: 1,
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

  // Subtle, delicate geothermal breath
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const pulse = 0.28 + Math.sin(time * 1.5) * 0.07;

    coreMaterial.opacity = pulse;
    glowMaterial.opacity = pulse * 0.5;
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
