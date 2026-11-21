"use client";

import React from "react";
import type { Scene } from "@/lib/scenes/schema";
import { SurfaceTrajectoryLayer } from "./SurfaceTrajectoryLayer";
import { CislunarTrajectoryLayer } from "./CislunarTrajectoryLayer";

/**
 * Player genérico de cenas (D12c), parte 3D: desenha cada trajetória da cena com a camada do seu
 * tipo. Não conhece nenhum evento pelo nome — tudo vem dos dados em `src/data/scenes/`.
 */
export const ScenePlayer: React.FC<{ scene: Scene }> = ({ scene }) => (
  <group name={`scene-player-${scene.id}`}>
    {scene.trajectories.map((t) =>
      t.kind === "surface" ? (
        <SurfaceTrajectoryLayer key={t.id} sceneId={scene.id} trajectory={t} />
      ) : (
        <CislunarTrajectoryLayer key={t.id} scene={scene} trajectory={t} />
      )
    )}
  </group>
);
