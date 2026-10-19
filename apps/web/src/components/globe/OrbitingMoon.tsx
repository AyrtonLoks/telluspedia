"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export const OrbitingMoon: React.FC = () => {
  const moonRef = useRef<THREE.Mesh>(null);
  const orbitGroupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (orbitGroupRef.current) {
      // Slow realistic orbital revolution
      orbitGroupRef.current.rotation.y += delta * 0.04;
    }
    if (moonRef.current) {
      // Synchronous rotation (tidally locked)
      moonRef.current.rotation.y += delta * 0.04;
    }
  });

  return (
    <group ref={orbitGroupRef}>
      <mesh ref={moonRef} position={[3.6, 0.4, 0]}>
        <sphereGeometry args={[0.27, 32, 32]} />
        <meshStandardMaterial
          color="#d1d5db"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
};
