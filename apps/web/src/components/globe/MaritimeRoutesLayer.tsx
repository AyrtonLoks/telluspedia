"use client";

import { useEffect, useMemo, useRef } from "react";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AIS_POLL_MS, aisRegion, vesselIsMoving } from "@/lib/ais-data";
import { latLngToVector3, slerpVectors } from "@/lib/geo-spatial";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { VesselFleet } from "./VesselFleet";

const ROUTE_RADIUS = 1.003;
const ROUTE_COLOR = "#63c0ad";
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
  const movingOnly = useObservatoryStore((s) => s.vesselsMovingOnly);
  const visibleVessels = useMemo(() => movingOnly ? vessels.filter(vesselIsMoving) : vessels, [movingOnly, vessels]);
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
      <VesselFleet vessels={visibleVessels} opacity={opacity} />
    </group>
  );
}

function aisRegionForVector(point: THREE.Vector3, id: string) {
  const lat = THREE.MathUtils.radToDeg(Math.asin(point.y / ROUTE_RADIUS));
  const lng = THREE.MathUtils.radToDeg(Math.atan2(-point.z, point.x));
  return aisRegion(lat, lng)?.id === id;
}
