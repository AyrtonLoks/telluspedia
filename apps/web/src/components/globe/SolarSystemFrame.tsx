"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useCosmicExitStore } from "@/stores/cosmicExitStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { nearBodyOpacity, orbitTransition, solarSystemExitOpacity } from "@/lib/camera-transition";

const sphere = new THREE.Sphere();

type Fadable = THREE.Material & { opacity: number; transparent: boolean; uniforms?: Record<string, { value: unknown }> };
const noRaycast = () => undefined;

/**
 * Grupo do sistema solar (D17). No Cosmos, identidade. Na descida de volta à Terra, aplica o mesmo
 * reposicionamento da câmera — a Terra foi da órbita (centro `c`, escala `s`) para a origem na escala
 * 1, então tudo o mais vai para `(p − c) / s` — e esmaece materiais e shaders (`uOpacity`) até sumir,
 * sem aceitar cliques. Cada corpo (malha) também some quando a câmera passa perto dele. Ao fim da descida o controlador limpa a saída e o grupo desmonta.
 */
export const SolarSystemFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const exit = useCosmicExitStore((s) => s.exit);
  const group = useRef<THREE.Group>(null);
  const exiting = !isCosmicMode && exit !== null;
  const k = exiting ? 1 / exit.scale : 1;
  const position: [number, number, number] = exiting ? [-exit.center[0] * k, -exit.center[1] * k, -exit.center[2] * k] : [0, 0, 0];

  useFrame(({ camera }) => {
    const g = group.current;
    if (!g || !exiting) return;
    const global = solarSystemExitOpacity(orbitTransition.progress);
    g.traverse((obj) => {
      const holder = obj as THREE.Object3D & { material?: Fadable | Fadable[] };
      let alpha = global;
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) {
        if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
        sphere.copy(mesh.geometry.boundingSphere!).applyMatrix4(mesh.matrixWorld);
        alpha *= nearBodyOpacity(camera.position.distanceTo(sphere.center), sphere.radius);
      }
      if (holder.material) holder.raycast = noRaycast;
      const mats = holder.material ? (Array.isArray(holder.material) ? holder.material : [holder.material]) : [];
      for (const m of mats) {
        const base = (m.userData.baseOpacity ??= m.opacity) as number;
        if (m.uniforms?.uOpacity) {
          m.uniforms.uOpacity.value = alpha;
          m.transparent = true;
        } else {
          m.opacity = base * alpha;
          m.transparent = true;
        }
      }
      obj.visible = alpha > 0.005 || !holder.material;
    });
  });

  return (
    <group ref={group} position={position} scale={k}>
      {children}
    </group>
  );
};
