"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { MAGELLAN_ROUTE, HistoricalRouteWaypoint } from "@/lib/historical-routes";
import { latLngToVector3, slerpVectors } from "@/lib/geo-spatial";
import { useGlobeStore } from "@/stores/globeStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useHistoricalRouteStore } from "@/stores/historicalRouteStore";

// Trajectory altitude strictly at 1.004 to eliminate clipping or internal intersection with Earth (0, 0, 0)
export const ROUTE_ALTITUDE = 1.004;

export interface MagellanTrajectoryData {
  curve: THREE.CatmullRomCurve3;
  curvePoints: THREE.Vector3[];
  waypoints3D: { point: THREE.Vector3; waypoint: HistoricalRouteWaypoint; index: number }[];
}

/**
 * Builds the continuous spherical 3D spline of Magellan's circumnavigation
 * interpolating great-circle arcs between historic waypoints at altitude 1.004.
 */
export function createMagellanTrajectoryCurve(): MagellanTrajectoryData {
  const waypoints = MAGELLAN_ROUTE.waypoints;
  const waypoints3D = waypoints.map((wp: HistoricalRouteWaypoint, index: number) => ({
    point: latLngToVector3(wp.lat, wp.lng, ROUTE_ALTITUDE),
    waypoint: wp,
    index,
  }));

  const finePoints: THREE.Vector3[] = [];
  const subdivisions = 18;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const pA = waypoints3D[i].point;
    const pB = waypoints3D[i + 1].point;

    for (let s = 0; s < subdivisions; s++) {
      const t = s / subdivisions;
      const interp = slerpVectors(pA, pB, t);
      // Strictly enforce spherical altitude
      interp.normalize().multiplyScalar(ROUTE_ALTITUDE);
      finePoints.push(interp);
    }
  }

  // Final waypoint: return to Sanlúcar de Barrameda / Sevilha
  const finalPt = waypoints3D[waypoints3D.length - 1].point.clone();
  finePoints.push(finalPt);

  const curve = new THREE.CatmullRomCurve3(finePoints, false, "centripetal", 0.05);

  return {
    curve,
    curvePoints: finePoints,
    waypoints3D,
  };
}

export const HistoricalRouteTrajectory: React.FC = () => {
  const shipRef = useRef<THREE.Group>(null);
  const wakeMeshRef = useRef<THREE.Mesh>(null);
  const [hoveredWpIndex, setHoveredWpIndex] = useState<number | null>(null);

  const flyTo = useGlobeStore((s) => s.flyTo);
  const selectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);

  // Construct trajectory curve and waypoints
  const { curve, waypoints3D } = useMemo(() => {
    return createMagellanTrajectoryCurve();
  }, []);

  // Geometries for the trajectory line and glowing aura
  const { coreTubeGeometry, glowTubeGeometry, lineSegmentsGeometry } = useMemo(() => {
    const coreTube = new THREE.TubeGeometry(curve, 360, 0.0016, 8, false);
    // Radius calibrated to 0.0032 so min surface radius 1.0036 - 0.0032 = 1.0004 strictly stays above 1.0
    const glowTube = new THREE.TubeGeometry(curve, 360, 0.0032, 8, false);

    const points = curve.getPoints(400);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

    return {
      coreTubeGeometry: coreTube,
      glowTubeGeometry: glowTube,
      lineSegmentsGeometry: lineGeo,
    };
  }, [curve]);

  // Shared geometry for waypoint beacons and surface rings
  const { beaconSphereGeo, beaconRingGeo, accentRingGeo } = useMemo(() => {
    const sphere = new THREE.SphereGeometry(0.0042, 14, 14);
    const ring = new THREE.RingGeometry(0.006, 0.010, 24);
    const accentRing = new THREE.RingGeometry(0.010, 0.016, 24);
    return {
      beaconSphereGeo: sphere,
      beaconRingGeo: ring,
      accentRingGeo: accentRing,
    };
  }, []);

  // Shared materials for efficient WebGL rendering
  const materials = useMemo(() => {
    const coreMat = new THREE.MeshStandardMaterial({
      color: "#d97706", // Renaissance nautical gold
      metalness: 0.85,
      roughness: 0.25,
      emissive: "#b45309",
      emissiveIntensity: 0.45,
    });

    const glowMat = new THREE.MeshBasicMaterial({
      color: "#f59e0b",
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const lineMat = new THREE.LineBasicMaterial({
      color: "#fbbf24",
      transparent: true,
      opacity: 0.85,
    });

    const beaconMat = new THREE.MeshBasicMaterial({
      color: "#fbbf24",
    });

    const ringMat = new THREE.MeshBasicMaterial({
      color: "#f59e0b",
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const accentRingMat = new THREE.MeshBasicMaterial({
      color: "#38bdf8",
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const wakeMat = new THREE.MeshBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    return { coreMat, glowMat, lineMat, beaconMat, ringMat, accentRingMat, wakeMat };
  }, []);

  const navigationLine = useMemo(() => {
    return new THREE.Line(lineSegmentsGeometry, materials.lineMat);
  }, [lineSegmentsGeometry, materials.lineMat]);

  // Dynamic wake ribbon buffer geometry
  const wakeGeometry = useMemo(() => {
    const numWakeSegments = 20;
    const vertexCount = (numWakeSegments + 1) * 2;
    const positions = new Float32Array(vertexCount * 3);
    const indices: number[] = [];

    for (let i = 0; i < numWakeSegments; i++) {
      const rowA = i * 2;
      const rowB = (i + 1) * 2;
      indices.push(rowA, rowB, rowA + 1);
      indices.push(rowA + 1, rowB, rowB + 1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setIndex(indices);
    return geo;
  }, []);

  // WebGL memory cleanup on unmount
  useEffect(() => {
    return () => {
      coreTubeGeometry.dispose();
      glowTubeGeometry.dispose();
      lineSegmentsGeometry.dispose();
      beaconSphereGeo.dispose();
      beaconRingGeo.dispose();
      accentRingGeo.dispose();
      wakeGeometry.dispose();
      materials.coreMat.dispose();
      materials.glowMat.dispose();
      materials.lineMat.dispose();
      materials.beaconMat.dispose();
      materials.ringMat.dispose();
      materials.accentRingMat.dispose();
      materials.wakeMat.dispose();
    };
  }, [
    coreTubeGeometry,
    glowTubeGeometry,
    lineSegmentsGeometry,
    beaconSphereGeo,
    beaconRingGeo,
    accentRingGeo,
    wakeGeometry,
    materials,
  ]);

  // Clean up cursor style on unmount
  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.cursor = "default";
      }
    };
  }, []);

  // Track playback progress synchronized with useHistoricalRouteStore
  const localProgressRef = useRef<number>(
    typeof window !== "undefined" ? useHistoricalRouteStore.getState().progress || 0 : 0
  );
  const lastStoreUpdateRef = useRef<number>(0);

  // Animate the Nau Victoria and dynamic wake ribbon along the curve
  useFrame((state, delta) => {
    if (!curve) return;

    const routeStore = useHistoricalRouteStore.getState();
    const isActive = Boolean(routeStore.activeRouteId);

    let progress: number;

    if (isActive) {
      if (routeStore.isPlaying) {
        routeStore.tick(delta);
      }
      progress = routeStore.progress;
      localProgressRef.current = progress;
    } else {
      // Standalone continuous loop when route is not actively driven by HUD
      const loopDuration = 60.0;
      progress = (state.clock.getElapsedTime() / loopDuration) % 1.0;
      localProgressRef.current = progress;
    }

    // Ship 3D position strictly at altitude 1.004
    const shipPos = curve.getPointAt(progress).normalize().multiplyScalar(ROUTE_ALTITUDE);
    const tangent = curve.getTangentAt(progress).normalize();

    // Spherical surface normal (upward from planet center)
    const up = shipPos.clone().normalize();

    // Lateral starboard/port axis (up cross tangent yields pure right-handed basis with det = +1)
    const right = new THREE.Vector3().crossVectors(up, tangent).normalize();

    // Forward heading tangent to sphere surface
    const forward = new THREE.Vector3().crossVectors(right, up).normalize();

    if (shipRef.current) {
      const rotMatrix = new THREE.Matrix4().makeBasis(right, up, forward);
      shipRef.current.quaternion.setFromRotationMatrix(rotMatrix);
      shipRef.current.position.copy(shipPos);

      // Gentle realistic sea rolling and pitching motion
      const elapsed = state.clock.getElapsedTime();
      const roll = Math.sin(elapsed * 2.8) * 0.04;
      const pitch = Math.cos(elapsed * 2.1) * 0.025;
      shipRef.current.rotateX(pitch);
      shipRef.current.rotateZ(roll);
    }

    // Update wake ribbon trailing behind the stern
    if (wakeMeshRef.current && wakeGeometry) {
      const posAttr = wakeGeometry.attributes.position as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;
      const numWakeSegments = 20;
      const wakeLengthFraction = 0.024; // ~1.5% of circumnavigation curve

      for (let i = 0; i <= numWakeSegments; i++) {
        const segFrac = i / numWakeSegments;
        let trailingP = progress - segFrac * wakeLengthFraction;
        if (trailingP < 0) trailingP += 1.0;

        const centerPt = curve.getPointAt(trailingP).normalize().multiplyScalar(1.0028);
        const trailTangent = curve.getTangentAt(trailingP).normalize();
        const trailUp = centerPt.clone().normalize();
        const trailRight = new THREE.Vector3().crossVectors(trailUp, trailTangent).normalize();

        // Wake spreads outward from the stern as it fades
        const spreadWidth = 0.0012 + segFrac * 0.0075;
        const leftPt = centerPt.clone().addScaledVector(trailRight, -spreadWidth);
        const rightPt = centerPt.clone().addScaledVector(trailRight, spreadWidth);

        const vIdx = i * 2;
        positions[vIdx * 3] = leftPt.x;
        positions[vIdx * 3 + 1] = leftPt.y;
        positions[vIdx * 3 + 2] = leftPt.z;

        positions[(vIdx + 1) * 3] = rightPt.x;
        positions[(vIdx + 1) * 3 + 1] = rightPt.y;
        positions[(vIdx + 1) * 3 + 2] = rightPt.z;
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group name="historical-route-magellan-1519">
      {/* 1. Core Gold Trajectory Tube */}
      <mesh geometry={coreTubeGeometry} material={materials.coreMat} />

      {/* 2. Soft Renaissance Amber Glow Aura */}
      <mesh geometry={glowTubeGeometry} material={materials.glowMat} />

      {/* 3. Renaissance Cartographic Navigation Guide Track */}
      <primitive object={navigationLine} raycast={() => null} />

      {/* 3. Waypoint Beacons & Orientation Rings */}
      {waypoints3D.map(({ point, waypoint, index }) => {
        const normal = point.clone().normalize();
        const ringQuat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          normal
        );
        const isHovered = hoveredWpIndex === index;
        const isSelectedMilestone =
          selectedMilestoneId === `magellan-${index}` ||
          (index === 0 && selectedMilestoneId === "esp-1519") ||
          (index === 6 && selectedMilestoneId === "magellan-strait");

        const isKeyMilestone =
          index === 0 || // Sanlúcar
          index === 3 || // Guanabara
          index === 6 || // Estreito de Magalhães
          index === 10 || // Mactan
          index === 11 || // Tidore
          index === 14; // Cabo da Boa Esperança

        return (
          <group
            key={`waypoint-${index}-${waypoint.name}`}
            position={point}
            onClick={(e) => {
              e.stopPropagation();
              flyTo(waypoint.lat, waypoint.lng, 1.8);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredWpIndex(index);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              setHoveredWpIndex(null);
              document.body.style.cursor = "default";
            }}
          >
            {/* Beacon Sphere */}
            <mesh geometry={beaconSphereGeo} material={materials.beaconMat} />

            {/* Flat Tangent Ring */}
            <mesh
              geometry={beaconRingGeo}
              quaternion={ringQuat}
              material={materials.ringMat}
              scale={isHovered ? [1.4, 1.4, 1.4] : [1.0, 1.0, 1.0]}
            />

            {/* Accent Ring for Key Historical Landmarks */}
            {(isKeyMilestone || isSelectedMilestone) && (
              <mesh
                geometry={accentRingGeo}
                quaternion={ringQuat}
                material={materials.accentRingMat}
              />
            )}
          </group>
        );
      })}

      {/* 4. Dynamic Water Wake Ribbon (Foam trailing the Nau Victoria) */}
      <mesh
        ref={wakeMeshRef}
        geometry={wakeGeometry}
        material={materials.wakeMat}
        frustumCulled={false}
      />

      {/* 5. Stylized 3D Model: Nau Victoria (16th-Century Spanish Carrack) */}
      <group ref={shipRef} name="nau-victoria-ship" scale={[1.2, 1.2, 1.2]}>
        {/* Main Oak Hull */}
        <mesh position={[0, 0.003, 0]}>
          <boxGeometry args={[0.008, 0.006, 0.024]} />
          <meshStandardMaterial color="#5c3a21" roughness={0.7} metalness={0.1} />
        </mesh>

        {/* Keel taper / bottom curve */}
        <mesh position={[0, -0.001, 0]}>
          <cylinderGeometry args={[0.0035, 0.0025, 0.003, 8]} />
          <meshStandardMaterial color="#451a03" roughness={0.8} />
        </mesh>

        {/* Poop Deck / Castle (Castelo de Popa - aft castle) */}
        <mesh position={[0, 0.008, -0.008]}>
          <boxGeometry args={[0.008, 0.007, 0.009]} />
          <meshStandardMaterial color="#78350f" roughness={0.65} metalness={0.15} />
        </mesh>

        {/* Forecastle (Castelo de Proa - forward deck) */}
        <mesh position={[0, 0.007, 0.0085]}>
          <boxGeometry args={[0.007, 0.005, 0.007]} />
          <meshStandardMaterial color="#78350f" roughness={0.65} />
        </mesh>

        {/* Bowsprit (Gurupés angled forward) */}
        <mesh position={[0, 0.008, 0.016]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.0006, 0.0004, 0.012, 6]} />
          <meshStandardMaterial color="#b45309" roughness={0.5} />
        </mesh>

        {/* Main Mast (Mastro Grande) */}
        <mesh position={[0, 0.016, 0]}>
          <cylinderGeometry args={[0.0007, 0.0007, 0.024, 8]} />
          <meshStandardMaterial color="#b45309" roughness={0.5} />
        </mesh>

        {/* Main Sail (Vela Redonda Grande) */}
        <mesh position={[0, 0.017, 0.0012]}>
          <boxGeometry args={[0.016, 0.013, 0.001]} />
          <meshStandardMaterial
            color="#fef3c7"
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Main Yard (Verga do Mastro Grande) */}
        <mesh position={[0, 0.023, 0.001]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.0005, 0.0005, 0.018, 6]} />
          <meshStandardMaterial color="#78350f" roughness={0.6} />
        </mesh>

        {/* Foremast (Mastro de Proa / Traquete) */}
        <mesh position={[0, 0.013, 0.008]}>
          <cylinderGeometry args={[0.0006, 0.0006, 0.018, 8]} />
          <meshStandardMaterial color="#b45309" roughness={0.5} />
        </mesh>

        {/* Fore Sail (Vela de Proa) */}
        <mesh position={[0, 0.014, 0.009]}>
          <boxGeometry args={[0.012, 0.010, 0.001]} />
          <meshStandardMaterial
            color="#fef3c7"
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Mizzenmast (Mastro de Popa / Mezena) */}
        <mesh position={[0, 0.012, -0.008]}>
          <cylinderGeometry args={[0.0005, 0.0005, 0.014, 8]} />
          <meshStandardMaterial color="#b45309" roughness={0.5} />
        </mesh>

        {/* Lateen Sail on Mizzenmast (Vela Latina Triangular) */}
        <mesh position={[0, 0.012, -0.0075]} rotation={[0, 0.25, 0]}>
          <boxGeometry args={[0.008, 0.008, 0.0008]} />
          <meshStandardMaterial
            color="#fef3c7"
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Red Expedition Pennants on Mast Tops */}
        <mesh position={[0, 0.0285, -0.0015]} rotation={[0, 0, -Math.PI / 8]}>
          <boxGeometry args={[0.0015, 0.0012, 0.004]} />
          <meshBasicMaterial color="#dc2626" />
        </mesh>
      </group>
    </group>
  );
};
