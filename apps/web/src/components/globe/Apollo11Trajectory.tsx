"use client";

import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  createApollo11TrajectoryCurve,
  getApollo11ControlPoints,
  MOON_DEFAULT_POSITION,
} from "@/lib/apollo11";
import { useApollo11Store } from "@/stores/apollo11Store";
import { useGlobeStore } from "@/stores/globeStore";
import { useTimelineStore } from "@/stores/timelineStore";

export const Apollo11Trajectory: React.FC = () => {
  const isPlaying = useApollo11Store((s) => s.isPlaying);
  const playbackSpeed = useApollo11Store((s) => s.playbackSpeed);
  const setProgress = useApollo11Store((s) => s.setProgress);

  const selectedYear = useTimelineStore((s) => s.selectedYear);
  const selectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);

  const spacecraftRef = useRef<THREE.Group>(null);
  const thrustRef = useRef<THREE.Mesh>(null);
  const strobeRef = useRef<THREE.PointLight>(null);

  // Local progress accumulator for 60 FPS smooth rendering
  const progressRef = useRef<number>(useApollo11Store.getState().progress);
  const lastStoreSyncTime = useRef<number>(0);
  const isSyncingToStore = useRef<boolean>(false);
  const hasFlownToOrbit = useRef<boolean>(false);

  // Keep local progress updated instantaneously whenever user scrubs the UI slider or jumps phase
  useEffect(() => {
    const unsub = useApollo11Store.subscribe((state) => {
      if (!isSyncingToStore.current) {
        progressRef.current = state.progress;
      }
    });
    return () => unsub();
  }, []);

  // When 1969 Apollo 11 activates, smoothly retreat camera to wide view (altitude 5.2)
  useEffect(() => {
    if (!hasFlownToOrbit.current) {
      hasFlownToOrbit.current = true;
      useGlobeStore.getState().flyTo(15, -20, 5.2);
    }
  }, [selectedYear, selectedMilestoneId]);

  // Construct trajectory curve and geometries
  const {
    curve,
    coreLineGeometry,
    tubeGeometry,
    glowTubeGeometry,
    launchPos,
    landingPos,
    launchRingQuat,
    landingRingQuat,
    coreLineObject,
  } = useMemo(() => {
    const c = createApollo11TrajectoryCurve();
    const points = c.getPoints(250);

    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const tubeGeo = new THREE.TubeGeometry(c, 200, 0.006, 8, false);
    const glowGeo = new THREE.TubeGeometry(c, 200, 0.014, 8, false);

    const lineMat = new THREE.LineBasicMaterial({
      color: "#38bdf8",
      transparent: true,
      opacity: 0.9,
    });
    const lineObj = new THREE.Line(lineGeo, lineMat);

    const ctrlPts = getApollo11ControlPoints();
    const launch = ctrlPts[0];
    const landing = ctrlPts[ctrlPts.length - 1];

    // Compute surface normal quaternions so beacon rings lie flat tangent to planet/moon sphere
    const launchNormal = launch.clone().normalize();
    const launchQ = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      launchNormal
    );

    const landingNormal = landing.clone().sub(MOON_DEFAULT_POSITION).normalize();
    const landingQ = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      landingNormal
    );

    return {
      curve: c,
      coreLineGeometry: lineGeo,
      tubeGeometry: tubeGeo,
      glowTubeGeometry: glowGeo,
      launchPos: launch,
      landingPos: landing,
      launchRingQuat: launchQ,
      landingRingQuat: landingQ,
      coreLineObject: lineObj,
    };
  }, []);

  // Dispose geometries and materials on unmount to prevent GPU buffer leaks (AGENTS.md invariant)
  useEffect(() => {
    return () => {
      coreLineGeometry.dispose();
      tubeGeometry.dispose();
      glowTubeGeometry.dispose();
      (coreLineObject.material as THREE.Material).dispose();
    };
  }, [coreLineGeometry, tubeGeometry, glowTubeGeometry, coreLineObject]);

  // Animation frame loop
  useFrame((state, delta) => {
    // 1. Advance mission progress along the Catmull-Rom spline
    if (isPlaying) {
      // ~45 seconds for full flight at 1.0x speed
      const speedRate = 0.022 * playbackSpeed;
      const nextP = progressRef.current + delta * speedRate;

      if (nextP >= 1.0) {
        progressRef.current = 1.0;
        isSyncingToStore.current = true;
        setProgress(1.0);
        useApollo11Store.getState().setPlaying(false);
        isSyncingToStore.current = false;
      } else {
        progressRef.current = nextP;

        // Throttle Zustand store sync to 15 Hz to keep UI performant
        const now = state.clock.getElapsedTime();
        if (now - lastStoreSyncTime.current > 0.066) {
          lastStoreSyncTime.current = now;
          isSyncingToStore.current = true;
          setProgress(progressRef.current);
          isSyncingToStore.current = false;
        }
      }
    }

    const currentP = progressRef.current;

    // 2. Position and orient spacecraft along the curve tangent
    if (spacecraftRef.current && curve) {
      const currentPos = curve.getPointAt(currentP);
      spacecraftRef.current.position.copy(currentPos);

      const tangent = curve.getTangentAt(currentP).normalize();
      // Up vector: align spacecraft +Y forward axis to tangent
      const up = new THREE.Vector3(0, 1, 0);
      spacecraftRef.current.quaternion.setFromUnitVectors(up, tangent);
    }

    // 3. Modulate engine exhaust plume during burn phases
    if (thrustRef.current) {
      const isBurning =
        (currentP >= 0.0 && currentP <= 0.1) || // Launch burn
        (currentP >= 0.2 && currentP <= 0.28) || // TLI burn
        (currentP >= 0.55 && currentP <= 0.65) || // LOI burn
        (currentP >= 0.82 && currentP <= 0.98); // Powered descent burn

      thrustRef.current.visible = isBurning;
      if (isBurning) {
        const flicker = 0.8 + Math.sin(state.clock.getElapsedTime() * 40) * 0.2;
        thrustRef.current.scale.set(flicker, flicker, flicker);
      }
    }

    // 4. Strobe navigation beacon light
    if (strobeRef.current) {
      const strobe = Math.sin(state.clock.getElapsedTime() * 8) > 0.6 ? 2.5 : 0.0;
      strobeRef.current.intensity = strobe;
    }
  });

  return (
    <group name="apollo-11-mission-trajectory">
      {/* 1. Core Glowing Trajectory Line (rendered via primitive to avoid SVG line tag conflict) */}
      <primitive object={coreLineObject} />

      {/* 2. Inner Glowing Translunar Tube */}
      <mesh geometry={tubeGeometry}>
        <meshBasicMaterial
          color="#0284c7"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Outer Translucent Ether Halo */}
      <mesh geometry={glowTubeGeometry}>
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 4. Launch Site Marker: Cape Canaveral LC-39A */}
      <group position={launchPos}>
        <mesh>
          <sphereGeometry args={[0.018, 16, 16]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
        <mesh quaternion={launchRingQuat}>
          <ringGeometry args={[0.022, 0.034, 32]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* 5. Touchdown Site Marker: Mare Tranquillitatis */}
      <group position={landingPos}>
        <mesh>
          <sphereGeometry args={[0.016, 16, 16]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
        <mesh quaternion={landingRingQuat}>
          <ringGeometry args={[0.02, 0.032, 32]} />
          <meshBasicMaterial
            color="#fbbf24"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* 6. Apollo 11 Spacecraft (CSM Columbia & LM Eagle) */}
      <group ref={spacecraftRef} name="apollo-11-spacecraft">
        {/* Navigation Strobe Light */}
        <pointLight ref={strobeRef} color="#ffffff" distance={0.5} />

        {/* Service Module (SM) */}
        <mesh position={[0, -0.015, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.042, 16]} />
          <meshStandardMaterial color="#f1f5f9" metalness={0.85} roughness={0.25} />
        </mesh>

        {/* SPS Engine Nozzle */}
        <mesh position={[0, -0.042, 0]}>
          <coneGeometry args={[0.014, 0.018, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.4} />
        </mesh>

        {/* Dynamic Engine Exhaust Plume */}
        <mesh ref={thrustRef} position={[0, -0.062, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.016, 0.038, 16]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Command Module (Columbia) */}
        <mesh position={[0, 0.018, 0]}>
          <coneGeometry args={[0.022, 0.028, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Lunar Module (Eagle) docked at front */}
        <group position={[0, 0.044, 0]}>
          {/* Golden Foil Descent Stage */}
          <mesh>
            <cylinderGeometry args={[0.018, 0.018, 0.016, 8]} />
            <meshStandardMaterial color="#eab308" metalness={0.95} roughness={0.15} />
          </mesh>
          {/* LM Cabin Ascent Stage */}
          <mesh position={[0, 0.014, 0]}>
            <sphereGeometry args={[0.014, 12, 12]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
