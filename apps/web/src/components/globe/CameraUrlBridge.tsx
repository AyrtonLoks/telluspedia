"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useRef } from "react";
import { orbitTransition } from "@/lib/camera-transition";
import type { ViewCamera } from "@/lib/explore/view-camera";

type CameraControls = { target: Vector3; enabled: boolean; update: () => void };

export function CameraUrlBridge({ view }: { view: ViewCamera }) {
  const controls = useThree((state) => state.controls as CameraControls | null);
  const nextSample = useRef(0);
  const relative = useRef(new Vector3());

  useFrame(({ camera, clock }) => {
    if (!controls?.enabled || orbitTransition.active) return;
    if (view.restore) {
      const [x, y, z] = view.restore;
      camera.position.set(x, y, z).add(controls.target);
      controls.update();
      view.restore = null;
      nextSample.current = 0;
    }
    if (clock.elapsedTime < nextSample.current) return;
    nextSample.current = clock.elapsedTime + 0.12;
    const offset = relative.current.copy(camera.position).sub(controls.target);
    const x = Math.round(offset.x * 10000) / 10000;
    const y = Math.round(offset.y * 10000) / 10000;
    const z = Math.round(offset.z * 10000) / 10000;
    if (view.offset[0] === x && view.offset[1] === y && view.offset[2] === z) return;
    view.offset = [x, y, z];
    view.onChange?.();
  });
  return null;
}
