"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import { useSolarSystemVisible } from "@/stores/cosmicExitStore";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { cn } from "@/components/ui/cn";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useTimelineStore } from "@/stores/timelineStore";
import {
  calculateHalleyPosition,
  generateHalleyOrbitalPath,
  ASTROPHYSICAL_CATALOG,
} from "@/lib/astronomy-planets";
import { celestialLabelPriority } from "@/lib/cosmic-scale";
import { CelestialLabel } from "./CelestialLabel";

import { isDragRelease } from "@/lib/pointer-intent";
import { halleyNucleusVertexShader, halleyNucleusFragmentShader, ionPlumeVertexShader, ionPlumeFragmentShader, dustPlumeVertexShader, dustPlumeFragmentShader } from "./comet-halley-shaders";
import { createRadialFalloffTexture, buildHalleyNucleusGeometry, buildIonPlumeGeometry, buildDustPlumeGeometry, buildIonTailGeometry, buildDustTailGeometry } from "./comet-halley-geometry";
export { createRadialFalloffTexture, buildHalleyNucleusGeometry, buildIonPlumeGeometry, buildDustPlumeGeometry, buildIonTailGeometry, buildDustTailGeometry } from "./comet-halley-geometry";

export const CometHalleyTrajectory: React.FC = () => {
  const { camera } = useThree();
  // Visível no Cosmos e durante a descida de volta à Terra (D17).
  const isCosmicMode = useSolarSystemVisible();
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

  const nucleusRef = useRef<THREE.Mesh>(null);
  const pickMeshRef = useRef<THREE.Mesh>(null);
  const isDistantRef = useRef<boolean>(true);
  const [isDistant, setIsDistant] = useState<boolean>(true);

  const halley = useMemo(() => calculateHalleyPosition(selectedYear), [selectedYear]);

  // Static GPU resources
  const {
    orbitGeometry,
    nucleusGeo,
    nucleusMat,
    pickGeo,
    pickMat,
    comaTexture,
    ionPlumeMat,
    dustPlumeMat,
    ionTailMat,
    dustTailMat,
  } = useMemo(() => {
    const oGeo = new THREE.BufferGeometry().setFromPoints(generateHalleyOrbitalPath(240));
    const nGeo = buildHalleyNucleusGeometry();
    const nMat = new THREE.ShaderMaterial({
      vertexShader: halleyNucleusVertexShader,
      fragmentShader: halleyNucleusFragmentShader,
      uniforms: {
        uActivity: { value: 0.0 },
      },
    });
    const pGeo = new THREE.SphereGeometry(1.0, 12, 12);
    const pMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const texture = createRadialFalloffTexture(128);

    const iPlumeMat = new THREE.ShaderMaterial({
      vertexShader: ionPlumeVertexShader,
      fragmentShader: ionPlumeFragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        uOpacity: { value: 0.0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const dPlumeMat = new THREE.ShaderMaterial({
      vertexShader: dustPlumeVertexShader,
      fragmentShader: dustPlumeFragmentShader,
      uniforms: {
        uOpacity: { value: 0.0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const iMat = new THREE.PointsMaterial({
      size: 0.36,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const dMat = new THREE.PointsMaterial({
      size: 0.56,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    return {
      orbitGeometry: oGeo,
      nucleusGeo: nGeo,
      nucleusMat: nMat,
      pickGeo: pGeo,
      pickMat: pMat,
      comaTexture: texture,
      ionPlumeMat: iPlumeMat,
      dustPlumeMat: dPlumeMat,
      ionTailMat: iMat,
      dustTailMat: dMat,
    };
  }, []);

  // Volumetric plumes & particle streams — allocated ONLY when Halley is inside the sublimation zone (< 4.5 AU)
  const ionPlumeGeo = useMemo(() => {
    if (!showComets || !halley.hasTail || halley.tailLength <= 0) return null;
    return buildIonPlumeGeometry(halley.tailDirection, halley.tailLength);
  }, [showComets, halley]);

  const dustPlumeGeo = useMemo(() => {
    if (!showComets || !halley.hasTail || halley.dustTailLength <= 0) return null;
    return buildDustPlumeGeometry(
      halley.tailDirection,
      halley.orbitalVelocityDirection,
      halley.dustTailLength
    );
  }, [showComets, halley]);

  const ionTailGeometry = useMemo(() => {
    if (!showComets || !halley.hasTail || halley.tailLength <= 0) return null;
    return buildIonTailGeometry(halley.tailDirection, halley.tailLength);
  }, [showComets, halley]);

  const dustTailGeometry = useMemo(() => {
    if (!showComets || !halley.hasTail || halley.dustTailLength <= 0) return null;
    return buildDustTailGeometry(
      halley.tailDirection,
      halley.orbitalVelocityDirection,
      halley.dustTailLength
    );
  }, [showComets, halley]);

  // Sync shader uniforms & particle opacities with physical activity
  useEffect(() => {
    nucleusMat.uniforms.uActivity.value = halley.activityFactor;
    ionPlumeMat.uniforms.uOpacity.value = halley.tailOpacity;
    dustPlumeMat.uniforms.uOpacity.value = halley.dustTailOpacity;
    ionTailMat.opacity = halley.tailOpacity;
    dustTailMat.opacity = halley.dustTailOpacity;
  }, [
    nucleusMat,
    ionPlumeMat,
    dustPlumeMat,
    ionTailMat,
    dustTailMat,
    halley.activityFactor,
    halley.tailOpacity,
    halley.dustTailOpacity,
  ]);

  // Restore pointer cursor cleanly on unmount
  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.cursor = "auto";
      }
    };
  }, []);

  // Strict disposal of dynamic tail geometries
  useEffect(() => {
    return () => {
      ionPlumeGeo?.dispose();
    };
  }, [ionPlumeGeo]);

  useEffect(() => {
    return () => {
      dustPlumeGeo?.dispose();
    };
  }, [dustPlumeGeo]);

  useEffect(() => {
    return () => {
      ionTailGeometry?.dispose();
    };
  }, [ionTailGeometry]);

  useEffect(() => {
    return () => {
      dustTailGeometry?.dispose();
    };
  }, [dustTailGeometry]);

  // Strict disposal of static GPU resources
  useEffect(() => {
    return () => {
      orbitGeometry.dispose();
      nucleusGeo.dispose();
      nucleusMat.dispose();
      pickGeo.dispose();
      pickMat.dispose();
      comaTexture.dispose();
      ionPlumeMat.dispose();
      dustPlumeMat.dispose();
      ionTailMat.dispose();
      dustTailMat.dispose();
    };
  }, [
    orbitGeometry,
    nucleusGeo,
    nucleusMat,
    pickGeo,
    pickMat,
    comaTexture,
    ionPlumeMat,
    dustPlumeMat,
    ionTailMat,
    dustTailMat,
  ]);

  // Animate nucleus tumble, solar-wind plasma ripples, and distance-adaptive 3D click target
  useFrame((_, delta) => {
    if (!showComets) return;

    if (nucleusRef.current) {
      nucleusRef.current.rotation.y += delta * 0.22;
      nucleusRef.current.rotation.z += delta * 0.09;
    }

    if (halley.hasTail && ionPlumeMat.uniforms.uTime) {
      ionPlumeMat.uniforms.uTime.value += delta;
    }

    const camDist = camera.position.distanceTo(halley.scenePosition);
    if (pickMeshRef.current) {
      // Constant generous ~32px click target from wide Solar System view down to close-up inspection
      const pickRadius = THREE.MathUtils.clamp(camDist * 0.036, 0.55, 8.5);
      pickMeshRef.current.scale.setScalar(pickRadius);
    }

    const distantNow = camDist > 4.5;
    if (distantNow !== isDistantRef.current) {
      isDistantRef.current = distantNow;
      setIsDistant(distantNow);
    }
  });

  if (!showComets) return null;

  const handleSelectHalley = () => {
    focusBody("HALLEY");
  };

  const handleHoverStart = () => {
    setHoveredBody("HALLEY");
    if (typeof document !== "undefined") {
      document.body.style.cursor = "pointer";
    }
  };

  const handleHoverEnd = () => {
    setHoveredBody(null);
    if (typeof document !== "undefined") {
      document.body.style.cursor = "auto";
    }
  };

  const outerComaScale = halley.hasTail ? halley.comaRadius * 2.1 : 0;

  return (
    <group name="comet-halley">
      {/* Keplerian Trajectory Line */}
      <lineLoop geometry={orbitGeometry}>
        <lineBasicMaterial
          color={isFocused ? "#38bdf8" : halley.isPerihelionPassage ? "#67e8f9" : "#0284c7"}
          transparent
          opacity={isFocused ? 0.78 : halley.isPerihelionPassage ? 0.55 : 0.28}
          linewidth={1}
        />
      </lineLoop>

      {/* Comet Nucleus, Multi-Layer Coma & Volumetric Dual Tail */}
      <group position={halley.scenePosition}>
        {/* Sculpted bilobed carbonaceous-icy nucleus lit by true world-space Sun direction */}
        <mesh ref={nucleusRef} name="halley-nucleus" geometry={nucleusGeo} material={nucleusMat} />

        {/* Distance-adaptive invisible picking sphere for effortless selection at any zoom */}
        <mesh
          ref={pickMeshRef}
          name="halley-pick-collider"
          geometry={pickGeo}
          material={pickMat}
          onClick={(e) => {
            e.stopPropagation();
            if (isDragRelease(e)) return;
            handleSelectHalley();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            handleHoverStart();
          }}
          onPointerOut={handleHoverEnd}
        />

        {/* Inner diffuse radial coma sprite (always larger than nucleus diameter so never occluded) */}
        <sprite scale={[halley.comaRadius, halley.comaRadius, 1]}>
          <spriteMaterial
            map={comaTexture}
            color={halley.hasTail ? "#e0f7ff" : "#bae6fd"}
            transparent
            opacity={halley.comaOpacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>

        {/* Outer luminous coma envelope — emerges when sublimation is active (< 4.5 AU) */}
        {halley.hasTail && outerComaScale > 0 && (
          <sprite scale={[outerComaScale, outerComaScale, 1]}>
            <spriteMaterial
              map={comaTexture}
              color="#38bdf8"
              transparent
              opacity={Number((halley.activityFactor * 0.42).toFixed(3))}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        )}

        {/* Volumetric Dual Tail + Particle Streams — visible ONLY below 4.5 AU */}
        {halley.hasTail && ionPlumeGeo && (
          <mesh name="halley-ion-plume" geometry={ionPlumeGeo} material={ionPlumeMat} />
        )}
        {halley.hasTail && dustPlumeGeo && (
          <mesh name="halley-dust-plume" geometry={dustPlumeGeo} material={dustPlumeMat} />
        )}
        {halley.hasTail && ionTailGeometry && (
          <points name="halley-ion-tail" geometry={ionTailGeometry} material={ionTailMat} />
        )}
        {halley.hasTail && dustTailGeometry && (
          <points name="halley-dust-tail" geometry={dustTailGeometry} material={dustTailMat} />
        )}

        {/* Discreet screen-space selection halo — hidden in close-up so it never stamps over the nucleus */}
        {(isHovered || (isFocused && isDistant)) && (
          <Html center className="pointer-events-none select-none">
            <span
              data-testid="halley-selection-halo"
              className={cn(
                "block h-7 w-7 rounded-full border transition-colors duration-fast ease-out",
                isFocused
                  ? "border-accent bg-accent/10 shadow-e1"
                  : "border-fg-muted/70 bg-transparent"
              )}
            />
          </Html>
        )}

        {/* Rótulo clicável pelo componente único (D11): px fixos e anticolisão */}
        {showLabels && (
          <CelestialLabel
            anchorHeight={0.2}
            priority={celestialLabelPriority(ASTROPHYSICAL_CATALOG.HALLEY.equatorialRadiusKm, { focused: isFocused, hovered: isHovered })}
          >
            <button
              type="button"
              data-testid="halley-label"
              aria-label="Selecionar Cometa 1P/Halley"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectHalley();
              }}
              onMouseEnter={handleHoverStart}
              onMouseLeave={handleHoverEnd}
              className={cn(
                "pointer-events-auto cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap rounded-control border bg-surface/86 px-2.5 py-1 text-caption font-medium shadow-e1 backdrop-blur-md transition-colors duration-fast ease-out hover:border-accent hover:text-accent",
                isFocused
                  ? "border-accent text-accent"
                  : halley.hasTail
                  ? "border-line-strong text-fg"
                  : "border-line text-fg"
              )}
            >
              <span>1P/Halley</span>
              <span className="font-mono tabular-nums text-fg-secondary">
                {halley.distanceSunAu.toFixed(2)} UA
              </span>
              {halley.isPerihelionPassage ? (
                <span className="text-cat-science">· Periélio</span>
              ) : halley.hasTail ? (
                <span className="text-cat-science">· Cauda ativa</span>
              ) : null}
            </button>
          </CelestialLabel>
        )}
      </group>
    </group>
  );
};
