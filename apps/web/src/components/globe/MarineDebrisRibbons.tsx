"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { getContemporarySpatialIndex } from "@/lib/historical-topology";
import { simulateDriftTrajectories } from "@/lib/marine-debris-data";

const TRAJECTORY_RADIUS = 1.0115;
const DEG2RAD = Math.PI / 180;
const MAX_DELTA_SECONDS = 0.05;

/** Projeção esférica paramétrica não-espelhada (AGENTS.md §1). */
export function debrisSphericalPoint(
  lat: number,
  lng: number,
  radius: number,
  out: [number, number, number]
) {
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lng + 180) * DEG2RAD;
  const sinPhi = Math.sin(phi);
  out[0] = -(radius * sinPhi * Math.cos(theta));
  out[1] = radius * Math.cos(phi);
  out[2] = radius * sinPhi * Math.sin(theta);
}

/** Subcamada das trajetórias da simulação interativa de deriva (ponto costeiro/oceânico → giro). */
export const DriftSimulationRibbons: React.FC<{ opacity: number }> = ({ opacity }) => {
  const releasePoint = useObservatoryStore((s) => s.marineDebrisReleasePoint);
  const windage = useObservatoryStore((s) => s.marineDebrisWindage);
  const horizonMonths = useObservatoryStore((s) => s.marineDebrisHorizonMonths);
  const currents = useObservatoryStore((s) => s.currents);
  const winds = useObservatoryStore((s) => s.winds);
  const isThrottled = useGlobeStore((s) => s.isThrottled);

  const spatialIndex = useMemo(() => getContemporarySpatialIndex(), []);
  const simulation = useMemo(() => {
    if (!releasePoint) return null;
    return simulateDriftTrajectories({
      origin: releasePoint,
      currents,
      surfaceWind: winds?.surface ?? null,
      windage,
      horizonMonths,
      spatialIndex,
    });
  }, [releasePoint, currents, winds, windage, horizonMonths, spatialIndex]);

  const pulseRef = useRef<THREE.Mesh>(null);
  const pulsePhase = useRef(0);

  const { ribbonGeometry, ribbonMaterial, originPos, centralPts } = useMemo(() => {
    if (!simulation) {
      return {
        ribbonGeometry: null,
        ribbonMaterial: null,
        originPos: null,
        centralPts: [] as [number, number, number][],
      };
    }
    const segCoords: number[] = [];
    const segColors: number[] = [];
    const ptA: [number, number, number] = [0, 0, 0];
    const ptB: [number, number, number] = [0, 0, 0];
    const central: [number, number, number][] = [];

    const startColor = new THREE.Color("#38bdf8");
    const endColor = new THREE.Color("#f97316");
    const tmpColor = new THREE.Color();

    simulation.trajectories.forEach((path, tIdx) => {
      const denom = Math.max(1, path.length - 1);
      for (let i = 0; i < path.length; i++) {
        debrisSphericalPoint(path[i][0], path[i][1], TRAJECTORY_RADIUS, ptA);
        if (tIdx === 0) central.push([ptA[0], ptA[1], ptA[2]]);
        if (i === 0) continue;
        debrisSphericalPoint(path[i - 1][0], path[i - 1][1], TRAJECTORY_RADIUS, ptB);
        segCoords.push(ptB[0], ptB[1], ptB[2], ptA[0], ptA[1], ptA[2]);
        const frac = i / denom;
        tmpColor.copy(startColor).lerp(endColor, frac);
        const dim = tIdx === 0 ? 1.0 : 0.62;
        segColors.push(
          tmpColor.r * dim,
          tmpColor.g * dim,
          tmpColor.b * dim,
          tmpColor.r * dim,
          tmpColor.g * dim,
          tmpColor.b * dim
        );
      }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(segCoords, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(segColors, 3));
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: Math.min(1, opacity * 0.95),
      depthWrite: false,
    });

    const orig: [number, number, number] = [0, 0, 0];
    debrisSphericalPoint(simulation.origin.lat, simulation.origin.lng, TRAJECTORY_RADIUS + 0.002, orig);
    return { ribbonGeometry: geometry, ribbonMaterial: material, originPos: orig, centralPts: central };
  }, [simulation, opacity]);

  useEffect(() => {
    pulsePhase.current = 0;
    return () => {
      ribbonGeometry?.dispose();
      ribbonMaterial?.dispose();
    };
  }, [ribbonGeometry, ribbonMaterial]);

  useFrame((_, delta) => {
    if (isThrottled || !pulseRef.current || centralPts.length < 2) return;
    pulsePhase.current = (pulsePhase.current + Math.min(delta, MAX_DELTA_SECONDS) * 0.28) % 1;
    const fIdx = pulsePhase.current * (centralPts.length - 1);
    const i0 = Math.floor(fIdx);
    const i1 = Math.min(centralPts.length - 1, i0 + 1);
    const t = fIdx - i0;
    const p0 = centralPts[i0];
    const p1 = centralPts[i1];
    pulseRef.current.position.set(
      p0[0] + (p1[0] - p0[0]) * t,
      p0[1] + (p1[1] - p0[1]) * t,
      p0[2] + (p1[2] - p0[2]) * t
    );
  });

  if (!ribbonGeometry || !ribbonMaterial || !originPos) return null;

  return (
    <group>
      <lineSegments geometry={ribbonGeometry} material={ribbonMaterial} frustumCulled={false} renderOrder={7} />
      <mesh position={originPos} renderOrder={8}>
        <sphereGeometry args={[0.011, 14, 14]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={opacity} depthWrite={false} />
      </mesh>
      <mesh ref={pulseRef} position={originPos} renderOrder={8}>
        <sphereGeometry args={[0.0085, 12, 12]} />
        <meshBasicMaterial color="#fb923c" transparent opacity={opacity} depthWrite={false} />
      </mesh>
    </group>
  );
};
