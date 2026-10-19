import * as THREE from "three";

/**
 * Converts Latitude and Longitude to 3D Cartesians on a sphere of radius R.
 * In Three.js SphereGeometry:
 * phi = (90 - lat) * (PI / 180)
 * theta = (lng + 180) * (PI / 180)
 * x = -(radius * sin(phi) * cos(theta))
 * y = radius * cos(phi)
 * z = radius * sin(phi) * sin(theta)
 */
export function latLngToVector3(lat: number, lng: number, radius: number = 1.0): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

/**
 * Inverse conversion: 3D point on unit sphere to latitude and longitude.
 * Used by 60 FPS Raycaster for instant picking without mesh overhead.
 */
export function vector3ToLatLng(point: THREE.Vector3): { lat: number; lng: number } {
  const normalized = point.clone().normalize();
  const clampedY = Math.max(-1.0, Math.min(1.0, normalized.y));
  const lat = Math.asin(clampedY) * (180 / Math.PI);

  // Invert the x and z mapping from latLngToVector3:
  // x = -sin(phi) * cos(theta) => -x = sin(phi) * cos(theta)
  // z = sin(phi) * sin(theta)
  // tan(theta) = z / (-x) => theta = atan2(z, -x)
  const theta = Math.atan2(normalized.z, -normalized.x);
  let lng = (theta * 180) / Math.PI - 180;
  lng = ((lng + 180) % 360 + 360) % 360 - 180;

  return {
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4)),
  };
}

/**
 * Spherical linear interpolation (slerp) between two vectors along the great-circle arc.
 * Preserves radial distance and avoids intermediate axis singularities.
 */
export function slerpVectors(
  start: THREE.Vector3,
  end: THREE.Vector3,
  t: number
): THREE.Vector3 {
  const v1 = start.clone().normalize();
  const v2 = end.clone().normalize();

  let dot = v1.dot(v2);
  dot = Math.max(-1.0, Math.min(1.0, dot));

  let dir: THREE.Vector3;
  if (dot > 0.99995) {
    dir = v1.clone().lerp(v2, t).normalize();
  } else if (dot < -0.99995) {
    const axis = Math.abs(v1.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const ortho = new THREE.Vector3().crossVectors(v1, axis).normalize();
    const q = new THREE.Quaternion().setFromAxisAngle(ortho, Math.PI * t);
    dir = v1.clone().applyQuaternion(q).normalize();
  } else {
    const omega = Math.acos(dot);
    const sinOmega = Math.sin(omega);
    const w1 = Math.sin((1 - t) * omega) / sinOmega;
    const w2 = Math.sin(t * omega) / sinOmega;
    dir = v1.clone().multiplyScalar(w1).add(v2.clone().multiplyScalar(w2)).normalize();
  }

  const length = THREE.MathUtils.lerp(start.length(), end.length(), t);
  return dir.multiplyScalar(length);
}
