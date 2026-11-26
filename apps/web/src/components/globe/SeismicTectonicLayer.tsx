"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { latLngToVector3, slerpVectors } from "@/lib/geo-spatial";
import { isDragRelease } from "@/lib/pointer-intent";
import {
  getTectonicPlatesSync,
  loadTectonicPlates,
} from "@/lib/seismic-data";
import type {
  PlateBoundaryType,
  SeismicDepthBand,
  SeismicEvent,
  TectonicPlatesCollection,
} from "@/lib/seismic-types";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";

const PLATES_RADIUS = 1.0022;
const EPICENTER_RADIUS = 1.0038;
const RING_RADIUS = 1.0042;
const ignoreRaycast = () => null;

const DEPTH_COLORS: Record<SeismicDepthBand, THREE.Color> = {
  shallow: new THREE.Color(0xf97316),
  intermediate: new THREE.Color(0xfacc15),
  deep: new THREE.Color(0x38bdf8),
};

const BOUNDARY_HEX: Record<PlateBoundaryType, number> = {
  convergent: 0xf43f5e,
  divergent: 0xf59e0b,
  transform: 0x38bdd4,
};

export function magnitudeToMarkerScale(magnitude: number): number {
  const clamped = Math.max(1.5, Math.min(9.5, magnitude));
  return 0.65 + Math.pow(Math.max(0, clamped - 2.0), 1.32) * 0.34;
}

export function buildPlateBoundaryGeometries(
  collection: TectonicPlatesCollection | null
): Record<PlateBoundaryType, THREE.BufferGeometry | null> {
  const empty: Record<PlateBoundaryType, THREE.BufferGeometry | null> = {
    convergent: null,
    divergent: null,
    transform: null,
  };
  if (!collection) return empty;

  const buckets: Record<PlateBoundaryType, number[]> = {
    convergent: [],
    divergent: [],
    transform: [],
  };

  for (const feature of collection.features) {
    const bType = feature.properties.boundaryType;
    const out = buckets[bType];
    if (!out) continue;
    const coords = feature.geometry.coordinates;
    for (let i = 1; i < coords.length; i++) {
      const [lng1, lat1] = coords[i - 1]!;
      const [lng2, lat2] = coords[i]!;
      // Ignora salto antimeridiano inválido se houver (> 120° de longitude)
      if (Math.abs(lng2 - lng1) > 120) continue;

      const vA = latLngToVector3(lat1, lng1, PLATES_RADIUS);
      const vB = latLngToVector3(lat2, lng2, PLATES_RADIUS);
      const steps = 6;
      for (let s = 0; s < steps; s++) {
        const p1 = slerpVectors(vA, vB, s / steps);
        const p2 = slerpVectors(vA, vB, (s + 1) / steps);
        out.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      }
    }
  }

  for (const kind of ["convergent", "divergent", "transform"] as const) {
    if (buckets[kind].length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(buckets[kind], 3));
      empty[kind] = geo;
    }
  }
  return empty;
}

/**
 * Camada 3D Sísmica & Tectônica Contemporânea (D39):
 * - Epicentros USGS instanciados (`THREE.InstancedMesh`) dimensionados por magnitude e coloridos por profundidade;
 * - Ondas sísmicas concêntricas para sismos significativos (`M >= 5.0` ou alerta de tsunami), respeitando `RN22` (`isThrottled`);
 * - Fronteiras de placas tectônicas contemporâneas (`PB2002`) com descarte explícito na GPU (`RN21`).
 */
export const SeismicTectonicLayer: React.FC = () => {
  const payload = useObservatoryStore((s) => s.earthquakes);
  const showPlates = useObservatoryStore((s) => s.showTectonicPlates);
  const opacity = useObservatoryStore((s) => s.layerOpacity.USGS_EARTHQUAKES ?? 0.95);
  const layerMeta = useObservatoryStore((s) => s.layerMeta.USGS_EARTHQUAKES);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);
  const isThrottled = useGlobeStore((s) => s.isThrottled);
  const invalidate = useThree((s) => s.invalidate);

  const instancedRef = useRef<THREE.InstancedMesh | null>(null);
  const waveRingsGroupRef = useRef<THREE.Group | null>(null);

  const [platesData, setPlatesData] = useState<TectonicPlatesCollection | null>(() =>
    getTectonicPlatesSync()
  );

  useEffect(() => {
    if (!showPlates) return;
    const sync = getTectonicPlatesSync();
    if (sync) {
      setPlatesData(sync);
      return;
    }
    let alive = true;
    void loadTectonicPlates().then((loaded) => {
      if (alive && loaded) setPlatesData(loaded);
    });
    return () => {
      alive = false;
    };
  }, [showPlates]);

  const events: readonly SeismicEvent[] = useMemo(() => payload?.events ?? [], [payload]);

  // Geometrias das fronteiras de placas PB2002
  const plateGeometries = useMemo(
    () => (showPlates ? buildPlateBoundaryGeometries(platesData) : { convergent: null, divergent: null, transform: null }),
    [showPlates, platesData]
  );

  const plateMaterials = useMemo(
    () => ({
      convergent: new THREE.LineBasicMaterial({
        color: BOUNDARY_HEX.convergent,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      }),
      divergent: new THREE.LineBasicMaterial({
        color: BOUNDARY_HEX.divergent,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      }),
      transform: new THREE.LineBasicMaterial({
        color: BOUNDARY_HEX.transform,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      }),
    }),
    []
  );

  useEffect(() => {
    plateMaterials.convergent.opacity = 0.78 * opacity;
    plateMaterials.divergent.opacity = 0.72 * opacity;
    plateMaterials.transform.opacity = 0.72 * opacity;
    invalidate();
  }, [opacity, plateMaterials, invalidate]);

  useEffect(() => {
    invalidate();
    return () => {
      plateGeometries.convergent?.dispose();
      plateGeometries.divergent?.dispose();
      plateGeometries.transform?.dispose();
    };
  }, [plateGeometries, invalidate]);

  // Geometria base dos epicentros (disco tangente à superfície para picking nítido)
  const epicenterGeometry = useMemo(() => new THREE.CircleGeometry(0.0085, 18), []);
  const epicenterMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    []
  );

  const waveRingGeometry = useMemo(() => new THREE.RingGeometry(0.013, 0.0175, 28), []);
  const waveRingMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    []
  );

  useEffect(() => {
    epicenterMaterial.opacity = 0.92 * opacity;
    waveRingMaterial.opacity = 0.65 * opacity;
    invalidate();
  }, [opacity, epicenterMaterial, waveRingMaterial, invalidate]);

  // Descarte explícito de recursos GPU ao desmontar (RN21)
  useEffect(() => {
    return () => {
      plateMaterials.convergent.dispose();
      plateMaterials.divergent.dispose();
      plateMaterials.transform.dispose();
      epicenterGeometry.dispose();
      epicenterMaterial.dispose();
      waveRingGeometry.dispose();
      waveRingMaterial.dispose();
    };
  }, [
    plateMaterials,
    epicenterGeometry,
    epicenterMaterial,
    waveRingGeometry,
    waveRingMaterial,
  ]);

  // Atualiza matrizes e cores por instância de todos os epicentros
  useEffect(() => {
    const mesh = instancedRef.current;
    if (!mesh || events.length === 0) return;

    const zUp = new THREE.Vector3(0, 0, 1);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < events.length; i++) {
      const ev = events[i]!;
      const pos = latLngToVector3(ev.lat, ev.lng, EPICENTER_RADIUS);
      const normal = pos.clone().normalize();
      dummy.position.copy(pos);
      dummy.quaternion.setFromUnitVectors(zUp, normal);
      const s = magnitudeToMarkerScale(ev.magnitude);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, DEPTH_COLORS[ev.depthBand] ?? DEPTH_COLORS.shallow);
    }

    mesh.count = events.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    invalidate();
  }, [events, invalidate]);

  // Anéis concêntricos para sismos maiores (M >= 5.0 ou alerta de tsunami), limitados aos 40 maiores
  const majorQuakeRings = useMemo(() => {
    const zUp = new THREE.Vector3(0, 0, 1);
    return events
      .filter((ev) => ev.magnitude >= 5.0 || ev.tsunamiAlert)
      .slice(0, 40)
      .map((ev) => {
        const position = latLngToVector3(ev.lat, ev.lng, RING_RADIUS);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          zUp,
          position.clone().normalize()
        );
        const baseScale = magnitudeToMarkerScale(ev.magnitude);
        return { id: ev.id, position, quaternion, baseScale };
      });
  }, [events]);

  // Pulso sutil de ondas sísmicas — pausado imediatamente quando `isThrottled === true` (RN22)
  useFrame((state) => {
    if (isThrottled) return;
    const group = waveRingsGroupRef.current;
    if (!group || majorQuakeRings.length === 0) return;
    const t = state.clock.getElapsedTime();
    const wave = 1.0 + ((t * 0.65) % 1.0) * 0.85;
    const fade = (1.0 - ((t * 0.65) % 1.0)) * 0.72 * opacity;
    waveRingMaterial.opacity = Math.max(0.08, fade);
    for (let i = 0; i < group.children.length; i++) {
      const child = group.children[i];
      const spec = majorQuakeRings[i];
      if (child && spec) {
        child.scale.setScalar(spec.baseScale * wave);
      }
    }
  });

  const handleInstanceClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (isDragRelease(e)) return;
    const idx = e.instanceId;
    if (idx === undefined || idx < 0 || idx >= events.length) return;
    const ev = events[idx];
    if (!ev) return;
    setSelectedEntity({
      type: "EARTHQUAKE",
      data: ev,
      meta: layerMeta,
    });
  };

  return (
    <group name="seismic-tectonic-layer">
      {showPlates && plateGeometries.convergent && (
        <lineSegments
          geometry={plateGeometries.convergent}
          material={plateMaterials.convergent}
          raycast={ignoreRaycast}
          renderOrder={11}
        />
      )}
      {showPlates && plateGeometries.divergent && (
        <lineSegments
          geometry={plateGeometries.divergent}
          material={plateMaterials.divergent}
          raycast={ignoreRaycast}
          renderOrder={11}
        />
      )}
      {showPlates && plateGeometries.transform && (
        <lineSegments
          geometry={plateGeometries.transform}
          material={plateMaterials.transform}
          raycast={ignoreRaycast}
          renderOrder={11}
        />
      )}

      {events.length > 0 && (
        <instancedMesh
          key={`seismic-inst-${events.length}`}
          ref={instancedRef}
          args={[epicenterGeometry, epicenterMaterial, events.length]}
          onClick={handleInstanceClick}
          renderOrder={14}
        />
      )}

      {majorQuakeRings.length > 0 && (
        <group ref={waveRingsGroupRef}>
          {majorQuakeRings.map((ring) => (
            <mesh
              key={ring.id}
              position={ring.position}
              quaternion={ring.quaternion}
              geometry={waveRingGeometry}
              material={waveRingMaterial}
              raycast={ignoreRaycast}
              renderOrder={13}
            />
          ))}
        </group>
      )}
    </group>
  );
};
