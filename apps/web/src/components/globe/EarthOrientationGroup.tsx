"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSunDirection } from "@/lib/epoch/useSunDirection";
import { earthCosmicLight, earthCosmicOrientation, earthOrientation, sceneDirectionToSun, stepEarthOrientation } from "@/lib/earth-orientation";
import { prefersReducedMotion } from "@/lib/reduced-motion";

const IDENTITY = new THREE.Quaternion();

/**
 * Gira o grupo da Terra (globo, nuvens, atmosfera, fronteiras, Lua) do referencial fixo da Terra
 * para a eclíptica no Cosmos (D21): eixo inclinado 23,4° e lado iluminado voltado para o Sol da
 * cena. No modo Terra fica na identidade. A troca é amortecida para acompanhar o voo da câmera.
 */
export const EarthOrientationGroup: React.FC<{
  cosmic: boolean;
  earthPosition: readonly [number, number, number];
  children: React.ReactNode;
}> = ({ cosmic, earthPosition, children }) => {
  const sun = useSunDirection();
  const group = useRef<THREE.Group>(null);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const target = useMemo(
    () => (cosmic ? earthCosmicOrientation(sun.direction, new THREE.Vector3(...earthPosition)) : IDENTITY.clone()),
    [cosmic, sun.direction, earthPosition]
  );

  const toSun = useMemo(() => sceneDirectionToSun(new THREE.Vector3(...earthPosition)), [earthPosition]);

  // Desmontar volta tudo ao modo Terra (o estado é compartilhado com os shaders da Terra).
  useEffect(
    () => () => {
      earthOrientation.identity();
      earthCosmicLight.weight = 0;
    },
    []
  );

  useFrame((_, delta) => {
    stepEarthOrientation(earthOrientation, target, delta, reducedMotion, { cosmic, toSun });
    group.current?.quaternion.copy(earthOrientation);
  });

  return (
    <group ref={group} name="earth-orientation">
      {children}
    </group>
  );
};
