"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import type { SatRec } from "satellite.js";
import { useObservatoryStore } from "@/stores/observatoryStore";
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
const SAT_DOT_PX = 5;

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
  uniform float uPx;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uPx;
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

const DOT_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    gl_FragColor = vec4(vColor, (1.0 - smoothstep(0.7, 1.0, r)) * uOpacity);
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
  const { camera, size } = useThree();

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
    others.forEach((s, i) => CATEGORY_COLOR[s.tle.category].toArray(colors, i * 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [others]);

  const issMaterial = useMemo(() => markerMaterial(ISS_FRAGMENT, ISS_ICON_PX), []);
  const satMaterial = useMemo(() => markerMaterial(DOT_FRAGMENT, SAT_DOT_PX), []);
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

  const issRaycast = useMemo(() => pixelRaycast(ISS_ICON_PX / 2 + 4, projScaleRef), []);
  const satRaycast = useMemo(() => pixelRaycast(8, projScaleRef), []);

  const onIssClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    refreshIssTelemetry();
    const telemetry = useObservatoryStore.getState().issTelemetry;
    if (telemetry) setSelectedEntity({ type: "ISS", data: telemetry });
  };

  const onSatClick = (e: ThreeEvent<MouseEvent>) => {
    const s = e.index !== undefined ? others[e.index] : undefined;
    if (!s) return;
    e.stopPropagation();
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
      <primitive object={trackLine} raycast={() => null} />
      <primitive object={ringLine} raycast={() => null} />
      {others.length > 0 && (
        <points geometry={satGeometry} material={satMaterial} raycast={satRaycast} onClick={onSatClick} renderOrder={3} />
      )}
      <points geometry={issGeometry} material={issMaterial} raycast={issRaycast} onClick={onIssClick} renderOrder={4} />
    </group>
  );
};
