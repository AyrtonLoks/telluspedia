"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useCosmicStore } from "@/stores/cosmicStore";
import { RING_RATIOS } from "@/lib/cosmic-scale";
import { planetOrientation, planetSpinRate, rotationPeriodHours, type PlanetId } from "@/lib/planet-orientation";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { planetTexturePath, SATURN_RING_TEXTURE, usePlanetTexture } from "@/lib/textures/planetTextures";
import { applyRingShadow, createRadialRingGeometry, createRingShadowUniforms } from "./planetShading";

interface PlanetBodyProps {
  id: PlanetId;
  radius: number;
  color: string;
  focused: boolean;
  onSelect: (e: ThreeEvent<MouseEvent>) => void;
  onHover: (e: ThreeEvent<PointerEvent>) => void;
  onLeave: () => void;
}

const UP = new THREE.Vector3(0, 1, 0);
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();

/**
 * Esfera de um planeta no Cosmos (D21): textura real (1K ao entrar, 2K em foco), eixo no polo de
 * rotação real, rotação sideral comprimida e, em Saturno, anéis texturizados com sombras mútuas.
 * Fica dentro do grupo posicionado do planeta; o pai desse grupo está na origem do Sol.
 */
export const PlanetBody: React.FC<PlanetBodyProps> = ({ id, radius, color, focused, onSelect, onHover, onLeave }) => {
  const orientation = useMemo(() => planetOrientation(id), [id]);
  const hasRing = id === "SATURN";
  const hasPlainRing = id === "URANUS";

  const base = usePlanetTexture(planetTexturePath(id, "1k"));
  const detail = usePlanetTexture(focused ? planetTexturePath(id, "2k") : null);
  const map = detail ?? base;
  const ringMap = usePlanetTexture(hasRing ? SATURN_RING_TEXTURE : null);

  const uniforms = useMemo(() => createRingShadowUniforms(), []);
  const bodyMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
    return hasRing ? applyRingShadow(m, uniforms, "planet") : m;
  }, [hasRing, uniforms]);
  const ringMaterial = useMemo(() => {
    if (!hasRing) return null;
    const m = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      roughness: 1,
      metalness: 0,
      alphaTest: 0.02,
    });
    return applyRingShadow(m, uniforms, "ring");
  }, [hasRing, uniforms]);
  const ringGeometry = useMemo(
    () => (hasRing ? createRadialRingGeometry(radius * RING_RATIOS.SATURN[0], radius * RING_RATIOS.SATURN[1]) : null),
    [hasRing, radius]
  );

  // Textura chega → material passa a ser branco × mapa; sem textura, a cor sólida do catálogo.
  useEffect(() => {
    bodyMaterial.map = map;
    bodyMaterial.color.set(map ? "#ffffff" : color);
    bodyMaterial.emissive.set(focused && !map ? color : "#000000");
    bodyMaterial.emissiveIntensity = focused && !map ? 0.2 : 0;
    bodyMaterial.needsUpdate = true;
  }, [bodyMaterial, map, color, focused]);

  useEffect(() => {
    uniforms.uRingMap.value = ringMap;
    if (!ringMaterial) return;
    ringMaterial.map = ringMap;
    ringMaterial.color.set(ringMap ? "#ffffff" : "#e2d8b8");
    ringMaterial.opacity = ringMap ? 1 : 0.7;
    ringMaterial.userData.baseOpacity = ringMaterial.opacity;
    ringMaterial.needsUpdate = true;
  }, [ringMap, ringMaterial, uniforms]);

  useEffect(
    () => () => {
      bodyMaterial.dispose();
      ringMaterial?.dispose();
      ringGeometry?.dispose();
    },
    [bodyMaterial, ringMaterial, ringGeometry]
  );

  const anchor = useRef<THREE.Group>(null);
  const tilted = useRef<THREE.Group>(null);
  const spinning = useRef<THREE.Mesh>(null);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  useFrame((_, delta) => {
    const { isPlaying, playbackSpeed } = useCosmicStore.getState();
    const w = planetSpinRate(rotationPeriodHours(id), { isPlaying, playbackSpeed, reducedMotion });
    if (spinning.current && w > 0) spinning.current.rotation.y += w * Math.min(delta, 0.1);

    if (!hasRing || !anchor.current || !tilted.current) return;
    // Uniforms em mundo: o Sol é a origem do grupo pai (inclui a escala da descida, D17).
    anchor.current.parent?.getWorldPosition(uniforms.uSunPos.value);
    anchor.current.getWorldPosition(uniforms.uBodyCenter.value);
    const s = anchor.current.getWorldScale(tmpScale).x;
    uniforms.uBodyRadius.value = radius * s;
    uniforms.uRingInner.value = radius * RING_RATIOS.SATURN[0] * s;
    uniforms.uRingOuter.value = radius * RING_RATIOS.SATURN[1] * s;
    uniforms.uRingNormal.value.copy(UP).applyQuaternion(tilted.current.getWorldQuaternion(tmpQuat));
  });

  return (
    <group ref={anchor}>
      <group ref={tilted} quaternion={orientation}>
        <mesh
          ref={spinning}
          name={`planet-body-${id}`}
          material={bodyMaterial}
          onClick={onSelect}
          onPointerOver={onHover}
          onPointerOut={onLeave}
        >
          <sphereGeometry args={[radius, 48, 32]} />
        </mesh>

        {ringGeometry && ringMaterial && (
          <mesh name="saturn-rings" geometry={ringGeometry} material={ringMaterial} raycast={() => null} />
        )}

        {hasPlainRing && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
            <ringGeometry args={[radius * RING_RATIOS.URANUS[0], radius * RING_RATIOS.URANUS[1], 64]} />
            <meshStandardMaterial color="#bae6fd" side={THREE.DoubleSide} transparent opacity={0.45} roughness={0.8} />
          </mesh>
        )}
      </group>
    </group>
  );
};
