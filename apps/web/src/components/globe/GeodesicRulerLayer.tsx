"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { latLngToVector3, slerpVectors } from "@/lib/geo-spatial";
import {
  EARTH_MEAN_RADIUS_KM,
  GEODESIC_RULER_RADIUS,
  type GeoCoord,
  type RulerWaypoint,
} from "@/lib/geodesic-ruler";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useStudioToolsStore } from "@/stores/studioToolsStore";

const ignoreRaycast = () => null;
const ARC_SEGMENTS_PER_LEG = 64;
const RULER_MARKER_RADIUS = GEODESIC_RULER_RADIUS + 0.0015;

/**
 * Amostra um arco ortodrômico real sobre a esfera em raio `GEODESIC_RULER_RADIUS` (`1.004`)
 * usando `slerpVectors` alinhado à parametrização não-espelhada de `SphereGeometry` (AGENTS.md §1).
 */
export function sampleOrthodromicArcVectors(
  from: GeoCoord,
  to: GeoCoord,
  radius: number = GEODESIC_RULER_RADIUS,
  steps: number = ARC_SEGMENTS_PER_LEG
): THREE.Vector3[] {
  const vStart = latLngToVector3(from.lat, from.lng, radius);
  const vEnd = latLngToVector3(to.lat, to.lng, radius);
  const count = Math.max(8, steps);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= count; i++) {
    pts.push(slerpVectors(vStart, vEnd, i / count));
  }
  return pts;
}

/**
 * Mede o comprimento poligonal acumulado dos segmentos 3D gerados por `sampleOrthodromicArcVectors`
 * reescalado para o raio médio terrestre (usado na verificação `< 0,5%` vs Haversine).
 */
export function computeSampledArcLengthKm(
  from: GeoCoord,
  to: GeoCoord,
  steps: number = ARC_SEGMENTS_PER_LEG
): number {
  const pts = sampleOrthodromicArcVectors(from, to, GEODESIC_RULER_RADIUS, steps);
  let unitChordSum = 0;
  for (let i = 1; i < pts.length; i++) {
    unitChordSum += pts[i]!.distanceTo(pts[i - 1]!) / GEODESIC_RULER_RADIUS;
  }
  return unitChordSum * EARTH_MEAN_RADIUS_KM;
}

function buildRulerLineGeometry(points: readonly RulerWaypoint[]): THREE.BufferGeometry | null {
  if (points.length < 2) return null;
  const positions: number[] = [];

  for (let leg = 1; leg < points.length; leg++) {
    const arc = sampleOrthodromicArcVectors(
      points[leg - 1]!,
      points[leg]!,
      GEODESIC_RULER_RADIUS,
      ARC_SEGMENTS_PER_LEG
    );
    for (let i = 1; i < arc.length; i++) {
      const a = arc[i - 1]!;
      const b = arc[i]!;
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

/**
 * Camada 3D da Régua Geodésica (D37).
 * Carregada sob demanda via `React.lazy` em `GlobeCanvas` com descarte explícito de buffers GPU (RN21).
 */
export const GeodesicRulerLayer: React.FC = () => {
  const rulerPoints = useStudioToolsStore((s) => s.rulerPoints);
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const invalidate = useThree((s) => s.invalidate);

  const lineGeometry = useMemo(
    () => (isCosmicMode ? null : buildRulerLineGeometry(rulerPoints)),
    [isCosmicMode, rulerPoints]
  );

  const lineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: 0x38bdd4,
        transparent: true,
        opacity: 0.96,
        depthWrite: false,
      }),
    []
  );

  const markerGeometry = useMemo(() => new THREE.SphereGeometry(0.0085, 16, 16), []);
  const ringGeometry = useMemo(() => new THREE.RingGeometry(0.011, 0.0155, 24), []);

  const startMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0x34d399, depthWrite: false }),
    []
  );
  const midMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0x38bdd4, depthWrite: false }),
    []
  );
  const endMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xf59e0b, depthWrite: false }),
    []
  );
  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    []
  );

  useEffect(() => {
    invalidate();
    return () => {
      lineGeometry?.dispose();
    };
  }, [lineGeometry, invalidate]);

  useEffect(() => {
    return () => {
      lineMaterial.dispose();
      markerGeometry.dispose();
      ringGeometry.dispose();
      startMaterial.dispose();
      midMaterial.dispose();
      endMaterial.dispose();
      ringMaterial.dispose();
    };
  }, [
    lineMaterial,
    markerGeometry,
    ringGeometry,
    startMaterial,
    midMaterial,
    endMaterial,
    ringMaterial,
  ]);

  const markerTransforms = useMemo(() => {
    if (isCosmicMode) return [];
    const up = new THREE.Vector3(0, 0, 1);
    return rulerPoints.map((pt, idx) => {
      const position = latLngToVector3(pt.lat, pt.lng, RULER_MARKER_RADIUS);
      const normal = position.clone().normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
      return { id: pt.id, idx, total: rulerPoints.length, position, quaternion };
    });
  }, [isCosmicMode, rulerPoints]);

  if (isCosmicMode || rulerPoints.length === 0) return null;

  return (
    <group name="geodesic-ruler-layer">
      {lineGeometry && (
        <lineSegments
          geometry={lineGeometry}
          material={lineMaterial}
          raycast={ignoreRaycast}
          renderOrder={16}
        />
      )}

      {markerTransforms.map(({ id, idx, total, position, quaternion }) => {
        const mat =
          idx === 0
            ? startMaterial
            : idx === total - 1 && total > 1
              ? endMaterial
              : midMaterial;
        return (
          <group key={id} position={position} quaternion={quaternion}>
            <mesh
              geometry={markerGeometry}
              material={mat}
              raycast={ignoreRaycast}
              renderOrder={17}
            />
            <mesh
              geometry={ringGeometry}
              material={ringMaterial}
              raycast={ignoreRaycast}
              renderOrder={17}
            />
          </group>
        );
      })}
    </group>
  );
};
