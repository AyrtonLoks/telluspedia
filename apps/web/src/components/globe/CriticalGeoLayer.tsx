"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import {
  buildMtciDataset,
  VERTICALITY_CORRIDORS,
  VERTICALITY_HUBS,
} from "@/lib/critical-geo-catalog";
import {
  FOUR_BRAZILS_TEXTURE_HEIGHT,
  FOUR_BRAZILS_TEXTURE_WIDTH,
  getFourBrazilsDatasetSync,
  loadFourBrazilsDataset,
  rasterizeFourBrazilsToCanvas,
  rasterizeHorizontalitiesToCanvas,
  rasterizeMtciToCanvas,
  type FourBrazilsDataset,
} from "@/lib/four-brazils-data";
import { useCriticalGeoStore } from "@/stores/criticalGeoStore";
import { useCosmicStore } from "@/stores/cosmicStore";

const ignoreRaycast = () => null;
const MTCI_SPHERE_RADIUS = 1.0013;
const FOUR_BRAZILS_SPHERE_RADIUS = 1.0024;
const VERTICALITY_HUB_RADIUS = 1.009;

/** Projeção esférica paramétrica não-espelhada alinhada à SphereGeometry do Three.js (AGENTS.md §1). */
function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/** Constrói arcos geodésicos elevados conectando nós globais de verticalidade. */
function buildVerticalityArcGeometry(): THREE.BufferGeometry {
  const hubById = new Map(VERTICALITY_HUBS.map((h) => [h.id, h]));
  const positions: number[] = [];
  const SEGMENTS = 44;

  for (const [fromId, toId] of VERTICALITY_CORRIDORS) {
    const a = hubById.get(fromId);
    const b = hubById.get(toId);
    if (!a || !b) continue;

    const v0 = latLngToVec3(a.lat, a.lng, 1).normalize();
    const v1 = latLngToVec3(b.lat, b.lng, 1).normalize();
    const dot = Math.max(-1, Math.min(1, v0.dot(v1)));
    const omega = Math.acos(dot);
    const sinOmega = Math.sin(omega);
    const peakLift = 0.045 + Math.min(0.18, (omega / Math.PI) * 0.22);

    let prev: THREE.Vector3 | null = null;
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      let dir: THREE.Vector3;
      if (sinOmega < 1e-4) {
        dir = v0.clone().lerp(v1, t).normalize();
      } else {
        const w0 = Math.sin((1 - t) * omega) / sinOmega;
        const w1 = Math.sin(t * omega) / sinOmega;
        dir = v0.clone().multiplyScalar(w0).addScaledVector(v1, w1).normalize();
      }
      const r = 1.006 + Math.sin(Math.PI * t) * peakLift;
      const pt = dir.multiplyScalar(r);
      if (prev) {
        positions.push(prev.x, prev.y, prev.z, pt.x, pt.y, pt.z);
      }
      prev = pt;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

/**
 * Camada 3D das Lentes de Geografia Crítica — Legado de Milton Santos (D36).
 * Carregada sob demanda via `React.lazy` (0 bytes em `/`) e com descarte rigoroso na GPU (RN21).
 */
export function CriticalGeoLayer() {
  const activeLens = useCriticalGeoStore((s) => s.activeLens);
  const selectedRegionId = useCriticalGeoStore((s) => s.selectedRegionId);
  const verticalityMode = useCriticalGeoStore((s) => s.verticalityMode);
  const showIbgeComparison = useCriticalGeoStore((s) => s.showIbgeComparison);
  const opacity = useCriticalGeoStore((s) => s.opacity);
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);

  const [fourBrazilsData, setFourBrazilsData] = useState<FourBrazilsDataset | null>(() =>
    getFourBrazilsDatasetSync()
  );

  // Carrega `public/data/four-brazils.json` sob demanda apenas quando FOUR_BRAZILS está ativa
  useEffect(() => {
    if (activeLens !== "FOUR_BRAZILS") return;
    const sync = getFourBrazilsDatasetSync();
    if (sync) {
      setFourBrazilsData(sync);
      return;
    }
    let alive = true;
    void loadFourBrazilsDataset().then((loaded) => {
      if (alive && loaded) setFourBrazilsData(loaded);
    });
    return () => {
      alive = false;
    };
  }, [activeLens]);

  const showHorizontalities =
    !isCosmicMode &&
    activeLens === "VERTICALITIES" &&
    (verticalityMode === "horizontalities" || verticalityMode === "both");
  const isRasterLens =
    !isCosmicMode &&
    (activeLens === "MTCI" ||
      activeLens === "VERTICALITIES" ||
      (activeLens === "FOUR_BRAZILS" && fourBrazilsData !== null));
  const isVerticalities =
    !isCosmicMode &&
    activeLens === "VERTICALITIES" &&
    (verticalityMode === "verticalities" || verticalityMode === "both");

  const rasterRadius = activeLens === "FOUR_BRAZILS" ? FOUR_BRAZILS_SPHERE_RADIUS : MTCI_SPHERE_RADIUS;
  const rasterVisible =
    activeLens === "MTCI" || activeLens === "FOUR_BRAZILS" || showHorizontalities;

  const sphereGeometry = useMemo(
    () =>
      isRasterLens
        ? new THREE.SphereGeometry(
            rasterRadius,
            activeLens === "FOUR_BRAZILS" ? 128 : 96,
            activeLens === "FOUR_BRAZILS" ? 64 : 48
          )
        : null,
    [isRasterLens, rasterRadius, activeLens]
  );

  const sphereMaterial = useMemo(() => {
    if (!isRasterLens) return null;
    return new THREE.MeshBasicMaterial({
      transparent: true,
      opacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      toneMapped: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRasterLens]);

  const canvasResource = useRef<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
  } | null>(null);

  // Descarte WebGL rigoroso (RN21)
  useEffect(() => () => { sphereGeometry?.dispose(); }, [sphereGeometry]);
  useEffect(() => () => { sphereMaterial?.dispose(); }, [sphereMaterial]);
  useEffect(() => {
    if (!isRasterLens && canvasResource.current) {
      canvasResource.current.texture.dispose();
      canvasResource.current = null;
    }
    return () => {
      if (canvasResource.current) {
        canvasResource.current.texture.dispose();
        canvasResource.current = null;
      }
    };
  }, [isRasterLens]);

  // Rasteriza MTCI, Horizontalidades ou Quatro Brasis na CanvasTexture reutilizada
  useEffect(() => {
    if (!isRasterLens || !rasterVisible || !sphereMaterial || typeof document === "undefined") return;
    if (!canvasResource.current) {
      const canvas = document.createElement("canvas");
      canvas.width = activeLens === "FOUR_BRAZILS" ? FOUR_BRAZILS_TEXTURE_WIDTH : 1024;
      canvas.height = activeLens === "FOUR_BRAZILS" ? FOUR_BRAZILS_TEXTURE_HEIGHT : 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
      canvasResource.current = { canvas, ctx, texture };
    }

    const { canvas, ctx, texture } = canvasResource.current;
    if (activeLens === "MTCI") {
      rasterizeMtciToCanvas(ctx, buildMtciDataset(), canvas.width, canvas.height);
    } else if (showHorizontalities) {
      rasterizeHorizontalitiesToCanvas(ctx, canvas.width, canvas.height);
    } else if (activeLens === "FOUR_BRAZILS" && fourBrazilsData) {
      rasterizeFourBrazilsToCanvas(
        ctx,
        fourBrazilsData,
        { selectedRegionId, showIbgeComparison },
        canvas.width,
        canvas.height
      );
    }
    texture.needsUpdate = true;
    if (sphereMaterial.map !== texture) {
      sphereMaterial.map = texture;
      sphereMaterial.needsUpdate = true;
    }
    invalidate();
  }, [
    isRasterLens,
    rasterVisible,
    activeLens,
    showHorizontalities,
    fourBrazilsData,
    selectedRegionId,
    showIbgeComparison,
    sphereMaterial,
    gl,
    invalidate,
  ]);

  useEffect(() => {
    if (!sphereMaterial) return;
    sphereMaterial.opacity = opacity;
    invalidate();
  }, [sphereMaterial, opacity, invalidate]);

  // Geometrias 3D para a lente Verticalidades (arcos geodésicos + pinos de nós de comando)
  const verticalityArcsGeometry = useMemo(
    () => (isVerticalities ? buildVerticalityArcGeometry() : null),
    [isVerticalities]
  );
  const verticalityArcsMaterial = useMemo(
    () =>
      isVerticalities
        ? new THREE.LineBasicMaterial({
            color: "#38BDF8",
            transparent: true,
            opacity: Math.min(1, opacity + 0.1),
            depthWrite: false,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isVerticalities]
  );
  const hubGeometry = useMemo(
    () => (isVerticalities ? new THREE.SphereGeometry(0.013, 14, 14) : null),
    [isVerticalities]
  );
  const hubMaterial = useMemo(
    () =>
      isVerticalities
        ? new THREE.MeshBasicMaterial({
            color: "#7BE3F6",
            transparent: true,
            opacity: 0.95,
            toneMapped: false,
          })
        : null,
    [isVerticalities]
  );

  useEffect(() => () => { verticalityArcsGeometry?.dispose(); }, [verticalityArcsGeometry]);
  useEffect(() => () => { verticalityArcsMaterial?.dispose(); }, [verticalityArcsMaterial]);
  useEffect(() => () => { hubGeometry?.dispose(); }, [hubGeometry]);
  useEffect(() => () => { hubMaterial?.dispose(); }, [hubMaterial]);

  useEffect(() => {
    if (verticalityArcsMaterial) {
      verticalityArcsMaterial.opacity = Math.min(1, opacity + 0.1);
      invalidate();
    }
  }, [verticalityArcsMaterial, opacity, invalidate]);

  const hubPositions = useMemo(
    () =>
      isVerticalities
        ? VERTICALITY_HUBS.map((hub) => ({
            id: hub.id,
            position: latLngToVec3(hub.lat, hub.lng, VERTICALITY_HUB_RADIUS),
          }))
        : [],
    [isVerticalities]
  );

  if (isCosmicMode || !activeLens) return null;

  return (
    <group name="critical-geo-milton-santos">
      {isRasterLens && sphereGeometry && sphereMaterial && (
        <mesh
          name={`critical-geo-${activeLens.toLowerCase()}`}
          visible={rasterVisible}
          geometry={sphereGeometry}
          material={sphereMaterial}
          renderOrder={1}
          raycast={ignoreRaycast}
        />
      )}
      {isVerticalities && verticalityArcsGeometry && verticalityArcsMaterial && (
        <lineSegments
          name="critical-geo-verticalities-arcs"
          geometry={verticalityArcsGeometry}
          material={verticalityArcsMaterial}
          raycast={ignoreRaycast}
        />
      )}
      {isVerticalities &&
        hubGeometry &&
        hubMaterial &&
        hubPositions.map((hub) => (
          <mesh
            key={hub.id}
            position={hub.position}
            geometry={hubGeometry}
            material={hubMaterial}
            raycast={ignoreRaycast}
          />
        ))}
    </group>
  );
}
