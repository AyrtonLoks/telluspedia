"use client";

import { selectCountry } from "@/stores/actions";

import React, { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { createEarthMaterial } from "./EarthShaderMaterial";
import { vector3ToLatLng } from "@/lib/geo-spatial";
import { useGlobeStore } from "@/stores/globeStore";
import { useTimelineStore } from "@/stores/timelineStore";
import {
  NUMERIC_TO_ISO,
  NAME_TO_ISO,
  PILOT_COUNTRIES,
} from "@/lib/country-data";
import {
  resolveHistoricalEntity,
  HISTORICAL_ENTITIES,
  HISTORICAL_ERAS,
} from "@/lib/historical-entities";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { useSunDirection } from "@/lib/epoch/useSunDirection";
import { worldSunDirection } from "@/lib/earth-orientation";
import { isDragRelease } from "@/lib/pointer-intent";
import { useObservatoryStore } from "@/stores/observatoryStore";
import {
  loadHistoricalTopology,
  getHistoricalTopologySync,
  type CountryProperties,
  type CountrySpatialIndex,
  getHistoricalSpatialIndex,
  getContemporarySpatialIndex,
} from "@/lib/historical-topology";
import { resolveGeologicalEra } from "@/lib/paleo-data";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useGraphicsQualityStore } from "@/stores/graphicsQualityStore";
import { getQualityProfile } from "@/lib/webgl-quality";
import { loadGlobeTexture, textureSource } from "@/lib/textures/globeTextures";
import { createProceduralPangeaTexture } from "@/lib/textures/proceduralPangea";
import { DEFAULT_PALEO_TEXTURE, pickEarthTextureSet } from "@/lib/textures/earthTextureSet";
import { WebGLQualityController } from "./WebGLQualityController";

export { DEFAULT_PALEO_TEXTURE, pickEarthTextureSet };

export const EarthSphere: React.FC<{ studyLighting: boolean; atmosphere?: boolean }> = ({
  studyLighting,
  atmosphere = true,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { invalidate, gl } = useThree();

  const setHoveredIso = useGlobeStore((s) => s.setHoveredIso);
  const flyTo = useGlobeStore((s) => s.flyTo);

  // Época ativa (T12) e direção solar canônica compartilhada (T14)
  const epoch = useEpochState();
  const sun = useSunDirection();
  const isFirmsLayerActive = useObservatoryStore((s) => s.activeLayers.includes("NASA_FIRMS"));
  const isGeological = epoch.mode === "GEOLOGICAL";
  const effectiveGeologicalMa = epoch.geologicalMa;
  const effectiveYear = epoch.effectiveYear;
  const era = HISTORICAL_ERAS[epoch.historicalEraId];

  const qualityPreset = useGraphicsQualityStore((s) => s.preset);
  const qualityProfile = getQualityProfile(qualityPreset);

  // Texturas NASA (domínio público — docs/DATA_SOURCES.md): 4096 px quando a GPU e o preset
  // permitem, 2048 px no preset Baixo/Médio ou como fallback; superfície é dado linear, não cor.
  const textureSet = useMemo(
    () => pickEarthTextureSet(gl.capabilities.maxTextureSize, qualityProfile.textureTier),
    [gl, qualityProfile.textureTier]
  );

  // Procedural Pangea texture initialized immediately as base fallback
  const proceduralPaleoTexture = useMemo(() => {
    return createProceduralPangeaTexture();
  }, []);

  // Initialize shader material (uSunDirection synced from canonical useSunDirection below).
  // As texturas entram de forma assíncrona (KTX2 ou JPG/PNG); até lá valem os placeholders 1×1.
  const earthMaterial = useMemo(() => {
    return createEarthMaterial(null, null, proceduralPaleoTexture, null);
  }, [proceduralPaleoTexture]);

  const activeTexturesRef = useRef<Partial<Record<"uDayTexture" | "uNightTexture" | "uSurfaceTexture", THREE.Texture>>>({});

  // Textura de superfície (normal/especular) é sempre 2K e carrega uma única vez por contexto.
  useEffect(() => {
    let alive = true;
    const surfaceSource = textureSource("/textures/earth_surface_2k.png");
    loadGlobeTexture(gl, surfaceSource, "data")
      .then((texture) => {
        if (!alive) {
          texture.dispose();
          return;
        }
        const previous = activeTexturesRef.current.uSurfaceTexture;
        activeTexturesRef.current.uSurfaceTexture = texture;
        earthMaterial.uniforms.uSurfaceTexture.value = texture;
        const { width, height } = texture.image as { width: number; height: number };
        earthMaterial.uniforms.uSurfaceTexel.value.set(1 / width, 1 / height);
        if (previous && previous !== texture) {
          previous.dispose();
        }
        invalidate();
      })
      .catch((error) => console.error(`[globo] falha ao carregar ${surfaceSource.fallback}`, error));
    return () => {
      alive = false;
    };
  }, [gl, earthMaterial, invalidate]);

  // Texturas dia/noite (2K ou 4K conforme GPU e preset de qualidade T39).
  useEffect(() => {
    let alive = true;
    const jobs = [
      ["uDayTexture", textureSet.day, "color"],
      ["uNightTexture", textureSet.night, "color"],
    ] as const;
    for (const [uniform, source, kind] of jobs) {
      loadGlobeTexture(gl, source, kind)
        .then((texture) => {
          if (!alive) {
            texture.dispose();
            return;
          }
          const previous = activeTexturesRef.current[uniform];
          activeTexturesRef.current[uniform] = texture;
          earthMaterial.uniforms[uniform].value = texture;
          // Só descarta a textura anterior depois que a substituta já está ligada ao shader (sem flash preto)
          if (previous && previous !== texture) {
            previous.dispose();
          }
          invalidate();
        })
        .catch((error) => console.error(`[globo] falha ao carregar ${source.fallback}`, error));
    }
    return () => {
      alive = false;
    };
  }, [gl, earthMaterial, textureSet, invalidate]);

  // Descarte garantido de todas as texturas ativas da Terra ao desmontar (RN21)
  useEffect(() => {
    const activeRef = activeTexturesRef;
    return () => {
      for (const key of Object.keys(activeRef.current) as Array<
        "uDayTexture" | "uNightTexture" | "uSurfaceTexture"
      >) {
        activeRef.current[key]?.dispose();
        delete activeRef.current[key];
      }
    };
  }, [earthMaterial]);

  useEffect(() => {
    earthMaterial.uniforms.uAtmosphereShell.value = atmosphere ? 1 : 0;
    invalidate();
  }, [earthMaterial, atmosphere, invalidate]);

  useEffect(() => {
    earthMaterial.uniforms.uStudyLighting.value = studyLighting ? 1 : 0;
    invalidate();
  }, [earthMaterial, studyLighting, invalidate]);

  // Ref to track loaded raster paleogeographic texture for proper WebGL GPU disposal
  const loadedPaleoTextureRef = useRef<THREE.Texture | null>(null);

  // Load raster paleogeographic texture from public directory if available
  useEffect(() => {
    let isMounted = true;
    const paleoEra = effectiveGeologicalMa ? resolveGeologicalEra(effectiveGeologicalMa) : null;
    const texturePath = paleoEra?.textureUrl || DEFAULT_PALEO_TEXTURE;

    // Paleomapas PALEOMAP (CC BY 4.0): RGB = cor, A = água (reflexo do Sol no shader).
    loadGlobeTexture(gl, textureSource(texturePath), "color").then(
      (tex) => {
        if (!isMounted) {
          tex.dispose();
          return;
        }
        // Dispose previously loaded raster texture to prevent VRAM accumulation
        if (
          loadedPaleoTextureRef.current &&
          loadedPaleoTextureRef.current !== proceduralPaleoTexture
        ) {
          loadedPaleoTextureRef.current.dispose();
        }
        loadedPaleoTextureRef.current = tex;
        earthMaterial.uniforms.uPaleoTexture.value = tex;
        earthMaterial.needsUpdate = true;
        invalidate();
      },
      () => {
        // A textura procedural continua como fallback
      }
    );

    return () => {
      isMounted = false;
    };
  }, [gl, earthMaterial, effectiveGeologicalMa, proceduralPaleoTexture, invalidate]);

  // Dispose earth material and procedural texture on unmount
  useEffect(() => {
    return () => {
      earthMaterial.dispose();
      proceduralPaleoTexture.dispose();
      if (
        loadedPaleoTextureRef.current &&
        loadedPaleoTextureRef.current !== proceduralPaleoTexture
      ) {
        loadedPaleoTextureRef.current.dispose();
      }
    };
  }, [earthMaterial, proceduralPaleoTexture]);

  // Dynamic spatial index (<0.2ms) switching seamlessly between contemporary and historical eras
  const [historicalSpatialIndex, setHistoricalSpatialIndex] = useState<CountrySpatialIndex | null>(() => {
    if (era.id !== "CONTEMPORARY" && era.topoJsonPath) {
      const cached = getHistoricalTopologySync(era.topoJsonPath);
      return cached ? getHistoricalSpatialIndex(era.id, cached) : null;
    }
    return null;
  });

  useEffect(() => {
    if (era.id === "CONTEMPORARY" || !era.topoJsonPath) {
      setHistoricalSpatialIndex(null);
      return;
    }

    const syncTopo = getHistoricalTopologySync(era.topoJsonPath);
    if (syncTopo) {
      const idx = getHistoricalSpatialIndex(era.id, syncTopo);
      setHistoricalSpatialIndex(() => idx);
      return;
    }

    let isMounted = true;
    loadHistoricalTopology(era.topoJsonPath).then((topo) => {
      if (!isMounted || !topo) return;
      const index = getHistoricalSpatialIndex(era.id, topo);
      setHistoricalSpatialIndex(() => index);
    });

    return () => {
      isMounted = false;
    };
  }, [era.id, era.topoJsonPath]);

  const activeSpatialIndex = useMemo(() => {
    if (era.id !== "CONTEMPORARY") {
      if (historicalSpatialIndex) return historicalSpatialIndex;
      if (era.topoJsonPath) {
        const syncTopo = getHistoricalTopologySync(era.topoJsonPath);
        if (syncTopo) {
          const idx = getHistoricalSpatialIndex(era.id, syncTopo);
          if (idx) return idx;
        }
      }
    }
    return getContemporarySpatialIndex();
  }, [era.id, era.topoJsonPath, historicalSpatialIndex]);

  // Continuity transition: when timeline moves across eras, smoothly resolve selected modern country to historical entity
  useEffect(() => {
    const currentIso = useGlobeStore.getState().selectedIso;
    if (!currentIso) return;

    const resolved = resolveHistoricalEntity(currentIso, effectiveYear);
    if (resolved && resolved !== currentIso) {
      selectCountry(resolved);
    }
  }, [effectiveYear]);

  // Update shader animation frame & smooth 60 FPS lerp for paleogeographic cross-fade
  useFrame((_, delta) => {
    earthMaterial.uniforms.uTime.value += delta;

    // Com a camada de queimadas ligada, as luzes urbanas são atenuadas para não serem
    // confundidas com focos de calor (D05).
    const targetCityLights = isFirmsLayerActive ? 0.3 : 1.0;
    const currentCityLights = earthMaterial.uniforms.uCityLights.value;
    if (Math.abs(currentCityLights - targetCityLights) > 0.001) {
      earthMaterial.uniforms.uCityLights.value = THREE.MathUtils.lerp(
        currentCityLights,
        targetCityLights,
        Math.min(delta * 3.5, 1.0)
      );
      invalidate();
    }

    const targetPaleoFactor = isGeological ? 1.0 : 0.0;
    const currentPaleoFactor = earthMaterial.uniforms.uPaleoFactor.value;

    if (Math.abs(currentPaleoFactor - targetPaleoFactor) > 0.001) {
      earthMaterial.uniforms.uPaleoFactor.value = THREE.MathUtils.lerp(
        currentPaleoFactor,
        targetPaleoFactor,
        Math.min(delta * 3.5, 1.0)
      );
      invalidate();
    } else if (currentPaleoFactor !== targetPaleoFactor) {
      earthMaterial.uniforms.uPaleoFactor.value = targetPaleoFactor;
      invalidate();
    }
  });

  // Astronomical Sun Synchronization (RN10, T14 — single source of truth via useSunDirection)
  useEffect(() => {
    worldSunDirection(sun.direction, earthMaterial.uniforms.uSunDirection.value);
    invalidate();
  }, [earthMaterial, sun.direction, sun.timestamp, invalidate]);
  // No Cosmos o globo gira para a eclíptica (D21): a direção do Sol acompanha a rotação a cada quadro.
  useFrame(() => {
    worldSunDirection(sun.direction, earthMaterial.uniforms.uSunDirection.value);
  });

  // Helper to resolve ISO / canonical historical entity from picked TopoJSON feature
  const resolveIsoFromFeature = (feature: CountryProperties | null): string | null => {
    if (!feature) return null;
    const rawId = feature.id ?? feature.iso;
    const numId =
      rawId !== undefined && rawId !== null ? String(rawId).padStart(3, "0") : "";
    const name = feature.name;

    const matchedIso =
      (rawId && HISTORICAL_ENTITIES[String(rawId)] ? String(rawId) : undefined) ||
      NUMERIC_TO_ISO[numId] ||
      (name && NAME_TO_ISO[name]) ||
      (rawId != null ? String(rawId) : null);

    if (!matchedIso) return null;

    return resolveHistoricalEntity(matchedIso, effectiveYear) || matchedIso;
  };

  // Handle Raycasting Pointer Movement (<0.2ms in-memory lookup)
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (useCosmicStore.getState().isCosmicMode) {
      useCosmicStore.getState().setHoveredBody("EARTH");
      setHoveredIso(null);
      return;
    }
    if (isGeological) {
      setHoveredIso(null);
      return;
    }
    if (!e.point || !activeSpatialIndex) return;

    const { lat, lng } = vector3ToLatLng(e.object.worldToLocal(e.point.clone()));
    const feature = activeSpatialIndex([lng, lat]);
    const iso = resolveIsoFromFeature(feature);

    setHoveredIso(iso);
  };

  const handlePointerOut = () => {
    if (useCosmicStore.getState().isCosmicMode) {
      useCosmicStore.getState().setHoveredBody(null);
    }
    setHoveredIso(null);
  };

  // Handle Click & FlyTo
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // Soltar o botão depois de girar o globo não é clique: não seleciona nem desmarca nada (D24).
    if (isDragRelease(e)) return;
    // In Cosmic Mode, clicking Earth selects Earth as a celestial body
    if (useCosmicStore.getState().isCosmicMode) {
      useCosmicStore.getState().focusBody("EARTH");
      return;
    }

    // In Normal Mode, if Moon was focused, clicking Earth restores focus to Earth
    if (useCosmicStore.getState().focusedBodyId === "MOON") {
      useCosmicStore.getState().focusBody(null);
    }

    if (isGeological) {
      selectCountry(null);
      setHoveredIso(null);
      return;
    }
    if (!e.point || !activeSpatialIndex) return;

    const { lat, lng } = vector3ToLatLng(e.object.worldToLocal(e.point.clone()));
    const feature = activeSpatialIndex([lng, lat]);
    const iso = resolveIsoFromFeature(feature);

    if (iso) {
      selectCountry(iso);
      useTimelineStore.getState().selectMilestone(null);

      const pilot = PILOT_COUNTRIES[iso];
      const hist = HISTORICAL_ENTITIES[iso];

      if (pilot) {
        flyTo(pilot.latitude, pilot.longitude, 2.0);
      } else if (hist) {
        flyTo(hist.latitude, hist.longitude, 2.0);
      } else {
        flyTo(lat, lng, 2.0);
      }
    } else {
      selectCountry(null);
      setHoveredIso(null);
      useTimelineStore.getState().selectMilestone(null);
    }
  };

  return (
    <>
      <WebGLQualityController />
      <mesh
        ref={meshRef}
        material={earthMaterial}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry
          args={[1.0, qualityProfile.earthSegments[0], qualityProfile.earthSegments[1]]}
        />
      </mesh>
    </>
  );
};
