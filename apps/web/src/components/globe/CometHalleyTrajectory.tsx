"use client";

import React, { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { cn } from "@/components/ui";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useTimelineStore } from "@/stores/timelineStore";
import {
  calculateHalleyPosition,
  generateHalleyOrbitalPath,
} from "@/lib/astronomy-planets";

const ION_PARTICLE_COUNT = 220;
const DUST_PARTICLE_COUNT = 260;

/** Deterministic PRNG (Mulberry32) so particle clouds are reproducible across renders and SSR. */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a soft circular radial-falloff RGBA DataTexture (works identically in GPU and Node/SSR).
 */
export function createRadialFalloffTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const half = (size - 1) / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half) / half;
      const dy = (y - half) / half;
      const r = Math.sqrt(dx * dx + dy * dy);
      const falloff = r >= 1 ? 0 : Math.pow(1 - r, 2.4);

      const idx = (y * size + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.round(falloff * 255);
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Builds an orthonormal basis (u, v) perpendicular to a given unit direction vector.
 */
function buildPerpendicularBasis(dir: THREE.Vector3): [THREE.Vector3, THREE.Vector3] {
  const ref = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(dir, ref).normalize();
  const v = new THREE.Vector3().crossVectors(dir, u).normalize();
  return [u, v];
}

/**
 * Builds the straight, narrow, bluish anti-solar ion (plasma) tail particle cloud.
 */
export function buildIonTailGeometry(
  tailDirection: THREE.Vector3,
  tailLength: number,
  count = ION_PARTICLE_COUNT
): THREE.BufferGeometry {
  const rand = createSeededRandom(19860209);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const axis = tailDirection.clone().normalize();
  const [u, v] = buildPerpendicularBasis(axis);
  const TWO_PI = Math.PI * 2;

  for (let i = 0; i < count; i++) {
    const t = Math.pow(rand(), 1.35);
    const angle = rand() * TWO_PI;
    const radial = Math.sqrt(rand());

    const along = 0.08 + t * tailLength;
    const spread = (0.04 + 0.32 * t) * radial;
    const c = Math.cos(angle) * spread;
    const s = Math.sin(angle) * spread;

    positions[i * 3] = axis.x * along + u.x * c + v.x * s;
    positions[i * 3 + 1] = axis.y * along + u.y * c + v.y * s;
    positions[i * 3 + 2] = axis.z * along + u.z * c + v.z * s;

    // Fade from icy cyan-white near coma to ionized blue at the tip
    const intensity = Math.pow(1 - t, 1.2);
    colors[i * 3] = (0.72 * (1 - t) + 0.2 * t) * intensity;
    colors[i * 3 + 1] = (0.94 * (1 - t) + 0.62 * t) * intensity;
    colors[i * 3 + 2] = (1.0 * (1 - t) + 0.98 * t) * intensity;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/**
 * Builds the broader, warm yellowish dust tail curving smoothly from the anti-solar
 * direction toward the trailing orbital path (-orbitalVelocityDirection).
 */
export function buildDustTailGeometry(
  tailDirection: THREE.Vector3,
  orbitalVelocityDirection: THREE.Vector3,
  dustTailLength: number,
  count = DUST_PARTICLE_COUNT
): THREE.BufferGeometry {
  const rand = createSeededRandom(19860411);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const antiSolar = tailDirection.clone().normalize();
  const trailing = orbitalVelocityDirection.clone().normalize().negate();

  // Orthogonalize trailing direction against anti-solar vector to form the orbital curvature plane
  const curveDir = trailing.clone().addScaledVector(antiSolar, -trailing.dot(antiSolar));
  if (curveDir.lengthSq() < 1e-6) {
    const [fallback] = buildPerpendicularBasis(antiSolar);
    curveDir.copy(fallback);
  } else {
    curveDir.normalize();
  }
  const binormal = new THREE.Vector3().crossVectors(antiSolar, curveDir).normalize();
  const TWO_PI = Math.PI * 2;

  for (let i = 0; i < count; i++) {
    const t = Math.pow(rand(), 1.25);
    const angle = rand() * TWO_PI;
    const radial = Math.sqrt(rand());

    const along = 0.08 + t * dustTailLength * (1 - 0.12 * t);
    const curveOffset = Math.pow(t, 1.85) * dustTailLength * 0.42;
    const fanSpread = (0.06 + 0.68 * Math.pow(t, 1.15)) * radial;

    const cOffset = curveOffset + Math.cos(angle) * fanSpread;
    const bOffset = Math.sin(angle) * fanSpread * 0.62;

    positions[i * 3] = antiSolar.x * along + curveDir.x * cOffset + binormal.x * bOffset;
    positions[i * 3 + 1] = antiSolar.y * along + curveDir.y * cOffset + binormal.y * bOffset;
    positions[i * 3 + 2] = antiSolar.z * along + curveDir.z * cOffset + binormal.z * bOffset;

    // Warm solar-lit dust: cream-white near coma tapering to warm amber
    const intensity = Math.pow(1 - t, 1.25);
    colors[i * 3] = (1.0 * (1 - t) + 0.96 * t) * intensity;
    colors[i * 3 + 1] = (0.94 * (1 - t) + 0.76 * t) * intensity;
    colors[i * 3 + 2] = (0.78 * (1 - t) + 0.44 * t) * intensity;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export const CometHalleyTrajectory: React.FC = () => {
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const activeCosmicLayers = useCosmicStore((s) => s.activeCosmicLayers);
  const focusedBodyId = useCosmicStore((s) => s.focusedBodyId);
  const hoveredBodyId = useCosmicStore((s) => s.hoveredBodyId);
  const focusBody = useCosmicStore((s) => s.focusBody);
  const setHoveredBody = useCosmicStore((s) => s.setHoveredBody);

  const selectedYear = useTimelineStore((s) => s.selectedYear) || new Date().getUTCFullYear();

  const showComets = isCosmicMode && activeCosmicLayers.includes("COMETS");
  const showLabels = activeCosmicLayers.includes("LABELS");

  const isFocused = focusedBodyId === "HALLEY";
  const isHovered = hoveredBodyId === "HALLEY";

  const halley = useMemo(() => calculateHalleyPosition(selectedYear), [selectedYear]);

  // Static GPU resources (orbit curve, small nucleus, invisible pick collider, radial falloff texture, tail materials)
  const {
    orbitGeometry,
    nucleusGeo,
    nucleusMat,
    pickGeo,
    pickMat,
    comaTexture,
    ionTailMat,
    dustTailMat,
  } = useMemo(() => {
    const oGeo = new THREE.BufferGeometry().setFromPoints(generateHalleyOrbitalPath(240));
    const nGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const nMat = new THREE.MeshStandardMaterial({
      color: "#cbd5e1",
      emissive: "#94a3b8",
      emissiveIntensity: 0.35,
      roughness: 0.85,
    });
    const pGeo = new THREE.SphereGeometry(0.45, 12, 12);
    const pMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const texture = createRadialFalloffTexture(64);
    const iMat = new THREE.PointsMaterial({
      size: 0.28,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const dMat = new THREE.PointsMaterial({
      size: 0.42,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    return {
      orbitGeometry: oGeo,
      nucleusGeo: nGeo,
      nucleusMat: nMat,
      pickGeo: pGeo,
      pickMat: pMat,
      comaTexture: texture,
      ionTailMat: iMat,
      dustTailMat: dMat,
    };
  }, []);

  // Dual tail particle geometries — allocated only when Halley is inside the sublimation zone (< 4.5 AU)
  const ionTailGeometry = useMemo(() => {
    if (!showComets || !halley.hasTail || halley.tailLength <= 0) return null;
    return buildIonTailGeometry(halley.tailDirection, halley.tailLength);
  }, [showComets, halley]);

  const dustTailGeometry = useMemo(() => {
    if (!showComets || !halley.hasTail || halley.dustTailLength <= 0) return null;
    return buildDustTailGeometry(
      halley.tailDirection,
      halley.orbitalVelocityDirection,
      halley.dustTailLength
    );
  }, [showComets, halley]);

  useEffect(() => {
    ionTailMat.opacity = halley.tailOpacity;
    dustTailMat.opacity = halley.dustTailOpacity;
  }, [ionTailMat, dustTailMat, halley.tailOpacity, halley.dustTailOpacity]);

  useEffect(() => {
    return () => {
      ionTailGeometry?.dispose();
    };
  }, [ionTailGeometry]);

  useEffect(() => {
    return () => {
      dustTailGeometry?.dispose();
    };
  }, [dustTailGeometry]);

  useEffect(() => {
    return () => {
      orbitGeometry.dispose();
      nucleusGeo.dispose();
      nucleusMat.dispose();
      pickGeo.dispose();
      pickMat.dispose();
      comaTexture.dispose();
      ionTailMat.dispose();
      dustTailMat.dispose();
    };
  }, [
    orbitGeometry,
    nucleusGeo,
    nucleusMat,
    pickGeo,
    pickMat,
    comaTexture,
    ionTailMat,
    dustTailMat,
  ]);

  if (!showComets) return null;

  return (
    <group name="comet-halley">
      {/* Keplerian Trajectory Line */}
      <lineLoop geometry={orbitGeometry}>
        <lineBasicMaterial
          color={isFocused ? "#38bdf8" : halley.isPerihelionPassage ? "#67e8f9" : "#0284c7"}
          transparent
          opacity={isFocused ? 0.8 : halley.isPerihelionPassage ? 0.55 : 0.25}
          linewidth={1}
        />
      </lineLoop>

      {/* Comet Nucleus, Diffuse Coma & Physical Dual Tail */}
      <group position={halley.scenePosition}>
        {/* Small physical nucleus */}
        <mesh geometry={nucleusGeo} material={nucleusMat} />

        {/* Invisible picking sphere so the small nucleus remains easy to click/hover */}
        <mesh
          geometry={pickGeo}
          material={pickMat}
          onClick={(e) => {
            e.stopPropagation();
            focusBody("HALLEY");
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredBody("HALLEY");
          }}
          onPointerOut={() => setHoveredBody(null)}
        />

        {/* Diffuse radial-falloff coma sprite (grows and brightens near the Sun) */}
        <sprite scale={[halley.comaRadius, halley.comaRadius, 1]}>
          <spriteMaterial
            map={comaTexture}
            color={halley.hasTail ? "#e0f7ff" : "#cbd5e1"}
            transparent
            opacity={halley.comaOpacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>

        {/* Dual particle tail — visible only below ~4.5 AU */}
        {halley.hasTail && ionTailGeometry && (
          <points name="halley-ion-tail" geometry={ionTailGeometry} material={ionTailMat} />
        )}
        {halley.hasTail && dustTailGeometry && (
          <points name="halley-dust-tail" geometry={dustTailGeometry} material={dustTailMat} />
        )}

        {/* Discreet screen-space selection halo (replaces oversized 3D ring) */}
        {(isFocused || isHovered) && (
          <Html center className="pointer-events-none select-none">
            <span
              data-testid="halley-selection-halo"
              className={cn(
                "block h-6 w-6 rounded-full border transition-colors duration-fast ease-out",
                isFocused
                  ? "border-accent bg-accent/10 shadow-e1"
                  : "border-fg-muted/60 bg-transparent"
              )}
            />
          </Html>
        )}

        {/* Fixed-pixel label (no distanceFactor) using D14 design tokens */}
        {showLabels && (
          <Html center className="pointer-events-none select-none">
            <span
              data-testid="halley-label"
              className={cn(
                "-translate-y-7 inline-flex items-center gap-1.5 whitespace-nowrap rounded-control border bg-surface/86 px-2 py-0.5 text-caption font-medium shadow-e1 backdrop-blur-md transition-colors duration-fast ease-out",
                isFocused
                  ? "border-accent text-accent"
                  : halley.isPerihelionPassage
                  ? "border-line-strong text-fg"
                  : "border-line text-fg"
              )}
            >
              <span>1P/Halley</span>
              <span className="font-mono tabular-nums text-fg-secondary">
                {halley.distanceSunAu.toFixed(2)} UA
              </span>
              {halley.isPerihelionPassage && (
                <span className="text-cat-science">· Periélio</span>
              )}
            </span>
          </Html>
        )}
      </group>
    </group>
  );
};
