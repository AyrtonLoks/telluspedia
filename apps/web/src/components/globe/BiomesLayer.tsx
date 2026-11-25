"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import {
  BIOMES_TEXTURE_HEIGHT,
  BIOMES_TEXTURE_WIDTH,
  getBiomeTopologySync,
  loadBiomeTopology,
  pickBiomeAt,
  rasterizeBiomesToCanvas,
  type BiomeTopology,
} from "@/lib/biomes-data";
import { registerBiomePicker } from "@/lib/biomes-types";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useCosmicStore } from "@/stores/cosmicStore";

const ignoreRaycast = () => null;

/**
 * Raio 1.0013: imediatamente acima da camada coroplética (1.0011) e abaixo das fronteiras (1.0015),
 * preservando bordas geopolíticas nítidas e oceanos 100% transparentes.
 */
const BIOMES_SPHERE_RADIUS = 1.0013;

/**
 * Camada 3D do Mapa dos Biomas (Global 14 WWF/RESOLVE + Brasil 6 IBGE — D31).
 * Renderização O(1) na GPU com uma única `SphereGeometry` + `CanvasTexture` reutilizada e descarte
 * rigoroso de recursos WebGL (RN21).
 */
export function BiomesLayer() {
  const biomeScope = useObservatoryStore((s) => s.biomeScope);
  const biomeFilterId = useObservatoryStore((s) => s.biomeFilterId);
  const selectedBiomeId = useObservatoryStore((s) => s.selectedBiomeId);
  const opacity = useObservatoryStore((s) => s.layerOpacity.BIOMES_MAP ?? 0.72);
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const invalidate = useThree((state) => state.invalidate);

  const [topology, setTopology] = useState<BiomeTopology | null>(() =>
    getBiomeTopologySync(biomeScope)
  );

  // Registra o picker espacial enquanto a camada de biomas estiver montada (evita importar biomes-data no bundle inicial).
  useEffect(() => {
    registerBiomePicker((scope, lat, lng) => pickBiomeAt(scope, lat, lng));
    return () => {
      registerBiomePicker(null);
    };
  }, []);

  // Carregamento sob demanda do TopoJSON correspondente ao escopo ativo (Global ou Brasil).
  useEffect(() => {
    const sync = getBiomeTopologySync(biomeScope);
    if (sync) {
      setTopology(sync);
      return;
    }
    let alive = true;
    setTopology(null);
    void loadBiomeTopology(biomeScope).then((loaded) => {
      if (!alive || !loaded) return;
      setTopology(loaded);
    });
    return () => {
      alive = false;
    };
  }, [biomeScope]);

  const shouldRender = !isCosmicMode && topology !== null;

  const canvasResource = useRef<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
  } | null>(null);

  const geometry = useMemo(
    () => (shouldRender ? new THREE.SphereGeometry(BIOMES_SPHERE_RADIUS, 64, 32) : null),
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
    // Opacidade sincronizada no efeito dedicado abaixo sem recriar o material.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRender]);

  // Descarte rigoroso de geometria, material e textura WebGL (RN21).
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

  // Rasteriza biomas no CanvasTexture reutilizado sempre que escopo, filtro ou seleção mudar.
  useEffect(() => {
    if (!shouldRender || !topology || !material || typeof document === "undefined") return;

    if (!canvasResource.current) {
      const canvas = document.createElement("canvas");
      canvas.width = BIOMES_TEXTURE_WIDTH;
      canvas.height = BIOMES_TEXTURE_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      canvasResource.current = { canvas, ctx, texture };
    }

    const { ctx, texture } = canvasResource.current;
    rasterizeBiomesToCanvas(
      ctx,
      biomeScope,
      topology,
      { filterBiomeId: biomeFilterId, selectedBiomeId },
      BIOMES_TEXTURE_WIDTH,
      BIOMES_TEXTURE_HEIGHT
    );
    texture.needsUpdate = true;

    if (material.map !== texture) {
      material.map = texture;
      material.needsUpdate = true;
    }
    invalidate();
  }, [shouldRender, topology, biomeScope, biomeFilterId, selectedBiomeId, material, invalidate]);

  useEffect(() => {
    if (!material) return;
    material.opacity = opacity;
    invalidate();
  }, [material, opacity, invalidate]);

  if (!shouldRender || !geometry || !material) return null;

  return (
    <mesh
      name="biomes-overlay"
      geometry={geometry}
      material={material}
      renderOrder={1}
      raycast={ignoreRaycast}
    />
  );
}
