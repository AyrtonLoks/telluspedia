"use client";

import { useEffect, useMemo, useRef } from "react";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AIS_MAX_VESSELS, AIS_POLL_MS, aisRegion, type AisSnapshot, type VesselKind } from "@/lib/ais-data";
import { aircraftHeading } from "@/lib/aircraft-motion";
import { latLngToVector3, slerpVectors } from "@/lib/geo-spatial";
import { useObservatoryStore } from "@/stores/observatoryStore";

const ROUTE_RADIUS = 1.003;
const SHIP_RADIUS = 1.007;
const EARTH_METERS = 6_371_000;
const KNOT_METERS_PER_SECOND = 1852 / 3600;
const MAX_PREDICTION_SECONDS = 60;
const ROUTE_COLOR = "#63c0ad";
const HULL_COLORS: Record<VesselKind, THREE.Color> = {
  cargo: new THREE.Color("#7ddcc3"),
  tanker: new THREE.Color("#f2ad77"),
  container: new THREE.Color("#76c7fa"),
  passenger: new THREE.Color("#f4e098"),
  fishing: new THREE.Color("#c8adf0"),
  other: new THREE.Color("#adc7c9"),
  unknown: new THREE.Color("#adc7c9"),
};

function VesselFleet({ vessels, opacity }: { vessels: AisSnapshot["vessels"]; opacity: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const picked = useObservatoryStore((s) => s.selectedEntity);
  const selectedId = picked?.type === "VESSEL" ? picked.data.id : undefined;
  const meta = useObservatoryStore((s) => s.layerMeta.MARITIME_ROUTES);
  const select = useObservatoryStore((s) => s.setSelectedEntity);
  const geometry = useMemo(() => {
    // Perfil desenhado no plano tangente, com a proa em +Z.
    const hull = new THREE.Shape();
    hull.moveTo(0, -0.74);
    hull.lineTo(0.31, -0.29);
    hull.lineTo(0.31, 0.55);
    hull.lineTo(-0.31, 0.55);
    hull.lineTo(-0.31, -0.29);
    hull.closePath();
    return new THREE.ShapeGeometry(hull).rotateX(-Math.PI / 2);
  }, []);
  const scratch = useMemo(() => ({
    normal: new THREE.Vector3(),
    bow: new THREE.Vector3(),
    right: new THREE.Vector3(),
    transform: new THREE.Matrix4(),
    scale: new THREE.Vector3(),
  }), []);
  const tracks = useMemo(() => vessels.map((vessel) => {
    const normal = latLngToVector3(vessel.lat, vessel.lng);
    return {
      vessel,
      normal,
      course: vessel.courseDeg == null ? null : aircraftHeading(vessel.lng, normal, vessel.courseDeg),
      bow: aircraftHeading(vessel.lng, normal, vessel.headingDeg ?? vessel.courseDeg ?? 0),
    };
  }), [vessels]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ camera, size }) => {
    const fleet = mesh.current;
    if (!fleet) return;
    const { normal, bow, right, transform, scale } = scratch;
    const now = Date.now();
    fleet.count = tracks.length;
    for (const [index, track] of tracks.entries()) {
      const { vessel, course } = track;
      normal.copy(track.normal);
      if (course && vessel.speedKnots != null && vessel.observedAt > 0 && !meta.stale) {
        const elapsed = THREE.MathUtils.clamp((now - vessel.observedAt) / 1000, 0, MAX_PREDICTION_SECONDS);
        const arc = elapsed * vessel.speedKnots * KNOT_METERS_PER_SECOND / EARTH_METERS;
        normal.multiplyScalar(Math.cos(arc)).addScaledVector(course, Math.sin(arc));
      }
      right.crossVectors(normal, track.bow).normalize();
      bow.crossVectors(right, normal).normalize();
      const distance = camera.position.distanceToSquared(normal);
      const markerSize = THREE.MathUtils.clamp(11 * Math.sqrt(distance) / size.height, 0.0018, 0.08);
      const selected = selectedId === vessel.id;
      const pixelScale = markerSize * (selected ? 1.35 : 1);
      transform.makeBasis(right, normal, bow).scale(scale.setScalar(pixelScale));
      transform.setPosition(normal.multiplyScalar(SHIP_RADIUS));
      fleet.setMatrixAt(index, transform);
      fleet.setColorAt(index, selected ? SELECTED_COLOR : HULL_COLORS[vessel.kind]);
    }
    fleet.instanceMatrix.needsUpdate = true;
    if (fleet.instanceColor) fleet.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      name="ais-vessels"
      boundingSphere={FLEET_BOUNDS}
      args={[geometry, undefined, AIS_MAX_VESSELS]}
      count={0}
      frustumCulled={false}
      onClick={(event) => {
        const vessel = event.instanceId == null ? undefined : vessels[event.instanceId];
        if (!vessel || opacity <= 0.02) return;
        event.stopPropagation();
        select({ type: "VESSEL", data: vessel, meta });
      }}
    >
      <meshBasicMaterial transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  );
}

const SELECTED_COLOR = new THREE.Color("#fff5d7");
const FLEET_BOUNDS = new THREE.Sphere(new THREE.Vector3(), SHIP_RADIUS + 0.16);
const ignoreRaycast = () => {};

function CorridorFlow({ path, count, opacity }: { path: THREE.CurvePath<THREE.Vector3>; count: number; opacity: number }) {
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const points = useRef<THREE.BufferAttribute>(null);

  useFrame(({ clock }) => {
    for (let index = 0; index < count; index++) {
      // Fluxo ilustrativo nos dois sentidos. As setas AIS mostram os rumos individuais.
      const direction = index % 2 === 0 ? 1 : -1;
      const progress = ((index / count + direction * clock.elapsedTime / 36) % 1 + 1) % 1;
      path.getPoint(progress).toArray(positions, index * 3);
    }
    if (points.current) points.current.needsUpdate = true;
  });

  return (
    <points name="ais-corridor-flow" frustumCulled={false} raycast={ignoreRaycast}>
      <bufferGeometry>
        <bufferAttribute ref={points} attach="attributes-position" args={[positions, 3]} usage={THREE.DynamicDrawUsage} />
      </bufferGeometry>
      <pointsMaterial size={3} sizeAttenuation={false} color={ROUTE_COLOR} transparent opacity={opacity * 0.75} depthWrite={false} toneMapped={false} />
    </points>
  );
}

export function MaritimeRoutesLayer() {
  const routes = useObservatoryStore((s) => s.maritimeRoutes);
  const { vessels, corridorCounts } = useObservatoryStore((s) => s.ais);
  const opacity = useObservatoryStore((s) => s.layerOpacity.MARITIME_ROUTES);
  const select = useObservatoryStore((s) => s.setSelectedEntity);
  const loadLayerData = useObservatoryStore((s) => s.loadLayerData);

  useEffect(() => {
    const refresh = () => { void loadLayerData("MARITIME_ROUTES"); };
    const meta = useObservatoryStore.getState().layerMeta.MARITIME_ROUTES;
    if (Date.now() - Date.parse(meta.fetchedAt) >= AIS_POLL_MS) refresh();
    const timer = setInterval(refresh, AIS_POLL_MS);
    return () => clearInterval(timer);
  }, [loadLayerData]);

  const routeData = useMemo(() => routes.filter((route) => route.coordinates.length >= 2).map((route) => {
    const points = route.coordinates.slice(1).flatMap(([lat, lng], index) => {
      const start = latLngToVector3(...route.coordinates[index], ROUTE_RADIUS);
      const end = latLngToVector3(lat, lng, ROUTE_RADIUS);
      return Array.from({ length: 16 }, (_, step) => slerpVectors(start, end, step / 16));
    });
    points.push(latLngToVector3(...route.coordinates[route.coordinates.length - 1], ROUTE_RADIUS));
    const flow = new THREE.CurvePath<THREE.Vector3>();
    for (const [index, point] of points.slice(1).entries()) {
      const start = points[index];
      if (aisRegionForVector(start, route.id)) flow.add(new THREE.LineCurve3(start, point));
    }
    return { route, points, flow };
  }), [routes]);

  if (opacity <= 0.02) return null;
  return (
    <group name="maritime-traffic">
      {routeData.map(({ route, points, flow }) => {
        const count = corridorCounts[route.id as keyof typeof corridorCounts] ?? 0;
        return (
          <group key={route.id}>
            <Line
              points={points}
              color={ROUTE_COLOR}
              lineWidth={0.8 + Math.min(1.7, Math.log1p(count) * 0.32)}
              transparent
              opacity={opacity * (count > 0 ? 0.52 : 0.27)}
              depthWrite={false}
              onClick={(event) => {
                event.stopPropagation();
                select({ type: "MARITIME", data: route });
              }}
            />
            {count > 0 && flow.curves.length > 0 && (
              <CorridorFlow path={flow} count={Math.min(12, 3 + Math.floor(Math.log2(count)))} opacity={opacity} />
            )}
          </group>
        );
      })}
      <VesselFleet vessels={vessels} opacity={opacity} />
    </group>
  );
}

function aisRegionForVector(point: THREE.Vector3, id: string) {
  const lat = THREE.MathUtils.radToDeg(Math.asin(point.y / ROUTE_RADIUS));
  const lng = THREE.MathUtils.radToDeg(Math.atan2(-point.z, point.x));
  return aisRegion(lat, lng)?.id === id;
}
