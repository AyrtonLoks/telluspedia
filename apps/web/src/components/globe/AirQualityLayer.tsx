"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { AQI_BAND_COLORS_HEX } from "@/lib/air-quality-data";
import type { AirQualityStation } from "@/lib/air-quality-types";
import { latLngToVector3 } from "@/lib/geo-spatial";
import { isDragRelease } from "@/lib/pointer-intent";
import { useObservatoryStore } from "@/stores/observatoryStore";

const STATION_RADIUS = 1.0036;

/**
 * Camada 3D de Qualidade do Ar em Estações Capitais Globais (Open-Meteo CAMS — D40):
 * - Marcadores instanciados (`THREE.InstancedMesh`) coloridos pela faixa US AQI ou European AQI;
 * - Picking instantâneo abrindo o boletim atmosférico no `ObservatoryTelemetryHUD`;
 * - Descarte explícito de `BufferGeometry` e `Material` na GPU (`RN21`).
 */
export const AirQualityLayer: React.FC = () => {
  const payload = useObservatoryStore((s) => s.airQualityStations);
  const scaleMode = useObservatoryStore((s) => s.aqiScaleMode);
  const opacity = useObservatoryStore((s) => s.layerOpacity.AIR_QUALITY ?? 0.95);
  const layerMeta = useObservatoryStore((s) => s.layerMeta.AIR_QUALITY);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);
  const invalidate = useThree((s) => s.invalidate);

  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const stations: readonly AirQualityStation[] = useMemo(
    () => payload?.stations ?? [],
    [payload]
  );

  const markerGeometry = useMemo(() => new THREE.SphereGeometry(0.0095, 12, 10), []);
  const markerMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.95,
        toneMapped: false,
      }),
    []
  );

  useEffect(() => {
    return () => {
      markerGeometry.dispose();
      markerMaterial.dispose();
    };
  }, [markerGeometry, markerMaterial]);

  useEffect(() => {
    markerMaterial.opacity = Math.max(0.25, opacity);
    invalidate();
  }, [opacity, markerMaterial, invalidate]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || stations.length === 0) return;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < stations.length; i++) {
      const st = stations[i]!;
      const pos = latLngToVector3(st.lat, st.lng, STATION_RADIUS);
      dummy.position.copy(pos);
      dummy.lookAt(0, 0, 0);

      const metric = scaleMode === "european_aqi" ? (st.europeanAqi ?? 20) : (st.usAqi ?? 35);
      const scale = scaleMode === "european_aqi"
        ? 0.85 + Math.min(1.4, metric / 70) * 0.55
        : 0.85 + Math.min(1.4, metric / 120) * 0.55;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const band = scaleMode === "european_aqi" ? st.bandEu : st.bandUs;
      color.set(AQI_BAND_COLORS_HEX[band] ?? "#22c55e");
      mesh.setColorAt(i, color);
    }

    mesh.count = stations.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    invalidate();
  }, [stations, scaleMode, invalidate]);

  const handlePointerClick = (e: ThreeEvent<MouseEvent>) => {
    if (isDragRelease(e)) return;
    e.stopPropagation();
    const idx = e.instanceId;
    if (idx === undefined || idx < 0 || idx >= stations.length) return;
    const picked = stations[idx];
    if (!picked) return;
    setSelectedEntity({
      type: "AIR_QUALITY_STATION",
      data: picked,
      meta: layerMeta,
    });
  };

  if (stations.length === 0) return null;

  return (
    <instancedMesh
      key={`air-quality-instances-${stations.length}`}
      ref={meshRef}
      args={[markerGeometry, markerMaterial, Math.max(1, stations.length)]}
      onClick={handlePointerClick}
      onPointerOver={() => {
        if (typeof document !== "undefined") document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        if (typeof document !== "undefined") document.body.style.cursor = "";
      }}
    />
  );
};
