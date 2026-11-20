"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { latLngToVector3, vector3ToLatLng } from "@/lib/geo-spatial";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { frpColor, frpSize } from "@/lib/firms-display";
import type { FirmsHotspot } from "@/lib/observatory-data";

/**
 * Camada de queimadas (D05). Princípio: cada ponto é UM foco detectado por satélite, em qualquer
 * zoom — nada de manchas sintéticas. A densidade aparece porque focos reais se acumulam.
 * Os focos são marcadores (disco saturado + contorno escuro), não luzes, para não serem
 * confundidos com as luzes urbanas da textura noturna (atenuadas pelo EarthSphere com a camada ligada).
 */

/** Raio de desenho (acima da crosta R = 1 e das fronteiras). */
const FIRE_RADIUS = 1.0035;
/** Raio de clique/hover em pixels de tela (o foco precisa estar sob o cursor). */
const PICK_RADIUS_PX = 9;
/** Diâmetro em pixels a partir do qual o marcador ganha contorno escuro. */
const OUTLINE_FROM_PX = 6;

// Vertex/fragment: tamanho em unidades do mundo (cresce ao aproximar), fade na borda do globo
// (normal e direção de visão no mesmo espaço: view space).
const VERTEX = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  uniform float uProjScale;
  uniform float uMinPx;
  uniform float uMaxPx;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vPx;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    // Na esfera centrada na origem do grupo, a normal local é a própria posição.
    vec3 viewNormal = normalize(normalMatrix * position);
    float facing = dot(viewNormal, normalize(-mv.xyz));
    vAlpha = smoothstep(0.02, 0.2, facing);
    vColor = aColor;
    float px = clamp(aSize * uProjScale / max(-mv.z, 0.001), uMinPx, uMaxPx);
    vPx = px;
    gl_PointSize = facing > 0.0 ? px : 0.0;
  }
`;

const FRAGMENT_FIRE = /* glsl */ `
  uniform float uOpacity;
  uniform float uOutlineFrom;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vPx;

  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float edge = 1.0 - smoothstep(0.88, 1.0, r);
    if (edge <= 0.0) discard;
    // Contorno escuro só quando o marcador é grande o bastante para ser lido.
    float outline = smoothstep(uOutlineFrom - 1.0, uOutlineFrom + 2.0, vPx) * smoothstep(0.62, 0.74, r);
    vec3 color = mix(vColor, vec3(0.08, 0.03, 0.02), outline * 0.85);
    // Pequeno centro mais claro: lê como “brasa”, não como luz difusa.
    color = mix(color, vec3(1.0, 0.86, 0.7), (1.0 - smoothstep(0.0, 0.22, r)) * 0.5);
    float a = edge * vAlpha * uOpacity;
    if (a < 0.02) discard;
    gl_FragColor = vec4(color, a);
  }
`;

/** Anel de seleção/hover: contorno nítido. */
const FRAGMENT_RING = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vPx;

  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float ring = smoothstep(0.62, 0.72, r) * (1.0 - smoothstep(0.86, 0.96, r));
    float a = ring * vAlpha * uOpacity;
    if (a < 0.02) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

function makeMaterial(fragment: string, minPx: number, maxPx: number) {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: fragment,
    uniforms: {
      uProjScale: { value: 500 },
      uOpacity: { value: 1 },
      uMinPx: { value: minPx },
      uMaxPx: { value: maxPx },
      uOutlineFrom: { value: OUTLINE_FROM_PX },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
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
  for (let i = 0; i < n; i++) {
    const p = latLngToVector3(items[i].lat, items[i].lng, FIRE_RADIUS);
    positions.set([p.x, p.y, p.z], i * 3);
    colors.set(color(i), i * 3);
    sizes[i] = size(i);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Tamanho do marcador em unidades do mundo. Na distância padrão (≈1,5 da superfície) dá
 * ~2–5 px; ao aproximar cresce até o teto, sempre proporcional à potência (FRP).
 */
export function fireWorldSize(frp: number): number {
  return 0.0028 * frpSize(frp);
}

const PICK_CELL_DEG = 0.5;

export interface FirePickIndex {
  cells: Map<number, number[]>;
  positions: Float32Array;
}

const cellKey = (row: number, col: number) => row * 1000 + col;

export function buildFirePickIndex(items: { lat: number; lng: number }[]): FirePickIndex {
  const cells = new Map<number, number[]>();
  const positions = new Float32Array(items.length * 3);
  items.forEach((h, i) => {
    const row = Math.floor((h.lat + 90) / PICK_CELL_DEG);
    const col = Math.floor((h.lng + 180) / PICK_CELL_DEG);
    const key = cellKey(row, col);
    const list = cells.get(key);
    if (list) list.push(i);
    else cells.set(key, [i]);
    const v = latLngToVector3(h.lat, h.lng, FIRE_RADIUS);
    positions.set([v.x, v.y, v.z], i * 3);
  });
  return { cells, positions };
}

/** Índices dos focos nas células que cobrem um raio (unidades do mundo) em torno de lat/lng. */
export function firePickCandidates(index: FirePickIndex, lat: number, lng: number, radiusWorld: number): number[] {
  const radiusDeg = (radiusWorld / FIRE_RADIUS) * (180 / Math.PI);
  const latSpan = Math.ceil(radiusDeg / PICK_CELL_DEG) + 1;
  const lngSpan = Math.min(Math.ceil(radiusDeg / Math.max(Math.cos((lat * Math.PI) / 180), 0.05) / PICK_CELL_DEG) + 1, 720);
  const row0 = Math.floor((lat + 90) / PICK_CELL_DEG);
  const col0 = Math.floor((lng + 180) / PICK_CELL_DEG);
  const cols = 360 / PICK_CELL_DEG;
  const out: number[] = [];
  for (let dr = -latSpan; dr <= latSpan; dr++) {
    const row = row0 + dr;
    if (row < 0 || row >= 180 / PICK_CELL_DEG) continue;
    for (let dc = -lngSpan; dc <= lngSpan; dc++) {
      const col = (((col0 + dc) % cols) + cols) % cols;
      const list = index.cells.get(cellKey(row, col));
      if (list) out.push(...list);
    }
  }
  return out;
}

const MARKER_SELECTED: [number, number, number] = [1, 1, 1];
const MARKER_HOVER: [number, number, number] = [0.3, 0.76, 0.88];

export const NasaFirmsLayer: React.FC = () => {
  const hotspots = useObservatoryStore((s) => s.firmsHotspots);
  const opacity = useObservatoryStore((s) => s.layerOpacity.NASA_FIRMS ?? 1.0);
  const selectedEntity = useObservatoryStore((s) => s.selectedEntity);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);
  const { camera, size, gl } = useThree();

  const [hovered, setHovered] = useState<FirmsHotspot | null>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const projScaleRef = useRef(500);

  const pointGeometry = useMemo(
    () => buildFirmsGeometry(hotspots, (i) => frpColor(hotspots[i].frp), (i) => fireWorldSize(hotspots[i].frp)),
    [hotspots]
  );

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

  const fireMaterial = useMemo(() => makeMaterial(FRAGMENT_FIRE, 2.2, 16), []);
  const markerMaterial = useMemo(() => makeMaterial(FRAGMENT_RING, 22, 22), []);

  // Descarte estrito de memória GPU (RN21)
  useEffect(() => () => pointGeometry.dispose(), [pointGeometry]);
  useEffect(() => () => markerGeometry.dispose(), [markerGeometry]);
  useEffect(() => () => fireMaterial.dispose(), [fireMaterial]);
  useEffect(() => () => markerMaterial.dispose(), [markerMaterial]);

  // Cursor de "mão" só sobre um foco; restaura ao sair/desmontar.
  useEffect(() => {
    gl.domElement.style.cursor = hovered ? "pointer" : "";
    return () => {
      gl.domElement.style.cursor = "";
    };
  }, [hovered, gl]);

  useFrame(({ clock }) => {
    const cam = camera as THREE.PerspectiveCamera;
    const projScale = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov ?? 45) / 2));
    projScaleRef.current = projScale;
    fireMaterial.uniforms.uProjScale.value = projScale;
    fireMaterial.uniforms.uOpacity.value = Math.max(0.1, opacity);
    markerMaterial.uniforms.uProjScale.value = projScale;
    markerMaterial.uniforms.uOpacity.value = 0.75 + 0.25 * Math.sin(clock.elapsedTime * 4);
  });

  // Índice espacial (células de 0,5°) para o picking não percorrer todos os focos a cada
  // movimento do mouse (5 dias ≈ 170 mil focos).
  const pickIndex = useMemo(() => buildFirePickIndex(hotspots), [hotspots]);
  const pickIndexRef = useRef(pickIndex);
  pickIndexRef.current = pickIndex;

  /**
   * Raycast: interseção do raio com a esfera dos focos (só o lado visível), depois busca no índice
   * pelos focos a até PICK_RADIUS_PX pixels de tela; fica o mais próximo do raio. Fora disso o
   * clique segue para o país.
   */
  const pointRaycast = useMemo(() => {
    const c = new THREE.Vector3();
    const local = new THREE.Ray();
    const hit = new THREE.Vector3();
    const p = new THREE.Vector3();
    return function raycast(this: THREE.Points, raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
      this.getWorldPosition(c);
      // O grupo dos focos só é transladado (sem rotação/escala): basta deslocar o raio.
      local.copy(raycaster.ray);
      local.origin.sub(c);
      if (!local.intersectSphere(new THREE.Sphere(new THREE.Vector3(), FIRE_RADIUS), hit)) return;
      const surfaceDistance = Math.max(0.05, local.origin.length() - FIRE_RADIUS);
      const threshold = (PICK_RADIUS_PX * surfaceDistance) / projScaleRef.current;
      const { lat, lng } = vector3ToLatLng(hit);
      let best = -1;
      let bestDist = Infinity;
      for (const i of firePickCandidates(pickIndexRef.current, lat, lng, threshold)) {
        p.fromArray(pickIndexRef.current.positions, i * 3);
        const d = local.distanceToPoint(p);
        if (d <= threshold && d < bestDist) {
          best = i;
          bestDist = d;
        }
      }
      if (best < 0) return;
      p.fromArray(pickIndexRef.current.positions, best * 3);
      intersects.push({
        distance: local.origin.distanceTo(p),
        distanceToRay: bestDist,
        point: p.clone().add(c),
        index: best,
        object: this,
      });
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

  if (hotspots.length === 0) return null;

  return (
    <group>
      <points
        ref={pointsRef}
        geometry={pointGeometry}
        material={fireMaterial}
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
