"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVector3, slerpVectors } from "@/lib/geo-spatial";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { createEonetIndex, getEonetMarkers, type EonetMarker } from "@/lib/eonet-clusters";
import type { EonetCategory, EonetEvent } from "@/lib/observatory-data";
import { createEonetIcon } from "./eonet-icons";

import { isDragRelease } from "@/lib/pointer-intent";
const MARKER_RADIUS = 1.012;
const EVENT_SIZE = 27;
const CLUSTER_SIZE = 36;
const ignoreRaycast = () => null;
type Icon = EonetCategory | "track" | number;

interface VisibleMarker extends EonetMarker {
  position: THREE.Vector3;
  key: string;
}

function projectMarkers(markers: EonetMarker[], group: THREE.Group, camera: THREE.Camera, width: number, height: number) {
  group.updateWorldMatrix(true, false);
  const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
  const center = group.getWorldPosition(new THREE.Vector3());
  const observer = cameraPosition.sub(center);
  const visible: (VisibleMarker & { x: number; y: number })[] = [];
  const projected = new THREE.Vector3();

  for (const marker of markers.sort((a, b) => b.events.length - a.events.length)) {
    const position = latLngToVector3(marker.lat, marker.lng, MARKER_RADIUS);
    if (position.dot(observer) <= MARKER_RADIUS ** 2) continue;
    projected.copy(position).applyMatrix4(group.matrixWorld).project(camera);
    if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || Math.abs(projected.z) > 1) continue;
    const x = projected.x * width / 2;
    const y = projected.y * height / 2;

    // Geographic clusters can still project close together at the limb or longitude seam.
    const neighbour = visible.find((other) => Math.hypot(x - other.x, y - other.y) < CLUSTER_SIZE + 2);
    if (neighbour) {
      neighbour.events.push(...marker.events);
    } else {
      visible.push({ ...marker, events: [...marker.events], position, key: "", x, y });
    }
  }
  for (const marker of visible) marker.key = marker.events.map((event) => event.id).sort().join("|");
  return visible;
}

function MarkerSprite({ position, texture, px, opacity, label, spin, onSelect }: {
  position: THREE.Vector3;
  texture: THREE.Texture;
  px: number;
  opacity: number;
  label: string;
  spin?: boolean;
  onSelect: () => void;
}) {
  const material = useRef<THREE.SpriteMaterial>(null);
  const height = useThree((state) => state.size.height);
  const camera = useThree((state) => state.camera);
  const scale = 2 * px / (Math.max(1, height) * camera.projectionMatrix.elements[5]);
  useFrame((_, delta) => {
    if (spin && material.current) material.current.rotation += Math.min(delta, 0.1) * 0.5;
  });

  return (
    <sprite
      name={label}
      position={position}
      scale={[scale, scale, 1]}
      visible={opacity > 0}
      onClick={(event) => {
        if (opacity <= 0) return;
        event.stopPropagation();
        if (isDragRelease(event)) return;
        onSelect();
      }}
    >
      <spriteMaterial
        ref={material}
        map={texture}
        transparent
        depthWrite={false}
        opacity={opacity}
        toneMapped={false}
        sizeAttenuation={false}
        alphaTest={0.08}
      />
    </sprite>
  );
}

function StormTrack({ event, icon, opacity, onSelect }: {
  event: EonetEvent;
  icon: THREE.Texture;
  opacity: number;
  onSelect: (index: number) => void;
}) {
  const observations = useMemo(() => (event.geometry ?? []).flatMap((observation, index) =>
    observation.type === "Point" ? [{
      date: observation.date, index,
      position: latLngToVector3(observation.coordinates[1], observation.coordinates[0], 1.009),
    }] : []
  ), [event]);
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 1; i < observations.length; i++) {
      const a = observations[i - 1].position;
      const b = observations[i].position;
      const segments = Math.max(1, Math.ceil(a.angleTo(b) / (Math.PI / 60)));
      if (!points.length) points.push(a);
      for (let step = 1; step <= segments; step++) points.push(slerpVectors(a, b, step / segments));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [observations]);
  const line = useMemo(() => new THREE.Line(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (observations.length < 2) return null;

  return (
    <group name="eonet-storm-track">
      <primitive object={line} geometry={geometry} raycast={ignoreRaycast}>
        <lineBasicMaterial color="#8adaff" transparent opacity={0.8 * opacity} depthWrite={false} />
      </primitive>
      {observations.filter(({ index }) => index !== (event.geometry?.length ?? 0) - 1).map(({ position, date, index }) => (
        <MarkerSprite
          key={index}
          position={position}
          texture={icon}
          px={14}
          opacity={opacity}
          label={date}
          onSelect={() => onSelect(index)}
        />
      ))}
    </group>
  );
}

export function NasaEonetLayer() {
  const events = useObservatoryStore((state) => state.eonetEvents);
  const category = useObservatoryStore((state) => state.eonetCategory);
  const opacity = useObservatoryStore((state) => state.layerOpacity.NASA_EONET ?? 1);
  const selected = useObservatoryStore((state) => state.selectedEntity);
  const setSelected = useObservatoryStore((state) => state.setSelectedEntity);
  const liveEvents = useMemo(
    () => category === "all" ? events : events.filter((event) => event.category === category),
    [events, category]
  );
  const index = useMemo(() => createEonetIndex(liveEvents), [liveEvents]);
  const group = useRef<THREE.Group>(null);
  const lastUpdate = useRef({ time: -1, key: "", index });
  const textures = useMemo(() => new Map<Icon, THREE.Texture>(), []);
  const [markers, setMarkers] = useState<VisibleMarker[]>([]);

  function icon(kind: Icon) {
    const previous = textures.get(kind);
    if (previous) return previous;
    const texture = createEonetIcon(kind);
    textures.set(kind, texture);
    return texture;
  }

  useEffect(() => () => {
    for (const texture of textures.values()) texture.dispose();
    textures.clear();
  }, [textures]);

  useFrame(({ camera, size, clock }) => {
    if (!group.current || !size.height) return;
    const time = clock.getElapsedTime();
    const previous = lastUpdate.current;
    const indexChanged = previous.index !== index;
    if (!indexChanged && time - previous.time < 0.1) return;
    camera.updateMatrixWorld();
    const distance = camera.position.distanceTo(group.current.getWorldPosition(new THREE.Vector3()));
    const diameter = size.height * camera.projectionMatrix.elements[5] / Math.sqrt(Math.max(0.05, distance ** 2 - 1));
    const next = projectMarkers(getEonetMarkers(index, diameter), group.current, camera, size.width, size.height);
    const key = next.map((marker) => `${marker.key}:${marker.lat.toFixed(3)}:${marker.lng.toFixed(3)}`).join(";");
    lastUpdate.current = { time, key, index };
    if (key !== previous.key || indexChanged) setMarkers(next);
  });

  const selectedStorm = selected?.type === "EONET" && selected.data.category === "severeStorms"
    ? selected.data : null;

  return (
    <group ref={group} name="eonet-markers">
      {markers.map((marker) => {
        const event = marker.events[0];
        const cluster = marker.events.length > 1;
        return (
          <MarkerSprite
            key={marker.key}
            position={marker.position}
            texture={icon(cluster ? marker.events.length : event.category)}
            px={cluster ? CLUSTER_SIZE : EVENT_SIZE}
            opacity={opacity}
            label={cluster ? `${marker.events.length} eventos EONET` : event.title}
            spin={!cluster && event.category === "severeStorms"}
            onSelect={() => setSelected(cluster ? { type: "EONET_CLUSTER", data: { lat: marker.lat, lng: marker.lng, events: marker.events } } : { type: "EONET", data: event })}
          />
        );
      })}
      {selectedStorm && (
        <StormTrack
          event={selectedStorm}
          icon={icon("track")}
          opacity={opacity}
          onSelect={(observationIndex) => setSelected({ type: "EONET", data: selectedStorm, observationIndex })}
        />
      )}
    </group>
  );
}
