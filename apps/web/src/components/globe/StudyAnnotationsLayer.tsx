"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { latLngToVector3 } from "@/lib/geo-spatial";
import type { StudyAnnotationTone } from "@/lib/study-annotations";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useStudyStore } from "@/stores/studyStore";
import { useStudioToolsStore } from "@/stores/studioToolsStore";

const PIN_SURFACE_RADIUS = 1.004;
const PIN_HEAD_OFFSET = 0.022;
const ignoreRaycast = () => null;

const TONE_HEX: Record<StudyAnnotationTone, number> = {
  accent: 0x38bdd4,
  warning: 0xf59e0b,
  success: 0x34d399,
  danger: 0xf87171,
};

/**
 * Camada 3D de Pinos Anotados `(lat, lng)` dos Estudos (D37).
 * Renderiza hastes normais à superfície esférica + cabeças interativas clicáveis e descarta
 * geometrias/materiais na GPU ao desmontar (RN21).
 */
export const StudyAnnotationsLayer: React.FC = () => {
  const annotations = useStudyStore((s) => s.annotations);
  const pendingPinCoords = useStudioToolsStore((s) => s.pendingPinCoords);
  const selectedAnnotationId = useStudioToolsStore((s) => s.selectedAnnotationId);
  const selectAnnotation = useStudioToolsStore((s) => s.selectAnnotation);
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const invalidate = useThree((s) => s.invalidate);

  const headGeometry = useMemo(() => new THREE.SphereGeometry(0.011, 16, 16), []);
  const selectedHeadGeometry = useMemo(() => new THREE.SphereGeometry(0.0145, 18, 18), []);
  const stemGeometry = useMemo(() => {
    const geom = new THREE.CylinderGeometry(0.0018, 0.0018, PIN_HEAD_OFFSET, 8);
    geom.translate(0, PIN_HEAD_OFFSET * 0.5, 0);
    return geom;
  }, []);
  const haloGeometry = useMemo(() => new THREE.RingGeometry(0.013, 0.019, 24), []);

  const materials = useMemo(
    () => ({
      accent: new THREE.MeshBasicMaterial({ color: TONE_HEX.accent }),
      warning: new THREE.MeshBasicMaterial({ color: TONE_HEX.warning }),
      success: new THREE.MeshBasicMaterial({ color: TONE_HEX.success }),
      danger: new THREE.MeshBasicMaterial({ color: TONE_HEX.danger }),
      stem: new THREE.MeshBasicMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.9,
      }),
      halo: new THREE.MeshBasicMaterial({
        color: 0x38bdd4,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      pending: new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.85,
      }),
    }),
    []
  );

  useEffect(() => {
    invalidate();
  }, [annotations, pendingPinCoords, selectedAnnotationId, invalidate]);

  useEffect(() => {
    return () => {
      headGeometry.dispose();
      selectedHeadGeometry.dispose();
      stemGeometry.dispose();
      haloGeometry.dispose();
      Object.values(materials).forEach((m) => m.dispose());
    };
  }, [headGeometry, selectedHeadGeometry, stemGeometry, haloGeometry, materials]);

  const pinTransforms = useMemo(() => {
    if (isCosmicMode) return [];
    const yAxis = new THREE.Vector3(0, 1, 0);
    const zAxis = new THREE.Vector3(0, 0, 1);

    return annotations.map((pin) => {
      const basePos = latLngToVector3(pin.lat, pin.lng, PIN_SURFACE_RADIUS);
      const normal = basePos.clone().normalize();
      const stemQuat = new THREE.Quaternion().setFromUnitVectors(yAxis, normal);
      const ringQuat = new THREE.Quaternion().setFromUnitVectors(zAxis, normal);
      const headPos = normal.clone().multiplyScalar(PIN_SURFACE_RADIUS + PIN_HEAD_OFFSET);
      return { pin, basePos, headPos, stemQuat, ringQuat };
    });
  }, [annotations, isCosmicMode]);

  const pendingTransform = useMemo(() => {
    if (isCosmicMode || !pendingPinCoords) return null;
    const yAxis = new THREE.Vector3(0, 1, 0);
    const basePos = latLngToVector3(pendingPinCoords.lat, pendingPinCoords.lng, PIN_SURFACE_RADIUS);
    const normal = basePos.clone().normalize();
    const stemQuat = new THREE.Quaternion().setFromUnitVectors(yAxis, normal);
    const headPos = normal.clone().multiplyScalar(PIN_SURFACE_RADIUS + PIN_HEAD_OFFSET);
    return { basePos, headPos, stemQuat };
  }, [isCosmicMode, pendingPinCoords]);

  if (isCosmicMode || (pinTransforms.length === 0 && !pendingTransform)) return null;

  const handlePinClick = (e: ThreeEvent<MouseEvent>, id: string, lat: number, lng: number) => {
    e.stopPropagation();
    selectAnnotation(id);
    useGlobeStore.getState().flyTo(lat, lng, 1.9);
  };

  return (
    <group name="study-annotations-layer">
      {pinTransforms.map(({ pin, basePos, headPos, stemQuat, ringQuat }) => {
        const isSelected = selectedAnnotationId === pin.id;
        const headMat = materials[pin.tone] ?? materials.accent;
        return (
          <group key={pin.id}>
            <mesh
              position={basePos}
              quaternion={stemQuat}
              geometry={stemGeometry}
              material={materials.stem}
              raycast={ignoreRaycast}
              renderOrder={18}
            />
            {isSelected && (
              <mesh
                position={basePos}
                quaternion={ringQuat}
                geometry={haloGeometry}
                material={materials.halo}
                raycast={ignoreRaycast}
                renderOrder={18}
              />
            )}
            <mesh
              position={headPos}
              geometry={isSelected ? selectedHeadGeometry : headGeometry}
              material={headMat}
              onClick={(e) => handlePinClick(e, pin.id, pin.lat, pin.lng)}
              renderOrder={19}
            />
          </group>
        );
      })}

      {pendingTransform && (
        <group>
          <mesh
            position={pendingTransform.basePos}
            quaternion={pendingTransform.stemQuat}
            geometry={stemGeometry}
            material={materials.stem}
            raycast={ignoreRaycast}
            renderOrder={18}
          />
          <mesh
            position={pendingTransform.headPos}
            geometry={selectedHeadGeometry}
            material={materials.pending}
            raycast={ignoreRaycast}
            renderOrder={19}
          />
        </group>
      )}
    </group>
  );
};
