"use client";

import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useCosmicStore } from "@/stores/cosmicStore";

const sunVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const sunFragmentShader = `
uniform float uTime;
uniform vec3 uColorCore;
uniform vec3 uColorLimb;
uniform vec3 uColorGlow;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

// Simple procedural noise for solar granulation
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = 1.0 - max(0.0, dot(vNormal, viewDir));

  // Animated granulation noise
  vec2 noiseUv = vUv * 24.0 + vec2(uTime * 0.04, uTime * 0.02);
  float n = noise(noiseUv) * 0.5 + noise(noiseUv * 2.0) * 0.25;

  // Pulsing core and edge limb darkening / solar flare glow
  vec3 color = mix(uColorCore, uColorLimb, n * 0.4);
  color = mix(color, uColorGlow, pow(fresnel, 2.0) * 0.85);

  gl_FragColor = vec4(color, 1.0);
}
`;

export const SunCore: React.FC = () => {
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const focusedBodyId = useCosmicStore((s) => s.focusedBodyId);
  const focusBody = useCosmicStore((s) => s.focusBody);
  const setHoveredBody = useCosmicStore((s) => s.setHoveredBody);

  const sunMeshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);

  const [sunGeo, sunMat, coronaGeo, coronaMat] = useMemo(() => {
    const sGeo = new THREE.SphereGeometry(7.5, 48, 48);
    const sMat = new THREE.ShaderMaterial({
      vertexShader: sunVertexShader,
      fragmentShader: sunFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColorCore: { value: new THREE.Color("#fff7ed") },
        uColorLimb: { value: new THREE.Color("#f59e0b") },
        uColorGlow: { value: new THREE.Color("#fbbf24") },
      },
    });

    const cGeo = new THREE.SphereGeometry(8.6, 32, 32);
    const cMat = new THREE.MeshBasicMaterial({
      color: "#f59e0b",
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });

    return [sGeo, sMat, cGeo, cMat];
  }, []);

  useEffect(() => {
    return () => {
      sunGeo.dispose();
      sunMat.dispose();
      coronaGeo.dispose();
      coronaMat.dispose();
    };
  }, [sunGeo, sunMat, coronaGeo, coronaMat]);

  useFrame((_, delta) => {
    if (sunMat.uniforms.uTime) {
      sunMat.uniforms.uTime.value += delta;
    }
    if (sunMeshRef.current) {
      sunMeshRef.current.rotation.y += delta * 0.05;
    }
    if (coronaRef.current) {
      const pulse = 1.0 + Math.sin(Date.now() * 0.002) * 0.04;
      coronaRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  if (!isCosmicMode) return null;

  const isFocused = focusedBodyId === "SUN";

  return (
    <group name="sun-core" position={[0, 0, 0]}>
      {/* Central Omnidirectional Solar Light Source */}
      <pointLight color="#fffbeb" intensity={4.5} distance={1500} decay={1.0} />

      {/* Pulsing Solar Corona Glow Atmosphere */}
      <mesh ref={coronaRef} geometry={coronaGeo} material={coronaMat} />

      {/* Main Solar Sphere with Granulation Shader */}
      <mesh
        ref={sunMeshRef}
        geometry={sunGeo}
        material={sunMat}
        onClick={(e) => {
          e.stopPropagation();
          focusBody("SUN");
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredBody("SUN");
        }}
        onPointerOut={() => setHoveredBody(null)}
      />

      {/* Selection Ring Indicator */}
      {isFocused && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[8.8, 9.2, 64]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};
