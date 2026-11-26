"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { celestialLabelPriority } from "@/lib/cosmic-scale";
import {
  calculateProbePosition,
  DEEP_SPACE_PROBE_IDS,
  DEEP_SPACE_PROBES_CATALOG,
  generateProbeTrajectoryPoints,
  type DeepSpaceProbeId,
} from "@/lib/deep-space-probes";
import { useI18n } from "@/lib/i18n/useT";
import { isDragRelease } from "@/lib/pointer-intent";
import { focusDeepSpaceProbe } from "@/stores/actions";
import { useSolarSystemVisible } from "@/stores/cosmicExitStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { CelestialLabel, CelestialLabelChip } from "./CelestialLabel";

const ignoreRaycast = () => null;

/**
 * Camada 3D de Sondas do Espaço Profundo no Modo Cosmos (D41):
 * - Voyager 1, Voyager 2, New Horizons e Telescópio Espacial James Webb (L2);
 * - Efemérides calibradas por data da timeline com trilhas 3D e rótulos integrados ao `CelestialLabelManager`;
 * - Descarte explícito de recursos GPU (`RN21`) e handover de câmera livre de `NaN` (`AGENTS.md` §1).
 */
export const DeepSpaceProbesLayer: React.FC = () => {
  const { locale } = useI18n();
  const isSolarSystemVisible = useSolarSystemVisible();
  const activeCosmicLayers = useCosmicStore((s) => s.activeCosmicLayers);
  const focusedProbeId = useCosmicStore((s) => s.focusedProbeId);
  const hoveredProbeId = useCosmicStore((s) => s.hoveredProbeId);
  const setHoveredProbe = useCosmicStore((s) => s.setHoveredProbe);
  const scaleMode = useCosmicStore((s) => s.scaleMode);
  const selectedYear = useTimelineStore((s) => s.selectedYear) || new Date().getUTCFullYear();
  const invalidate = useThree((s) => s.invalidate);

  const showProbes = isSolarSystemVisible && activeCosmicLayers.includes("PROBES");
  const showLabels = activeCosmicLayers.includes("LABELS");

  const { busGeo, dishGeo, ringGeo, hitGeo, hitMat } = useMemo(() => {
    const bGeo = new THREE.OctahedronGeometry(0.28, 0);
    const dGeo = new THREE.ConeGeometry(0.32, 0.22, 12);
    const rGeo = new THREE.RingGeometry(0.52, 0.66, 32);
    const hGeo = new THREE.SphereGeometry(1.15, 10, 10);
    const hMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    return { busGeo: bGeo, dishGeo: dGeo, ringGeo: rGeo, hitGeo: hGeo, hitMat: hMat };
  }, []);

  useEffect(() => {
    return () => {
      busGeo.dispose();
      dishGeo.dispose();
      ringGeo.dispose();
      hitGeo.dispose();
      hitMat.dispose();
      if (typeof document !== "undefined") {
        document.body.style.cursor = "auto";
      }
    };
  }, [busGeo, dishGeo, ringGeo, hitGeo, hitMat]);

  const probeVisuals = useMemo(() => {
    if (!showProbes) return [];
    return DEEP_SPACE_PROBE_IDS.map((id: DeepSpaceProbeId) => {
      const meta = DEEP_SPACE_PROBES_CATALOG[id];
      const pos = calculateProbePosition(id, selectedYear, scaleMode);
      const pts = generateProbeTrajectoryPoints(id, selectedYear, scaleMode, 64);
      const linePos: number[] = [];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!;
        const b = pts[i]!;
        linePos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
      const trailMat = new THREE.LineBasicMaterial({
        color: meta.color,
        transparent: true,
        opacity: focusedProbeId === id ? 0.72 : 0.34,
        depthWrite: false,
      });
      const craftMat = new THREE.MeshBasicMaterial({
        color: meta.color,
        toneMapped: false,
      });
      const haloMat = new THREE.MeshBasicMaterial({
        color: meta.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        toneMapped: false,
      });
      // Antena HGA / escudo solar orientado de volta para o Sol / Terra
      const toOrigin =
        pos.scenePosition.lengthSq() > 1e-6
          ? pos.scenePosition.clone().negate().normalize()
          : new THREE.Vector3(0, 1, 0);
      const dishQuat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        toOrigin
      );
      return { id, meta, pos, trailGeo, trailMat, craftMat, haloMat, dishQuat };
    });
  }, [showProbes, selectedYear, scaleMode, focusedProbeId]);

  useEffect(() => {
    invalidate();
    return () => {
      for (const item of probeVisuals) {
        item.trailGeo.dispose();
        item.trailMat.dispose();
        item.craftMat.dispose();
        item.haloMat.dispose();
      }
    };
  }, [probeVisuals, invalidate]);

  if (!showProbes || probeVisuals.length === 0) return null;

  return (
    <group name="deep-space-probes-layer">
      {probeVisuals.map((item) => {
        const isFocused = focusedProbeId === item.id;
        const isHovered = hoveredProbeId === item.id;
        const probeScale = item.id === "JWST" ? (scaleMode === "real" ? 0.26 : 0.65) : 1.0;
        const displayName = locale === "en" ? item.meta.nameEn : item.meta.namePt;

        return (
          <group key={item.id}>
            <lineSegments
              geometry={item.trailGeo}
              material={item.trailMat}
              raycast={ignoreRaycast}
            />

            <group position={item.pos.scenePosition} scale={probeScale}>
              <mesh geometry={busGeo} material={item.craftMat} raycast={ignoreRaycast} />
              <mesh
                position={[0, 0, 0]}
                quaternion={item.dishQuat}
                geometry={dishGeo}
                material={item.craftMat}
                raycast={ignoreRaycast}
              />

              {(isFocused || isHovered) && (
                <mesh
                  rotation={[-Math.PI / 2, 0, 0]}
                  geometry={ringGeo}
                  material={item.haloMat}
                  raycast={ignoreRaycast}
                />
              )}

              <mesh
                geometry={hitGeo}
                material={hitMat}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isDragRelease(e)) return;
                  focusDeepSpaceProbe(item.id);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredProbe(item.id);
                  if (typeof document !== "undefined") {
                    document.body.style.cursor = "pointer";
                  }
                }}
                onPointerOut={() => {
                  setHoveredProbe(null);
                  if (typeof document !== "undefined") {
                    document.body.style.cursor = "auto";
                  }
                }}
              />

              {showLabels && (
                <CelestialLabel
                  anchorHeight={0.48}
                  priority={celestialLabelPriority(250, {
                    focused: isFocused,
                    hovered: isHovered,
                  })}
                >
                  <CelestialLabelChip
                    name={displayName}
                    focused={isFocused}
                    hovered={isHovered}
                  />
                </CelestialLabel>
              )}
            </group>
          </group>
        );
      })}
    </group>
  );
};
