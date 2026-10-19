"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { latLngToVector3 } from "@/lib/geo-spatial";
import { useGlobeStore } from "@/stores/globeStore";

export const CameraFlyToController: React.FC = () => {
  const { camera } = useThree();
  const flyToTrigger = useGlobeStore((s) => s.flyToTrigger);
  const cameraLat = useGlobeStore((s) => s.cameraLat);
  const cameraLng = useGlobeStore((s) => s.cameraLng);
  const cameraAltitude = useGlobeStore((s) => s.cameraAltitude);

  const targetPosition = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 2.5));
  const isAnimating = useRef<boolean>(false);

  useEffect(() => {
    if (flyToTrigger > 0) {
      // Calculate 3D target coordinates
      const targetVec = latLngToVector3(cameraLat, cameraLng, cameraAltitude);
      targetPosition.current.copy(targetVec);
      isAnimating.current = true;
    }
  }, [flyToTrigger, cameraLat, cameraLng, cameraAltitude]);

  useFrame((_, delta) => {
    if (isAnimating.current) {
      // Interpolate camera smoothly towards target
      const step = Math.min(1.0, delta * 3.5);
      camera.position.lerp(targetPosition.current, step);
      camera.lookAt(0, 0, 0);

      if (camera.position.distanceTo(targetPosition.current) < 0.01) {
        camera.position.copy(targetPosition.current);
        isAnimating.current = false;
      }
    }
  });

  return null;
};
