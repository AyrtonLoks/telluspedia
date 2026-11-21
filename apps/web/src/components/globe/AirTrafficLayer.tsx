"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { vector3ToLatLng } from "@/lib/geo-spatial";
import {
  advanceAircraft,
  sampleAircraftTrail,
  updateAircraft,
  TRAIL_SAMPLE_COUNT,
  type AircraftTrack,
} from "@/lib/aircraft-motion";
import { AIRCRAFT_MAX_LIMIT, AIRCRAFT_POLL_MS } from "@/lib/aircraft-config";
import { useObservatoryStore } from "@/stores/observatoryStore";

import { isDragRelease } from "@/lib/pointer-intent";
const MODEL_URL = "/models/aircraft.glb";
const LOD_DISTANCE = 2.35;
const IGNORE_RAYCAST = () => null;

function meshGeometry(model: THREE.Group, name: string) {
  const mesh = model.getObjectByName(name);
  if (!(mesh instanceof THREE.Mesh)) throw new Error(`Aircraft glTF is missing ${name}`);
  return mesh.geometry;
}

function AirTrafficModels() {
  const fleet = useObservatoryStore((s) => s.aircraftFleet);
  const opacity = useObservatoryStore((s) => s.layerOpacity.FLIGHTS_OPENSKY ?? 1);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);
  const { scene } = useLoader(GLTFLoader, MODEL_URL);
  const [nearGeometry, farGeometry] = useMemo(() => [
    meshGeometry(scene, "AircraftNear").clone(),
    meshGeometry(scene, "AircraftFar").clone(),
  ], [scene]);

  const group = useRef<THREE.Group>(null);
  const nearMesh = useRef<THREE.InstancedMesh>(null);
  const farMesh = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide, toneMapped: false, transparent: true, forceSinglePass: true,
  }), []);
  const tracks = useRef(new Map<string, AircraftTrack>());
  const drawn = useRef<AircraftTrack[]>([]);

  const trail = useMemo(() => {
    const vertexCapacity = AIRCRAFT_MAX_LIMIT * TRAIL_SAMPLE_COUNT * 2;
    const positions = new THREE.BufferAttribute(new Float32Array(vertexCapacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
    const colors = new THREE.BufferAttribute(new Float32Array(vertexCapacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    const geometry = new THREE.BufferGeometry().setAttribute("position", positions).setAttribute("color", colors);
    geometry.setDrawRange(0, 0);
    return { geometry, positions, colors };
  }, []);

  const scratch = useMemo(() => ({
    camera: new THREE.Vector3(),
    cameraDirection: new THREE.Vector3(),
    relative: new THREE.Vector3(),
    up: new THREE.Vector3(),
    right: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    basis: new THREE.Matrix4(),
    model: new THREE.Object3D(),
  }), []);

  useEffect(() => {
    const next = new Map<string, AircraftTrack>();
    const now = Date.now();
    for (const state of fleet.slice(0, AIRCRAFT_MAX_LIMIT)) {
      next.set(state.icao24, updateAircraft(tracks.current.get(state.icao24), state, now));
    }
    tracks.current = next;
  }, [fleet]);

  useLayoutEffect(() => {
    const bounds = new THREE.Sphere(new THREE.Vector3(), 1.20);
    for (const mesh of [nearMesh.current, farMesh.current]) {
      if (!mesh) continue;
      mesh.boundingSphere = bounds;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
  }, []);

  useEffect(() => () => {
    material.dispose();
    nearGeometry.dispose();
    farGeometry.dispose();
    trail.geometry.dispose();
  }, [material, nearGeometry, farGeometry, trail]);

  useFrame(({ camera, size }) => {
    if (!group.current || !nearMesh.current || !farMesh.current) return;
    const now = Date.now();
    const { relative, up, right, model, normal, basis, cameraDirection } = scratch;
    const localCamera = group.current.worldToLocal(camera.getWorldPosition(scratch.camera));
    const nearby = localCamera.length() < LOD_DISTANCE;
    const mesh = nearby ? nearMesh.current : farMesh.current;
    nearMesh.current.visible = nearby && opacity > 0;
    farMesh.current.visible = !nearby && opacity > 0;
    material.opacity = opacity * 0.92;
    const selected = useObservatoryStore.getState().selectedEntity;
    const selectedId = selected?.type === "AIRCRAFT" ? selected.data.icao24 : null;
    const pixels = Math.max(1, size.height * camera.projectionMatrix.elements[5] / 2);
    camera.getWorldDirection(cameraDirection);
    const rendered = drawn.current;
    let count = 0;
    let trailVertices = 0;

    for (const track of tracks.current.values()) {
      advanceAircraft(track, now);
      sampleAircraftTrail(track, now);
      if (!opacity || track.position.dot(localCamera) < 0.995) continue;

      const depth = relative.copy(track.position).sub(localCamera).dot(cameraDirection);
      if (depth <= 0) continue;
      const scale = Math.min(0.085, Math.max(0.012, 12 * depth / pixels));
      normal.copy(track.position).normalize();
      right.crossVectors(normal, track.tangent).normalize();
      up.crossVectors(track.tangent, right).normalize();
      model.position.copy(track.position).addScaledVector(normal, scale * 0.072);
      model.quaternion.setFromRotationMatrix(basis.makeBasis(right, up, track.tangent));
      model.scale.setScalar(scale);
      model.updateMatrix();
      mesh.setMatrixAt(count, model.matrix);
      rendered[count++] = track;

      if (nearby || track.state.icao24 === selectedId) {
        for (let i = 0; i < track.trailCount; i++) {
          const index = (track.trailIndex - track.trailCount + 1 + i + TRAIL_SAMPLE_COUNT) % TRAIL_SAMPLE_COUNT;
          const next = i + 1 === track.trailCount ? track.position : track.trail[(index + 1) % TRAIL_SAMPLE_COUNT];
          const a = track.trail[index];
          const fade = 0.7 * opacity / track.trailCount;
          trail.positions.setXYZ(trailVertices, a.x, a.y, a.z);
          trail.colors.setXYZW(trailVertices++, 0.25, 0.60, 0.94, fade * i);
          trail.positions.setXYZ(trailVertices, next.x, next.y, next.z);
          trail.colors.setXYZW(trailVertices++, 0.25, 0.60, 0.94, fade * (i + 1));
        }
      }
    }
    rendered.length = count;
    nearMesh.current.count = nearby ? count : 0;
    farMesh.current.count = nearby ? 0 : count;
    if (count) {
      mesh.instanceMatrix.clearUpdateRanges();
      mesh.instanceMatrix.addUpdateRange(0, count * 16);
      mesh.instanceMatrix.needsUpdate = true;
    }
    trail.geometry.setDrawRange(0, trailVertices);
    if (trailVertices) {
      trail.positions.clearUpdateRanges();
      trail.positions.addUpdateRange(0, trailVertices * 3);
      trail.positions.needsUpdate = true;
      trail.colors.clearUpdateRanges();
      trail.colors.addUpdateRange(0, trailVertices * 4);
      trail.colors.needsUpdate = true;
    }
  });

  const selectAircraft = (instance: number | undefined) => {
    if (instance === undefined || !opacity) return;
    const aircraft = drawn.current[instance];
    if (!aircraft) return;
    setSelectedEntity({
      type: "AIRCRAFT",
      data: aircraft.state,
      estimatedPosition: vector3ToLatLng(aircraft.position),
      meta: useObservatoryStore.getState().layerMeta.FLIGHTS_OPENSKY,
    });
  };

  return (
    <group ref={group} name="air-traffic">
      <instancedMesh
        ref={nearMesh}
        name="aircraft-near"
        args={[nearGeometry, material, AIRCRAFT_MAX_LIMIT]}
        count={0}
        frustumCulled={false}
        onClick={(event) => { event.stopPropagation(); if (isDragRelease(event)) return; selectAircraft(event.instanceId); }}
      />
      <instancedMesh
        ref={farMesh}
        name="aircraft-far"
        args={[farGeometry, material, AIRCRAFT_MAX_LIMIT]}
        count={0}
        frustumCulled={false}
        onClick={(event) => { event.stopPropagation(); if (isDragRelease(event)) return; selectAircraft(event.instanceId); }}
      />
      <lineSegments name="aircraft-trails" geometry={trail.geometry} frustumCulled={false} raycast={IGNORE_RAYCAST}>
        <lineBasicMaterial vertexColors transparent depthWrite={false} toneMapped={false} />
      </lineSegments>
    </group>
  );
}

export function AirTrafficLayer() {
  const loadLayerData = useObservatoryStore((s) => s.loadLayerData);
  useEffect(() => {
    const refresh = () => {
      if (!useObservatoryStore.getState().isLoading.FLIGHTS_OPENSKY) void loadLayerData("FLIGHTS_OPENSKY");
    };
    const meta = useObservatoryStore.getState().layerMeta.FLIGHTS_OPENSKY;
    if (Date.now() - Date.parse(meta.fetchedAt) >= AIRCRAFT_POLL_MS) refresh();
    const timer = setInterval(refresh, AIRCRAFT_POLL_MS);
    return () => clearInterval(timer);
  }, [loadLayerData]);

  return <Suspense fallback={null}><AirTrafficModels /></Suspense>;
}
