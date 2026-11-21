"use client";

import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useObservatoryStore } from "@/stores/observatoryStore";

/** Abaixo das rotas (1,003), dos rastros (1,002) e das fronteiras (1,004); acima da superfície (1,0). */
export const GIBS_RADIUS = 1.0015;

const noRaycast = () => null;

/**
 * Camada NASA GIBS (D25): a imagem equiretangular do produto/mês escolhido, translúcida sobre o
 * globo. Fica dentro do grupo da Terra, então acompanha a orientação do Cosmos (D21). Sem luz e sem
 * tone mapping, para as cores baterem com a legenda; sem raycast, para o clique chegar ao país.
 * Cada textura é descartada ao trocar de imagem e ao desligar a camada.
 */
export const GibsLayer: React.FC = () => {
  const imageUrl = useObservatoryStore((s) => s.gibs?.imageUrl ?? null);
  const opacity = useObservatoryStore((s) => s.layerOpacity.NASA_GIBS ?? 0.75);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // A imagem anterior continua na tela até a nova chegar.
  useEffect(() => {
    if (!imageUrl) return;
    let active = true;
    new THREE.TextureLoader().load(
      imageUrl,
      (t) => {
        if (!active) {
          t.dispose();
          return;
        }
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
        setTexture(t);
        invalidate();
      },
      undefined,
      () => console.warn(`[observatório] imagem GIBS indisponível: ${imageUrl}`)
    );
    return () => {
      active = false;
    };
  }, [imageUrl, gl, invalidate]);

  // Cada textura sai da GPU quando é substituída (o cleanup roda depois de o material já usar a nova)
  // ou quando a camada é desligada (desmontagem).
  useEffect(() => () => texture?.dispose(), [texture]);

  if (!texture) return null;
  return (
    <mesh name="gibs-layer" raycast={noRaycast} renderOrder={1}>
      <sphereGeometry args={[GIBS_RADIUS, 128, 64]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};
