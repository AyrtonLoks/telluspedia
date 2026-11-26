"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { latLngToVector3, slerpVectors } from "@/lib/geo-spatial";
import { isDragRelease } from "@/lib/pointer-intent";
import {
  CABLE_BASIN_COLORS_HEX,
  getSubmarineCablesSync,
  loadSubmarineCables,
} from "@/lib/submarine-cables-data";
import type {
  CableBasinFilter,
  CableChokePoint,
  SubmarineCableSystem,
  SubmarineCablesDataset,
} from "@/lib/submarine-cables-types";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";

/** Raio esférico exato especificado em D40 (`1.0025`). */
export const SUBMARINE_CABLES_RADIUS = 1.0025;
const LANDING_MARKER_RADIUS = 1.0031;
const CHOKE_RING_RADIUS = 1.0034;

export interface LandingPickEntry {
  cable: SubmarineCableSystem;
  landingName: string;
  countryIso: string;
  lat: number;
  lng: number;
}

export function buildSubmarineCableGeometries(
  cables: readonly SubmarineCableSystem[],
  selectedCableId: string | null
): {
  byCable: Array<{ cable: SubmarineCableSystem; geometry: THREE.BufferGeometry; colorHex: string }>;
} {
  const byCable: Array<{
    cable: SubmarineCableSystem;
    geometry: THREE.BufferGeometry;
    colorHex: string;
  }> = [];

  for (const cable of cables) {
    const positions: number[] = [];
    for (const seg of cable.segments) {
      for (let i = 1; i < seg.length; i++) {
        const [lng1, lat1] = seg[i - 1]!;
        const [lng2, lat2] = seg[i]!;
        if (Math.abs(lng2 - lng1) > 120) continue;

        const vA = latLngToVector3(lat1, lng1, SUBMARINE_CABLES_RADIUS);
        const vB = latLngToVector3(lat2, lng2, SUBMARINE_CABLES_RADIUS);
        const steps = 8;
        for (let s = 0; s < steps; s++) {
          const p1 = slerpVectors(vA, vB, s / steps);
          const p2 = slerpVectors(vA, vB, (s + 1) / steps);
          positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        }
      }
    }

    if (positions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      const baseColor = CABLE_BASIN_COLORS_HEX[cable.basin] ?? "#38bdf8";
      byCable.push({
        cable,
        geometry: geo,
        colorHex: selectedCableId === cable.id ? "#f8fafc" : baseColor,
      });
    }
  }

  return { byCable };
}

export function filterSubmarineCables(
  dataset: SubmarineCablesDataset | null,
  basin: CableBasinFilter
): SubmarineCableSystem[] {
  if (!dataset) return [];
  if (basin === "all") return dataset.cables;
  return dataset.cables.filter((c) => c.basin === basin);
}

/**
 * Camada 3D de Cabos Submarinos de Internet (TeleGeography — D40):
 * - Arcos geodésicos SLERP sutis no raio `1.0025` com picking direto de sistema;
 * - Estações de aterramento (`THREE.InstancedMesh`) e gargalos geopolíticos estratégicos;
 * - Descarte explícito de `BufferGeometry` e `Material` na GPU (`RN21`) e pausa em `isThrottled` (`RN22`).
 */
export const SubmarineCablesLayer: React.FC = () => {
  const basinFilter = useObservatoryStore((s) => s.cableBasinFilter);
  const showChokePoints = useObservatoryStore((s) => s.showCableChokePoints);
  const opacity = useObservatoryStore((s) => s.layerOpacity.SUBMARINE_CABLES ?? 0.9);
  const selectedEntity = useObservatoryStore((s) => s.selectedEntity);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);
  const isThrottled = useGlobeStore((s) => s.isThrottled);
  const invalidate = useThree((s) => s.invalidate);

  const landingMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const chokeRingsRef = useRef<THREE.Group | null>(null);

  const [dataset, setDataset] = useState<SubmarineCablesDataset | null>(() =>
    getSubmarineCablesSync()
  );

  useEffect(() => {
    const sync = getSubmarineCablesSync();
    if (sync) {
      setDataset(sync);
      return;
    }
    let alive = true;
    void loadSubmarineCables().then((loaded) => {
      if (alive && loaded) {
        setDataset(loaded);
        invalidate();
      }
    });
    return () => {
      alive = false;
    };
  }, [invalidate]);

  const selectedCableId =
    selectedEntity?.type === "SUBMARINE_CABLE" ? selectedEntity.data.id : null;

  const visibleCables = useMemo(
    () => filterSubmarineCables(dataset, basinFilter),
    [dataset, basinFilter]
  );

  const chokePoints: readonly CableChokePoint[] = useMemo(
    () => (showChokePoints && dataset ? dataset.chokePoints : []),
    [showChokePoints, dataset]
  );

  const landingEntries = useMemo<LandingPickEntry[]>(() => {
    const list: LandingPickEntry[] = [];
    for (const cable of visibleCables) {
      for (const lp of cable.landingPoints) {
        list.push({
          cable,
          landingName: lp.name,
          countryIso: lp.countryIso,
          lat: lp.lat,
          lng: lp.lng,
        });
      }
    }
    return list;
  }, [visibleCables]);

  const cableItems = useMemo(() => {
    const { byCable } = buildSubmarineCableGeometries(visibleCables, selectedCableId);
    return byCable.map((item) => {
      const isSelected = item.cable.id === selectedCableId;
      const material = new THREE.LineBasicMaterial({
        color: item.colorHex,
        transparent: true,
        opacity: isSelected ? Math.min(1, opacity + 0.15) : opacity * 0.72,
        depthWrite: false,
      });
      return { ...item, material };
    });
  }, [visibleCables, selectedCableId, opacity]);

  useEffect(() => {
    invalidate();
    return () => {
      for (const item of cableItems) {
        item.geometry.dispose();
        item.material.dispose();
      }
    };
  }, [cableItems, invalidate]);

  const landingGeometry = useMemo(() => new THREE.SphereGeometry(0.0055, 8, 8), []);
  const landingMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.92,
        toneMapped: false,
      }),
    []
  );
  const chokeRingGeometry = useMemo(() => new THREE.RingGeometry(0.015, 0.022, 24), []);
  const chokeRingMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );
  const chokeHitGeometry = useMemo(() => new THREE.SphereGeometry(0.024, 10, 10), []);
  const chokeHitMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    []
  );

  useEffect(() => {
    return () => {
      landingGeometry.dispose();
      landingMaterial.dispose();
      chokeRingGeometry.dispose();
      chokeRingMaterial.dispose();
      chokeHitGeometry.dispose();
      chokeHitMaterial.dispose();
    };
  }, [
    landingGeometry,
    landingMaterial,
    chokeRingGeometry,
    chokeRingMaterial,
    chokeHitGeometry,
    chokeHitMaterial,
  ]);

  useEffect(() => {
    landingMaterial.opacity = Math.max(0.25, opacity * 0.92);
    chokeRingMaterial.opacity = Math.max(0.2, opacity * 0.78);
    invalidate();
  }, [opacity, landingMaterial, chokeRingMaterial, invalidate]);

  useEffect(() => {
    const mesh = landingMeshRef.current;
    if (!mesh || landingEntries.length === 0) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < landingEntries.length; i++) {
      const entry = landingEntries[i]!;
      const pos = latLngToVector3(entry.lat, entry.lng, LANDING_MARKER_RADIUS);
      dummy.position.copy(pos);
      dummy.lookAt(0, 0, 0);
      const scale = entry.cable.id === selectedCableId ? 1.45 : 1.0;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      color.set(
        entry.cable.id === selectedCableId
          ? "#f8fafc"
          : (CABLE_BASIN_COLORS_HEX[entry.cable.basin] ?? "#38bdf8")
      );
      mesh.setColorAt(i, color);
    }

    mesh.count = landingEntries.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    invalidate();
  }, [landingEntries, selectedCableId, invalidate]);

  useFrame(({ clock }) => {
    if (isThrottled) return;
    const group = chokeRingsRef.current;
    if (!group || group.children.length === 0) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < group.children.length; i++) {
      const ring = group.children[i];
      if (!ring) continue;
      const phase = (t * 0.65 + i * 0.25) % 1;
      ring.scale.setScalar(0.9 + phase * 0.55);
    }
  });

  const handleSelectCable = (cable: SubmarineCableSystem, landingName?: string) => {
    setSelectedEntity({
      type: "SUBMARINE_CABLE",
      data: cable,
      landingName,
    });
  };

  const handleLandingClick = (e: ThreeEvent<MouseEvent>) => {
    if (isDragRelease(e)) return;
    e.stopPropagation();
    const idx = e.instanceId;
    if (idx === undefined || idx < 0 || idx >= landingEntries.length) return;
    const picked = landingEntries[idx];
    if (picked) handleSelectCable(picked.cable, picked.landingName);
  };

  return (
    <group name="submarine-cables-layer">
      {cableItems.map((item) => (
        <lineSegments
          key={item.cable.id}
          geometry={item.geometry}
          material={item.material}
          onClick={(e) => {
            if (isDragRelease(e)) return;
            e.stopPropagation();
            handleSelectCable(item.cable);
          }}
          onPointerOver={() => {
            if (typeof document !== "undefined") document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            if (typeof document !== "undefined") document.body.style.cursor = "";
          }}
        />
      ))}

      {landingEntries.length > 0 && (
        <instancedMesh
          key={`cables-landings-${landingEntries.length}`}
          ref={landingMeshRef}
          args={[landingGeometry, landingMaterial, Math.max(1, landingEntries.length)]}
          onClick={handleLandingClick}
          onPointerOver={() => {
            if (typeof document !== "undefined") document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            if (typeof document !== "undefined") document.body.style.cursor = "";
          }}
        />
      )}

      {chokePoints.length > 0 && (
        <group ref={chokeRingsRef}>
          {chokePoints.map((cp) => {
            const pos = latLngToVector3(cp.lat, cp.lng, CHOKE_RING_RADIUS);
            const normal = pos.clone().normalize();
            const quat = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              normal
            );
            return (
              <group key={cp.id} position={pos} quaternion={quat}>
                <mesh geometry={chokeRingGeometry} material={chokeRingMaterial} raycast={() => null} />
                <mesh
                  geometry={chokeHitGeometry}
                  material={chokeHitMaterial}
                  onClick={(e) => {
                    if (isDragRelease(e)) return;
                    e.stopPropagation();
                    setSelectedEntity({ type: "CABLE_CHOKE_POINT", data: cp });
                  }}
                  onPointerOver={() => {
                    if (typeof document !== "undefined") document.body.style.cursor = "pointer";
                  }}
                  onPointerOut={() => {
                    if (typeof document !== "undefined") document.body.style.cursor = "";
                  }}
                />
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
};
