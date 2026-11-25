"use client";

import React, { Suspense, lazy, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Globe, TriangleAlert } from "lucide-react";
import { pickBiomeAt } from "@/lib/biomes-data";
import { getCountryData } from "@/lib/country-data";
import { HISTORICAL_ENTITIES } from "@/lib/historical-entities";
import { formatCountryName } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/useT";
import { render2dMapFrame } from "@/lib/map-2d-renderer";
import {
  pickObservatory2dHit,
  type Observatory2dHitTarget,
} from "@/lib/map-2d-observatory";
import {
  clamp2dZoom,
  createMapProjection,
  MAX_2D_ZOOM,
  MIN_2D_ZOOM,
  pickCountryAt2dPoint,
  type MapProjectionId,
} from "@/lib/map-projections";
import { selectCountry } from "@/stores/actions";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useSpeciesStore } from "@/stores/speciesStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { ProjectionSelectorHud } from "./ProjectionSelectorHud";
import { useFlatMapData } from "./useFlatMapData";
import { useFlatMapObservatory } from "./useFlatMapObservatory";

const ObservatoryTelemetryHUD = lazy(() =>
  import("@/components/observatory/ObservatoryTelemetryHUD").then((m) => ({
    default: m.ObservatoryTelemetryHUD,
  }))
);
const BiomeHudOverlay = lazy(() =>
  import("@/components/observatory/BiomeHudOverlay").then((m) => ({ default: m.BiomeHudOverlay }))
);
const SpeciesHudOverlay = lazy(() =>
  import("@/components/observatory/SpeciesHudOverlay").then((m) => ({
    default: m.SpeciesHudOverlay,
  }))
);

const DRAG_THRESHOLD_PX = 5;

export const FlatMapCanvas: React.FC = () => {
  const { locale, t } = useI18n();
  const instructionsId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [size, setSize] = useState<{ width: number; height: number }>({ width: 1280, height: 760 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGraticule, setShowGraticule] = useState(true);
  const [azimuthalFollowSelected, setAzimuthalFollowSelected] = useState(true);
  const [hoverPointer, setHoverPointer] = useState<{
    x: number;
    y: number;
    iso: string;
    lat: number;
    lng: number;
  } | null>(null);

  const dragRef = useRef({
    active: false,
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    originPanX: 0,
    originPanY: 0,
    moved: false,
  });

  const projectionId = useGlobeStore((s) => s.projectionId);
  const setProjectionId = useGlobeStore((s) => s.setProjectionId);
  const setViewMode = useGlobeStore((s) => s.setViewMode);
  const setHoveredIso = useGlobeStore((s) => s.setHoveredIso);

  const data = useFlatMapData(projectionId, zoom, azimuthalFollowSelected, locale);
  const isContemporary2d = !data.isHistorical && !data.isGeological;
  const observatory = useFlatMapObservatory(isContemporary2d);
  const hitTargetsRef = useRef<Observatory2dHitTarget[]>([]);
  const isSpeciesActive = observatory.activeLayers.includes("SPECIES_MAP");

  // Dimensões responsivas do container 2D
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
      }
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const projection = useMemo(
    () =>
      createMapProjection(projectionId, size.width, size.height, {
        zoom,
        panX: pan.x,
        panY: pan.y,
        center: data.azimuthalCenter ?? undefined,
      }),
    [projectionId, size.width, size.height, zoom, pan.x, pan.y, data.azimuthalCenter]
  );

  // Renderização no <canvas> high-DPI
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const targetW = Math.round(size.width * dpr);
    const targetH = Math.round(size.height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    hitTargetsRef.current = render2dMapFrame({
      ctx,
      width: size.width,
      height: size.height,
      projection,
      projectionId,
      topology: data.activeTopology,
      isHistorical: data.isHistorical,
      effectiveYear: data.effectiveYear,
      showGraticule,
      zoom,
      selectedIsos: data.selectedSet,
      hoveredIsos: data.hoveredSet,
      relatedIsos: data.relatedSet,
      choroplethDataset: data.choroplethDataset,
      choroplethOpacity: data.choroplethOpacity,
      biomes: data.biomesRenderData,
      observatory: isContemporary2d ? observatory : null,
      criticalGeo: data.criticalGeoRenderData,
      azimuthalCenter: data.azimuthalCenter,
    });
  }, [size, projection, projectionId, data, observatory, isContemporary2d, showGraticule, zoom]);

  const handleSelectProjection = useCallback(
    (nextId: MapProjectionId) => {
      setProjectionId(nextId);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    },
    [setProjectionId]
  );

  const handleZoomBy = useCallback(
    (factor: number, anchorX?: number, anchorY?: number) => {
      setZoom((prevZoom) => {
        const nextZoom = clamp2dZoom(Number((prevZoom * factor).toFixed(3)));
        if (nextZoom === prevZoom) return prevZoom;
        if (nextZoom <= 1.001) {
          setPan({ x: 0, y: 0 });
          return 1;
        }
        const ratio = nextZoom / prevZoom;
        const cx = size.width / 2;
        const cy = size.height / 2;
        const ax = anchorX ?? cx;
        const ay = anchorY ?? cy;
        setPan((prevPan) => ({
          x: (prevPan.x - (ax - cx)) * ratio + (ax - cx),
          y: (prevPan.y - (ay - cy)) * ratio + (ay - cy),
        }));
        return nextZoom;
      });
    },
    [size.width, size.height]
  );

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const getLocalCoords = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originPanX: pan.x,
      originPanY: pan.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (drag.active) {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) drag.moved = true;
      if (drag.moved) {
        setPan({ x: drag.originPanX + dx, y: drag.originPanY + dy });
        setHoverPointer(null);
        return;
      }
    }

    if (data.isGeological) {
      setHoveredIso(null);
      setHoverPointer(null);
      return;
    }

    const pos = getLocalCoords(event.clientX, event.clientY);
    if (!pos) return;
    if (isSpeciesActive) {
      const hit = pickObservatory2dHit(hitTargetsRef.current, pos.x, pos.y);
      const nextHoveredSpecies = hit?.kind === "SPECIES" ? hit.speciesId : null;
      const spStore = useSpeciesStore.getState();
      if (spStore.hoveredSpeciesId !== nextHoveredSpecies) {
        spStore.setHoveredSpeciesId(nextHoveredSpecies);
      }
    }
    const picked = pickCountryAt2dPoint(
      projection,
      projectionId,
      pos.x,
      pos.y,
      data.activeSpatialIndex,
      data.effectiveYear
    );

    if (data.biomesRenderData) {
      const obs = useObservatoryStore.getState();
      const hitBiome = picked
        ? pickBiomeAt(
            data.biomesRenderData.scope,
            picked.lat,
            picked.lng,
            data.biomesRenderData.topology
          )
        : null;
      if (hitBiome !== obs.hoveredBiomeId) obs.setHoveredBiomeId(hitBiome);
    }

    const iso = picked?.iso ?? null;
    setHoveredIso(iso);
    setHoverPointer(iso && picked ? { x: pos.x, y: pos.y, iso, lat: picked.lat, lng: picked.lng } : null);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    const wasMoved = drag.moved;
    drag.active = false;
    drag.moved = false;
    if (drag.pointerId !== null) {
      try {
        event.currentTarget.releasePointerCapture?.(drag.pointerId);
      } catch {
        // Ignora se a captura já foi liberada
      }
      drag.pointerId = null;
    }

    if (wasMoved || event.button !== 0 || data.isGeological) return;
    const pos = getLocalCoords(event.clientX, event.clientY);
    if (!pos) return;
    const picked = pickCountryAt2dPoint(
      projection,
      projectionId,
      pos.x,
      pos.y,
      data.activeSpatialIndex,
      data.effectiveYear
    );

    if (isContemporary2d && picked) {
      const obs = useObservatoryStore.getState();
      if (obs.marineDebrisPickMode && obs.activeLayers.includes("MARINE_DEBRIS")) {
        obs.setMarineDebrisReleasePoint({
          lat: Number(picked.lat.toFixed(2)),
          lng: Number(picked.lng.toFixed(2)),
        });
        return;
      }
    }

    if (isContemporary2d) {
      const hit = pickObservatory2dHit(hitTargetsRef.current, pos.x, pos.y);
      if (hit) {
        const obs = useObservatoryStore.getState();
        if (hit.kind === "SPECIES") {
          useSpeciesStore.getState().selectSpecies(hit.speciesId);
          obs.setSelectedEntity(null);
          return;
        }
        if (hit.kind === "GYRE") {
          obs.setSelectedGyreId(hit.gyreId);
          return;
        }
        obs.setSelectedEntity(hit.entity);
        return;
      }
    }

    if (data.biomesRenderData && picked) {
      const obs = useObservatoryStore.getState();
      const hitBiome = pickBiomeAt(
        data.biomesRenderData.scope,
        picked.lat,
        picked.lng,
        data.biomesRenderData.topology
      );
      if (obs.biomePickMode) {
        obs.setSelectedBiomeId(hitBiome);
        if (hitBiome) {
          obs.setSelectedEntity(null);
          return;
        }
      } else if (hitBiome) {
        obs.setSelectedBiomeId(hitBiome);
      }
    }

    if (picked?.iso) {
      selectCountry(picked.iso);
      useTimelineStore.getState().selectMilestone(null);
    } else {
      selectCountry(null);
      setHoveredIso(null);
      useTimelineStore.getState().selectMilestone(null);
      useObservatoryStore.getState().setSelectedEntity(null);
    }
  };

  const handlePointerLeave = () => {
    dragRef.current.active = false;
    dragRef.current.moved = false;
    setHoveredIso(null);
    setHoverPointer(null);
    const obs = useObservatoryStore.getState();
    if (obs.hoveredBiomeId !== null) obs.setHoveredBiomeId(null);
    const sp = useSpeciesStore.getState();
    if (sp.hoveredSpeciesId !== null) sp.setHoveredSpeciesId(null);
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    const pos = getLocalCoords(event.clientX, event.clientY);
    handleZoomBy(event.deltaY < 0 ? 1.2 : 1 / 1.2, pos?.x, pos?.y);
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getLocalCoords(event.clientX, event.clientY);
    handleZoomBy(1.6, pos?.x, pos?.y);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      handleZoomBy(1.3);
    } else if (event.key === "-") {
      event.preventDefault();
      handleZoomBy(1 / 1.3);
    } else if (event.key === "0") {
      event.preventDefault();
      handleResetView();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPan((p) => ({ ...p, x: p.x + 60 }));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setPan((p) => ({ ...p, x: p.x - 60 }));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setPan((p) => ({ ...p, y: p.y + 60 }));
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setPan((p) => ({ ...p, y: p.y - 60 }));
    }
  };

  const hoveredLabel = useMemo(() => {
    if (!hoverPointer) return null;
    const hist = HISTORICAL_ENTITIES[hoverPointer.iso];
    if (hist) return hist.nameCommon;
    const country = getCountryData(hoverPointer.iso);
    return country ? formatCountryName(country.iso2, country.nameCommon, locale) : hoverPointer.iso;
  }, [hoverPointer, locale]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={t("map2d.regionAria", "Mapa cartográfico 2D interativo")}
      aria-describedby={instructionsId}
      data-testid="flat-map-viewport"
      data-projection={projectionId}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="absolute inset-0 z-10 h-full w-full overflow-hidden bg-bg focus-visible:outline-none focus-visible:after:pointer-events-none focus-visible:after:absolute focus-visible:after:inset-1 focus-visible:after:z-10 focus-visible:after:rounded-control focus-visible:after:border-2 focus-visible:after:border-accent"
    >
      <p id={instructionsId} className="sr-only">
        {t(
          "map2d.instructions",
          "Arraste para mover o mapa 2D, use a roda do mouse ou mais e menos para zoom, zero para enquadrar e clique em qualquer país para inspecionar."
        )}
      </p>

      <canvas
        ref={canvasRef}
        data-testid="flat-map-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        className="block h-full w-full cursor-grab active:cursor-grabbing"
      />

      <ProjectionSelectorHud
        projectionId={projectionId}
        onSelectProjection={handleSelectProjection}
        showGraticule={showGraticule}
        onToggleGraticule={() => setShowGraticule((v) => !v)}
        zoom={zoom}
        onZoomIn={() => handleZoomBy(1.35)}
        onZoomOut={() => handleZoomBy(1 / 1.35)}
        onResetView={handleResetView}
        selectedCountryLabel={data.selectedCenter?.label ?? null}
        azimuthalFollowSelected={azimuthalFollowSelected}
        onToggleAzimuthalCenter={() => setAzimuthalFollowSelected((v) => !v)}
      />

      {data.isGeological && (
        <div className="pointer-events-none fixed bottom-[calc(var(--map-overlay-bottom)+0.75rem)] left-1/2 z-20 -translate-x-1/2">
          <Panel
            data-testid="map-2d-geological-notice"
            className="pointer-events-auto flex items-center gap-3 border-warning/40 px-3.5 py-2 shadow-e2"
          >
            <TriangleAlert aria-hidden="true" className="h-4 w-4 shrink-0 text-warning" />
            <span className="text-caption text-fg-secondary">
              {t("map2d.geoNotice", "A deriva continental paleogeográfica é exibida no Globo 3D.")}
            </span>
            <Button size="sm" variant="secondary" onClick={() => setViewMode("3d")}>
              <Globe aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{t("map2d.switchTo3d", "Ver em 3D")}</span>
            </Button>
          </Panel>
        </div>
      )}

      {hoverPointer && hoveredLabel && !data.activeChoropleth && !data.isGeological && (
        <div
          aria-hidden="true"
          data-testid="map-2d-hover-tooltip"
          style={{
            left: Math.min(size.width - 210, Math.max(12, hoverPointer.x + 14)),
            top: Math.min(size.height - 96, Math.max(72, hoverPointer.y - 34)),
          }}
          className="pointer-events-none absolute z-20 flex items-center gap-2 rounded-control border border-line-strong bg-surface/92 px-2.5 py-1 text-caption text-fg shadow-e2 backdrop-blur-md"
        >
          <span className="font-semibold text-fg">{hoveredLabel}</span>
          <span className="font-mono text-fg-muted tabular-nums">{hoverPointer.iso}</span>
        </div>
      )}

      {isContemporary2d && (
        <Suspense fallback={null}>
          <ObservatoryTelemetryHUD />
        </Suspense>
      )}
      {isContemporary2d && data.isBiomesActive && (
        <Suspense fallback={null}>
          <BiomeHudOverlay />
        </Suspense>
      )}
      {isContemporary2d && isSpeciesActive && (
        <Suspense fallback={null}>
          <SpeciesHudOverlay />
        </Suspense>
      )}
    </div>
  );
};

export { MAX_2D_ZOOM, MIN_2D_ZOOM };
