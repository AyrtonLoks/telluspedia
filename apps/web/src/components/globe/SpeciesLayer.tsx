"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { speciesCacheKey, useSpeciesStore } from "@/stores/speciesStore";
import {
  IUCN_STATUS_META,
  filterSpeciesCatalog,
  getSpeciesById,
} from "@/lib/species-catalog";
import { isDragRelease } from "@/lib/pointer-intent";

const MARKER_RADIUS = 1.0125;
const OCCURRENCE_RADIUS = 1.0098;
const RANGE_RING_RADIUS = 1.0055;
const DEG2RAD = Math.PI / 180;

/** Projeção esférica paramétrica não-espelhada (AGENTS.md §1). */
function latLngToVec(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lng + 180) * DEG2RAD;
  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(
    -(radius * sinPhi * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * sinPhi * Math.sin(theta)
  );
}

/** Constrói anel geodésico aproximado (em 48 segmentos) ao redor da zona focal da espécie. */
function buildRangeRingGeometry(
  centerLat: number,
  centerLng: number,
  radiusDeg: number
): THREE.BufferGeometry {
  const segments = 48;
  const positions = new Float32Array((segments + 1) * 3);
  const cosLat = Math.max(0.25, Math.cos(centerLat * DEG2RAD));
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const lat = Math.max(-85, Math.min(85, centerLat + Math.sin(angle) * radiusDeg));
    const lng = centerLng + (Math.cos(angle) * radiusDeg) / cosLat;
    const v = latLngToVec(lat, lng, RANGE_RING_RADIUS);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geom;
}

const GBIF_VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  void main() {
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * (2.6 / max(0.8, -mvPos.z)), 3.5, 13.0);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const GBIF_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uPulse;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float halo = smoothstep(0.5, 0.1, dist);
    float core = smoothstep(0.22, 0.0, dist);
    vec3 col = mix(uColor, vec3(1.0), core * 0.65);
    float alpha = halo * uOpacity * (0.78 + 0.22 * uPulse);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * Camada 3D do Mapa de Espécies Animais & Biodiversidade (D32 / RN13.7):
 * - Marcadores clicáveis coloridos por categoria oficial IUCN Red List (CR/EN/VU/NT/LC).
 * - Nuvem de ocorrências reais georreferenciadas da GBIF API v1 para a espécie selecionada.
 * - Anel focal de distribuição + pausa no modo leitura (RN22) e `dispose()` rigoroso (RN21).
 */
export const SpeciesLayer: React.FC = () => {
  const { invalidate } = useThree();
  const isThrottled = useGlobeStore((s) => s.isThrottled);
  const flyTo = useGlobeStore((s) => s.flyTo);
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const opacity = useObservatoryStore((s) => s.layerOpacity.SPECIES_MAP ?? 0.95);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);

  const taxonFilter = useSpeciesStore((s) => s.taxonFilter);
  const iucnFilter = useSpeciesStore((s) => s.iucnFilter);
  const biomeFilter = useSpeciesStore((s) => s.biomeFilter);
  const countryFilter = useSpeciesStore((s) => s.countryFilter);
  const selectedSpeciesId = useSpeciesStore((s) => s.selectedSpeciesId);
  const hoveredSpeciesId = useSpeciesStore((s) => s.hoveredSpeciesId);
  const occurrencesByKey = useSpeciesStore((s) => s.occurrencesByKey);
  const selectSpecies = useSpeciesStore((s) => s.selectSpecies);
  const setHoveredSpeciesId = useSpeciesStore((s) => s.setHoveredSpeciesId);

  const visibleSpecies = useMemo(
    () =>
      filterSpeciesCatalog({
        taxonGroup: taxonFilter,
        iucnStatus: iucnFilter,
        biomeId: biomeFilter,
        countryIso3: countryFilter,
      }),
    [taxonFilter, iucnFilter, biomeFilter, countryFilter]
  );

  const selectedSpecies = useMemo(
    () => getSpeciesById(selectedSpeciesId),
    [selectedSpeciesId]
  );

  const selectedOccurrences = useMemo(() => {
    if (!selectedSpeciesId) return null;
    return occurrencesByKey[speciesCacheKey(selectedSpeciesId)] ?? null;
  }, [selectedSpeciesId, occurrencesByKey]);

  const markerGeometry = useMemo(() => new THREE.SphereGeometry(0.014, 14, 10), []);
  const markerRingGeometry = useMemo(() => new THREE.RingGeometry(0.018, 0.024, 24), []);

  const rangeRingGeometry = useMemo(() => {
    if (!selectedSpecies) return null;
    return buildRangeRingGeometry(
      selectedSpecies.centerLat,
      selectedSpecies.centerLng,
      selectedSpecies.rangeRadiusDeg
    );
  }, [selectedSpecies]);

  const rangeRingMaterial = useMemo(() => {
    const color = selectedSpecies
      ? IUCN_STATUS_META[selectedSpecies.iucnStatus].hex
      : "#38bdf8";
    return new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: opacity * 0.65,
      depthWrite: false,
    });
    // Opacidade sincronizada no efeito abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpecies]);

  const occurrencesGeometry = useMemo(() => {
    const pts = selectedOccurrences?.points ?? [];
    if (pts.length === 0) return null;
    const positions = new Float32Array(pts.length * 3);
    const sizes = new Float32Array(pts.length);
    for (let i = 0; i < pts.length; i++) {
      const v = latLngToVec(pts[i].lat, pts[i].lng, OCCURRENCE_RADIUS);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
      sizes[i] = 5.5;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    return geom;
  }, [selectedOccurrences]);

  const occurrencesMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: GBIF_VERTEX_SHADER,
        fragmentShader: GBIF_FRAGMENT_SHADER,
        uniforms: {
          uColor: { value: new THREE.Color("#38bdf8") },
          uOpacity: { value: opacity },
          uPulse: { value: 1.0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Descarte rigoroso WebGL (RN21)
  useEffect(() => () => { markerGeometry.dispose(); }, [markerGeometry]);
  useEffect(() => () => { markerRingGeometry.dispose(); }, [markerRingGeometry]);
  useEffect(() => () => { rangeRingGeometry?.dispose(); }, [rangeRingGeometry]);
  useEffect(() => () => { rangeRingMaterial.dispose(); }, [rangeRingMaterial]);
  useEffect(() => () => { occurrencesGeometry?.dispose(); }, [occurrencesGeometry]);
  useEffect(() => () => { occurrencesMaterial.dispose(); }, [occurrencesMaterial]);

  useEffect(() => {
    const hex = selectedSpecies
      ? IUCN_STATUS_META[selectedSpecies.iucnStatus].hex
      : "#38bdf8";
    occurrencesMaterial.uniforms.uColor.value.set(hex);
    occurrencesMaterial.uniforms.uOpacity.value = opacity;
    rangeRingMaterial.opacity = opacity * 0.65;
    invalidate();
  }, [selectedSpecies, opacity, occurrencesMaterial, rangeRingMaterial, invalidate]);

  const pulseClock = useRef(0);
  useFrame((_, delta) => {
    if (isThrottled || !occurrencesGeometry) return;
    pulseClock.current += Math.min(delta, 0.05);
    occurrencesMaterial.uniforms.uPulse.value =
      0.5 + 0.5 * Math.sin(pulseClock.current * 2.5);
  });

  if (isCosmicMode) return null;

  return (
    <group name="species-biodiversity-layer">
      {/* Marcadores das espécies filtradas no globo */}
      {visibleSpecies.map((sp) => {
        const pos = latLngToVec(sp.centerLat, sp.centerLng, MARKER_RADIUS);
        const normal = pos.clone().normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          normal
        );
        const color = IUCN_STATUS_META[sp.iucnStatus].hex;
        const isSelected = sp.id === selectedSpeciesId;
        const isHovered = sp.id === hoveredSpeciesId;
        const scale = isSelected ? 1.55 : isHovered ? 1.3 : 1.0;

        const handleClick = (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (isDragRelease(e)) return;
          setSelectedEntity(null);
          selectSpecies(sp.id);
          flyTo(sp.centerLat, sp.centerLng, 2.05);
        };

        return (
          <group key={sp.id} position={pos} quaternion={quat} scale={scale}>
            <mesh
              geometry={markerGeometry}
              onClick={handleClick}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredSpeciesId(sp.id);
              }}
              onPointerOut={() => {
                if (useSpeciesStore.getState().hoveredSpeciesId === sp.id) {
                  setHoveredSpeciesId(null);
                }
              }}
              renderOrder={8}
            >
              <meshBasicMaterial
                color={color}
                transparent
                opacity={opacity}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            {(isSelected || isHovered) && (
              <mesh geometry={markerRingGeometry} renderOrder={8}>
                <meshBasicMaterial
                  color="#f8fafc"
                  side={THREE.DoubleSide}
                  transparent
                  opacity={opacity * 0.9}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Anel focal de distribuição da espécie selecionada */}
      {rangeRingGeometry && (
        <lineLoop
          geometry={rangeRingGeometry}
          material={rangeRingMaterial}
          frustumCulled={false}
          renderOrder={5}
        />
      )}

      {/* Ocorrências reais georreferenciadas da GBIF API v1 */}
      {occurrencesGeometry && (
        <points
          geometry={occurrencesGeometry}
          material={occurrencesMaterial}
          frustumCulled={false}
          renderOrder={7}
        />
      )}
    </group>
  );
};
