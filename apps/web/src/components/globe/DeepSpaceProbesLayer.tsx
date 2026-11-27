"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { celestialLabelPriority, type CosmicScaleMode } from "@/lib/cosmic-scale";
import {
  calculateProbePosition,
  computeProbeBasis,
  DEEP_SPACE_PROBE_IDS,
  DEEP_SPACE_PROBES_CATALOG,
  generateProbeTrajectoryPoints,
  type DeepSpaceProbeId,
} from "@/lib/deep-space-probes";
import { resolveEclipseDecimalYear } from "@/lib/eclipses-ids";
import { useI18n } from "@/lib/i18n/useT";
import { isDragRelease } from "@/lib/pointer-intent";
import { focusDeepSpaceProbe } from "@/stores/actions";
import { useSolarSystemVisible } from "@/stores/cosmicExitStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { CelestialLabel, CelestialLabelChip } from "./CelestialLabel";
import { createProbeMaterialPalette, disposeProbeMaterialPalette } from "./probe-materials";
import {
  buildProbeModelGroup,
  disposeBuiltProbeModel,
  type BuiltProbeModel,
} from "./probe-models";

const ignoreRaycast = () => null;

/**
 * Escala visual/real proporcional das sondas:
 * - No modo `"real"` (Terra = 0,11; Lua = 0,03), o JWST em L2 usa escala 0,07 para permanecer
 *   fisicamente menor que a Terra e a Lua na visão conjunta, sem distorção grotesca.
 * - No modo `"visual"` (Terra = 1,0), o JWST usa 0,24 e as sondas interestelares usam 0,48.
 */
export function resolveProbeSceneScale(
  probeId: DeepSpaceProbeId,
  scaleMode: CosmicScaleMode
): number {
  if (probeId === "JWST") {
    return scaleMode === "real" ? 0.07 : 0.24;
  }
  return scaleMode === "real" ? 0.3 : 0.48;
}

/**
 * Camada 3D de Sondas do Espaço Profundo no Modo Cosmos (D41):
 * - Modelos PBR multicomponente de Voyager 1/2, New Horizons e James Webb (JWST · L2);
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
  const activeEclipseId = useCosmicStore((s) => s.activeEclipseId);
  const eclipseOffsetMinutes = useCosmicStore((s) => s.eclipseOffsetMinutes);
  const selectedYear = useTimelineStore((s) => s.selectedYear) || new Date().getUTCFullYear();
  const invalidate = useThree((s) => s.invalidate);

  const showProbes = isSolarSystemVisible && activeCosmicLayers.includes("PROBES");
  const showLabels = activeCosmicLayers.includes("LABELS");

  const effectiveEpoch = useMemo(
    () =>
      activeEclipseId
        ? resolveEclipseDecimalYear(activeEclipseId, eclipseOffsetMinutes)
        : selectedYear,
    [activeEclipseId, eclipseOffsetMinutes, selectedYear]
  );

  // Paleta PBR + modelos 3D estáticos das 4 sondas construídos uma única vez e descartados no unmount (RN21)
  const staticAssets = useMemo(() => {
    const palette = createProbeMaterialPalette();
    const models = {} as Record<DeepSpaceProbeId, BuiltProbeModel>;
    for (const id of DEEP_SPACE_PROBE_IDS) {
      models[id] = buildProbeModelGroup(id, palette);
    }
    const hitGeo = new THREE.SphereGeometry(0.82, 10, 10);
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    return { palette, models, hitGeo, hitMat };
  }, []);

  useEffect(() => {
    return () => {
      for (const id of DEEP_SPACE_PROBE_IDS) {
        disposeBuiltProbeModel(staticAssets.models[id]);
      }
      disposeProbeMaterialPalette(staticAssets.palette);
      staticAssets.hitGeo.dispose();
      staticAssets.hitMat.dispose();
      if (typeof document !== "undefined") {
        document.body.style.cursor = "auto";
      }
    };
  }, [staticAssets]);

  const probeTrails = useMemo(() => {
    if (!showProbes) return [];
    return DEEP_SPACE_PROBE_IDS.map((id: DeepSpaceProbeId) => {
      const meta = DEEP_SPACE_PROBES_CATALOG[id];
      const pos = calculateProbePosition(id, effectiveEpoch, scaleMode);
      const basis = computeProbeBasis(pos.scenePosition);
      const pts = generateProbeTrajectoryPoints(id, effectiveEpoch, scaleMode, 64);
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
        opacity: focusedProbeId === id ? 0.68 : 0.3,
        depthWrite: false,
      });
      return { id, meta, pos, quaternion: basis.quaternion, trailGeo, trailMat };
    });
  }, [showProbes, effectiveEpoch, scaleMode, focusedProbeId]);

  useEffect(() => {
    invalidate();
    return () => {
      for (const item of probeTrails) {
        item.trailGeo.dispose();
        item.trailMat.dispose();
      }
    };
  }, [probeTrails, invalidate]);

  if (!showProbes || probeTrails.length === 0) return null;

  return (
    <group name="deep-space-probes-layer">
      {probeTrails.map((item) => {
        const isFocused = focusedProbeId === item.id;
        const isHovered = hoveredProbeId === item.id;
        const probeScale = resolveProbeSceneScale(item.id, scaleMode);
        const hoverBoost = isHovered ? 1.06 : 1.0;
        const displayName = locale === "en" ? item.meta.nameEn : item.meta.namePt;
        const modelGroup = staticAssets.models[item.id].group;

        return (
          <group key={item.id}>
            <lineSegments
              geometry={item.trailGeo}
              material={item.trailMat}
              raycast={ignoreRaycast}
            />

            <group position={item.pos.scenePosition} scale={probeScale * hoverBoost}>
              <group quaternion={item.quaternion}>
                <primitive object={modelGroup} />
              </group>

              <mesh
                geometry={staticAssets.hitGeo}
                material={staticAssets.hitMat}
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
                  anchorHeight={0.58}
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
