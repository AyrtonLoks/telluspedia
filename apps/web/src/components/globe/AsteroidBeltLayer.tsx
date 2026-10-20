"use client";

import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useCosmicStore } from "@/stores/cosmicStore";

export const AsteroidBeltLayer: React.FC = () => {
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const activeCosmicLayers = useCosmicStore((s) => s.activeCosmicLayers);

  const groupRef = useRef<THREE.Group>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);

  const showAsteroids = isCosmicMode && activeCosmicLayers.includes("ASTEROIDS");
  const asteroidCount = 3000;

  const [geometry, material] = useMemo(() => {
    // Low-poly icosahedron for maximum GPU performance
    const geo = new THREE.IcosahedronGeometry(0.12, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: "#94a3b8",
      roughness: 0.9,
      metalness: 0.1,
    });
    return [geo, mat];
  }, []);

  // Initialize instance matrices once
  useEffect(() => {
    const mesh = instancedMeshRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    const minR = 42.0; // ~2.1 AU mapped
    const maxR = 54.0; // ~3.3 AU mapped

    for (let i = 0; i < asteroidCount; i++) {
      // Semi-major axis with density concentrated near 2.7 AU (R ~ 48)
      const u = Math.random();
      const r = minR + u * (maxR - minR);

      // Random orbital angle
      const theta = Math.random() * 2 * Math.PI;

      // Small inclination dispersion
      const y = (Math.random() - 0.5) * 3.5;

      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);

      dummy.position.set(x, y, z);

      // Random tumbling orientation
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      // Scale variation (Ceres-like to small pebbles)
      const scale = 0.5 + Math.random() * 1.5;
      dummy.scale.set(scale, scale, scale);

      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }, [showAsteroids]);

  // Clean up WebGL resources
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Slow orbital rotation of the asteroid belt
  useFrame((_, delta) => {
    if (groupRef.current && showAsteroids) {
      groupRef.current.rotation.y += delta * 0.008;
    }
  });

  if (!showAsteroids) return null;

  return (
    <group ref={groupRef} name="asteroid-belt">
      <instancedMesh
        ref={instancedMeshRef}
        args={[geometry, material, asteroidCount]}
        raycast={() => null}
      />
    </group>
  );
};
