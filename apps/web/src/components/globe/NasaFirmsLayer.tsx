"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { latLngToVector3 } from "@/lib/geo-spatial";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { frpColor, frpSize } from "@/lib/firms-display";
import type { FirmsCell } from "@/lib/firms-aggregate";

/** Raio de desenho (acima da crosta R = 1 e das fronteiras). */
const FIRE_RADIUS = 1.0035;
/** Lado aproximado de uma célula de 1° na esfera unitária. */
const CELL_WORLD = (Math.PI / 180) * 1.0;

/**
 * Distâncias da câmera ao centro da Terra para a transição foco ↔ heatmap.
 * Perto: focos individuais; longe: grade agregada; no meio, os dois se somam.
 */
export const FIRMS_POINTS_FADE: [number, number] = [2.4, 3.4];
export const FIRMS_CELLS_FADE: [number, number] = [2.0, 3.0];

export function firmsLayerOpacities(cameraDistance: number) {
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  return {
    points: 1 - smooth(FIRMS_POINTS_FADE[0], FIRMS_POINTS_FADE[1], cameraDistance),
    cells: smooth(FIRMS_CELLS_FADE[0], FIRMS_CELLS_FADE[1], cameraDistance),
  };
}

// ---------------------------------------------------------------------------
// Shaders: sprite circular com núcleo quente + halo, tamanho em unidades do mundo,
// cintilação por foco e fade na borda do globo (normal e visão no mesmo espaço: view space).
// ---------------------------------------------------------------------------
const VERTEX = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  uniform float uProjScale;
  uniform float uFlicker;
  uniform float uMinPx;
  uniform float uMaxPx;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;

    // Na esfera centrada na origem do grupo, a normal local é a própria posição.
    vec3 viewNormal = normalize(normalMatrix * position);
    float facing = dot(viewNormal, normalize(-mv.xyz));
    vAlpha = smoothstep(0.02, 0.22, facing);

    float flicker = 1.0 - uFlicker + uFlicker * (0.5 + 0.5 * sin(uTime * (2.2 + aPhase) + aPhase * 6.2831));
    vAlpha *= flicker;
    vColor = aColor;

    float px = aSize * uProjScale / max(-mv.z, 0.001);
    gl_PointSize = facing > 0.0 ? clamp(px, uMinPx, uMaxPx) : 0.0;
  }
`;

const FRAGMENT_POINT = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float core = 1.0 - smoothstep(0.0, 0.32, r);
    float halo = pow(1.0 - r, 2.2) * 0.75;
    vec3 color = mix(vColor, vec3(1.0, 0.97, 0.88), core * 0.75);
    float a = clamp(core + halo, 0.0, 1.0) * vAlpha * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(color, a);
  }
`;

const FRAGMENT_CELL = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float a = exp(-r * r * 3.5) * vAlpha * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

function makeMaterial(fragment: string, minPx: number, maxPx: number, flicker: number) {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: fragment,
    uniforms: {
      uTime: { value: 0 },
      uProjScale: { value: 500 },
      uOpacity: { value: 1 },
      uFlicker: { value: flicker },
      uMinPx: { value: minPx },
      uMaxPx: { value: maxPx },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
}

export function buildFirmsGeometry(
  items: { lat: number; lng: number }[],
  color: (i: number) => [number, number, number],
  size: (i: number) => number
) {
  const n = items.length;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const phases = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = latLngToVector3(items[i].lat, items[i].lng, FIRE_RADIUS);
    positions.set([p.x, p.y, p.z], i * 3);
    colors.set(color(i), i * 3);
    sizes[i] = size(i);
    // Fase determinística por posição (cintilação estável entre recargas).
    phases[i] = (Math.abs(Math.sin(items[i].lat * 12.9898 + items[i].lng * 78.233)) * 43758.5453) % 1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geo.computeBoundingSphere();
  return geo;
}

/** Cor da célula pela densidade (log da contagem), na mesma escala térmica dos focos. */
function cellColor(c: FirmsCell, maxLogCount: number): [number, number, number] {
  const t = maxLogCount > 0 ? Math.log1p(c.count) / maxLogCount : 0;
  return frpColor(t * 300);
}

/**
 * Raycast dos Points com limiar proporcional à distância da câmera e só no hemisfério visível
 * (o raycast padrão de Points usa limiar 1 em unidades do mundo e acerta o lado oculto do globo).
 */
function makeRaycast(thresholdAt1: number) {
  const center = new THREE.Vector3();
  const toCam = new THREE.Vector3();
  const normal = new THREE.Vector3();
  return function raycast(this: THREE.Points, raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    const prev = raycaster.params.Points?.threshold ?? 1;
    const cam = raycaster.ray.origin;
    this.getWorldPosition(center);
    raycaster.params.Points = { threshold: thresholdAt1 * cam.distanceTo(center) };
    const hits: THREE.Intersection[] = [];
    THREE.Points.prototype.raycast.call(this, raycaster, hits);
    raycaster.params.Points = { threshold: prev };
    for (const h of hits) {
      normal.copy(h.point).sub(center).normalize();
      toCam.copy(cam).sub(h.point).normalize();
      if (normal.dot(toCam) > 0.05) intersects.push(h);
    }
  };
}

export const NasaFirmsLayer: React.FC = () => {
  const hotspots = useObservatoryStore((s) => s.firmsHotspots);
  const cells = useObservatoryStore((s) => s.firmsCells);
  const opacity = useObservatoryStore((s) => s.layerOpacity.NASA_FIRMS ?? 1.0);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);
  const { camera, size } = useThree();

  const pointsRef = useRef<THREE.Points>(null);
  const cellsRef = useRef<THREE.Points>(null);

  const pointGeometry = useMemo(
    () =>
      buildFirmsGeometry(
        hotspots,
        (i) => frpColor(hotspots[i].frp),
        // ~2,5 a 8 px por foco na distância padrão.
        (i) => 0.0032 * frpSize(hotspots[i].frp)
      ),
    [hotspots]
  );

  const cellGeometry = useMemo(() => {
    const maxLog = cells.reduce((m, c) => Math.max(m, Math.log1p(c.count)), 0);
    return buildFirmsGeometry(
      cells,
      (i) => cellColor(cells[i], maxLog),
      // A mancha cobre ~2 células, crescendo levemente com a densidade.
      (i) => CELL_WORLD * (1.6 + (maxLog > 0 ? Math.log1p(cells[i].count) / maxLog : 0) * 1.4)
    );
  }, [cells]);

  const pointMaterial = useMemo(() => makeMaterial(FRAGMENT_POINT, 2.5, 28, 0.35), []);
  const cellMaterial = useMemo(() => makeMaterial(FRAGMENT_CELL, 6, 160, 0), []);

  const pointRaycast = useMemo(() => makeRaycast(0.008), []);
  const cellRaycast = useMemo(() => makeRaycast(0.02), []);

  // Descarte estrito de memória GPU (RN21)
  useEffect(() => () => pointGeometry.dispose(), [pointGeometry]);
  useEffect(() => () => cellGeometry.dispose(), [cellGeometry]);
  useEffect(() => () => pointMaterial.dispose(), [pointMaterial]);
  useEffect(() => () => cellMaterial.dispose(), [cellMaterial]);

  const center = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const cam = camera as THREE.PerspectiveCamera;
    const projScale = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov ?? 45) / 2));
    (pointsRef.current ?? cellsRef.current)?.getWorldPosition(center);
    const { points, cells: cellAlpha } = firmsLayerOpacities(camera.position.distanceTo(center));
    const layerOpacity = Math.max(0.1, opacity);

    for (const [mat, alpha, obj] of [
      [pointMaterial, points, pointsRef.current],
      [cellMaterial, cellAlpha * 0.85, cellsRef.current],
    ] as const) {
      mat.uniforms.uTime.value = clock.elapsedTime;
      mat.uniforms.uProjScale.value = projScale;
      mat.uniforms.uOpacity.value = alpha * layerOpacity;
      if (obj) obj.visible = alpha > 0.01;
    }
  });

  const onPointClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.index === undefined || !hotspots[e.index]) return;
    e.stopPropagation();
    setSelectedEntity({ type: "FIRMS", data: hotspots[e.index] });
  };

  const onCellClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.index === undefined || !cells[e.index]) return;
    // Com os focos individuais visíveis, eles têm prioridade no clique.
    if (pointsRef.current?.visible) return;
    e.stopPropagation();
    setSelectedEntity({ type: "FIRMS_CELL", data: cells[e.index] });
  };

  if (hotspots.length === 0 && cells.length === 0) return null;

  return (
    <group>
      <points
        ref={cellsRef}
        geometry={cellGeometry}
        material={cellMaterial}
        raycast={cellRaycast}
        onClick={onCellClick}
        renderOrder={1}
      />
      <points
        ref={pointsRef}
        geometry={pointGeometry}
        material={pointMaterial}
        raycast={pointRaycast}
        onClick={onPointClick}
        renderOrder={2}
      />
    </group>
  );
};
