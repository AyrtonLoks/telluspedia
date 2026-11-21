"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { buildChoroplethDataset } from "@/lib/choropleth";
import {
  CHOROPLETH_TEXTURE_HEIGHT,
  CHOROPLETH_TEXTURE_WIDTH,
  rasterizeChoroplethToCanvas,
} from "@/lib/choropleth-texture";
import { useChoroplethStore } from "@/stores/choroplethStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useCosmicStore } from "@/stores/cosmicStore";

const ignoreRaycast = () => null;

/**
 * Raio 1.0011: imediatamente acima da malha da Terra (1.0) e abaixo das fronteiras base (1.0015),
 * garantindo bordas nítidas e highlights de hover/seleção sempre legíveis acima do mapa temático.
 */
const CHOROPLETH_SPHERE_RADIUS = 1.0011;

interface ChoroplethOverlayProps {
  visible: boolean;
}

/**
 * Camada coroplética O(1) na GPU (D22): uma única SphereGeometry com CanvasTexture equiretangular
 * rasterizada offscreen a partir do Natural Earth 110m (177 países). Oceanos 100% transparentes.
 */
export function ChoroplethOverlay({ visible }: ChoroplethOverlayProps) {
  const activeIndicator = useChoroplethStore((s) => s.activeIndicator);
  const opacity = useChoroplethStore((s) => s.opacity);
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const firmsByCountry = useObservatoryStore((s) => s.firmsByCountry);
  const isFirmsLoading = useObservatoryStore((s) => s.isLoading.NASA_FIRMS);
  const loadLayerData = useObservatoryStore((s) => s.loadLayerData);
  const invalidate = useThree((state) => state.invalidate);
  const gl = useThree((state) => state.gl);

  const shouldRender = visible && !isCosmicMode && activeIndicator !== null;

  // Dispara carga real das contagens FIRMS por país ao selecionar Queimadas 24h
  useEffect(() => {
    if (!shouldRender || activeIndicator !== "NASA_FIRMS") return;
    if (firmsByCountry === null && !isFirmsLoading) {
      void loadLayerData("NASA_FIRMS");
    }
  }, [shouldRender, activeIndicator, firmsByCountry, isFirmsLoading, loadLayerData]);

  const dataset = useMemo(() => {
    if (!shouldRender || !activeIndicator) return null;
    return buildChoroplethDataset(
      activeIndicator,
      activeIndicator === "NASA_FIRMS" ? firmsByCountry : undefined
    );
  }, [shouldRender, activeIndicator, firmsByCountry]);

  const canvasResource = useRef<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
  } | null>(null);

  const geometry = useMemo(
    () => (shouldRender ? new THREE.SphereGeometry(CHOROPLETH_SPHERE_RADIUS, 96, 48) : null),
    [shouldRender]
  );

  const material = useMemo(() => {
    if (!shouldRender) return null;
    return new THREE.MeshBasicMaterial({
      transparent: true,
      opacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      toneMapped: false,
    });
    // Opacidade atualizada no efeito abaixo sem recriar o material.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRender]);

  // Libera recursos WebGL (geometria, material e textura) ao desmontar ou desativar o modo coroplético
  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    return () => {
      material?.dispose();
    };
  }, [material]);

  useEffect(() => {
    if (!shouldRender) {
      if (canvasResource.current) {
        canvasResource.current.texture.dispose();
        canvasResource.current = null;
      }
      return;
    }

    return () => {
      if (canvasResource.current) {
        canvasResource.current.texture.dispose();
        canvasResource.current = null;
      }
    };
  }, [shouldRender]);

  // Rasteriza o indicador atual reutilizando o mesmo CanvasTexture (troca < 20 ms, zero realocação)
  useEffect(() => {
    if (!shouldRender || !dataset || !material || typeof document === "undefined") return;

    if (!canvasResource.current) {
      const canvas = document.createElement("canvas");
      canvas.width = CHOROPLETH_TEXTURE_WIDTH;
      canvas.height = CHOROPLETH_TEXTURE_HEIGHT;
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

    const { ctx, texture } = canvasResource.current;
    rasterizeChoroplethToCanvas(ctx, dataset, CHOROPLETH_TEXTURE_WIDTH, CHOROPLETH_TEXTURE_HEIGHT);
    texture.needsUpdate = true;

    if (material.map !== texture) {
      material.map = texture;
      material.needsUpdate = true;
    }
    invalidate();
  }, [shouldRender, dataset, material, gl, invalidate]);

  useEffect(() => {
    if (!material) return;
    material.opacity = opacity;
    invalidate();
  }, [material, opacity, invalidate]);

  if (!shouldRender || !geometry || !material) return null;

  return (
    <mesh
      name="choropleth-overlay"
      geometry={geometry}
      material={material}
      renderOrder={0}
      raycast={ignoreRaycast}
    />
  );
}
