"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { AIS_MAX_VESSELS, type AisVessel, type VesselKind, vesselIsMoving } from "@/lib/ais-data";
import { aircraftHeading } from "@/lib/aircraft-motion";
import { latLngToVector3, vector3ToLatLng } from "@/lib/geo-spatial";
import { groupProjectedVessels, type ProjectedVessel } from "@/lib/maritime-markers";
import type { ObservatoryMeta } from "@/lib/observatory-source";
import { buildVesselGeometry } from "@/lib/vessel-model";
import { useObservatoryStore } from "@/stores/observatoryStore";

const MARKER_RADIUS = 1.004;
const EARTH_METERS = 6_371_000;
const KNOT_METERS_PER_SECOND = 1852 / 3600;
const MAX_PREDICTION_SECONDS = 60;
const SELECTED_TINT = new THREE.Color("#ffe3a2");
const REGULAR_TINT = new THREE.Color("#ffffff");

interface VisibleVessel {
  data: AisVessel;
  position: THREE.Vector3;
  forward: THREE.Vector3;
  scale: number;
}

type Marker = ReturnType<typeof groupProjectedVessels<VisibleVessel>>[number];

function makeGroupTexture(count: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(48, 48);
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.fillStyle = "#152a39";
  ctx.strokeStyle = "#91d0dc";
  ctx.lineWidth = 4;
  ctx.fill();
  ctx.stroke();
  ctx.font = `600 ${count > 99 ? 33 : 39}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ecfbff";
  ctx.fillText(String(count), 0, 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function VesselGroupMarker({ marker, meta, opacity, selectedId }: {
  marker: Marker;
  meta: ObservatoryMeta;
  selectedId?: string;
  opacity: number;
}) {
  const height = useThree((state) => state.size.height);
  const camera = useThree((state) => state.camera);
  const { position } = marker.anchor.vessel;
  const count = marker.members.length;
  const texture = useMemo(() => typeof document === "undefined" ? null : makeGroupTexture(count), [count]);
  useEffect(() => () => texture?.dispose(), [texture]);

  const highlighted = selectedId != null && marker.members.some(({ data }) => data.id === selectedId);
  const scale = 68 / (Math.max(1, height) * camera.projectionMatrix.elements[5]);
  if (!texture) return null;
  return (
    <sprite
      name={`ais-group-${count}`}
      position={position}
      scale={[scale, scale, 1]}
      renderOrder={8}
      onClick={(event) => {
        event.stopPropagation();
        useObservatoryStore.getState().setSelectedEntity({
          type: "VESSEL_GROUP",
          data: { ...vector3ToLatLng(position), vessels: marker.members.map(({ data }) => data) },
          meta,
        });
      }}
    >
      <spriteMaterial
        map={texture}
        color={highlighted ? "#ffe7a3" : "#fff"}
        sizeAttenuation={false}
        transparent
        opacity={opacity}
        alphaTest={0.08}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}

function VesselModels({ kind, models, meta, opacity, selectedId }: {
  kind: VesselKind;
  models: VisibleVessel[];
  meta: ObservatoryMeta;
  opacity: number;
  selectedId?: string;
}) {
  const instances = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => buildVesselGeometry(kind), [kind]);
  const scratch = useMemo(() => ({
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    transform: new THREE.Matrix4(),
    scale: new THREE.Vector3(),
  }), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    const mesh = instances.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
  }, []);

  useLayoutEffect(() => {
    const mesh = instances.current;
    if (!mesh) return;
    const { right, up, transform, scale } = scratch;
    mesh.count = models.length;
    models.forEach(({ data, position, forward, scale: size }, index) => {
      const selected = data.id === selectedId;
      right.crossVectors(position, forward).normalize();
      up.crossVectors(forward, right).normalize();
      transform.makeBasis(right, up, forward).scale(scale.setScalar(size * (selected ? 1.10 : 1)));
      transform.setPosition(position);
      mesh.setMatrixAt(index, transform);
      mesh.setColorAt(index, selected ? SELECTED_TINT : REGULAR_TINT);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [models, scratch, selectedId]);

  return (
    <instancedMesh
      ref={instances}
      args={[geometry, undefined, AIS_MAX_VESSELS]}
      name={`ais-ships-${kind}`}
      renderOrder={7}
      onClick={(event) => {
        const model = event.instanceId == null ? undefined : models[event.instanceId];
        if (!model) return;
        event.stopPropagation();
        useObservatoryStore.getState().setSelectedEntity({ type: "VESSEL", data: model.data, meta });
      }}
    >
      <meshBasicMaterial vertexColors transparent={opacity < 1} opacity={opacity} toneMapped={false} />
    </instancedMesh>
  );
}

export function VesselFleet({ vessels, opacity }: { vessels: AisVessel[]; opacity: number }) {
  const meta = useObservatoryStore((state) => state.layerMeta.MARITIME_ROUTES);
  const selectedId = useObservatoryStore((state) => state.selectedEntity?.type === "VESSEL" ? state.selectedEntity.data.id : undefined);
  const [layout, setLayout] = useState<{ markers: Marker[]; meta: ObservatoryMeta }>({ markers: [], meta });
  const lastFrame = useRef({ time: -1, vessels });
  const group = useRef<THREE.Group>(null);
  const tracks = useMemo(() => [...vessels].sort((a, b) => a.id.localeCompare(b.id)).map((data) => {
    const normal = latLngToVector3(data.lat, data.lng);
    const course = data.courseDeg == null ? null : aircraftHeading(data.lng, normal, data.courseDeg);
    const bow = data.headingDeg == null && vesselIsMoving(data) && course
      ? course
      : aircraftHeading(data.lng, normal, data.headingDeg ?? 0);
    return { data, normal, course, bow };
  }), [vessels]);

  const scratch = useMemo(() => ({
    observer: new THREE.Vector3(),
    projected: new THREE.Vector3(),
    normal: new THREE.Vector3(),
  }), []);

  useFrame(({ camera, size, clock }) => {
    const root = group.current;
    if (!root || size.height <= 0) return;
    const time = clock.elapsedTime;
    const previous = lastFrame.current;
    if (previous.vessels === vessels && time - previous.time < 0.12) return;
    lastFrame.current = { time, vessels };

    root.updateWorldMatrix(true, false);
    camera.updateWorldMatrix(true, false);
    const { observer, projected, normal } = scratch;
    const pixelsPerUnit = size.height * camera.projectionMatrix.elements[5] / 2;
    root.worldToLocal(camera.getWorldPosition(observer));
    const sample: ProjectedVessel<VisibleVessel>[] = [];
    const now = Date.now();

    for (const track of tracks) {
      const { data, course, bow } = track;
      const moving = vesselIsMoving(data);
      normal.copy(track.normal);
      if (moving && course && data.speedKnots != null && data.observedAt > 0 && !meta.stale) {
        const elapsed = THREE.MathUtils.clamp((now - data.observedAt) / 1000, 0, MAX_PREDICTION_SECONDS);
        const arc = elapsed * data.speedKnots * KNOT_METERS_PER_SECOND / EARTH_METERS;
        normal.multiplyScalar(Math.cos(arc)).addScaledVector(course, Math.sin(arc));
      }
      if (normal.dot(observer) <= MARKER_RADIUS) continue;
      projected.copy(normal).multiplyScalar(MARKER_RADIUS).applyMatrix4(root.matrixWorld)
        .applyMatrix4(camera.matrixWorldInverse);
      const depth = -projected.z;
      projected.applyMatrix4(camera.projectionMatrix);
      if (depth <= 0 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || Math.abs(projected.z) > 1) continue;
      // The model measures two units bow to stern before projection onto the globe.
      const scale = Math.min(0.14, 17 * depth / pixelsPerUnit);
      const forward = bow.clone().addScaledVector(normal, -bow.dot(normal)).normalize();
      sample.push({
        vessel: { data, position: normal.clone().multiplyScalar(MARKER_RADIUS), forward, scale },
        x: projected.x * size.width / 2,
        y: projected.y * size.height / 2,
      });
    }
    setLayout({ markers: groupProjectedVessels(sample, 39), meta });
  });

  const { groups, single } = useMemo(() => {
    const groups: Marker[] = [];
    const single = new Map<VesselKind, VisibleVessel[]>();
    for (const marker of layout.markers) {
      if (marker.members.length > 1) {
        groups.push(marker);
      } else {
        const model = marker.anchor.vessel;
        const kind = model.data.kind === "other" ? "unknown" : model.data.kind;
        const batch = single.get(kind);
        if (batch) batch.push(model);
        else single.set(kind, [model]);
      }
    }
    return { groups, single };
  }, [layout.markers]);

  return (
    <group ref={group} name="ais-vessels">
      {groups.map((marker) => (
        <VesselGroupMarker
          key={marker.anchor.vessel.data.id}
          marker={marker}
          meta={layout.meta}
          selectedId={selectedId}
          opacity={opacity}
        />
      ))}
      {[...single].map(([kind, models]) => (
        <VesselModels key={kind} kind={kind} models={models} meta={layout.meta} opacity={opacity} selectedId={selectedId} />
      ))}
    </group>
  );
}
