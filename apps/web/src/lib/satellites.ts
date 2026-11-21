/**
 * Satélites (D04) — TLEs do CelesTrak propagados com SGP4 (satellite.js). Funções puras,
 * usadas no servidor (validação dos TLEs) e no cliente (posição a cada instante).
 *
 * Referenciais: SGP4 dá a posição no referencial inercial TEME (≈ ECI); `eciToGeodetic` com o GMST
 * do instante converte para latitude/longitude/altitude geodésicas — o mesmo referencial fixo à
 * Terra do globo (textura e fronteiras não giram; o Sol é que se move).
 */
import { eciToGeodetic, degreesLat, degreesLong, gstime, propagate, twoline2satrec, type SatRec } from "satellite.js";
import { calculateSubsolarPoint } from "./astronomy-solar";
import type { IssTelemetryData } from "./observatory-data";

export const EARTH_RADIUS_KM = 6371;

/**
 * TLE de referência da ISS (CelesTrak, época 2026-11-20). Só para o fallback “Simulado” quando o
 * CelesTrak está indisponível: o SGP4 a partir de um TLE antigo acumula erro de dezenas a centenas
 * de km por dia — por isso a procedência é rotulada como imprecisa.
 */
export const REFERENCE_ISS_TLE = {
  name: "ISS (ZARYA)",
  line1: "1 25544U 98067A   26324.49484039  .00009536  00000+0  17778-3 0  9993",
  line2: "2 25544  51.6319 246.5768 0007409  46.6569 313.5036 15.49509114595987",
};
export const ISS_NORAD_ID = 25544;

export type SatelliteCategory = "station" | "visual";

export interface SatelliteTle {
  name: string;
  noradId: number;
  category: SatelliteCategory;
  line1: string;
  line2: string;
  /** Época do TLE (ISO), para mostrar a idade do dado. */
  epoch: string;
}

export interface SatelliteState {
  lat: number;
  lng: number;
  altKm: number;
  velocityKmh: number;
}

/** Converte a época do TLE (AAJJJ.FFFFFFFF, colunas 19–32 da linha 1) para ISO. */
export function tleEpochToIso(line1: string): string | null {
  const raw = line1.slice(18, 32).trim();
  const m = /^(\d{2})(\d{3}\.\d+)$/.exec(raw);
  if (!m) return null;
  const yy = Number(m[1]);
  const year = yy < 57 ? 2000 + yy : 1900 + yy;
  const dayOfYear = Number(m[2]);
  const ms = Date.UTC(year, 0, 1) + (dayOfYear - 1) * 86_400_000;
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** Checksum módulo 10 de uma linha de TLE (dígitos somam; '-' vale 1). */
export function tleChecksumOk(line: string): boolean {
  if (line.length < 69) return false;
  let sum = 0;
  for (const ch of line.slice(0, 68)) {
    if (ch >= "0" && ch <= "9") sum += Number(ch);
    else if (ch === "-") sum += 1;
  }
  return sum % 10 === Number(line[68]);
}

/** Lê o formato de 3 linhas do CelesTrak (nome + linha 1 + linha 2); ignora entradas inválidas. */
export function parseTleText(text: string, category: SatelliteCategory): SatelliteTle[] {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trimEnd()).filter((l) => l.length > 0);
  const out: SatelliteTle[] = [];
  for (let i = 0; i < lines.length - 2; i++) {
    const [name, l1, l2] = [lines[i], lines[i + 1], lines[i + 2]];
    if (!l1.startsWith("1 ") || !l2.startsWith("2 ")) continue;
    if (!tleChecksumOk(l1) || !tleChecksumOk(l2)) {
      i += 2;
      continue;
    }
    const noradId = Number(l1.slice(2, 7));
    const epoch = tleEpochToIso(l1);
    if (Number.isFinite(noradId) && epoch) {
      out.push({ name: name.trim(), noradId, category, line1: l1, line2: l2, epoch });
    }
    i += 2;
  }
  return out;
}

/** Junta grupos sem duplicar satélites (a ISS está em "stations" e "visual"); prioridade ao primeiro. */
export function mergeSatelliteGroups(...groups: SatelliteTle[][]): SatelliteTle[] {
  const seen = new Set<number>();
  const out: SatelliteTle[] = [];
  for (const group of groups) {
    for (const s of group) {
      if (seen.has(s.noradId)) continue;
      seen.add(s.noradId);
      out.push(s);
    }
  }
  return out;
}

export function toSatrec(tle: Pick<SatelliteTle, "line1" | "line2">): SatRec | null {
  try {
    const rec = twoline2satrec(tle.line1, tle.line2);
    return rec.error ? null : rec;
  } catch {
    return null;
  }
}

/** Período orbital em minutos a partir do movimento médio (rad/min) do satrec. */
export function orbitalPeriodMinutes(rec: SatRec): number {
  return (2 * Math.PI) / rec.no;
}

/** Inclinação orbital em graus. */
export function inclinationDeg(rec: SatRec): number {
  return (rec.inclo * 180) / Math.PI;
}

/** Posição geodésica e velocidade num instante; null se o SGP4 falhar (TLE decaído/inválido). */
export function propagateState(rec: SatRec, date: Date): SatelliteState | null {
  const pv = propagate(rec, date);
  if (typeof pv.position === "boolean" || typeof pv.velocity === "boolean") return null;
  const geo = eciToGeodetic(pv.position, gstime(date));
  const v = pv.velocity;
  return {
    lat: degreesLat(geo.latitude),
    lng: degreesLong(geo.longitude),
    altKm: geo.height,
    velocityKmh: Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) * 3600,
  };
}

/**
 * Anel orbital FECHADO: um período completo amostrado no referencial inercial e convertido com o
 * GMST do instante atual (não o de cada amostra). Assim a órbita é uma elipse fechada em torno da
 * Terra — e não o ground track, que não fecha porque a Terra gira por baixo.
 */
export function orbitRing(rec: SatRec, date: Date, samples = 180): SatelliteState[] {
  const period = orbitalPeriodMinutes(rec);
  const gmst = gstime(date);
  const out: SatelliteState[] = [];
  for (let i = 0; i < samples; i++) {
    const t = new Date(date.getTime() + (i / samples) * period * 60_000);
    const pv = propagate(rec, t);
    if (typeof pv.position === "boolean") continue;
    const geo = eciToGeodetic(pv.position, gmst);
    out.push({ lat: degreesLat(geo.latitude), lng: degreesLong(geo.longitude), altKm: geo.height, velocityKmh: 0 });
  }
  return out;
}

/** Ground track (projeção na superfície), com o GMST de cada amostra: de -minutesBack a +minutesAhead. */
export function groundTrack(rec: SatRec, date: Date, minutesBack = 45, minutesAhead = 45, stepMinutes = 1) {
  const out: { lat: number; lng: number }[] = [];
  for (let m = -minutesBack; m <= minutesAhead; m += stepMinutes) {
    const s = propagateState(rec, new Date(date.getTime() + m * 60_000));
    if (s) out.push({ lat: s.lat, lng: s.lng });
  }
  return out;
}

/**
 * Sombra da Terra (modelo cilíndrico): o satélite está em eclipse se estiver do lado noturno e a
 * menos de um raio terrestre do eixo Terra–Sol.
 */
export function isEclipsed(state: SatelliteState, date: Date): boolean {
  const sun = calculateSubsolarPoint(date);
  const toVec = (lat: number, lng: number, r: number) => {
    const la = (lat * Math.PI) / 180;
    const lo = (lng * Math.PI) / 180;
    return [r * Math.cos(la) * Math.cos(lo), r * Math.cos(la) * Math.sin(lo), r * Math.sin(la)];
  };
  const s = toVec(sun.latitude, sun.longitude, 1);
  const p = toVec(state.lat, state.lng, EARTH_RADIUS_KM + state.altKm);
  const along = p[0] * s[0] + p[1] * s[1] + p[2] * s[2];
  if (along >= 0) return false;
  const perp2 = p[0] ** 2 + p[1] ** 2 + p[2] ** 2 - along * along;
  return perp2 < EARTH_RADIUS_KM * EARTH_RADIUS_KM;
}

/** Raio na cena para uma altitude real (globo de raio 1 = 6.371 km). */
export function altitudeToSceneRadius(altKm: number): number {
  return 1 + altKm / EARTH_RADIUS_KM;
}

/** Distância de grande círculo (km) entre dois pontos — usada para comparar com a wheretheiss.at. */
export function greatCircleKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLng = (b.lng - a.lng) * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Telemetria da ISS (HUD, painel e modelo 3D usam a MESMA propagação — D04).
 * `groundTrack` = 1 órbita centrada no instante (±46 min), na superfície.
 */
export function buildIssTelemetry(rec: SatRec, timestamp: number, tleEpoch?: string): IssTelemetryData | null {
  const date = new Date(timestamp);
  const state = propagateState(rec, date);
  if (!state) return null;
  const half = orbitalPeriodMinutes(rec) / 2;
  return {
    latitude: Number(state.lat.toFixed(4)),
    longitude: Number(state.lng.toFixed(4)),
    altitudeKm: Number(state.altKm.toFixed(1)),
    velocityKmh: Number(state.velocityKmh.toFixed(0)),
    visibility: isEclipsed(state, date) ? "eclipsed" : "daylight",
    timestamp,
    orbitInclinationDeg: Number(inclinationDeg(rec).toFixed(2)),
    groundTrack: groundTrack(rec, date, half, half, 1.5),
    ...(tleEpoch ? { tleEpoch } : {}),
  };
}

let referenceRec: SatRec | null = null;
/**
 * Telemetria a partir do TLE de referência (fallback “Simulado”, impreciso com o passar dos dias).
 * Nunca lança: se o SGP4 não propagar até o instante pedido (TLE velho demais — o modelo “decai” a
 * órbita), devolve a posição na época do TLE, com o `timestamp` pedido. O store chama isto na
 * inicialização; uma exceção aqui derrubaria o app.
 */
export function referenceIssTelemetry(timestamp: number = Date.now()): IssTelemetryData {
  referenceRec ??= toSatrec(REFERENCE_ISS_TLE);
  const epoch = tleEpochToIso(REFERENCE_ISS_TLE.line1) ?? undefined;
  if (referenceRec) {
    const t = buildIssTelemetry(referenceRec, timestamp, epoch);
    if (t) return t;
    const atEpoch = epoch ? buildIssTelemetry(referenceRec, Date.parse(epoch), epoch) : null;
    if (atEpoch) return { ...atEpoch, timestamp };
  }
  return {
    latitude: 0,
    longitude: 0,
    altitudeKm: 420,
    velocityKmh: 27600,
    visibility: "daylight",
    timestamp,
    orbitInclinationDeg: 51.64,
    groundTrack: [],
    ...(epoch ? { tleEpoch: epoch } : {}),
  };
}
