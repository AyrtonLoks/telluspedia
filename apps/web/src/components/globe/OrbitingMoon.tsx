"use client";

import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useTimelineStore } from "@/stores/timelineStore";

export const OrbitingMoon: React.FC = () => {
  const moonRef = useRef<THREE.Mesh>(null);
  const orbitGroupRef = useRef<THREE.Group>(null);
  const { invalidate } = useThree();

  const selectedYear = useTimelineStore((s) => s.selectedYear);
  const selectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);
  const isApolloActive =
    selectedYear === 1969 ||
    selectedMilestoneId === "usa-1969" ||
    selectedMilestoneId === "glo-1969";

  // Load realistic lunar surface texture with immediate render invalidation on load
  const moonTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load("/textures/moon.jpg", () => invalidate());
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [invalidate]);

  useFrame((_, delta) => {
    if (orbitGroupRef.current) {
      if (isApolloActive) {
        // In 1969 Apollo 11 mode, smoothly settle Moon to historical trajectory docking position
        orbitGroupRef.current.rotation.y = THREE.MathUtils.damp(
          orbitGroupRef.current.rotation.y,
          0,
          4,
          delta
        );
      } else {
        // Natural orbital revolution around Earth:
        // Because moonRef is a child of orbitGroup, rotating the orbitGroup inherently
        // maintains true astronomical tidal locking (the same lunar hemisphere faces Earth)
        orbitGroupRef.current.rotation.y += delta * 0.04;
      }
    }
  });

  return (
    <group ref={orbitGroupRef} name="orbiting-moon-group">
      <mesh
        ref={moonRef}
        name="orbiting-moon"
        position={[3.6, 0.4, 0]}
        rotation={[0, Math.PI, 0]}
      >
        <sphereGeometry args={[0.27, 32, 32]} />
        <meshStandardMaterial
          map={moonTexture}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
};
