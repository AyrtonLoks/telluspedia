"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { PRODES_MONITORING_REGIONS } from "@/lib/inpe-data";
import type { ProdesBiomeId } from "@/lib/inpe-types";

const REGION_RADIUS = 1.0065;
const ALERT_RADIUS = 1.0085;
const DEG2RAD = Math.PI / 180;

/** Projeção esférica paramétrica não-espelhada (AGENTS.md §1). */
function sphericalPoint(lat: number, lng: number, radius: number, out: [number, number, number]) {
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lng + 180) * DEG2RAD;
  const sinPhi = Math.sin(phi);
  out[0] = -(radius * sinPhi * Math.cos(theta));
  out[1] = radius * Math.cos(phi);
  out[2] = radius * sinPhi * Math.sin(theta);
}

function buildOutlineGeometry(outline: readonly (readonly [number, number])[]): THREE.BufferGeometry {
  const coords: number[] = [];
  const a: [number, number, number] = [0, 0, 0];
  const b: [number, number, number] = [0, 0, 0];
  for (let i = 1; i < outline.length; i++) {
    const [lat0, lng0] = outline[i - 1];
    const [lat1, lng1] = outline[i];
    // Subdivide em 4 passos para aderir perfeitamente à curvatura da esfera
    for (let s = 0; s < 4; s++) {
      const t0 = s / 4;
      const t1 = (s + 1) / 4;
      sphericalPoint(lat0 + (lat1 - lat0) * t0, lng0 + (lng1 - lng0) * t0, REGION_RADIUS, a);
      sphericalPoint(lat0 + (lat1 - lat0) * t1, lng0 + (lng1 - lng0) * t1, REGION_RADIUS, b);
      coords.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(coords, 3));
  return geometry;
}

const ALERT_VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aSeverity;
  varying float vSeverity;

  void main() {
    vSeverity = clamp(aSeverity, 0.0, 1.0);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * (2.8 / max(0.8, -mvPos.z)), 3.0, 14.0);
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
    vec3 col = mix(vec3(0.96, 0.62, 0.04), vec3(0.94, 0.27, 0.27), vSeverity);
    float alpha = core * uOpacity * (0.72 + 0.28 * uPulse);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * Camada 3D espacial de monitoramento INPE TerraBrasilis (D30 / RN17):
 * - Contornos de monitoramento PRODES/DETER (Amazônia Legal e Cerrado).
 * - Alertas DETER ativos (quando retornados pelo WFS oficial do INPE), com `dispose()` completo.
 */
export const InpeDeforestationLayer: React.FC = () => {
  const { invalidate } = useThree();
  const isThrottled = useGlobeStore((s) => s.isThrottled);
  const opacity = useObservatoryStore((s) => s.layerOpacity.INPE_DEFORESTATION ?? 0.9);
  const prodesBiome = useObservatoryStore((s) => s.prodesBiome);
  const payload = useObservatoryStore((s) => s.inpeDeforestation);

  const regionGeometries = useMemo<Record<ProdesBiomeId, THREE.BufferGeometry>>(
    () => ({
      amazonia: buildOutlineGeometry(PRODES_MONITORING_REGIONS.amazonia.outline),
      cerrado: buildOutlineGeometry(PRODES_MONITORING_REGIONS.cerrado.outline),
    }),
    []
  );

  const regionMaterials = useMemo<Record<ProdesBiomeId, THREE.LineBasicMaterial>>(
    () => ({
      amazonia: new THREE.LineBasicMaterial({
        color: PRODES_MONITORING_REGIONS.amazonia.hex,
        transparent: true,
        opacity,
        depthWrite: false,
      }),
      cerrado: new THREE.LineBasicMaterial({
        color: PRODES_MONITORING_REGIONS.cerrado.hex,
        transparent: true,
        opacity,
        depthWrite: false,
      }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const alertsGeometry = useMemo(() => {
    const alerts = payload?.deterAlerts ?? [];
    if (alerts.length === 0) return null;
    const positions = new Float32Array(alerts.length * 3);
    const sizes = new Float32Array(alerts.length);
    const severities = new Float32Array(alerts.length);
    const pt: [number, number, number] = [0, 0, 0];

    for (let i = 0; i < alerts.length; i++) {
      const a = alerts[i];
      sphericalPoint(a.lat, a.lng, ALERT_RADIUS, pt);
      positions[i * 3] = pt[0];
      positions[i * 3 + 1] = pt[1];
      positions[i * 3 + 2] = pt[2];
      sizes[i] = 3.5 + Math.min(7.5, Math.sqrt(Math.max(0.05, a.areaKm2)) * 4.5);
      severities[i] = Math.min(1, a.areaKm2 / 1.5);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute("aSeverity", new THREE.BufferAttribute(severities, 1));
    return geom;
  }, [payload]);

  const alertsMaterial = useMemo(
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

  useEffect(() => {
    return () => {
      regionGeometries.amazonia.dispose();
      regionGeometries.cerrado.dispose();
      regionMaterials.amazonia.dispose();
      regionMaterials.cerrado.dispose();
      alertsMaterial.dispose();
    };
  }, [regionGeometries, regionMaterials, alertsMaterial]);

  useEffect(() => {
    return () => {
      alertsGeometry?.dispose();
    };
  }, [alertsGeometry]);

  useEffect(() => {
    regionMaterials.amazonia.opacity = opacity * (prodesBiome === "amazonia" ? 0.92 : 0.36);
    regionMaterials.cerrado.opacity = opacity * (prodesBiome === "cerrado" ? 0.92 : 0.36);
    alertsMaterial.uniforms.uOpacity.value = opacity;
    invalidate();
  }, [opacity, prodesBiome, regionMaterials, alertsMaterial, invalidate]);

  const pulseClock = useRef(0);
  useFrame((_, delta) => {
    if (isThrottled || !alertsGeometry) return;
    pulseClock.current += Math.min(delta, 0.05);
    alertsMaterial.uniforms.uPulse.value = 0.5 + 0.5 * Math.sin(pulseClock.current * 2.8);
  });

  return (
    <group>
      <lineSegments
        geometry={regionGeometries.amazonia}
        material={regionMaterials.amazonia}
        frustumCulled={false}
        renderOrder={5}
      />
      <lineSegments
        geometry={regionGeometries.cerrado}
        material={regionMaterials.cerrado}
        frustumCulled={false}
        renderOrder={5}
      />
      {alertsGeometry && (
        <points
          geometry={alertsGeometry}
          material={alertsMaterial}
          frustumCulled={false}
          renderOrder={7}
        />
      )}
    </group>
  );
};
