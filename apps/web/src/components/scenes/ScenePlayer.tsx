"use client";

import React from "react";
import { useFrame } from "@react-three/fiber";
import { useSceneStore } from "@/stores/sceneStore";
import type { Scene } from "@/lib/scenes/schema";
import { useScene } from "@/lib/scenes/useScene";
import { SurfaceTrajectoryLayer } from "./SurfaceTrajectoryLayer";
import { CislunarTrajectoryLayer } from "./CislunarTrajectoryLayer";

/**
 * Player genérico de cenas (D12c), parte 3D: desenha cada trajetória da cena com a camada do seu
 * tipo. Não conhece nenhum evento pelo nome — tudo vem dos dados em `src/data/scenes/`.
 */
/** Único relógio da reprodução: avança o store da cena a cada quadro (D12d). */
const ScenePlaybackDriver: React.FC = () => {
  useFrame((_, delta) => {
    const s = useSceneStore.getState();
    if (s.isPlaying) s.tick(Math.min(delta, 0.1));
  });
  return null;
};

export const ScenePlayer: React.FC<{ scene: Scene }> = ({ scene: indexed }) => {
  // A cena pode chegar do índice leve (D24): as trajetórias aparecem quando a parte pesada carrega.
  const scene = useScene(indexed.id) ?? indexed;
  return (
    <group name={`scene-player-${scene.id}`}>
      <ScenePlaybackDriver />
      {scene.trajectories.map((t) =>
        t.kind === "surface" ? (
          <SurfaceTrajectoryLayer key={t.id} sceneId={scene.id} trajectory={t} />
        ) : (
          <CislunarTrajectoryLayer key={t.id} scene={scene} trajectory={t} />
        )
      )}
    </group>
  );
};
