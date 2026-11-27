"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { ASTROPHYSICAL_CATALOG } from "@/lib/astronomy-planets";
import { bodySceneRadius, earthSystemScale } from "@/lib/cosmic-scale";
import {
  clearEclipseSurfaceShadow,
  setEclipseSurfaceShadow,
} from "@/lib/eclipse-shader-state";
import { ECLIPSES_CATALOG } from "@/lib/eclipses-catalog";
import {
  buildTotalityCenterlinePoints,
  buildTotalityRibbonGeometry,
  computeEclipseGeometry,
  TOTALITY_CENTERLINE_RADIUS,
} from "@/lib/eclipses-geometry";
import { latLngToVector3 } from "@/lib/geo-spatial";
import { useCosmicStore } from "@/stores/cosmicStore";

const ignoreRaycast = () => null;
const MOON_LOCAL_BASE_RADIUS = 0.27;

/**
 * Camada 3D de Eclipses Solares & Lunares (D41):
 * - Sincroniza `eclipseShaderState` para escurecer fisicamente `EarthSphere` e `CloudLayer`;
 * - Desenha acima das nuvens (`R > 1.006`) o corredor geodésico de totalidade, as linhas-limite
 *   norte/sul, a linha central dourada, o anel coronal móvel da umbra e os marcos das estações;
 * - Projeta cones 3D com orientação e abertura físicas reais:
 *   • Solar: da Lua (`0.27 * moonScale`) afunilando até a mancha de umbra sobre a cidade eclipsada;
 *   • Lunar: do terminador terrestre (`R = 0.99`) envolvendo a Lua Cheia em crepúsculo avermelhado;
 * - Nunca intercepta cliques sobre países (`raycast={() => null}`) e descarta 100% da GPU (`RN21`).
 */
export const EclipseShadowLayer: React.FC = () => {
  const activeEclipseId = useCosmicStore((s) => s.activeEclipseId);
  const offsetMinutes = useCosmicStore((s) => s.eclipseOffsetMinutes);
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const scaleMode = useCosmicStore((s) => s.scaleMode);
  const invalidate = useThree((s) => s.invalidate);

  const instant = useMemo(() => {
    if (!activeEclipseId) return null;
    return computeEclipseGeometry(activeEclipseId, offsetMinutes);
  }, [activeEclipseId, offsetMinutes]);

  const eclipseEntry = activeEclipseId ? ECLIPSES_CATALOG[activeEclipseId] : null;

  const moonEffectiveRadius = useMemo(() => {
    if (!isCosmicMode) return MOON_LOCAL_BASE_RADIUS;
    return (
      bodySceneRadius(ASTROPHYSICAL_CATALOG.MOON.equatorialRadiusKm, scaleMode) /
      earthSystemScale(scaleMode)
    );
  }, [isCosmicMode, scaleMode]);

  const staticVisuals = useMemo(() => {
    const coronaRingGeo = new THREE.RingGeometry(0.022, 0.035, 48);
    const coronaRingMat = new THREE.MeshBasicMaterial({
      color: "#fbbf24",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
      toneMapped: false,
    });
    const umbraCoreGeo = new THREE.CircleGeometry(0.022, 36);
    const umbraCoreMat = new THREE.MeshBasicMaterial({
      color: "#020617",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    const stationDotGeo = new THREE.SphereGeometry(0.0085, 12, 12);
    const stationDotMat = new THREE.MeshBasicMaterial({
      color: "#fef08a",
      toneMapped: false,
    });
    // CylinderGeometry(radiusTop = +Y = end, radiusBottom = -Y = start, height = 1)
    const solarConeGeo = new THREE.CylinderGeometry(1.0, 0.09, 1.0, 32, 1, true);
    const solarConeMat = new THREE.MeshBasicMaterial({
      color: "#020617",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const lunarConeGeo = new THREE.CylinderGeometry(0.64, 0.99, 1.0, 36, 1, true);
    const lunarConeMat = new THREE.MeshBasicMaterial({
      color: "#991b1b",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    return {
      coronaRingGeo,
      coronaRingMat,
      umbraCoreGeo,
      umbraCoreMat,
      stationDotGeo,
      stationDotMat,
      solarConeGeo,
      solarConeMat,
      lunarConeGeo,
      lunarConeMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      clearEclipseSurfaceShadow();
      staticVisuals.coronaRingGeo.dispose();
      staticVisuals.coronaRingMat.dispose();
      staticVisuals.umbraCoreGeo.dispose();
      staticVisuals.umbraCoreMat.dispose();
      staticVisuals.stationDotGeo.dispose();
      staticVisuals.stationDotMat.dispose();
      staticVisuals.solarConeGeo.dispose();
      staticVisuals.solarConeMat.dispose();
      staticVisuals.lunarConeGeo.dispose();
      staticVisuals.lunarConeMat.dispose();
    };
  }, [staticVisuals]);

  const totalityVisuals = useMemo(() => {
    if (!eclipseEntry || eclipseEntry.kind !== "solar_total") return null;
    const ribbonGeo = buildTotalityRibbonGeometry(
      eclipseEntry.centerline,
      eclipseEntry.umbraWidthKm
    );
    const ribbonMat = new THREE.MeshBasicMaterial({
      color: "#050814",
      transparent: true,
      opacity: 0.64,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Extrai as bordas norte e sul diretamente dos pares de vértices da fita de totalidade
    const ribAttr = ribbonGeo.getAttribute("position");
    const borderPos: number[] = [];
    const pairs = Math.floor(ribAttr.count / 2);
    for (let i = 1; i < pairs; i++) {
      const l0 = (i - 1) * 2;
      const l1 = i * 2;
      borderPos.push(
        ribAttr.getX(l0),
        ribAttr.getY(l0),
        ribAttr.getZ(l0),
        ribAttr.getX(l1),
        ribAttr.getY(l1),
        ribAttr.getZ(l1)
      );
      const r0 = l0 + 1;
      const r1 = l1 + 1;
      borderPos.push(
        ribAttr.getX(r0),
        ribAttr.getY(r0),
        ribAttr.getZ(r0),
        ribAttr.getX(r1),
        ribAttr.getY(r1),
        ribAttr.getZ(r1)
      );
    }
    const borderGeo = new THREE.BufferGeometry();
    borderGeo.setAttribute("position", new THREE.Float32BufferAttribute(borderPos, 3));
    const borderMat = new THREE.LineBasicMaterial({
      color: "#fde68a",
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      toneMapped: false,
    });

    const pts = buildTotalityCenterlinePoints(eclipseEntry.centerline, TOTALITY_CENTERLINE_RADIUS);
    const linePos: number[] = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      linePos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: "#f59e0b",
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
      toneMapped: false,
    });

    const stationPositions = eclipseEntry.stations.map((st) =>
      latLngToVector3(st.lat, st.lng, 1.0086)
    );

    return { ribbonGeo, ribbonMat, borderGeo, borderMat, lineGeo, lineMat, stationPositions };
  }, [eclipseEntry]);

  useEffect(() => {
    invalidate();
    return () => {
      if (!totalityVisuals) return;
      totalityVisuals.ribbonGeo.dispose();
      totalityVisuals.ribbonMat.dispose();
      totalityVisuals.borderGeo.dispose();
      totalityVisuals.borderMat.dispose();
      totalityVisuals.lineGeo.dispose();
      totalityVisuals.lineMat.dispose();
    };
  }, [totalityVisuals, invalidate]);

  useEffect(() => {
    if (!instant) {
      clearEclipseSurfaceShadow();
      invalidate();
      return;
    }
    const solarStrength =
      instant.eclipse.kind === "solar_total" ? (instant.isTotalityActive ? 1.0 : 0.45) : 0.0;
    setEclipseSurfaceShadow(
      instant.shadowDirection,
      instant.umbraAngularRad,
      instant.penumbraAngularRad,
      solarStrength
    );
    invalidate();
  }, [instant, invalidate]);

  const coneTransform = useMemo(() => {
    if (!instant) return null;
    const isSolar = instant.eclipse.kind === "solar_total";
    const start = isSolar
      ? instant.shadowDirection.clone().multiplyScalar(1.006)
      : new THREE.Vector3(0, 0, 0);
    const end = isSolar
      ? instant.syzygyMoonLocalPos.clone()
      : instant.syzygyMoonLocalPos.clone().multiplyScalar(1.12);
    const axis = end.clone().sub(start);
    const length = axis.length();
    if (length < 0.2) return null;
    const mid = start.clone().addScaledVector(axis, 0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      axis.clone().normalize()
    );
    const radialScale = isSolar ? moonEffectiveRadius : 1.0;
    return { isSolar, mid, quat, scale: [radialScale, length, radialScale] as [number, number, number] };
  }, [instant, moonEffectiveRadius]);

  if (!instant) return null;

  const markerPos = instant.shadowDirection.clone().multiplyScalar(1.0086);
  const markerQuat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    instant.shadowDirection
  );

  return (
    <group name="eclipse-shadow-layer">
      {totalityVisuals && (
        <>
          <mesh
            geometry={totalityVisuals.ribbonGeo}
            material={totalityVisuals.ribbonMat}
            raycast={ignoreRaycast}
            renderOrder={9}
          />
          <lineSegments
            geometry={totalityVisuals.borderGeo}
            material={totalityVisuals.borderMat}
            raycast={ignoreRaycast}
            renderOrder={10}
          />
          <lineSegments
            geometry={totalityVisuals.lineGeo}
            material={totalityVisuals.lineMat}
            raycast={ignoreRaycast}
            renderOrder={11}
          />
          {totalityVisuals.stationPositions.map((pos, idx) => (
            <mesh
              key={idx}
              position={pos}
              geometry={staticVisuals.stationDotGeo}
              material={staticVisuals.stationDotMat}
              raycast={ignoreRaycast}
              renderOrder={12}
            />
          ))}
        </>
      )}

      {instant.eclipse.kind === "solar_total" && (
        <group position={markerPos} quaternion={markerQuat}>
          <mesh
            geometry={staticVisuals.umbraCoreGeo}
            material={staticVisuals.umbraCoreMat}
            raycast={ignoreRaycast}
            renderOrder={12}
          />
          <mesh
            geometry={staticVisuals.coronaRingGeo}
            material={staticVisuals.coronaRingMat}
            raycast={ignoreRaycast}
            renderOrder={13}
          />
        </group>
      )}

      {coneTransform && (
        <mesh
          position={coneTransform.mid}
          quaternion={coneTransform.quat}
          scale={coneTransform.scale}
          geometry={
            coneTransform.isSolar ? staticVisuals.solarConeGeo : staticVisuals.lunarConeGeo
          }
          material={
            coneTransform.isSolar ? staticVisuals.solarConeMat : staticVisuals.lunarConeMat
          }
          raycast={ignoreRaycast}
          renderOrder={7}
        />
      )}
    </group>
  );
};
