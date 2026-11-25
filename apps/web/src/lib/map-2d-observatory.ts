/**
 * Renderizador e picking interativo das camadas vetoriais/pontuais do Observatório
 * Planetário no Modo 2D (D33), combinando-as às camadas de campo em `map-2d-observatory-fields.ts`.
 */

import { geoPath, type GeoPermissibleObjects, type GeoProjection } from "d3-geo";
import { vesselIsMoving } from "@/lib/ais-data";
import type { MapProjectionId } from "@/lib/map-projections-types";
import { IUCN_STATUS_META } from "@/lib/species-catalog";
import {
  drawInpeDeforestation2d,
  drawMarineDebris2d,
  drawWindsAndCurrents2d,
  projectPointSafe,
  renderGibs2dLayer,
  type GibsImagePixels,
  type Observatory2dHitTarget,
  type Observatory2dRenderState,
} from "@/lib/map-2d-observatory-fields";

export {
  projectPointSafe,
  renderGibs2dLayer,
  type GibsImagePixels,
  type Observatory2dHitTarget,
  type Observatory2dRenderState,
};

const EONET_COLORS: Record<string, string> = {
  wildfires: "#f97316",
  severeStorms: "#38bdf8",
  volcanoes: "#ef4444",
  seaLakeIce: "#67e8f9",
  floods: "#3b82f6",
  drought: "#eab308",
  earthquakes: "#f43f5e",
  dustHaze: "#d97706",
};

const DEG2RAD = Math.PI / 180;

function drawSplitGeodesicLine(
  ctx: CanvasRenderingContext2D,
  points: ReadonlyArray<{ lat: number; lng: number }>,
  projection: GeoProjection,
  projectionId: MapProjectionId,
  width: number,
  height: number
) {
  ctx.beginPath();
  let prevX: number | null = null;
  for (const p of points) {
    const pt = projectPointSafe(projection, projectionId, p.lng, p.lat, width, height);
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
  ctx.stroke();
}

/**
 * Desenha todas as camadas pontuais/vetoriais do Observatório acima das fronteiras
 * e retorna os alvos clicáveis projetados em coordenadas de tela.
 */
export function renderObservatory2dLayers(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  projection: GeoProjection,
  projectionId: MapProjectionId,
  state: Observatory2dRenderState
): Observatory2dHitTarget[] {
  const hits: Observatory2dHitTarget[] = [];
  const active = new Set(state.activeLayers);

  if (active.has("GLOBAL_WINDS")) {
    drawWindsAndCurrents2d(ctx, width, height, projection, projectionId, state, state.layerOpacity.GLOBAL_WINDS ?? 0.85);
  }
  if (active.has("MARINE_DEBRIS")) {
    drawMarineDebris2d(ctx, width, height, projection, projectionId, state, state.layerOpacity.MARINE_DEBRIS ?? 0.9, hits);
  }
  if (active.has("INPE_DEFORESTATION")) {
    drawInpeDeforestation2d(ctx, width, height, projection, projectionId, state, state.layerOpacity.INPE_DEFORESTATION ?? 0.9);
  }

  // Tráfego Marítimo & AIS
  if (active.has("MARITIME_ROUTES")) {
    ctx.save();
    ctx.globalAlpha = Math.max(0.25, state.layerOpacity.MARITIME_ROUTES ?? 0.9);
    const path = geoPath(projection, ctx);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.42)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 3]);
    for (const route of state.maritimeRoutes) {
      const geo: GeoPermissibleObjects = {
        type: "LineString",
        coordinates: route.coordinates.map(([lat, lng]) => [lng, lat]),
      };
      ctx.beginPath();
      path(geo);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const vessels = state.vesselsMovingOnly
      ? state.aisVessels.filter(vesselIsMoving)
      : state.aisVessels;
    for (const vessel of vessels) {
      const pt = projectPointSafe(projection, projectionId, vessel.lng, vessel.lat, width, height);
      if (!pt) continue;
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], 3.1, 0, Math.PI * 2);
      ctx.fillStyle = "#22d3ee";
      ctx.fill();
      ctx.strokeStyle = "#0b1120";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      hits.push({
        kind: "ENTITY",
        x: pt[0],
        y: pt[1],
        radius: 9,
        entity: { type: "VESSEL", data: vessel, meta: state.layerMeta.MARITIME_ROUTES },
      });
    }
    ctx.restore();
  }

  // Queimadas Ativas (NASA FIRMS / INPE BDQueimadas)
  if (active.has("NASA_FIRMS") && state.firmsHotspots.length > 0) {
    ctx.save();
    ctx.globalAlpha = Math.max(0.25, state.layerOpacity.NASA_FIRMS ?? 0.9);
    const step = state.firmsHotspots.length > 3500 ? Math.ceil(state.firmsHotspots.length / 3500) : 1;
    for (let i = 0; i < state.firmsHotspots.length; i += step) {
      const hs = state.firmsHotspots[i];
      const pt = projectPointSafe(projection, projectionId, hs.lng, hs.lat, width, height);
      if (!pt) continue;
      const intense = hs.frp >= 40;
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], intense ? 3.2 : 2.1, 0, Math.PI * 2);
      ctx.fillStyle = intense ? "#fde047" : hs.frp >= 12 ? "#f97316" : "#fb923c";
      ctx.fill();
      hits.push({
        kind: "ENTITY",
        x: pt[0],
        y: pt[1],
        radius: 8,
        entity: { type: "FIRMS", data: hs },
      });
    }
    ctx.restore();
  }

  // Eventos Severos (NASA EONET)
  if (active.has("NASA_EONET")) {
    ctx.save();
    ctx.globalAlpha = Math.max(0.25, state.layerOpacity.NASA_EONET ?? 0.95);
    const events =
      state.eonetCategory === "all"
        ? state.eonetEvents
        : state.eonetEvents.filter((ev) => ev.category === state.eonetCategory);
    for (const ev of events) {
      const pt = projectPointSafe(projection, projectionId, ev.lng, ev.lat, width, height);
      if (!pt) continue;
      const color = EONET_COLORS[ev.category] ?? "#c084fc";
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], 7, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      hits.push({
        kind: "ENTITY",
        x: pt[0],
        y: pt[1],
        radius: 12,
        entity: { type: "EONET", data: ev },
      });
    }
    ctx.restore();
  }

  // Tráfego Aéreo (OpenSky ADS-B)
  if (active.has("FLIGHTS_OPENSKY")) {
    ctx.save();
    ctx.globalAlpha = Math.max(0.25, state.layerOpacity.FLIGHTS_OPENSKY ?? 0.95);
    for (const ac of state.aircraftFleet) {
      const pt = projectPointSafe(projection, projectionId, ac.lng, ac.lat, width, height);
      if (!pt) continue;
      const rad = ((ac.headingDeg ?? 0) - 90) * DEG2RAD;
      ctx.save();
      ctx.translate(pt[0], pt[1]);
      ctx.rotate(rad);
      ctx.beginPath();
      ctx.moveTo(5.5, 0);
      ctx.lineTo(-3.5, -3.2);
      ctx.lineTo(-1.8, 0);
      ctx.lineTo(-3.5, 3.2);
      ctx.closePath();
      ctx.fillStyle = "#e0f2fe";
      ctx.fill();
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
      hits.push({
        kind: "ENTITY",
        x: pt[0],
        y: pt[1],
        radius: 10,
        entity: { type: "AIRCRAFT", data: ac, meta: state.layerMeta.FLIGHTS_OPENSKY },
      });
    }
    ctx.restore();
  }

  // ISS & Satélites Artificiais
  if (active.has("ISS_SATELLITES")) {
    ctx.save();
    ctx.globalAlpha = Math.max(0.3, state.layerOpacity.ISS_SATELLITES ?? 1);
    const iss = state.issTelemetry;
    if (iss && state.showIssGroundTrack && iss.groundTrack.length > 1) {
      ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
      ctx.lineWidth = 1.6;
      drawSplitGeodesicLine(ctx, iss.groundTrack, projection, projectionId, width, height);
    }

    for (const sat of state.satelliteSnapshots) {
      const pt = projectPointSafe(projection, projectionId, sat.lng, sat.lat, width, height);
      if (!pt) continue;
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], sat.category === "station" ? 4.2 : 3.0, 0, Math.PI * 2);
      ctx.fillStyle = sat.category === "station" ? "#38bdf8" : "#cbd5e1";
      ctx.fill();
      ctx.strokeStyle = "#0b1120";
      ctx.lineWidth = 0.9;
      ctx.stroke();
      hits.push({
        kind: "ENTITY",
        x: pt[0],
        y: pt[1],
        radius: 10,
        entity: { type: "SATELLITE", data: sat },
      });
    }

    if (iss) {
      const pt = projectPointSafe(projection, projectionId, iss.longitude, iss.latitude, width, height);
      if (pt) {
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 9, 0, Math.PI * 2);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 4.2, 0, Math.PI * 2);
        ctx.fillStyle = "#f8fafc";
        ctx.fill();
        ctx.font = "600 10px ui-monospace, SFMono-Regular, monospace";
        ctx.fillStyle = "#e0f2fe";
        ctx.fillText("ISS", pt[0] + 11, pt[1] + 3);
        hits.push({
          kind: "ENTITY",
          x: pt[0],
          y: pt[1],
          radius: 14,
          entity: { type: "ISS", data: iss },
        });
      }
    }
    ctx.restore();
  }

  // Mapa de Espécies & Biodiversidade (GBIF + IUCN)
  if (active.has("SPECIES_MAP")) {
    ctx.save();
    ctx.globalAlpha = Math.max(0.3, state.layerOpacity.SPECIES_MAP ?? 0.95);
    for (const occ of state.selectedSpeciesOccurrences) {
      const pt = projectPointSafe(projection, projectionId, occ.lng, occ.lat, width, height);
      if (!pt) continue;
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], 2.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(103, 232, 249, 0.85)";
      ctx.fill();
    }

    for (const sp of state.speciesEntries) {
      const pt = projectPointSafe(projection, projectionId, sp.centerLng, sp.centerLat, width, height);
      if (!pt) continue;
      const isSelected = sp.id === state.selectedSpeciesId;
      const isHovered = sp.id === state.hoveredSpeciesId;
      const color = IUCN_STATUS_META[sp.iucnStatus].hex;

      if (isSelected) {
        const edge = projection([sp.centerLng + sp.rangeRadiusDeg, sp.centerLat]);
        const rangePx = edge ? Math.max(14, Math.min(90, Math.hypot(edge[0] - pt[0], edge[1] - pt[1]))) : 24;
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], rangePx, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.25;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], isSelected ? 11 : 9, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? "#f8fafc" : color;
        ctx.lineWidth = isSelected ? 2 : 1.4;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], isSelected ? 5.8 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#0b1120";
      ctx.lineWidth = 1.1;
      ctx.stroke();

      hits.push({ kind: "SPECIES", x: pt[0], y: pt[1], radius: 12, speciesId: sp.id });
    }
    ctx.restore();
  }

  return hits;
}

/**
 * Resolve o alvo clicável mais próximo em `(x, y)` respeitando prioridade visual
 * (Espécies e ISS no topo, seguidos por EONET, Voos, Navios, Queimadas e Giros).
 */
export function pickObservatory2dHit(
  hits: readonly Observatory2dHitTarget[],
  x: number,
  y: number
): Observatory2dHitTarget | null {
  let best: Observatory2dHitTarget | null = null;
  let bestDistSq = Infinity;
  for (let i = hits.length - 1; i >= 0; i--) {
    const target = hits[i];
    const dx = target.x - x;
    const dy = target.y - y;
    const dSq = dx * dx + dy * dy;
    if (dSq <= target.radius * target.radius && dSq < bestDistSq) {
      bestDistSq = dSq;
      best = target;
    }
  }
  return best;
}
