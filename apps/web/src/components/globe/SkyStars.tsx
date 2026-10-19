"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

export const SkyStars: React.FC = () => {
  // Generate spherical starfield
  const [starsGeometry, starsMaterial] = useMemo(() => {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Uniform distribution on sphere radius ~70
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 70 + (Math.random() - 0.5) * 10;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Subtle celestial spectral classes (white, blue, amber)
      const colorType = Math.random();
      if (colorType > 0.85) {
        colors[i * 3] = 0.9;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 1.0;
      } else if (colorType > 0.7) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 0.6;
      } else {
        colors[i * 3] = 0.8;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 0.9;
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.9,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    return [geom, mat];
  }, []);

  // Symbolic IAU constellation lines (e.g., Southern Cross Crux, Orion belt, Big Dipper)
  const constellationGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [
      // Crux (Southern Cross)
      new THREE.Vector3(-15, -45, 45).normalize().multiplyScalar(68),
      new THREE.Vector3(-15, -55, 45).normalize().multiplyScalar(68),
      new THREE.Vector3(-20, -50, 45).normalize().multiplyScalar(68),
      new THREE.Vector3(-10, -50, 45).normalize().multiplyScalar(68),
      // Orion belt & frame
      new THREE.Vector3(12, 10, -65).normalize().multiplyScalar(68),
      new THREE.Vector3(10, 0, -65).normalize().multiplyScalar(68),
      new THREE.Vector3(10, 0, -65).normalize().multiplyScalar(68),
      new THREE.Vector3(8, -10, -65).normalize().multiplyScalar(68),
      new THREE.Vector3(12, 10, -65).normalize().multiplyScalar(68),
      new THREE.Vector3(22, 12, -65).normalize().multiplyScalar(68),
      new THREE.Vector3(8, -10, -65).normalize().multiplyScalar(68),
      new THREE.Vector3(18, -12, -65).normalize().multiplyScalar(68),
    ];

    const geom = new THREE.BufferGeometry();
    geom.setFromPoints(points);
    return geom;
  }, []);

  return (
    <group>
      <points geometry={starsGeometry} material={starsMaterial} raycast={() => null} />
      <lineSegments geometry={constellationGeometry} raycast={() => null}>
        <lineBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.2}
          linewidth={1}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
};
