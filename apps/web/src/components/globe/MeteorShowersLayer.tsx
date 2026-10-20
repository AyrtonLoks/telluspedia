"use client";

import React, { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { calculatePlanetaryPosition } from "@/lib/astronomy-planets";

export const MeteorShowersLayer: React.FC = () => {
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const activeCosmicLayers = useCosmicStore((s) => s.activeCosmicLayers);
  const selectedYear = useTimelineStore((s) => s.selectedYear) || new Date().getUTCFullYear();

  const groupRef = useRef<THREE.Group>(null);
  const showMeteors = isCosmicMode && activeCosmicLayers.includes("METEORS");

  // Generate meteor streaks around Earth's orbital node
  const [geometry, material] = useMemo(() => {
    const meteorCount = 80;
    const positions = new Float32Array(meteorCount * 2 * 3); // 2 vertices per segment

    for (let i = 0; i < meteorCount; i++) {
      // Base position around Earth orbit radius ~28
      const angle = (i / meteorCount) * 0.4 + 1.2; // sector around Earth
      const radius = 27.5 + (Math.random() - 0.5) * 2.5;
      const x0 = radius * Math.cos(angle);
      const z0 = radius * Math.sin(angle);
      const y0 = (Math.random() - 0.5) * 1.5;

      // Radiant direction: incoming high-speed vector
      const dirX = -0.4 + (Math.random() - 0.5) * 0.2;
      const dirY = -0.3 + (Math.random() - 0.5) * 0.2;
      const dirZ = -0.6 + (Math.random() - 0.5) * 0.2;
      const len = 0.8 + Math.random() * 1.4;

      positions[i * 6] = x0;
      positions[i * 6 + 1] = y0;
      positions[i * 6 + 2] = z0;

      positions[i * 6 + 3] = x0 + dirX * len;
      positions[i * 6 + 4] = y0 + dirY * len;
      positions[i * 6 + 5] = z0 + dirZ * len;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.LineBasicMaterial({
      color: "#67e8f9",
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });

    return [geo, mat];
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Subtle pulsing streak animation
  useFrame((_, delta) => {
    if (material && showMeteors) {
      material.opacity = 0.4 + Math.sin(Date.now() * 0.005) * 0.35;
    }
  });

  if (!showMeteors) return null;

  return (
    <group ref={groupRef} name="meteor-showers">
      <lineSegments geometry={geometry} material={material} raycast={() => null} />
    </group>
  );
};
