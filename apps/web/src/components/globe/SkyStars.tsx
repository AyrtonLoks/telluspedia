"use client";

import React, { useMemo, useEffect } from "react";
import * as THREE from "three";
import { useCosmicStore } from "@/stores/cosmicStore";
import {
  generateHygCatalog,
  equatorialToVector3,
  bvToRgb,
  IAU_CONSTELLATIONS,
  BRIGHT_STARS,
} from "@/lib/hyg-star-data";

export const SkyStars: React.FC = () => {
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const activeCosmicLayers = useCosmicStore((s) => s.activeCosmicLayers);

  const showConstellations = !isCosmicMode || activeCosmicLayers.includes("CONSTELLATIONS");

  // Sphere radius for deep-space background vault
  const vaultRadius = 450;

  // 1. Generate full HYG 3,500+ stars geometry and material with real B-V colors
  const [starsGeometry, starsMaterial] = useMemo(() => {
    const catalog = generateHygCatalog(3600);
    const count = catalog.length;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const star = catalog[i];
      const vec = equatorialToVector3(star.ra, star.dec, vaultRadius);

      positions[i * 3] = vec.x;
      positions[i * 3 + 1] = vec.y;
      positions[i * 3 + 2] = vec.z;

      const rgb = bvToRgb(star.bv);
      // Brightness scaling based on apparent magnitude V
      const brightness = Math.max(0.4, 1.0 - (star.vMag - 1.0) * 0.12);

      colors[i * 3] = rgb[0] * brightness;
      colors[i * 3 + 1] = rgb[1] * brightness;
      colors[i * 3 + 2] = rgb[2] * brightness;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 1.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      sizeAttenuation: false,
    });

    return [geo, mat];
  }, [vaultRadius]);

  // 2. Official IAU Constellation line segments and vertex stars
  const [constellationGeometry, constellationMaterial, vertexGeometry, vertexMaterial] = useMemo(() => {
    const linePoints: THREE.Vector3[] = [];
    const vertexPoints: THREE.Vector3[] = [];

    for (const c of IAU_CONSTELLATIONS) {
      for (const seg of c.lines) {
        const v1 = equatorialToVector3(seg[0][0], seg[0][1], vaultRadius * 0.99);
        const v2 = equatorialToVector3(seg[1][0], seg[1][1], vaultRadius * 0.99);
        linePoints.push(v1, v2);
        vertexPoints.push(v1, v2);
      }
    }

    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: "#38bdf8",
      transparent: true,
      opacity: 0.18,
      depthTest: true,
      depthWrite: false,
    });

    const vGeo = new THREE.BufferGeometry().setFromPoints(vertexPoints);
    const vMat = new THREE.PointsMaterial({
      size: 2.5,
      color: "#a5f3fc",
      transparent: true,
      opacity: 0.85,
      depthTest: true,
      depthWrite: false,
      sizeAttenuation: false,
    });

    return [lineGeo, lineMat, vGeo, vMat];
  }, [vaultRadius]);

  // Dispose all WebGL resources on unmount
  useEffect(() => {
    return () => {
      starsGeometry.dispose();
      starsMaterial.dispose();
      constellationGeometry.dispose();
      constellationMaterial.dispose();
      vertexGeometry.dispose();
      vertexMaterial.dispose();
    };
  }, [
    starsGeometry,
    starsMaterial,
    constellationGeometry,
    constellationMaterial,
    vertexGeometry,
    vertexMaterial,
  ]);

  return (
    <group name="celestial-vault">
      {/* 3,500+ HYG Starfield with B-V Spectral Colors */}
      <points geometry={starsGeometry} material={starsMaterial} raycast={() => null} />

      {/* IAU Constellations */}
      {showConstellations && (
        <>
          <lineSegments
            geometry={constellationGeometry}
            material={constellationMaterial}
            raycast={() => null}
          />
          <points
            geometry={vertexGeometry}
            material={vertexMaterial}
            raycast={() => null}
          />
        </>
      )}
    </group>
  );
};
