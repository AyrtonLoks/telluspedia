"use client";

import { useEffect, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import { Spherical, Vector3, MathUtils } from "three";
import { orbitTransition } from "@/lib/camera-transition";

type OrbitControls = {
  target: Vector3;
  enabled: boolean;
  minDistance: number;
  maxDistance: number;
  update: () => void;
};

export function GlobeKeyboardControls({ viewport }: { viewport: RefObject<HTMLDivElement | null> }) {
  const { camera, invalidate } = useThree();
  const controls = useThree((state) => state.controls as OrbitControls | null);

  useEffect(() => {
    const element = viewport.current;
    if (!element || !controls) return;
    const offset = new Vector3();
    const orbit = new Spherical();
    const step = MathUtils.degToRad(7.5);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target !== element || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (!controls.enabled || orbitTransition.active) return;

      orbit.setFromVector3(offset.copy(camera.position).sub(controls.target));
      switch (event.key) {
        case "ArrowLeft": orbit.theta += step; break;
        case "ArrowRight": orbit.theta -= step; break;
        case "ArrowUp": orbit.phi += step; break;
        case "ArrowDown": orbit.phi -= step; break;
        case "+":
        case "=": orbit.radius /= 1.12; break;
        case "-":
        case "−": orbit.radius *= 1.12; break;
        default: return;
      }
      event.preventDefault();
      orbit.radius = MathUtils.clamp(orbit.radius, controls.minDistance, controls.maxDistance);
      camera.position.copy(offset.setFromSpherical(orbit.makeSafe())).add(controls.target);
      controls.update();
      invalidate();
    };

    element.addEventListener("keydown", onKeyDown);
    return () => element.removeEventListener("keydown", onKeyDown);
  }, [camera, controls, invalidate, viewport]);

  return null;
}
