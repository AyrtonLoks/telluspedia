"use client";

import React, { useMemo, useEffect } from "react";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo-spatial";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { EonetEvent } from "@/lib/observatory-data";

function getCategoryColor(category: EonetEvent["category"]): string {
  switch (category) {
    case "severeStorms":
      return "#38bdf8"; // Ciano / Azul Elétrico
    case "volcanoes":
      return "#f87171"; // Vermelho / Magma
    case "wildfires":
      return "#fb923c"; // Laranja / Fogo
    case "floods":
      return "#60a5fa"; // Azul Celeste
    case "seaLakeIce":
      return "#2dd4bf"; // Turquesa Glacial
    default:
      return "#e2e8f0";
  }
}

export const NasaEonetLayer: React.FC = () => {
  const events = useObservatoryStore((s) => s.eonetEvents);
  const opacity = useObservatoryStore((s) => s.layerOpacity.NASA_EONET ?? 1.0);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);

  const markerGeometry = useMemo(() => new THREE.SphereGeometry(0.012, 12, 12), []);
  const ringGeometry = useMemo(() => new THREE.RingGeometry(0.016, 0.024, 24), []);

  // Materiais compartilhados por categoria
  const materials = useMemo(() => {
    const categories: EonetEvent["category"][] = [
      "severeStorms",
      "volcanoes",
      "wildfires",
      "floods",
      "seaLakeIce",
    ];

    const map: Record<string, { core: THREE.MeshBasicMaterial; ring: THREE.MeshBasicMaterial }> = {};

    for (const cat of categories) {
      const hex = getCategoryColor(cat);
      map[cat] = {
        core: new THREE.MeshBasicMaterial({
          color: hex,
          transparent: true,
          opacity: Math.max(0.2, opacity * 0.95),
        }),
        ring: new THREE.MeshBasicMaterial({
          color: hex,
          transparent: true,
          opacity: Math.max(0.15, opacity * 0.65),
          side: THREE.DoubleSide,
        }),
      };
    }
    return map;
  }, [opacity]);

  // Descarte estrito de geometrias e materiais na desmontagem (RN21)
  useEffect(() => {
    return () => {
      markerGeometry.dispose();
      ringGeometry.dispose();
      Object.values(materials).forEach(({ core, ring }) => {
        core.dispose();
        ring.dispose();
      });
    };
  }, [markerGeometry, ringGeometry, materials]);

  const items = useMemo(() => {
    return events.map((event) => {
      const pos = latLngToVector3(event.lat, event.lng, 1.006);
      const normal = pos.clone().normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        normal
      );
      return { event, pos, quaternion };
    });
  }, [events]);

  if (events.length === 0) return null;

  return (
    <group>
      {items.map(({ event, pos, quaternion }) => {
        const mat = materials[event.category] || materials.wildfires;
        return (
          <group
            key={event.id}
            position={pos}
            quaternion={quaternion}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEntity({ type: "EONET", data: event });
            }}
          >
            {/* Esfera central do evento */}
            <mesh geometry={markerGeometry} material={mat.core} />

            {/* Anel concêntrico plano alinhado à superfície */}
            <mesh geometry={ringGeometry} material={mat.ring} />
          </group>
        );
      })}
    </group>
  );
};
