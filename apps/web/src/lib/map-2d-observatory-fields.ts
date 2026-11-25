/**
 * Camadas de campo, raster e áreas do Observatório Planetário no Modo 2D (D33):
 * - NASA GIBS (reprojeção inversa da imagem equiretangular),
 * - Ventos Globais & Correntes Oceânicas (vetores direcionais coloridos por intensidade),
 * - Lixo Marítimo (5 giros oceânicos NOAA + trajetórias Lagrangianas RK2),
 * - Desmatamento INPE (mapa de calor térmico PRODES + alertas DETER + contorno IBGE).
 */

import * as topojson from "topojson-client";
import { geoPath, type GeoPermissibleObjects, type GeoProjection } from "d3-geo";
import type { AisVessel } from "@/lib/ais-data";
import type { BiomeFeatureProperties, BiomeTopology } from "@/lib/biomes-data";
import { PRODES_CRITICAL_HUBS } from "@/lib/inpe-heatmap";
import type { DeterAlertPoint, ProdesBiomeId } from "@/lib/inpe-types";
import {
  OCEAN_GYRES,
  type DriftSimulationResult,
  type OceanGyreId,
} from "@/lib/marine-debris-data";
import type { MapProjectionId } from "@/lib/map-projections-types";
import type {
  AircraftState,
  EonetCategoryFilter,
  EonetEvent,
  FirmsHotspot,
  IssTelemetryData,
  MaritimeRoute,
  ObservatoryEntity,
  ObservatoryLayer,
  SatelliteSnapshot,
} from "@/lib/observatory-data";
import type { ObservatoryMeta } from "@/lib/observatory-source";
import type { SpeciesCatalogEntry, SpeciesOccurrencePoint } from "@/lib/species-types";
import type { FlowMode, OceanCurrentGrid, WindAltitude, WindFieldPayload } from "@/lib/winds-types";

export interface GibsImagePixels {
  url: string;
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface Observatory2dRenderState {
  activeLayers: readonly ObservatoryLayer[];
  layerOpacity: Record<ObservatoryLayer, number>;
  layerMeta: Record<ObservatoryLayer, ObservatoryMeta>;
  gibsPixels: GibsImagePixels | null;
  firmsHotspots: readonly FirmsHotspot[];
  eonetEvents: readonly EonetEvent[];
  eonetCategory: EonetCategoryFilter;
  issTelemetry: IssTelemetryData | null;
  showIssGroundTrack: boolean;
  satelliteSnapshots: readonly SatelliteSnapshot[];
  aircraftFleet: readonly AircraftState[];
  maritimeRoutes: readonly MaritimeRoute[];
  aisVessels: readonly AisVessel[];
  vesselsMovingOnly: boolean;
  flowMode: FlowMode;
  winds: WindFieldPayload | null;
  windAltitude: WindAltitude;
  currents: OceanCurrentGrid | null;
  selectedGyreId: OceanGyreId | null;
  driftSimulation: DriftSimulationResult | null;
  prodesBiome: ProdesBiomeId;
  deterAlerts: readonly DeterAlertPoint[];
  brazilBiomesTopology: BiomeTopology | null;
  speciesEntries: readonly SpeciesCatalogEntry[];
  selectedSpeciesId: string | null;
  hoveredSpeciesId: string | null;
  selectedSpeciesOccurrences: readonly SpeciesOccurrencePoint[];
}

export type Observatory2dHitTarget =
  | { kind: "SPECIES"; x: number; y: number; radius: number; speciesId: string }
  | { kind: "GYRE"; x: number; y: number; radius: number; gyreId: OceanGyreId }
  | { kind: "ENTITY"; x: number; y: number; radius: number; entity: ObservatoryEntity };

const DEG2RAD = Math.PI / 180;

/** Projeta `[lng, lat]` verificando visibilidade real no viewport e recorte de Mercator. */
export function projectPointSafe(
  projection: GeoProjection,
  projectionId: MapProjectionId,
  lng: number,
  lat: number,
  width: number,
  height: number
): [number, number] | null {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (projectionId === "mercator" && Math.abs(lat) > 82.5) return null;
  const pt = projection([lng, lat]);
  if (!pt || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) return null;
  if (pt[0] < -32 || pt[0] > width + 32 || pt[1] < -32 || pt[1] > height + 32) return null;
  return pt;
}

/**
 * Reprojeta a textura equiretangular NASA GIBS para qualquer projeção `d3-geo`
 * usando amostragem inversa (`projection.invert`) em resolução adaptativa leve.
 */
export function renderGibs2dLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  projection: GeoProjection,
  projectionId: MapProjectionId,
  gibsPixels: GibsImagePixels,
  opacity: number
): void {
  if (!projection.invert || typeof document === "undefined") return;
  const stride = Math.max(2, Math.round(Math.min(width, height) / 220));
  const outW = Math.max(1, Math.ceil(width / stride));
  const outH = Math.max(1, Math.ceil(height / stride));

  const offscreen = document.createElement("canvas");
  offscreen.width = outW;
  offscreen.height = outH;
  const octx = offscreen.getContext("2d");
  if (!octx) return;
  const outImg = octx.createImageData(outW, outH);
  const dst = outImg.data;
  const src = gibsPixels.data;
  const srcW = gibsPixels.width;
  const srcH = gibsPixels.height;

  for (let oy = 0; oy < outH; oy++) {
    const sy = oy * stride + stride * 0.5;
    for (let ox = 0; ox < outW; ox++) {
      const sx = ox * stride + stride * 0.5;
      const inv = projection.invert([sx, sy]);
      if (!inv) continue;
      const [lng, lat] = inv;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) continue;
      if (projectionId === "mercator" && Math.abs(lat) > 82.5) continue;

      const u = Math.min(srcW - 1, Math.max(0, Math.floor(((lng + 180) / 360) * srcW)));
      const v = Math.min(srcH - 1, Math.max(0, Math.floor(((90 - lat) / 180) * srcH)));
      const sIdx = (v * srcW + u) * 4;
      const a = src[sIdx + 3];
      if (a < 8) continue;

      const dIdx = (oy * outW + ox) * 4;
      dst[dIdx] = src[sIdx];
      dst[dIdx + 1] = src[sIdx + 1];
      dst[dIdx + 2] = src[sIdx + 2];
      dst[dIdx + 3] = a;
    }
  }

  octx.putImageData(outImg, 0, 0);
  ctx.save();
  ctx.globalAlpha = Math.max(0.1, Math.min(1, opacity));
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, 0, 0, width, height);
  ctx.restore();
}

function drawFlowArrow(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  lineWidth: number
) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 2 || len > 72) return;
  const angle = Math.atan2(dy, dx);
  const head = Math.min(5.5, len * 0.38);

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(angle - 0.55), y1 - head * Math.sin(angle - 0.55));
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(angle + 0.55), y1 - head * Math.sin(angle + 0.55));
  ctx.stroke();
}

function windSpeedColor(speedMs: number, isJet: boolean): string {
  const t = Math.min(1, speedMs / (isJet ? 55 : 22));
  if (t < 0.35) return "#38bdf8";
  if (t < 0.65) return "#34d399";
  if (t < 0.85) return "#fbbf24";
  return "#fb7185";
}

function currentSpeedColor(speedMs: number): string {
  const t = Math.min(1, speedMs / 1.1);
  if (t < 0.35) return "#0ea5e9";
  if (t < 0.7) return "#22d3ee";
  return "#a5f3fc";
}

export function drawWindsAndCurrents2d(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  projection: GeoProjection,
  projectionId: MapProjectionId,
  state: Observatory2dRenderState,
  opacity: number
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0.2, Math.min(1, opacity));
  ctx.lineCap = "round";

  const showWinds = state.flowMode === "winds" || state.flowMode === "both";
  const showCurrents = state.flowMode === "currents" || state.flowMode === "both";

  if (showCurrents && state.currents) {
    const grid = state.currents;
    const cols = grid.lngs.length;
    for (let r = 0; r < grid.lats.length; r++) {
      const lat = grid.lats[r];
      const cosLat = Math.max(0.3, Math.cos(lat * DEG2RAD));
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (grid.mask[idx] === 0) continue;
        const u = grid.u[idx];
        const v = grid.v[idx];
        const speed = Math.hypot(u, v);
        if (speed < 0.03) continue;
        const lng = grid.lngs[c];
        const p0 = projectPointSafe(projection, projectionId, lng, lat, width, height);
        if (!p0) continue;
        const scaleDeg = Math.min(9, 2.6 + speed * 8.5);
        const p1 = projectPointSafe(
          projection,
          projectionId,
          lng + ((u / speed) * scaleDeg) / cosLat,
          Math.max(-80, Math.min(80, lat + (v / speed) * scaleDeg)),
          width,
          height
        );
        if (!p1) continue;
        drawFlowArrow(ctx, p0[0], p0[1], p1[0], p1[1], currentSpeedColor(speed), 1.45);
      }
    }
  }

  if (showWinds && state.winds) {
    const grid = state.winds[state.windAltitude];
    const isJet = state.windAltitude === "jet250";
    const cols = grid.lngs.length;
    for (let r = 0; r < grid.lats.length; r++) {
      const lat = grid.lats[r];
      const cosLat = Math.max(0.3, Math.cos(lat * DEG2RAD));
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const u = grid.u[idx];
        const v = grid.v[idx];
        const speed = Math.hypot(u, v);
        if (speed < 0.4) continue;
        const lng = grid.lngs[c];
        const p0 = projectPointSafe(projection, projectionId, lng, lat, width, height);
        if (!p0) continue;
        const scaleDeg = Math.min(11, 2.4 + (speed / (isJet ? 50 : 18)) * 8);
        const p1 = projectPointSafe(
          projection,
          projectionId,
          lng + ((u / speed) * scaleDeg) / cosLat,
          Math.max(-80, Math.min(80, lat + (v / speed) * scaleDeg)),
          width,
          height
        );
        if (!p1) continue;
        drawFlowArrow(ctx, p0[0], p0[1], p1[0], p1[1], windSpeedColor(speed, isJet), 1.3);
      }
    }
  }

  ctx.restore();
}

export function drawMarineDebris2d(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  projection: GeoProjection,
  projectionId: MapProjectionId,
  state: Observatory2dRenderState,
  opacity: number,
  hits: Observatory2dHitTarget[]
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0.2, Math.min(1, opacity));

  for (const gyre of OCEAN_GYRES) {
    const center = projectPointSafe(projection, projectionId, gyre.centerLng, gyre.centerLat, width, height);
    if (!center) continue;
    const isSelected = state.selectedGyreId === gyre.id;

    const rings = [
      { mult: 1.35, color: "rgba(23, 163, 184, 0.18)" },
      { mult: 0.9, color: "rgba(245, 194, 41, 0.28)" },
      { mult: 0.48, color: "rgba(235, 56, 107, 0.42)" },
    ];
    for (const ring of rings) {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= 32; i++) {
        const theta = (i / 32) * Math.PI * 2;
        const lat = Math.max(-78, Math.min(78, gyre.centerLat + Math.sin(theta) * gyre.radiusLat * ring.mult));
        let lng = gyre.centerLng + Math.cos(theta) * gyre.radiusLng * ring.mult;
        if (lng > 180) lng -= 360;
        if (lng < -180) lng += 360;
        const pt = projection([lng, lat]);
        if (!pt || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) continue;
        if (!started) {
          ctx.moveTo(pt[0], pt[1]);
          started = true;
        } else {
          ctx.lineTo(pt[0], pt[1]);
        }
      }
      ctx.closePath();
      ctx.fillStyle = ring.color;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(center[0], center[1], isSelected ? 6.5 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = isSelected ? "#f43f5e" : "#f59e0b";
    ctx.fill();
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = isSelected ? 1.8 : 1;
    ctx.stroke();

    hits.push({ kind: "GYRE", x: center[0], y: center[1], radius: 16, gyreId: gyre.id });
  }

  const sim = state.driftSimulation;
  if (sim) {
    sim.trajectories.forEach((traj, idx) => {
      const isCentral = idx === 0;
      ctx.beginPath();
      let prevX: number | null = null;
      for (const [lat, lng] of traj) {
        const pt = projectPointSafe(projection, projectionId, lng, lat, width, height);
        if (!pt) {
          prevX = null;
          continue;
        }
        if (prevX === null || Math.abs(pt[0] - prevX) > width * 0.35) {
          ctx.moveTo(pt[0], pt[1]);
        } else {
          ctx.lineTo(pt[0], pt[1]);
        }
        prevX = pt[0];
      }
      ctx.strokeStyle = isCentral ? "#38bdf8" : "rgba(56, 189, 248, 0.45)";
      ctx.lineWidth = isCentral ? 2.1 : 1.0;
      ctx.stroke();
    });

    const originPt = projectPointSafe(projection, projectionId, sim.origin.lng, sim.origin.lat, width, height);
    if (originPt) {
      ctx.beginPath();
      ctx.arc(originPt[0], originPt[1], 5, 0, Math.PI * 2);
      ctx.fillStyle = "#38bdf8";
      ctx.fill();
      ctx.strokeStyle = "#0b1120";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function drawInpeDeforestation2d(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  projection: GeoProjection,
  projectionId: MapProjectionId,
  state: Observatory2dRenderState,
  opacity: number
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0.2, Math.min(1, opacity));

  if (state.brazilBiomesTopology) {
    const fc = topojson.feature<BiomeFeatureProperties>(
      state.brazilBiomesTopology,
      state.brazilBiomesTopology.objects.biomes
    );
    const path = geoPath(projection, ctx);
    for (const feature of fc.features) {
      ctx.beginPath();
      path(feature as GeoPermissibleObjects);
      ctx.strokeStyle = "rgba(251, 146, 60, 0.55)";
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }

  for (const hub of PRODES_CRITICAL_HUBS) {
    const pt = projectPointSafe(projection, projectionId, hub.lng, hub.lat, width, height);
    if (!pt) continue;
    const isFocusedBiome = hub.biome === state.prodesBiome;
    const edge = projection([hub.lng + hub.spreadDeg, hub.lat]);
    const radius = edge ? Math.max(8, Math.min(44, Math.hypot(edge[0] - pt[0], edge[1] - pt[1]))) : 14;

    const grad = ctx.createRadialGradient(pt[0], pt[1], 0, pt[0], pt[1], radius);
    const alpha = (isFocusedBiome ? 0.78 : 0.25) * hub.intensity;
    grad.addColorStop(0, `rgba(254, 240, 138, ${alpha})`);
    grad.addColorStop(0.35, `rgba(239, 68, 68, ${alpha * 0.85})`);
    grad.addColorStop(0.7, `rgba(245, 158, 11, ${alpha * 0.45})`);
    grad.addColorStop(1, "rgba(245, 158, 11, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pt[0], pt[1], radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const alert of state.deterAlerts) {
    const pt = projectPointSafe(projection, projectionId, alert.lng, alert.lat, width, height);
    if (!pt) continue;
    ctx.beginPath();
    ctx.arc(pt[0], pt[1], 2.8, 0, Math.PI * 2);
    ctx.fillStyle = "#fde047";
    ctx.fill();
  }

  ctx.restore();
}
