"use client";

import React, { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { latLngToVector3 } from "@/lib/geo-spatial";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { calculateIssPosition } from "@/lib/observatory-data";

const ORBIT_RADIUS = 1.18; // Altitude orbital calibrada no Three.js

export const IssOrbitLayer: React.FC = () => {
  const telemetry = useObservatoryStore((s) => s.issTelemetry) || calculateIssPosition();
  const opacity = useObservatoryStore((s) => s.layerOpacity.ISS_SATELLITES ?? 1.0);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);

  const issGroupRef = useRef<THREE.Group>(null);

  // 1. Linha Contínua da Órbita da ISS (memoizada pela trilha)
  const orbitGeometry = useMemo(() => {
    const track = telemetry.groundTrack || [];
    const points: THREE.Vector3[] = [];

    if (track.length > 0) {
      for (const pt of track) {
        points.push(latLngToVector3(pt.lat, pt.lng, ORBIT_RADIUS));
      }
    } else {
      const now = Date.now();
      for (let i = 0; i < 64; i++) {
        const offsetMs = (i / 64) * 5560.8 * 1000;
        const pos = calculateIssPosition(now + offsetMs);
        points.push(latLngToVector3(pos.latitude, pos.longitude, ORBIT_RADIUS));
      }
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [telemetry.groundTrack]);

  const orbitMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: "#22d3ee",
      transparent: true,
      opacity: Math.max(0.15, opacity * 0.55),
      linewidth: 1.5,
    });
  }, [opacity]);

  const orbitLineObject = useMemo(() => {
    return new THREE.Line(orbitGeometry, orbitMaterial);
  }, [orbitGeometry, orbitMaterial]);

  // 2. Geometrias Poligonais da Estação Espacial Internacional
  const {
    moduleGeo,
    moduleMat,
    trussGeo,
    trussMat,
    solarGeo,
    solarMat,
    beaconGeo,
    beaconMat,
  } = useMemo(() => {
    const modG = new THREE.CylinderGeometry(0.007, 0.007, 0.042, 8);
    const modM = new THREE.MeshStandardMaterial({
      color: "#94a3b8",
      metalness: 0.8,
      roughness: 0.25,
    });

    const trG = new THREE.BoxGeometry(0.13, 0.004, 0.004);
    const trM = new THREE.MeshStandardMaterial({
      color: "#cbd5e1",
      metalness: 0.7,
      roughness: 0.3,
    });

    const solG = new THREE.BoxGeometry(0.038, 0.016, 0.001);
    const solM = new THREE.MeshStandardMaterial({
      color: "#1d4ed8",
      roughness: 0.1,
      metalness: 0.9,
      emissive: "#0369a1",
      emissiveIntensity: 0.25,
    });

    const beacG = new THREE.SphereGeometry(0.004, 8, 8);
    const beacM = new THREE.MeshBasicMaterial({
      color: "#38bdf8",
      transparent: true,
      opacity: 0.9,
    });

    return {
      moduleGeo: modG,
      moduleMat: modM,
      trussGeo: trG,
      trussMat: trM,
      solarGeo: solG,
      solarMat: solM,
      beaconGeo: beacG,
      beaconMat: beacM,
    };
  }, []);

  // Descarte estrito de recursos WebGL (RN21)
  useEffect(() => {
    return () => {
      orbitGeometry.dispose();
      orbitMaterial.dispose();
      moduleGeo.dispose();
      moduleMat.dispose();
      trussGeo.dispose();
      trussMat.dispose();
      solarGeo.dispose();
      solarMat.dispose();
      beaconGeo.dispose();
      beaconMat.dispose();
    };
  }, [
    orbitGeometry,
    orbitMaterial,
    moduleGeo,
    moduleMat,
    trussGeo,
    trussMat,
    solarGeo,
    solarMat,
    beaconGeo,
    beaconMat,
  ]);

  // Propagação orbital contínua a 60 FPS com orientação tangente de velocidade
  useFrame(() => {
    if (!issGroupRef.current) return;

    const now = Date.now();
    const currentTelemetry = calculateIssPosition(now);
    const currentPos = latLngToVector3(
      currentTelemetry.latitude,
      currentTelemetry.longitude,
      ORBIT_RADIUS
    );

    const aheadTelemetry = calculateIssPosition(now + 2000);
    const targetPos = latLngToVector3(
      aheadTelemetry.latitude,
      aheadTelemetry.longitude,
      ORBIT_RADIUS
    );

    issGroupRef.current.position.copy(currentPos);

    // Orientação: o vetor para frente acompanha a velocidade orbital, e o 'up' aponta para o zênite
    const forward = targetPos.clone().sub(currentPos).normalize();
    const up = currentPos.clone().normalize();
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    const correctedUp = new THREE.Vector3().crossVectors(forward.clone().negate(), right).normalize();

    const rotMatrix = new THREE.Matrix4().makeBasis(right, correctedUp, forward.negate());
    issGroupRef.current.quaternion.setFromRotationMatrix(rotMatrix);
  });

  return (
    <group>
      {/* Trilha Orbital em Linha Contínua */}
      <primitive object={orbitLineObject} />

      {/* Modelo 3D da ISS com Click Interativo */}
      <group
        ref={issGroupRef}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedEntity({ type: "ISS", data: calculateIssPosition(Date.now()) });
        }}
      >
        {/* Módulo Pressurizado Principal (Zvezda / Destiny / Unity) */}
        <mesh
          geometry={moduleGeo}
          material={moduleMat}
          rotation={[Math.PI / 2, 0, 0]}
        />

        {/* Treliça Integrada Transversal (Truss) */}
        <mesh geometry={trussGeo} material={trussMat} />

        {/* Painéis Solares de Estibordo (Starboard) */}
        <mesh
          geometry={solarGeo}
          material={solarMat}
          position={[0.045, 0, 0.012]}
        />
        <mesh
          geometry={solarGeo}
          material={solarMat}
          position={[0.045, 0, -0.012]}
        />

        {/* Painéis Solares de Bombordo (Port) */}
        <mesh
          geometry={solarGeo}
          material={solarMat}
          position={[-0.045, 0, 0.012]}
        />
        <mesh
          geometry={solarGeo}
          material={solarMat}
          position={[-0.045, 0, -0.012]}
        />

        {/* Luz de Posição / Beacon */}
        <mesh geometry={beaconGeo} material={beaconMat} position={[0, 0.008, 0]} />
      </group>
    </group>
  );
};
