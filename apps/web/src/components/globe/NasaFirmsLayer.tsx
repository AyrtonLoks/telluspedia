"use client";

import React, { useMemo, useEffect } from "react";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo-spatial";
import { useObservatoryStore } from "@/stores/observatoryStore";

export const NasaFirmsLayer: React.FC = () => {
  const hotspots = useObservatoryStore((s) => s.firmsHotspots);
  const opacity = useObservatoryStore((s) => s.layerOpacity.NASA_FIRMS ?? 1.0);

  // Geometria memoizada exclusivamente pelos focos térmicos (evita re-alocação de Float32Array ao alterar opacidade)
  const geometry = useMemo(() => {
    const count = hotspots.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const radius = 1.0025; // Levemente acima da crosta da Terra (R = 1.000)

    for (let i = 0; i < count; i++) {
      const h = hotspots[i];
      const pos = latLngToVector3(h.lat, h.lng, radius);
      positions[i * 3 + 0] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      // Mapeamento térmico de cores de acordo com Fire Radiative Power (MW)
      // FRP baixo (<60 MW): Âmbar #fbbf24
      // FRP médio (60 - 120 MW): Laranja #f97316
      // FRP alto (>120 MW): Vermelho Intenso #ef4444
      if (h.frp > 120) {
        colors[i * 3 + 0] = 0.94; // R
        colors[i * 3 + 1] = 0.27; // G
        colors[i * 3 + 2] = 0.27; // B
      } else if (h.frp >= 60) {
        colors[i * 3 + 0] = 0.98; // R
        colors[i * 3 + 1] = 0.45; // G
        colors[i * 3 + 2] = 0.09; // B
      } else {
        colors[i * 3 + 0] = 0.98; // R
        colors[i * 3 + 1] = 0.75; // G
        colors[i * 3 + 2] = 0.14; // B
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [hotspots]);

  // Material memoizado pela opacidade
  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 4.5,
      vertexColors: true,
      transparent: true,
      opacity: Math.max(0.1, opacity * 0.95),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false,
    });
  }, [opacity]);

  // Descarte estrito de memória GPU (RN21)
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  if (hotspots.length === 0) return null;

  return <points geometry={geometry} material={material} />;
};
