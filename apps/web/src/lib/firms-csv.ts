import type { FirmsHotspot } from "./observatory-data";

/**
 * Parser do CSV da API "area" do NASA FIRMS (T04).
 *
 * As colunas são lidas pelo NOME do cabeçalho, nunca por índice, porque o layout
 * difere entre produtos:
 *   VIIRS: latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
 *   MODIS: latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
 *
 * Confiança: VIIRS usa "l" | "n" | "h"; MODIS usa 0–100 (limiares da documentação FIRMS: <30 baixa, 30–79 nominal, ≥80 alta).
 */

export interface ParseFirmsOptions {
  /** Máximo de focos devolvidos; quando excedido, ficam os de maior FRP. */
  limit?: number;
}

export const DEFAULT_FIRMS_LIMIT = 1000;

function normalizeConfidence(raw: string | undefined): FirmsHotspot["confidence"] | null {
  if (raw === undefined) return null;
  const value = raw.trim().toLowerCase();
  if (value === "l" || value === "low") return "low";
  if (value === "n" || value === "nominal") return "nominal";
  if (value === "h" || value === "high") return "high";
  const pct = Number(value);
  if (value !== "" && Number.isFinite(pct)) {
    if (pct < 30) return "low";
    if (pct < 80) return "nominal";
    return "high";
  }
  return null;
}

function normalizeInstrument(instrument: string | undefined, satellite: string | undefined): FirmsHotspot["satellite"] | null {
  const inst = (instrument ?? "").trim().toUpperCase();
  if (inst === "VIIRS" || inst === "MODIS") return inst;
  // Fallback pelo código do satélite: VIIRS = N (Suomi NPP), N20, N21; MODIS = Terra/Aqua (T/A).
  const sat = (satellite ?? "").trim().toUpperCase();
  if (/^N(20|21)?$/.test(sat)) return "VIIRS";
  if (sat === "T" || sat === "A" || sat === "TERRA" || sat === "AQUA") return "MODIS";
  return null;
}

function toNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseFirmsCsv(csv: string, options: ParseFirmsOptions = {}): FirmsHotspot[] {
  const limit = options.limit ?? DEFAULT_FIRMS_LIMIT;
  const lines = csv.replace(/\r\n?/g, "\n").trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const idx = {
    lat: col("latitude"),
    lng: col("longitude"),
    brightness: col("bright_ti4") >= 0 ? col("bright_ti4") : col("brightness"),
    acqDate: col("acq_date"),
    acqTime: col("acq_time"),
    satellite: col("satellite"),
    instrument: col("instrument"),
    confidence: col("confidence"),
    frp: col("frp"),
    daynight: col("daynight"),
  };

  // Sem posição, FRP ou data não há foco utilizável: o formato é desconhecido.
  if (idx.lat < 0 || idx.lng < 0 || idx.frp < 0 || idx.acqDate < 0) return [];

  const hotspots: FirmsHotspot[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < header.length) continue;

    const lat = toNumber(cols[idx.lat]);
    const lng = toNumber(cols[idx.lng]);
    const frp = toNumber(cols[idx.frp]);
    const brightness = idx.brightness >= 0 ? toNumber(cols[idx.brightness]) : null;
    const confidence = idx.confidence >= 0 ? normalizeConfidence(cols[idx.confidence]) : null;
    const satellite = normalizeInstrument(
      idx.instrument >= 0 ? cols[idx.instrument] : undefined,
      idx.satellite >= 0 ? cols[idx.satellite] : undefined
    );
    const acqDate = cols[idx.acqDate]?.trim();

    if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    if (frp === null || frp < 0 || brightness === null || !confidence || !satellite) continue;
    if (!acqDate || !/^\d{4}-\d{2}-\d{2}$/.test(acqDate)) continue;

    const acqTimeRaw = idx.acqTime >= 0 ? cols[idx.acqTime]?.trim() : "";
    const daynightRaw = idx.daynight >= 0 ? cols[idx.daynight]?.trim().toUpperCase() : "";

    hotspots.push({
      id: `firms-${acqDate}-${acqTimeRaw || "0000"}-${lat.toFixed(4)}-${lng.toFixed(4)}`,
      lat,
      lng,
      brightness,
      frp,
      confidence,
      satellite,
      acqDate,
      ...(acqTimeRaw && /^\d{1,4}$/.test(acqTimeRaw) ? { acqTime: acqTimeRaw.padStart(4, "0") } : {}),
      ...(daynightRaw === "D" || daynightRaw === "N" ? { daynight: daynightRaw as "D" | "N" } : {}),
    });
  }

  if (hotspots.length > limit) {
    hotspots.sort((a, b) => b.frp - a.frp);
    hotspots.length = limit;
  }
  return hotspots;
}
