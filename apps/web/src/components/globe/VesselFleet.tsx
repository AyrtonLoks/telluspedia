"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { type AisVessel, type VesselKind, vesselIsMoving } from "@/lib/ais-data";
import { aircraftHeading } from "@/lib/aircraft-motion";
import { latLngToVector3, vector3ToLatLng } from "@/lib/geo-spatial";
import { groupProjectedVessels, type ProjectedVessel } from "@/lib/maritime-markers";
import type { ObservatoryMeta } from "@/lib/observatory-source";
import { useObservatoryStore } from "@/stores/observatoryStore";

const MARKER_RADIUS = 1.004;
const EARTH_METERS = 6_371_000;
const KNOT_METERS_PER_SECOND = 1852 / 3600;
const MAX_PREDICTION_SECONDS = 60;
const HULL_COLORS: Record<VesselKind, string> = {
  cargo: "#7ddcc3",
  tanker: "#f2ad77",
  container: "#76c7fa",
  passenger: "#f4e098",
  fishing: "#c8adf0",
  other: "#bad4da",
  unknown: "#bad4da",
};

interface VisibleVessel {
  data: AisVessel;
  position: THREE.Vector3;
  rotation: number;
  directed: boolean;
}

type Marker = ReturnType<typeof groupProjectedVessels<VisibleVessel>>[number];

function makeTexture(symbol: "bow" | "ring" | number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(48, 48);
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (symbol === "bow") {
    ctx.moveTo(0, -37);
    ctx.lineTo(23, 13);
    ctx.lineTo(14, 31);
    ctx.lineTo(-14, 31);
    ctx.lineTo(-23, 13);
    ctx.closePath();
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#101826";
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.fill();
  } else if (symbol === "ring") {
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#101826";
    ctx.strokeStyle = "#101826";
    ctx.lineWidth = 13;
    ctx.stroke();
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 8;
    ctx.stroke();
  } else {
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fillStyle = "#152a39";
    ctx.strokeStyle = "#91d0dc";
    ctx.lineWidth = 4;
    ctx.fill();
    ctx.stroke();
    ctx.font = `600 ${symbol > 99 ? 33 : 39}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ecfbff";
    ctx.fillText(String(symbol), 0, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function VesselMarker({ marker, meta, opacity, bow, ring, selectedId }: {
  marker: Marker;
  meta: ObservatoryMeta;
  selectedId?: string;
  opacity: number;
  bow: THREE.CanvasTexture | null;
  ring: THREE.CanvasTexture | null;
}) {
  const height = useThree((state) => state.size.height);
  const camera = useThree((state) => state.camera);
  const { data, position, rotation, directed } = marker.anchor.vessel;
  const count = marker.members.length;
  const groupTexture = useMemo(() => count > 1 && typeof document !== "undefined" ? makeTexture(count) : null, [count]);
  useEffect(() => () => groupTexture?.dispose(), [groupTexture]);

  const highlighted = selectedId != null && marker.members.some(({ data }) => data.id === selectedId);
  const pixels = count > 1 ? 34 : highlighted ? 29 : 25;
  const scale = 2 * pixels / (Math.max(1, height) * camera.projectionMatrix.elements[5]);
  const texture = groupTexture ?? (directed ? bow : ring);
  if (!texture) return null;

  return (
    <sprite
      name={count > 1 ? `ais-group-${count}` : `ais-ship-${data.id}`}
      position={position}
      scale={[scale, scale, 1]}
      renderOrder={highlighted ? 8 : 7}
      onClick={(event) => {
        event.stopPropagation();
        const select = useObservatoryStore.getState().setSelectedEntity;
        if (count > 1) {
          select({
            type: "VESSEL_GROUP",
            data: { ...vector3ToLatLng(position), vessels: marker.members.map(({ data }) => data) },
            meta,
          });
        } else select({ type: "VESSEL", data, meta });
      }}
    >
      <spriteMaterial
        map={texture}
        color={highlighted ? "#ffe7a3" : count > 1 ? "#fff" : HULL_COLORS[data.kind]}
        rotation={count > 1 ? 0 : rotation}
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

export function VesselFleet({ vessels, opacity }: { vessels: AisVessel[]; opacity: number }) {
  const meta = useObservatoryStore((state) => state.layerMeta.MARITIME_ROUTES);
  const selectedId = useObservatoryStore((state) => state.selectedEntity?.type === "VESSEL" ? state.selectedEntity.data.id : undefined);
  const [layout, setLayout] = useState<{ markers: Marker[]; meta: ObservatoryMeta }>({ markers: [], meta });
  const lastFrame = useRef({ time: -1, vessels });
  const group = useRef<THREE.Group>(null);
  const textures = useMemo(() => typeof document === "undefined" ? null : {
    bow: makeTexture("bow"), ring: makeTexture("ring"),
  }, []);
  useEffect(() => () => {
    textures?.bow.dispose();
    textures?.ring.dispose();
  }, [textures]);

  const tracks = useMemo(() => [...vessels].sort((a, b) => a.id.localeCompare(b.id)).map((data) => {
    const normal = latLngToVector3(data.lat, data.lng);
    const course = data.courseDeg == null ? null : aircraftHeading(data.lng, normal, data.courseDeg);
    const heading = data.headingDeg == null ? course : aircraftHeading(data.lng, normal, data.headingDeg);
    return { data, normal, course, heading };
  }), [vessels]);

  const scratch = useMemo(() => ({
    observer: new THREE.Vector3(),
    projected: new THREE.Vector3(),
    ahead: new THREE.Vector3(),
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
    const { observer, projected, ahead, normal } = scratch;
    root.worldToLocal(camera.getWorldPosition(observer));
    const sample: ProjectedVessel<VisibleVessel>[] = [];
    const now = Date.now();

    for (const track of tracks) {
      const { data, course, heading } = track;
      const moving = vesselIsMoving(data);
      normal.copy(track.normal);
      if (moving && course && data.speedKnots != null && data.observedAt > 0 && !meta.stale) {
        const elapsed = THREE.MathUtils.clamp((now - data.observedAt) / 1000, 0, MAX_PREDICTION_SECONDS);
        const arc = elapsed * data.speedKnots * KNOT_METERS_PER_SECOND / EARTH_METERS;
        normal.multiplyScalar(Math.cos(arc)).addScaledVector(course, Math.sin(arc));
      }
      if (normal.dot(observer) <= MARKER_RADIUS) continue;
      normal.multiplyScalar(MARKER_RADIUS);
      projected.copy(normal).applyMatrix4(root.matrixWorld).project(camera);
      if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || Math.abs(projected.z) > 1) continue;

      let rotation = 0;
      if (moving && heading) {
        ahead.copy(normal).addScaledVector(heading, 0.001).applyMatrix4(root.matrixWorld).project(camera);
        rotation = Math.atan2((projected.x - ahead.x) * size.width, (ahead.y - projected.y) * size.height);
      }
      sample.push({
        vessel: { data, position: normal.clone(), rotation, directed: moving && !!heading },
        x: projected.x * size.width / 2,
        y: projected.y * size.height / 2,
      });
    }
    setLayout({ markers: groupProjectedVessels(sample, 34), meta });
  });

  return (
    <group ref={group} name="ais-vessels">
      {layout.markers.map((marker) => (
        <VesselMarker
          key={marker.anchor.vessel.data.id}
          marker={marker}
          meta={layout.meta}
          selectedId={selectedId}
          opacity={opacity}
          bow={textures?.bow ?? null}
          ring={textures?.ring ?? null}
        />
      ))}
    </group>
  );
}
