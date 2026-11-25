"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import {
  getBiomeTopologySync,
  loadBiomeTopology,
  type BiomeTopology,
} from "@/lib/biomes-data";
import {
  DEFORESTATION_HEATMAP_HEIGHT,
  DEFORESTATION_HEATMAP_WIDTH,
  PRODES_CRITICAL_HUBS,
  rasterizeDeforestationHeatmap,
} from "@/lib/inpe-heatmap";

/**
 * Raio 1.0032 com tesselação 128×64: acima de BiomesLayer (1.0022) e abaixo de CountryBorders (1.004),
 * garantindo zero intersecção triangular com o globo base.
 */
const HEATMAP_SPHERE_RADIUS = 1.0032;
const ALERT_RADIUS = 1.0085;
const DEG2RAD = Math.PI / 180;
const ignoreRaycast = () => null;

/** Projeção esférica paramétrica não-espelhada (AGENTS.md §1). */
function sphericalPoint(lat: number, lng: number, radius: number, out: [number, number, number]) {
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lng + 180) * DEG2RAD;
  const sinPhi = Math.sin(phi);
  out[0] = -(radius * sinPhi * Math.cos(theta));
  out[1] = radius * Math.cos(phi);
  out[2] = radius * sinPhi * Math.sin(theta);
}

const ALERT_VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aSeverity;
  varying float vSeverity;

  void main() {
    vSeverity = clamp(aSeverity, 0.0, 1.0);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * (2.6 / max(0.8, -mvPos.z)), 3.0, 13.0);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const ALERT_FRAGMENT_SHADER = /* glsl */ `
  uniform float uOpacity;
  uniform float uPulse;
  varying float vSeverity;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float core = smoothstep(0.5, 0.08, dist);
    vec3 col = mix(vec3(0.98, 0.58, 0.08), vec3(0.99, 0.25, 0.25), vSeverity);
    float alpha = core * uOpacity * (0.72 + 0.28 * uPulse);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * Camada 3D de desmatamento INPE TerraBrasilis (D30/D31 — 6 Biomas Brasileiros):
 * - Mapa de calor térmico GPU (CanvasTexture equiretangular recortado pelos biomas reais IBGE)
 *   combinando zonas críticas municipais PRODES + alertas DETER ao vivo.
 * - Focos pulsantes 3D dos polos críticos PRODES e alertas DETER, com `dispose()` rigoroso (RN21).
 */
export const InpeDeforestationLayer: React.FC = () => {
  const { invalidate } = useThree();
  const isThrottled = useGlobeStore((s) => s.isThrottled);
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const opacity = useObservatoryStore((s) => s.layerOpacity.INPE_DEFORESTATION ?? 0.9);
  const prodesBiome = useObservatoryStore((s) => s.prodesBiome);
  const payload = useObservatoryStore((s) => s.inpeDeforestation);

  const [biomeTopology, setBiomeTopology] = useState<BiomeTopology | null>(() =>
    getBiomeTopologySync("brazil")
  );

  // Carrega sob demanda o polígono oficial dos 6 biomas IBGE para recorte e contorno exatos.
  useEffect(() => {
    const cached = getBiomeTopologySync("brazil");
    if (cached) {
      setBiomeTopology(cached);
      return;
    }
    let alive = true;
    void loadBiomeTopology("brazil").then((loaded) => {
      if (alive && loaded) setBiomeTopology(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  const shouldRender = !isCosmicMode;

  const canvasResource = useRef<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
  } | null>(null);

  const heatmapGeometry = useMemo(
    () => (shouldRender ? new THREE.SphereGeometry(HEATMAP_SPHERE_RADIUS, 128, 64) : null),
    [shouldRender]
  );

  const heatmapMaterial = useMemo(() => {
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

  // Pontos pulsantes 3D: alertas DETER ao vivo + polos críticos municipais PRODES do bioma em foco
  const hotspotsGeometry = useMemo(() => {
    const deterAlerts = payload?.deterAlerts ?? [];
    const focusHubs = PRODES_CRITICAL_HUBS.filter((h) => h.biome === prodesBiome);
    const totalCount = deterAlerts.length + focusHubs.length;
    if (totalCount === 0) return null;

    const positions = new Float32Array(totalCount * 3);
    const sizes = new Float32Array(totalCount);
    const severities = new Float32Array(totalCount);
    const pt: [number, number, number] = [0, 0, 0];
    let idx = 0;

    for (const hub of focusHubs) {
      sphericalPoint(hub.lat, hub.lng, ALERT_RADIUS, pt);
      positions[idx * 3] = pt[0];
      positions[idx * 3 + 1] = pt[1];
      positions[idx * 3 + 2] = pt[2];
      sizes[idx] = 4.2 + hub.intensity * 5.2;
      severities[idx] = hub.intensity;
      idx++;
    }

    for (const alert of deterAlerts) {
      sphericalPoint(alert.lat, alert.lng, ALERT_RADIUS, pt);
      positions[idx * 3] = pt[0];
      positions[idx * 3 + 1] = pt[1];
      positions[idx * 3 + 2] = pt[2];
      sizes[idx] = 3.8 + Math.min(7.5, Math.sqrt(Math.max(0.05, alert.areaKm2)) * 4.5);
      severities[idx] = Math.min(1, 0.35 + alert.areaKm2 / 1.5);
      idx++;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute("aSeverity", new THREE.BufferAttribute(severities, 1));
    return geom;
  }, [payload, prodesBiome]);

  const hotspotsMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ALERT_VERTEX_SHADER,
        fragmentShader: ALERT_FRAGMENT_SHADER,
        uniforms: {
          uOpacity: { value: opacity },
          uPulse: { value: 1.0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Descarte rigoroso de recursos WebGL (RN21)
  useEffect(() => () => { heatmapGeometry?.dispose(); }, [heatmapGeometry]);
  useEffect(() => () => { heatmapMaterial?.dispose(); }, [heatmapMaterial]);
  useEffect(() => () => { hotspotsGeometry?.dispose(); }, [hotspotsGeometry]);
  useEffect(() => () => { hotspotsMaterial.dispose(); }, [hotspotsMaterial]);

  useEffect(() => {
    if (!shouldRender && canvasResource.current) {
      canvasResource.current.texture.dispose();
      canvasResource.current = null;
      return;
    }
    return () => {
      if (canvasResource.current) {
        canvasResource.current.texture.dispose();
        canvasResource.current = null;
      }
    };
  }, [shouldRender]);

  // Rasteriza o mapa de calor no CanvasTexture reutilizado
  useEffect(() => {
    if (!shouldRender || !heatmapMaterial || typeof document === "undefined") return;

    if (!canvasResource.current) {
      const canvas = document.createElement("canvas");
      canvas.width = DEFORESTATION_HEATMAP_WIDTH;
      canvas.height = DEFORESTATION_HEATMAP_HEIGHT;
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
    rasterizeDeforestationHeatmap(
      ctx,
      {
        activeBiome: prodesBiome,
        deterAlerts: payload?.deterAlerts ?? [],
        biomeTopology,
      },
      DEFORESTATION_HEATMAP_WIDTH,
      DEFORESTATION_HEATMAP_HEIGHT
    );
    texture.needsUpdate = true;

    if (heatmapMaterial.map !== texture) {
      heatmapMaterial.map = texture;
      heatmapMaterial.needsUpdate = true;
    }
    invalidate();
  }, [shouldRender, prodesBiome, payload, biomeTopology, heatmapMaterial, invalidate]);

  useEffect(() => {
    if (heatmapMaterial) heatmapMaterial.opacity = opacity;
    hotspotsMaterial.uniforms.uOpacity.value = opacity;
    invalidate();
  }, [opacity, heatmapMaterial, hotspotsMaterial, invalidate]);

  const pulseClock = useRef(0);
  useFrame((_, delta) => {
    if (isThrottled || !hotspotsGeometry) return;
    pulseClock.current += Math.min(delta, 0.05);
    hotspotsMaterial.uniforms.uPulse.value = 0.5 + 0.5 * Math.sin(pulseClock.current * 2.4);
  });

  if (!shouldRender) return null;

  return (
    <group>
      {heatmapGeometry && heatmapMaterial && (
        <mesh
          name="inpe-deforestation-heatmap"
          geometry={heatmapGeometry}
          material={heatmapMaterial}
          renderOrder={3}
          raycast={ignoreRaycast}
        />
      )}
      {hotspotsGeometry && (
        <points
          geometry={hotspotsGeometry}
          material={hotspotsMaterial}
          frustumCulled={false}
          renderOrder={7}
        />
      )}
    </group>
  );
};
