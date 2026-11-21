"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { SatRec } from "satellite.js";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { isDragRelease } from "@/lib/pointer-intent";
import {
  ISS_NORAD_ID,
  REFERENCE_ISS_TLE,
  altitudeToSceneRadius,
  groundTrack,
  orbitRing,
  propagateState,
  toSatrec,
  type SatelliteTle,
} from "@/lib/satellites";

/**
 * Camada da ISS e satélites (D04). Posições por SGP4 a partir dos TLEs do CelesTrak, em escala real
 * de altitude (raio 1 + h/6.371 km). Desenho:
 *  - ISS: ícone de tamanho constante em pixels (módulo, treliça e painéis), na posição real;
 *  - órbita: anel FECHADO no referencial inercial (girado pelo GMST atual), cauda brilhante atrás;
 *  - ground track: na superfície (±45 min);
 *  - demais satélites: pontos por categoria.
 * A ISS é propagada a 10 Hz e interpolada a cada quadro, em vetores pré-alocados (sem alocação por quadro).
 */

const ISS_STEP_MS = 100;
const SATELLITES_STEP_MS = 1000;
const ORBIT_REFRESH_MS = 30_000;
const RING_SAMPLES = 180;
const TRACK_RADIUS = 1.002;
const ISS_ICON_PX = 30;
/** Diâmetro dos pontos (px): estações maiores que os demais satélites. */
const SAT_DOT_PX = { station: 9, visual: 7 } as const;
const MARKER_RING_PX = 24;
const SAT_PICK_PX = 12;
const ISS_PICK_PX = 20;

/** latLngToVector3 sem alocar (mesma parametrização da SphereGeometry — invariante do AGENTS.md). */
export function setFromLatLng(out: THREE.Vector3, lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return out.set(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

const MARKER_VERTEX = /* glsl */ `
  attribute vec3 aColor;
  attribute float aPx;
  uniform float uPx;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aPx > 0.0 ? aPx : uPx;
  }
`;

/** Ícone da ISS: módulo central, treliça e dois pares de painéis solares. */
const ISS_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    vec2 a = abs(c);
    float body = step(a.x, 0.07) * step(a.y, 0.2);
    float truss = step(a.y, 0.022) * step(a.x, 0.46);
    float panel = step(0.17, a.x) * step(a.x, 0.46) * step(0.05, a.y) * step(a.y, 0.17);
    float shape = max(max(body, truss), panel);
    if (shape < 0.5) discard;
    vec3 color = panel > 0.5 ? vec3(0.23, 0.51, 0.96) : vec3(0.93, 0.95, 0.98);
    gl_FragColor = vec4(color, uOpacity);
  }
`;

/** Ponto de satélite: disco na cor da categoria com contorno escuro (legível sobre o globo e as estrelas). */
const DOT_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    vec3 color = mix(vColor, vec3(0.03, 0.04, 0.07), smoothstep(0.6, 0.72, r));
    gl_FragColor = vec4(color, (1.0 - smoothstep(0.9, 1.0, r)) * uOpacity);
  }
`;

/** Anel de hover/seleção. */
const RING_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float ring = smoothstep(0.62, 0.72, r) * (1.0 - smoothstep(0.86, 0.96, r));
    if (ring < 0.02) discard;
    gl_FragColor = vec4(vColor, ring * uOpacity);
  }
`;

function markerMaterial(fragment: string, px: number) {
  return new THREE.ShaderMaterial({
    vertexShader: MARKER_VERTEX,
    fragmentShader: fragment,
    uniforms: { uPx: { value: px }, uOpacity: { value: 1 } },
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
}

const CATEGORY_COLOR = {
  station: new THREE.Color("#4CC3E0"),
  visual: new THREE.Color("#C9D2DE"),
} as const;

/** Raycast de Points com raio fixo em pixels (convertido para unidades do mundo pela distância). */
function pixelRaycast(radiusPx: number, projScale: { current: number }) {
  const local = new THREE.Vector3();
  return function raycast(this: THREE.Points, raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    if (!this.visible) return;
    this.getWorldPosition(local);
    const dist = Math.max(0.05, raycaster.ray.origin.distanceTo(local) - 1);
    const prev = raycaster.params.Points?.threshold ?? 1;
    raycaster.params.Points = { threshold: (radiusPx * dist) / projScale.current };
    const hits: THREE.Intersection[] = [];
    THREE.Points.prototype.raycast.call(this, raycaster, hits);
    raycaster.params.Points = { threshold: prev };
    let best: THREE.Intersection | null = null;
    for (const h of hits) if (!best || (h.distanceToRay ?? 0) < (best.distanceToRay ?? 0)) best = h;
    if (best) intersects.push(best);
  };
}

export const IssOrbitLayer: React.FC = () => {
  const satellites = useObservatoryStore((s) => s.satellites);
  const categories = useObservatoryStore((s) => s.satelliteCategories);
  const opacity = useObservatoryStore((s) => s.layerOpacity.ISS_SATELLITES ?? 1.0);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);
  const refreshIssTelemetry = useObservatoryStore((s) => s.refreshIssTelemetry);
  const showGroundTrack = useObservatoryStore((s) => s.showIssGroundTrack);
  const selectedEntity = useObservatoryStore((s) => s.selectedEntity);
  const { camera, size, gl } = useThree();

  // Hover: índice do satélite sob o cursor (-1 = ISS; null = nenhum) e posição da etiqueta.
  const [hovered, setHovered] = useState<number | null>(null);
  const [labelPos, setLabelPos] = useState<[number, number, number] | null>(null);

  // TLE da ISS: o do CelesTrak quando carregado; senão o de referência (fallback rotulado pela T05).
  const issRec = useMemo<SatRec | null>(() => {
    const live = satellites.find((t) => t.noradId === ISS_NORAD_ID);
    return toSatrec(live ?? REFERENCE_ISS_TLE);
  }, [satellites]);

  const others = useMemo(() => {
    return satellites
      .filter((t) => t.noradId !== ISS_NORAD_ID && categories.includes(t.category))
      .map((tle) => ({ tle, rec: toSatrec(tle) }))
      .filter((s): s is { tle: SatelliteTle; rec: SatRec } => s.rec !== null);
  }, [satellites, categories]);

  // ---- Geometrias pré-alocadas -------------------------------------------------------------
  const issGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array([1, 1, 1]), 3));
    g.setAttribute("aPx", new THREE.BufferAttribute(new Float32Array([0]), 1));
    return g;
  }, []);

  const ringGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(RING_SAMPLES * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(RING_SAMPLES * 3), 3));
    return g;
  }, []);

  const trackGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(91 * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(91 * 3), 3));
    return g;
  }, []);

  const satGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = others.length;
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const colors = new Float32Array(n * 3);
    const px = new Float32Array(n);
    others.forEach((s, i) => {
      CATEGORY_COLOR[s.tle.category].toArray(colors, i * 3);
      px[i] = SAT_DOT_PX[s.tle.category];
    });
    g.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    g.setAttribute("aPx", new THREE.BufferAttribute(px, 1));
    return g;
  }, [others]);

  // Anéis de destaque: [0] = hover, [1] = selecionado (posições atualizadas com os satélites).
  const ringMarkerGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array([0.3, 0.76, 0.88, 1, 1, 1]), 3));
    g.setAttribute("aPx", new THREE.BufferAttribute(new Float32Array([MARKER_RING_PX, MARKER_RING_PX]), 1));
    g.setDrawRange(0, 0);
    return g;
  }, []);
  const ringMarkerMaterial = useMemo(() => markerMaterial(RING_FRAGMENT, MARKER_RING_PX), []);
  useEffect(() => () => ringMarkerGeometry.dispose(), [ringMarkerGeometry]);
  useEffect(() => () => ringMarkerMaterial.dispose(), [ringMarkerMaterial]);

  const issMaterial = useMemo(() => markerMaterial(ISS_FRAGMENT, ISS_ICON_PX), []);
  const satMaterial = useMemo(() => markerMaterial(DOT_FRAGMENT, SAT_DOT_PX.visual), []);
  const lineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  const ringLine = useMemo(() => new THREE.LineLoop(ringGeometry, lineMaterial), [ringGeometry, lineMaterial]);
  const trackLine = useMemo(() => new THREE.Line(trackGeometry, lineMaterial), [trackGeometry, lineMaterial]);

  // Descarte estrito de recursos WebGL (RN21)
  useEffect(() => () => issGeometry.dispose(), [issGeometry]);
  useEffect(() => () => ringGeometry.dispose(), [ringGeometry]);
  useEffect(() => () => trackGeometry.dispose(), [trackGeometry]);
  useEffect(() => () => satGeometry.dispose(), [satGeometry]);
  useEffect(() => () => issMaterial.dispose(), [issMaterial]);
  useEffect(() => () => satMaterial.dispose(), [satMaterial]);
  useEffect(() => () => lineMaterial.dispose(), [lineMaterial]);

  // ---- Estado de animação (sem alocação por quadro) -----------------------------------------
  const prevPos = useMemo(() => new THREE.Vector3(), []);
  const nextPos = useMemo(() => new THREE.Vector3(), []);
  const curPos = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const timers = useRef({ issAt: 0, satsAt: 0, orbitAt: 0, telemetryAt: 0 });
  const projScaleRef = useRef(500);

  const writeIssSample = (target: THREE.Vector3, ms: number) => {
    const s = issRec ? propagateState(issRec, new Date(ms)) : null;
    if (s) setFromLatLng(target, s.lat, s.lng, altitudeToSceneRadius(s.altKm));
  };

  const rebuildOrbit = (ms: number) => {
    if (!issRec) return;
    const date = new Date(ms);
    const ring = orbitRing(issRec, date, RING_SAMPLES);
    const rp = ringGeometry.getAttribute("position") as THREE.BufferAttribute;
    const rc = ringGeometry.getAttribute("color") as THREE.BufferAttribute;
    ring.forEach((p, i) => {
      setFromLatLng(tmp, p.lat, p.lng, altitudeToSceneRadius(p.altKm));
      rp.setXYZ(i, tmp.x, tmp.y, tmp.z);
      // i = 0 é a ISS agora; i → N é o trecho logo atrás dela: cauda brilhante, esmaecendo à frente.
      const k = 0.12 + 0.88 * Math.pow(i / ring.length, 2);
      rc.setXYZ(i, 0.3 * k, 0.76 * k, 0.88 * k);
    });
    ringGeometry.setDrawRange(0, ring.length);
    rp.needsUpdate = true;
    rc.needsUpdate = true;
    ringGeometry.computeBoundingSphere();

    const track = groundTrack(issRec, date, 45, 45, 1);
    const tp = trackGeometry.getAttribute("position") as THREE.BufferAttribute;
    const tc = trackGeometry.getAttribute("color") as THREE.BufferAttribute;
    track.forEach((p, i) => {
      setFromLatLng(tmp, p.lat, p.lng, TRACK_RADIUS);
      tp.setXYZ(i, tmp.x, tmp.y, tmp.z);
      const past = i <= 45;
      const k = past ? 0.15 + 0.35 * (i / 45) : 0.18 * (1 - (i - 45) / 45);
      tc.setXYZ(i, 0.3 * k, 0.76 * k, 0.88 * k);
    });
    trackGeometry.setDrawRange(0, track.length);
    tp.needsUpdate = true;
    tc.needsUpdate = true;
    trackGeometry.computeBoundingSphere();
  };

  const updateSatellites = (ms: number) => {
    const pos = satGeometry.getAttribute("position") as THREE.BufferAttribute;
    const date = new Date(ms);
    others.forEach((s, i) => {
      const st = propagateState(s.rec, date);
      if (!st) return;
      setFromLatLng(tmp, st.lat, st.lng, altitudeToSceneRadius(st.altKm));
      pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
    });
    pos.needsUpdate = true;
    satGeometry.computeBoundingSphere();
    updateRingMarkers();
  };

  const selectedIndex =
    selectedEntity?.type === "SATELLITE" ? others.findIndex((o) => o.tle.noradId === selectedEntity.data.noradId) : -1;
  const hoveredRef = useRef<number | null>(null);
  hoveredRef.current = hovered;
  const selectedRef = useRef(selectedIndex);
  selectedRef.current = selectedIndex;

  /** Posiciona os anéis de hover/seleção e a etiqueta sobre os pontos atuais. */
  const updateRingMarkers = () => {
    const pos = satGeometry.getAttribute("position") as THREE.BufferAttribute;
    const rp = ringMarkerGeometry.getAttribute("position") as THREE.BufferAttribute;
    const h = hoveredRef.current;
    const sel = selectedRef.current;
    let count = 0;
    const put = (slot: number, x: number, y: number, z: number) => {
      rp.setXYZ(slot, x, y, z);
      count = Math.max(count, slot + 1);
    };
    // slot 0 (hover) — ISS usa a posição interpolada atual
    if (h === -1) put(0, curPos.x, curPos.y, curPos.z);
    else if (h !== null && h >= 0 && h < pos.count) put(0, pos.getX(h), pos.getY(h), pos.getZ(h));
    else rp.setXYZ(0, 0, 0, 0);
    if (sel >= 0 && sel < pos.count && sel !== h) put(1, pos.getX(sel), pos.getY(sel), pos.getZ(sel));
    ringMarkerGeometry.setDrawRange(0, count);
    rp.needsUpdate = true;
    ringMarkerGeometry.computeBoundingSphere();
    if (h !== null && h >= 0 && h < pos.count) setLabelPos([pos.getX(h), pos.getY(h), pos.getZ(h)]);
  };

  // Ao trocar de TLE/filtros, recalcula tudo imediatamente.
  useEffect(() => {
    const now = Date.now();
    writeIssSample(prevPos, now);
    writeIssSample(nextPos, now + ISS_STEP_MS);
    timers.current = { issAt: now, satsAt: now, orbitAt: now, telemetryAt: now };
    rebuildOrbit(now);
    updateSatellites(now);
    refreshIssTelemetry(now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issRec, others]);

  useFrame(() => {
    const now = Date.now();
    const t = timers.current;
    const cam = camera as THREE.PerspectiveCamera;
    projScaleRef.current = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov ?? 45) / 2));

    if (now - t.issAt >= ISS_STEP_MS) {
      prevPos.copy(nextPos);
      t.issAt = now;
      writeIssSample(nextPos, now + ISS_STEP_MS);
    }
    curPos.lerpVectors(prevPos, nextPos, Math.min(1, (now - t.issAt) / ISS_STEP_MS));
    const ip = issGeometry.getAttribute("position") as THREE.BufferAttribute;
    ip.setXYZ(0, curPos.x, curPos.y, curPos.z);
    ip.needsUpdate = true;

    if (now - t.satsAt >= SATELLITES_STEP_MS) {
      t.satsAt = now;
      updateSatellites(now);
    }
    if (now - t.telemetryAt >= SATELLITES_STEP_MS) {
      t.telemetryAt = now;
      refreshIssTelemetry(now);
    }
    if (now - t.orbitAt >= ORBIT_REFRESH_MS) {
      t.orbitAt = now;
      rebuildOrbit(now);
    }

    const layerOpacity = Math.max(0.15, opacity);
    issMaterial.uniforms.uOpacity.value = layerOpacity;
    satMaterial.uniforms.uOpacity.value = 0.85 * layerOpacity;
    lineMaterial.opacity = layerOpacity;
  });

  const issRaycast = useMemo(() => pixelRaycast(ISS_PICK_PX, projScaleRef), []);
  const satRaycast = useMemo(() => pixelRaycast(SAT_PICK_PX, projScaleRef), []);

  // Cursor de "mão" sobre ISS/satélite; restaura ao sair/desmontar.
  useEffect(() => {
    gl.domElement.style.cursor = hovered !== null ? "pointer" : "";
    return () => {
      gl.domElement.style.cursor = "";
    };
  }, [hovered, gl]);

  // Hover/seleção mudaram → reposiciona anéis já (sem esperar o próximo segundo).
  useEffect(() => {
    updateRingMarkers();
    if (hovered === null) setLabelPos(null);
    else if (hovered === -1) setLabelPos([curPos.x, curPos.y, curPos.z]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered, selectedIndex]);

  const onIssClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (isDragRelease(e)) return;
    refreshIssTelemetry();
    const telemetry = useObservatoryStore.getState().issTelemetry;
    if (telemetry) setSelectedEntity({ type: "ISS", data: telemetry });
  };

  const onSatClick = (e: ThreeEvent<MouseEvent>) => {
    const s = e.index !== undefined ? others[e.index] : undefined;
    if (!s) return;
    e.stopPropagation();
    if (isDragRelease(e)) return;
    const now = Date.now();
    const st = propagateState(s.rec, new Date(now));
    if (!st) return;
    setSelectedEntity({
      type: "SATELLITE",
      data: {
        name: s.tle.name,
        noradId: s.tle.noradId,
        category: s.tle.category,
        lat: st.lat,
        lng: st.lng,
        altKm: st.altKm,
        velocityKmh: st.velocityKmh,
        tleEpoch: s.tle.epoch,
        timestamp: now,
      },
    });
  };

  return (
    <group>
      {showGroundTrack && <primitive object={trackLine} raycast={() => null} />}
      <primitive object={ringLine} raycast={() => null} />
      {others.length > 0 && (
        <points
          geometry={satGeometry}
          material={satMaterial}
          raycast={satRaycast}
          onClick={onSatClick}
          onPointerMove={(e) => {
            if (e.index !== undefined && e.index !== hovered) setHovered(e.index);
          }}
          onPointerOut={() => setHovered((h) => (h === -1 ? h : null))}
          renderOrder={3}
        />
      )}
      <points
        geometry={issGeometry}
        material={issMaterial}
        raycast={issRaycast}
        onClick={onIssClick}
        onPointerOver={() => setHovered(-1)}
        onPointerOut={() => setHovered((h) => (h === -1 ? null : h))}
        renderOrder={4}
      />
      <points geometry={ringMarkerGeometry} material={ringMarkerMaterial} raycast={() => null} renderOrder={5} />
      {hovered !== null && labelPos && (
        <Html position={labelPos} center style={{ pointerEvents: "none", transform: "translateY(-26px)" }} zIndexRange={[20, 0]}>
          <span className="whitespace-nowrap rounded-control border border-line-strong bg-surface/86 px-2 py-1 text-caption font-medium text-fg shadow-e1 backdrop-blur-md">
            {hovered === -1 ? "ISS (ZARYA) · Estação Espacial Internacional" : `${others[hovered]?.tle.name ?? ""} · ${others[hovered]?.tle.category === "station" ? "estação" : "satélite"}`}
          </span>
        </Html>
      )}
    </group>
  );
};
