"use client";

import React, { useMemo, useEffect } from "react";
import * as THREE from "three";
import { latLngToVector3, slerpVectors } from "@/lib/geo-spatial";
import { useObservatoryStore } from "@/stores/observatoryStore";

const MARITIME_RADIUS = 1.003; // Rente à superfície oceânica

export const MaritimeRoutesLayer: React.FC = () => {
  const routes = useObservatoryStore((s) => s.maritimeRoutes);
  const opacity = useObservatoryStore((s) => s.layerOpacity.MARITIME_ROUTES ?? 1.0);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);

  // Geometrias memoizadas exclusivamente pelas rotas e coordenadas geodésicas
  const routeData = useMemo(() => {
    return routes
      .filter((r) => r.coordinates.length >= 2)
      .map((route) => {
        const coords = route.coordinates;
        const points: THREE.Vector3[] = [];

        for (let i = 0; i < coords.length - 1; i++) {
          const [lat1, lng1] = coords[i];
          const [lat2, lng2] = coords[i + 1];

          const startVec = latLngToVector3(lat1, lng1, MARITIME_RADIUS);
          const endVec = latLngToVector3(lat2, lng2, MARITIME_RADIUS);

          // Interpolação geodésica estrita (slerp) para manter altitude constante sobre a esfera
          const steps = 16;
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            points.push(slerpVectors(startVec, endVec, t));
          }
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return { route, geometry };
      });
  }, [routes]);

  // Materiais compartilhados (apenas 2 instâncias para toda a frota mercante)
  const materials = useMemo(() => {
    return {
      choke: new THREE.LineBasicMaterial({
        color: "#34d399", // Esmeralda para estreitos críticos
        transparent: true,
        opacity: Math.max(0.2, opacity * 0.85),
        linewidth: 2.0,
      }),
      regular: new THREE.LineBasicMaterial({
        color: "#38bdf8", // Ciano para corredores
        transparent: true,
        opacity: Math.max(0.2, opacity * 0.6),
        linewidth: 1.2,
      }),
    };
  }, [opacity]);

  // Descarte estrito de memória GPU (RN21)
  useEffect(() => {
    return () => {
      routeData.forEach((d) => d.geometry.dispose());
    };
  }, [routeData]);

  useEffect(() => {
    return () => {
      materials.choke.dispose();
      materials.regular.dispose();
    };
  }, [materials]);

  const routeObjects = useMemo(() => {
    return routeData.map(({ route, geometry }) => {
      const mat = route.chokePoint ? materials.choke : materials.regular;
      const line = new THREE.Line(geometry, mat);
      return { route, line };
    });
  }, [routeData, materials]);

  if (routeObjects.length === 0) return null;

  return (
    <group>
      {routeObjects.map(({ route, line }, idx) => (
        <primitive
          key={route.id || idx}
          object={line}
          onClick={(e: any) => {
            e.stopPropagation();
            setSelectedEntity({ type: "MARITIME", data: route });
          }}
        />
      ))}
    </group>
  );
};
