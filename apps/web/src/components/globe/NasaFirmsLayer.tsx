"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { latLngToVector3, vector3ToLatLng } from "@/lib/geo-spatial";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { frpColor, frpSize } from "@/lib/firms-display";
import type { FirmsBbox, FirmsCell } from "@/lib/firms-aggregate";
import type { FirmsHotspot } from "@/lib/observatory-data";

/** Raio de desenho (acima da crosta R = 1 e das fronteiras). */
const FIRE_RADIUS = 1.0035;
/** Lado aproximado de uma célula de 1° na esfera unitária. */
const CELL_WORLD = (Math.PI / 180) * 1.0;
/** Abaixo desta distância câmera–centro, carrega todos os focos da área visível. */
export const FIRMS_DETAIL_DISTANCE = 2.6;
/** Raio de clique/hover em pixels de tela (o foco precisa estar sob o cursor). */
const PICK_RADIUS_PX = 10;

/**
 * Distâncias da câmera ao centro da Terra para a transição foco ↔ heatmap.
 * Perto: focos individuais; longe: grade agregada; no meio, os dois se somam.
 */
export const FIRMS_POINTS_FADE: [number, number] = [2.4, 3.4];
export const FIRMS_CELLS_FADE: [number, number] = [2.0, 3.0];

export function firmsLayerOpacities(cameraDistance: number, hasDetail = false) {
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const cells = smooth(FIRMS_CELLS_FADE[0], FIRMS_CELLS_FADE[1], cameraDistance);
  return {
    points: 1 - smooth(FIRMS_POINTS_FADE[0], FIRMS_POINTS_FADE[1], cameraDistance),
    // De perto, sem o detalhe carregado, a mancha continua visível para a área não ficar vazia.
    cells: hasDetail ? cells : Math.max(cells, cameraDistance < FIRMS_DETAIL_DISTANCE ? 0.35 : 0),
  };
}

/**
 * Recorte lat/lng visível a partir do ponto sob a câmera e da distância ao centro:
 * meia-abertura até o horizonte (acos(1/d)), arredondada para não refazer a busca a cada pixel.
 */
export function visibleFirmsBbox(center: { lat: number; lng: number }, cameraDistance: number): FirmsBbox {
  const horizon = (Math.acos(Math.min(1, 1 / Math.max(cameraDistance, 1.0001))) * 180) / Math.PI;
  const half = Math.min(60, Math.ceil(horizon / 5) * 5);
  const q = (v: number) => Math.round(v / 5) * 5;
  const lat = q(center.lat);
  const lng = q(center.lng);
  const minLat = Math.max(-90, lat - half);
  const maxLat = Math.min(90, lat + half);
  const widestLat = Math.max(Math.abs(minLat), Math.abs(maxLat));
  const lngHalf = half / Math.max(Math.cos((widestLat * Math.PI) / 180), 0.25);
  if (lngHalf >= 180) return { minLng: -180, minLat, maxLng: 180, maxLat };
  const wrap = (v: number) => ((((v + 180) % 360) + 360) % 360) - 180;
  return { minLng: wrap(lng - lngHalf), minLat, maxLng: wrap(lng + lngHalf), maxLat };
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

/** Anel de seleção/hover: contorno nítido, sem blending aditivo (legível sobre o fogo). */
const FRAGMENT_RING = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float ring = smoothstep(0.62, 0.72, r) * (1.0 - smoothstep(0.86, 0.96, r));
    float a = ring * vAlpha * uOpacity;
    if (a < 0.02) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

function makeMaterial(fragment: string, minPx: number, maxPx: number, flicker: number, additive = true) {
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
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
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

const MARKER_SELECTED: [number, number, number] = [1, 1, 1];
const MARKER_HOVER: [number, number, number] = [0.3, 0.76, 0.88];

export const NasaFirmsLayer: React.FC = () => {
  const globalHotspots = useObservatoryStore((s) => s.firmsHotspots);
  const cells = useObservatoryStore((s) => s.firmsCells);
  const detail = useObservatoryStore((s) => s.firmsDetail);
  const opacity = useObservatoryStore((s) => s.layerOpacity.NASA_FIRMS ?? 1.0);
  const selectedEntity = useObservatoryStore((s) => s.selectedEntity);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);
  const loadFirmsDetail = useObservatoryStore((s) => s.loadFirmsDetail);
  const clearFirmsDetail = useObservatoryStore((s) => s.clearFirmsDetail);
  const { camera, size, gl } = useThree();

  const [isNear, setIsNear] = useState(false);
  const [hovered, setHovered] = useState<FirmsHotspot | null>(null);

  // De perto e com o detalhe carregado: todos os focos da área visível; senão, os mais intensos do mundo.
  const hotspots = isNear && detail ? detail.hotspots : globalHotspots;

  const pointsRef = useRef<THREE.Points>(null);
  const cellsRef = useRef<THREE.Points>(null);
  const projScaleRef = useRef(500);

  const pointGeometry = useMemo(
    () =>
      buildFirmsGeometry(
        hotspots,
        (i) => frpColor(hotspots[i].frp),
        // ~3 a 9 px por foco na distância padrão.
        (i) => 0.0034 * frpSize(hotspots[i].frp)
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

  const selected = selectedEntity?.type === "FIRMS" ? selectedEntity.data : null;
  const markerGeometry = useMemo(() => {
    const items = [selected, hovered && hovered.id !== selected?.id ? hovered : null].filter(
      (h): h is FirmsHotspot => h !== null
    );
    return buildFirmsGeometry(
      items,
      (i) => (items[i] === selected ? MARKER_SELECTED : MARKER_HOVER),
      () => 0
    );
  }, [selected, hovered]);

  const pointMaterial = useMemo(() => makeMaterial(FRAGMENT_POINT, 3, 28, 0.35), []);
  const cellMaterial = useMemo(() => makeMaterial(FRAGMENT_CELL, 6, 160, 0), []);
  const markerMaterial = useMemo(() => makeMaterial(FRAGMENT_RING, 22, 22, 0, false), []);

  // Descarte estrito de memória GPU (RN21)
  useEffect(() => () => pointGeometry.dispose(), [pointGeometry]);
  useEffect(() => () => cellGeometry.dispose(), [cellGeometry]);
  useEffect(() => () => markerGeometry.dispose(), [markerGeometry]);
  useEffect(() => () => pointMaterial.dispose(), [pointMaterial]);
  useEffect(() => () => cellMaterial.dispose(), [cellMaterial]);
  useEffect(() => () => markerMaterial.dispose(), [markerMaterial]);

  // Cursor de "mão" só sobre um foco; restaura ao sair/desmontar.
  useEffect(() => {
    gl.domElement.style.cursor = hovered ? "pointer" : "";
    return () => {
      gl.domElement.style.cursor = "";
    };
  }, [hovered, gl]);

  // Detalhe da área visível: busca com debounce quando a câmera para perto do globo.
  const bboxKeyRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      clearFirmsDetail();
    },
    [clearFirmsDetail]
  );

  const center = useMemo(() => new THREE.Vector3(), []);
  const toCam = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const cam = camera as THREE.PerspectiveCamera;
    const projScale = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov ?? 45) / 2));
    projScaleRef.current = projScale;
    (pointsRef.current ?? cellsRef.current)?.getWorldPosition(center);
    const distance = camera.position.distanceTo(center);

    const near = distance < FIRMS_DETAIL_DISTANCE;
    if (near !== isNear) setIsNear(near);
    if (near) {
      toCam.copy(camera.position).sub(center);
      const bbox = visibleFirmsBbox(vector3ToLatLng(toCam), distance);
      const key = `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`;
      if (key !== bboxKeyRef.current) {
        bboxKeyRef.current = key;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => void loadFirmsDetail(bbox), 350);
      }
    } else if (bboxKeyRef.current) {
      bboxKeyRef.current = "";
      if (debounceRef.current) clearTimeout(debounceRef.current);
    }

    const { points, cells: cellAlpha } = firmsLayerOpacities(distance, near && !!detail);
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
    markerMaterial.uniforms.uProjScale.value = projScale;
    markerMaterial.uniforms.uOpacity.value = 0.75 + 0.25 * Math.sin(clock.elapsedTime * 4);
  });

  /**
   * Raycast dos focos com raio fixo em pixels (convertido para unidades do mundo pela distância
   * da câmera à superfície) e só no hemisfério visível — fora disso o clique vai para o país.
   */
  const pointRaycast = useMemo(() => {
    const c = new THREE.Vector3();
    const n = new THREE.Vector3();
    const v = new THREE.Vector3();
    return function raycast(this: THREE.Points, raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
      if (!this.visible) return;
      const origin = raycaster.ray.origin;
      this.getWorldPosition(c);
      const surfaceDistance = Math.max(0.05, origin.distanceTo(c) - FIRE_RADIUS);
      const prev = raycaster.params.Points?.threshold ?? 1;
      raycaster.params.Points = { threshold: (PICK_RADIUS_PX * surfaceDistance) / projScaleRef.current };
      const hits: THREE.Intersection[] = [];
      THREE.Points.prototype.raycast.call(this, raycaster, hits);
      raycaster.params.Points = { threshold: prev };
      // Fica só o foco mais próximo do raio (não o primeiro da lista), no lado visível.
      let best: THREE.Intersection | null = null;
      for (const h of hits) {
        n.copy(h.point).sub(c).normalize();
        v.copy(origin).sub(h.point).normalize();
        if (n.dot(v) <= 0.05) continue;
        if (!best || (h.distanceToRay ?? 0) < (best.distanceToRay ?? 0)) best = h;
      }
      if (best) intersects.push(best);
    };
  }, []);

  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
    e.index !== undefined ? hotspots[e.index] ?? null : null;

  const onPointClick = (e: ThreeEvent<MouseEvent>) => {
    const h = pick(e);
    if (!h) return;
    e.stopPropagation();
    setSelectedEntity({ type: "FIRMS", data: h });
  };

  const onPointMove = (e: ThreeEvent<PointerEvent>) => {
    const h = pick(e);
    if (h && h.id !== hovered?.id) setHovered(h);
  };

  if (hotspots.length === 0 && cells.length === 0) return null;

  return (
    <group>
      {/* Manchas de densidade: só visuais — não capturam clique (o clique vai para o país). */}
      <points ref={cellsRef} geometry={cellGeometry} material={cellMaterial} raycast={() => null} renderOrder={1} />
      <points
        ref={pointsRef}
        geometry={pointGeometry}
        material={pointMaterial}
        raycast={pointRaycast}
        onClick={onPointClick}
        onPointerMove={onPointMove}
        onPointerOut={() => setHovered(null)}
        renderOrder={2}
      />
      <points geometry={markerGeometry} material={markerMaterial} raycast={() => null} renderOrder={3} />
    </group>
  );
};
