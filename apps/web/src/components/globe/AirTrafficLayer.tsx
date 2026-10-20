"use client";

import React, { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo-spatial";
import { useObservatoryStore } from "@/stores/observatoryStore";

const FLIGHT_ALTITUDE = 1.018; // Altitude de cruzeiro comercial sobre o relevo

export const AirTrafficLayer: React.FC = () => {
  const fleet = useObservatoryStore((s) => s.aircraftFleet);
  const opacity = useObservatoryStore((s) => s.layerOpacity.FLIGHTS_OPENSKY ?? 1.0);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);

  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Geometria aerodinâmica em dardo/cone (memoizada independentemente da opacidade)
  const geometry = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.005, 0.018, 5);
    geo.rotateX(Math.PI / 2); // Rotaciona para que o nariz aponte para +Z local
    return geo;
  }, []);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: "#38bdf8",
      transparent: true,
      opacity: Math.max(0.2, opacity * 0.9),
    });
  }, [opacity]);

  // Descarte estrito de memória GPU (RN21)
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Atualização das matrizes das instâncias (1 draw call única)
  useEffect(() => {
    if (!meshRef.current || fleet.length === 0) return;

    meshRef.current.count = fleet.length;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < fleet.length; i++) {
      const plane = fleet[i];
      const pos = latLngToVector3(plane.lat, plane.lng, FLIGHT_ALTITUDE);
      const up = pos.clone().normalize();

      // Cálculo de Norte e Leste locais
      const northProj = new THREE.Vector3(0, 1, 0).sub(
        up.clone().multiplyScalar(new THREE.Vector3(0, 1, 0).dot(up))
      );
      const north =
        northProj.lengthSq() > 1e-6
          ? northProj.normalize()
          : new THREE.Vector3(0, 0, -1);

      // No sistema de coordenadas esféricas do Three.js, East é (North x Up)
      const east = new THREE.Vector3().crossVectors(north, up).normalize();

      // Vetor de direção orientado pelo rumo (heading em graus horários a partir do Norte)
      const headingRad = (plane.headingDeg * Math.PI) / 180;
      const forward = north
        .clone()
        .multiplyScalar(Math.cos(headingRad))
        .add(east.clone().multiplyScalar(Math.sin(headingRad)))
        .normalize();

      const right = new THREE.Vector3().crossVectors(up, forward).normalize();
      const correctedUp = new THREE.Vector3().crossVectors(forward, right).normalize();

      const rotMatrix = new THREE.Matrix4().makeBasis(right, correctedUp, forward);

      dummy.position.copy(pos);
      dummy.quaternion.setFromRotationMatrix(rotMatrix);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [fleet, geometry]);

  if (fleet.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, fleet.length]}
      onClick={(e) => {
        e.stopPropagation();
        const instanceId = e.instanceId;
        if (instanceId !== undefined && fleet[instanceId]) {
          setSelectedEntity({
            type: "AIRCRAFT",
            data: fleet[instanceId],
          });
        }
      }}
    />
  );
};
