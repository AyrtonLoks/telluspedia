import * as THREE from "three";
import { latLngToVector3, slerpVectors } from "../geo-spatial";

/** Altitude das trajetórias de superfície (acima do globo de raio 1, sem cortar o interior). */
export const ROUTE_ALTITUDE = 1.004;

export interface SurfaceCurveData<P extends { lat: number; lng: number }> {
  curve: THREE.CatmullRomCurve3;
  curvePoints: THREE.Vector3[];
  waypoints3D: { point: THREE.Vector3; waypoint: P; index: number }[];
}

/**
 * Spline esférica contínua de uma trajetória de superfície (D12c): arcos de círculo máximo
 * (SLERP) entre pontos consecutivos, sempre na altitude `ROUTE_ALTITUDE`.
 */
export function createSurfaceTrajectoryCurve<P extends { lat: number; lng: number }>(points: P[], subdivisions = 18): SurfaceCurveData<P> {
  const waypoints3D = points.map((waypoint, index) => ({ point: latLngToVector3(waypoint.lat, waypoint.lng, ROUTE_ALTITUDE), waypoint, index }));
  const finePoints: THREE.Vector3[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const pA = waypoints3D[i].point;
    const pB = waypoints3D[i + 1].point;
    for (let s = 0; s < subdivisions; s++) {
      finePoints.push(slerpVectors(pA, pB, s / subdivisions).normalize().multiplyScalar(ROUTE_ALTITUDE));
    }
  }
  finePoints.push(waypoints3D[waypoints3D.length - 1].point.clone());
  return { curve: new THREE.CatmullRomCurve3(finePoints, false, "centripetal", 0.05), curvePoints: finePoints, waypoints3D };
}
