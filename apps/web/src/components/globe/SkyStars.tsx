"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { resolveAstronomicalDate } from "@/lib/astronomy";
import { findMilestoneById } from "@/lib/milestones";
import { useEpochState } from "@/lib/epoch/useEpochState";
import {
  bvToRgb,
  decodeHygCatalog,
  equatorialToVector3,
  greenwichSiderealAngle,
  IAU_CONSTELLATIONS,
  J2000_OBLIQUITY,
  STAR_CATALOG_URL,
  starAppearance,
  type StarCatalog,
} from "@/lib/hyg-star-data";
import { SkyLabels, type SkyLabel } from "./SkyLabels";

const STAR_RADIUS = 550;
const MILKY_WAY_URL = "/data/sky/milky-way-j2000.jpg";
const ignoreRaycast = () => null;

const starVertex = /* glsl */ `
  uniform float pixelRatio;
  attribute vec3 starColor;
  attribute vec2 appearance;
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vColor = starColor;
    vOpacity = appearance.y;
    gl_PointSize = max(2.0, appearance.x * pixelRatio);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const starFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    float radius = 2.0 * length(gl_PointCoord - vec2(0.5));
    float opacity = (1.0 - smoothstep(0.12, 1.0, radius)) * vOpacity;
    gl_FragColor = vec4(vColor, opacity);
    #include <colorspace_fragment>
  }
`;

function buildSky(catalog: StarCatalog) {
  const { stars, visibleCount } = catalog;
  const positions = new Float32Array(visibleCount * 3);
  const colors = new Float32Array(visibleCount * 3);
  const appearances = new Float32Array(visibleCount * 2);
  const hipPositions = new Map<number, THREE.Vector3>();
  const starLabels: SkyLabel[] = [];
  const color = new THREE.Color();

  stars.forEach((star, i) => {
    const position = equatorialToVector3(star.ra, star.dec, STAR_RADIUS);
    if (star.hip && !hipPositions.has(star.hip)) hipPositions.set(star.hip, position);
    if (i >= visibleCount) return;

    position.toArray(positions, i * 3);
    color.setRGB(...bvToRgb(star.bv), THREE.SRGBColorSpace).toArray(colors, i * 3);
    const appearance = starAppearance(star.vMag);
    appearances.set([appearance.diameter, appearance.opacity], i * 2);
    if (star.name && star.vMag <= 1.5) {
      starLabels.push({ name: star.name, position, kind: "star" });
    }
  });

  const starGeometry = new THREE.BufferGeometry()
    .setAttribute("position", new THREE.BufferAttribute(positions, 3))
    .setAttribute("starColor", new THREE.BufferAttribute(colors, 3))
    .setAttribute("appearance", new THREE.BufferAttribute(appearances, 2));
  const linePoints: THREE.Vector3[] = [];
  const constellationLabels: SkyLabel[] = [];
  for (const constellation of IAU_CONSTELLATIONS) {
    const members = new Set<THREE.Vector3>();
    for (const path of constellation.paths) {
      for (let i = 1; i < path.length; i++) {
        const a = hipPositions.get(path[i - 1]);
        const b = hipPositions.get(path[i]);
        if (!a || !b) continue;
        linePoints.push(a, b);
        members.add(a);
        members.add(b);
      }
    }
    const center = new THREE.Vector3();
    for (const member of members) center.add(member);
    if (members.size) {
      constellationLabels.push({
        name: constellation.namePt,
        position: center.setLength(STAR_RADIUS),
        kind: "constellation",
      });
    }
  }

  return {
    starGeometry,
    lineGeometry: new THREE.BufferGeometry().setFromPoints(linePoints),
    starLabels,
    constellationLabels,
  };
}

function MilkyWay({ cosmic }: { cosmic: boolean }) {
  const texture = useTexture(MILKY_WAY_URL);
  useLayoutEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  const geometry = useMemo(() => {
    const sphere = new THREE.SphereGeometry(STAR_RADIUS + 10, 48, 24);
    const uv = sphere.attributes.uv;
    // The source is centered on RA 0h with RA increasing toward the left.
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    return sphere;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} renderOrder={-100} raycast={ignoreRaycast}>
      <meshBasicMaterial
        map={texture}
        color={cosmic ? "#70788e" : "#4a5060"}
        side={THREE.BackSide}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

export function SkyStars() {
  const cosmic = useCosmicStore((state) => state.isCosmicMode);
  const layers = useCosmicStore((state) => state.activeCosmicLayers);
  const selectedYear = useTimelineStore((state) => state.selectedYear);
  const milestoneId = useTimelineStore((state) => state.selectedMilestoneId);
  const scene = useEpochState().activeScene;
  const showLines = !cosmic || layers.includes("CONSTELLATIONS");
  const showLabels = cosmic && layers.includes("LABELS");
  const dpr = useThree((state) => state.viewport.dpr);
  const [catalog, setCatalog] = useState<StarCatalog | null>(null);
  const sky = useMemo(() => catalog && buildSky(catalog), [catalog]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(STAR_CATALOG_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HYG catalog returned HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((buffer) => {
        if (!controller.signal.aborted) setCatalog(decodeHygCatalog(buffer));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) console.error("Failed to load the HYG catalog", error);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => () => {
    sky?.starGeometry.dispose();
    sky?.lineGeometry.dispose();
  }, [sky]);

  const date = useMemo(() => {
    const milestone = milestoneId ? findMilestoneById(milestoneId) : null;
    const now = new Date();
    const resolved = resolveAstronomicalDate({
      selectedYear,
      selectedMilestoneExactDate: milestone?.exactDate,
      selectedMilestoneYear: milestone?.year,
      activeScene: scene,
      now,
    });
    return resolved === now ? null : resolved;
  }, [selectedYear, milestoneId, scene]);
  const group = useRef<THREE.Group>(null);
  const liveAngle = useRef({ minute: -1, angle: 0 });
  const fixedAngle = useMemo(() => date && greenwichSiderealAngle(date), [date]);
  useFrame(({ camera }) => {
    if (!group.current) return;
    // Center the distant sky on the observer, so orbital camera flights have no stellar parallax.
    group.current.position.copy(camera.position);
    if (cosmic) {
      group.current.rotation.set(-J2000_OBLIQUITY, 0, 0);
    } else {
      if (fixedAngle === null) {
        const minute = Math.floor(Date.now() / 60000);
        if (liveAngle.current.minute !== minute) {
          liveAngle.current = { minute, angle: greenwichSiderealAngle(new Date(minute * 60000)) };
        }
      }
      group.current.rotation.set(0, -(fixedAngle ?? liveAngle.current.angle), 0);
    }
  });

  const uniforms = useMemo(() => ({ pixelRatio: { value: dpr } }), [dpr]);
  const labels = useMemo(() => {
    if (!showLabels || !sky) return [];
    return showLines ? [...sky.starLabels, ...sky.constellationLabels] : sky.starLabels;
  }, [showLabels, showLines, sky]);

  return (
    <group ref={group} name="celestial-vault">
      <Suspense fallback={null}><MilkyWay cosmic={cosmic} /></Suspense>
      {sky && (
        <>
          <points name="hyg-catalog" geometry={sky.starGeometry} raycast={ignoreRaycast} frustumCulled={false}>
            <shaderMaterial
              vertexShader={starVertex}
              fragmentShader={starFragment}
              uniforms={uniforms}
              transparent
              depthWrite={false}
              toneMapped={false}
            />
          </points>
          {showLines && (
            <lineSegments name="stellarium-constellations" geometry={sky.lineGeometry} raycast={ignoreRaycast}>
              <lineBasicMaterial color="#4b809d" transparent opacity={cosmic ? 0.30 : 0.13} depthWrite={false} />
            </lineSegments>
          )}
          {!!labels.length && <SkyLabels labels={labels} />}
        </>
      )}
    </group>
  );
}
