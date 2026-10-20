"use client";

import React, { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useTimelineStore } from "@/stores/timelineStore";
import {
  calculateHalleyPosition,
  generateHalleyOrbitalPath,
} from "@/lib/astronomy-planets";

export const CometHalleyTrajectory: React.FC = () => {
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const activeCosmicLayers = useCosmicStore((s) => s.activeCosmicLayers);
  const focusedBodyId = useCosmicStore((s) => s.focusedBodyId);
  const hoveredBodyId = useCosmicStore((s) => s.hoveredBodyId);
  const focusBody = useCosmicStore((s) => s.focusBody);
  const setHoveredBody = useCosmicStore((s) => s.setHoveredBody);

  const selectedYear = useTimelineStore((s) => s.selectedYear) || new Date().getUTCFullYear();

  const showComets = isCosmicMode && activeCosmicLayers.includes("COMETS");
  const showLabels = activeCosmicLayers.includes("LABELS");

  const isFocused = focusedBodyId === "HALLEY";
  const isHovered = hoveredBodyId === "HALLEY";

  // Halley orbit path line geometry
  const orbitGeometry = useMemo(() => {
    const points = generateHalleyOrbitalPath(240);
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  // Nucleus & tail geometries
  const [nucleusGeo, nucleusMat, tailGeo, tailMat] = useMemo(() => {
    const nGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const nMat = new THREE.MeshStandardMaterial({
      color: "#38bdf8",
      emissive: "#0284c7",
      emissiveIntensity: 0.8,
      roughness: 0.5,
    });

    // Tapered cylinder / cone for ion & dust tail
    const tGeo = new THREE.CylinderGeometry(0.08, 0.9, 1.0, 16, 1, true);
    tGeo.translate(0, 0.5, 0); // origin at apex pointing +Y
    const tMat = new THREE.MeshBasicMaterial({
      color: "#67e8f9",
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    return [nGeo, nMat, tGeo, tMat];
  }, []);

  useEffect(() => {
    return () => {
      orbitGeometry.dispose();
      nucleusGeo.dispose();
      nucleusMat.dispose();
      tailGeo.dispose();
      tailMat.dispose();
    };
  }, [orbitGeometry, nucleusGeo, nucleusMat, tailGeo, tailMat]);

  if (!showComets) return null;

  const halley = calculateHalleyPosition(selectedYear);
  const tailOrientation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    halley.tailDirection
  );

  return (
    <group name="comet-halley">
      {/* Keplerian Trajectory Line */}
      <lineLoop geometry={orbitGeometry}>
        <lineBasicMaterial
          color={isFocused ? "#38bdf8" : halley.isPerihelionPassage ? "#67e8f9" : "#0284c7"}
          transparent
          opacity={isFocused ? 0.85 : halley.isPerihelionPassage ? 0.6 : 0.25}
          linewidth={1}
        />
      </lineLoop>

      {/* Comet Nucleus & Directional Tail */}
      <group position={halley.scenePosition}>
        {/* Nucleus */}
        <mesh
          geometry={nucleusGeo}
          material={nucleusMat}
          onClick={(e) => {
            e.stopPropagation();
            focusBody("HALLEY");
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredBody("HALLEY");
          }}
          onPointerOut={() => setHoveredBody(null)}
        />

        {/* Tail pointing strictly away from Sun */}
        <mesh
          geometry={tailGeo}
          material={tailMat}
          quaternion={tailOrientation}
          scale={[1, halley.tailLength, 1]}
        />

        {/* Perihelion Highlight Aura */}
        {halley.isPerihelionPassage && (
          <mesh>
            <sphereGeometry args={[0.9, 16, 16]} />
            <meshBasicMaterial
              color="#a5f3fc"
              transparent
              opacity={0.3}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )}

        {/* Selection Indicator */}
        {isFocused && (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.7, 0.9, 32]} />
            <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} transparent opacity={0.8} />
          </mesh>
        )}

        {/* Label */}
        {showLabels && (
          <Html
            distanceFactor={45}
            position={[0, 1.2, 0]}
            center
            className="pointer-events-none select-none"
          >
            <div className="flex flex-col items-center">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap shadow-md ${
                  halley.isPerihelionPassage
                    ? "bg-cyan-500 text-slate-950 font-bold border border-cyan-300 animate-pulse"
                    : isFocused
                    ? "bg-cyan-600 text-slate-100 font-bold"
                    : "bg-slate-900/80 text-cyan-200 border border-slate-700/60"
                }`}
              >
                1P/Halley
              </span>
              <span className="text-[9px] font-mono text-cyan-400 mt-0.5">
                {halley.distanceSunAu} UA {halley.isPerihelionPassage ? "★ Periélio!" : ""}
              </span>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
};
