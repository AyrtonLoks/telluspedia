import {
  AIS_MAX_VESSELS, AIS_POSITION_TTL_MS, AIS_REGIONS, aisRegion, emptyAisCounts,
  type AisSnapshot, type AisVessel, type VesselKind, type VesselPosition,
} from "./ais-data";

export const AIS_MESSAGE_TYPES = [
  "PositionReport", "StandardClassBPositionReport", "ExtendedClassBPositionReport", "ShipStaticData", "StaticDataReport",
] as const;

const MAX_TRACKS = 6000;
const STATIC_TTL_MS = 30 * 60_000;

// Registros frequentes na área de cobertura. MID ausente permanece desconhecido.
const FLAGS_BY_MID: Record<string, string> = {
  "205": "Bélgica", "209": "Chipre", "210": "Chipre", "212": "Chipre",
  "219": "Dinamarca", "220": "Dinamarca", "228": "França", "229": "Malta",
  "232": "Reino Unido", "233": "Reino Unido", "234": "Reino Unido", "235": "Reino Unido",
  "241": "Grécia", "244": "Países Baixos", "245": "Países Baixos", "246": "Países Baixos",
  "248": "Malta", "249": "Malta", "256": "Malta", "257": "Noruega", "258": "Noruega",
  "259": "Noruega", "305": "Antígua e Barbuda", "311": "Bahamas", "319": "Ilhas Cayman",
  "338": "Estados Unidos", "351": "Panamá", "352": "Panamá", "353": "Panamá",
  "354": "Panamá", "355": "Panamá", "356": "Panamá", "357": "Panamá",
  "366": "Estados Unidos", "367": "Estados Unidos", "368": "Estados Unidos", "369": "Estados Unidos",
  "412": "China", "413": "China", "414": "China", "416": "Taiwan", "419": "Índia",
  "431": "Japão", "432": "Japão", "440": "Coreia do Sul", "441": "Coreia do Sul",
  "477": "Hong Kong", "525": "Indonésia", "533": "Malásia", "538": "Ilhas Marshall",
  "563": "Singapura", "564": "Singapura", "565": "Singapura", "566": "Singapura",
  "574": "Vietnã", "613": "Camarões", "622": "Egito", "636": "Libéria", "637": "Libéria",
  "667": "Serra Leoa", "671": "Togo", "677": "Tanzânia", "710": "Brasil",
};

type Fields = Record<string, unknown>;
interface Track {
  touchedAt: number;
  name?: string;
  kind?: VesselKind;
  destination?: string;
  position?: VesselPosition;
  lastPositionAt?: number;
}

function fields(value: unknown): Fields {
  return value && typeof value === "object" ? value as Fields : {};
}

function textField(value: unknown) {
  if (typeof value !== "string") return undefined;
  return value.replace(/[@\u0000-\u001f\u007f]/g, " ").trim().slice(0, 80) || undefined;
}

function bounded(value: unknown, low: number, high: number) {
  return typeof value === "number" && value >= low && value <= high ? value : null;
}

function vesselKind(value: unknown): VesselKind | undefined {
  const type = bounded(value, 1, 99);
  if (type == null) return;
  if (type === 30) return "fishing";
  if (type >= 60 && type < 70) return "passenger";
  if (type >= 70 && type < 80) return "cargo";
  if (type >= 80 && type < 90) return "tanker";
  return "other";
}

function reportTimestamp(value: unknown, now: number) {
  if (typeof value !== "string") return now;
  const normalized = value.replace(/ \+0000 UTC$/, "Z").replace(" ", "T");
  const time = Date.parse(normalized);
  return Number.isFinite(time) ? Math.min(time, now) : now;
}

export function createAisAccumulator() {
  const tracks = new Map<string, Track>();

  function ingest(frame: unknown, now: number) {
    const { MessageType: type, MetaData, Message } = fields(frame);
    if (!AIS_MESSAGE_TYPES.some((supported) => supported === type)) return;
    const metadata = fields(MetaData);
    const report = fields(fields(Message)[String(type)]);
    if (Object.keys(report).length === 0 || report.Valid === false) return;
    const mmsi = String(metadata.MMSI ?? report.UserID ?? "");
    if (!/^[2-7]\d{8}$/.test(mmsi)) return;

    const lat = bounded(report.Latitude ?? metadata.Latitude ?? metadata.latitude, -90, 90);
    const lng = bounded(report.Longitude ?? metadata.Longitude ?? metadata.longitude, -180, 180);
    const isStatic = type === "ShipStaticData" || type === "StaticDataReport";
    const previous = tracks.get(mmsi);
    const observedAt = reportTimestamp(metadata.time_utc, now);
    if (!isStatic && (lat == null || lng == null || !aisRegion(lat, lng))) {
      // An updated position outside the configured window supersedes the old point.
      if (lat != null && lng != null && previous && observedAt >= (previous.lastPositionAt ?? 0)) {
        previous.position = undefined;
        previous.lastPositionAt = observedAt;
      }
      return;
    }
    if (!previous && isStatic && (lat == null || lng == null || !aisRegion(lat, lng))) return;

    const reportA = fields(report.ReportA);
    const reportB = fields(report.ReportB);
    const track = previous ?? { touchedAt: now };
    track.touchedAt = now;
    track.name = textField(report.Name ?? reportA.Name) ?? textField(metadata.ShipName) ?? track.name;
    track.kind = vesselKind(report.Type ?? report.ShipType ?? reportB.ShipType ?? reportB.Type) ?? track.kind;
    track.destination = textField(report.Destination) ?? track.destination;
    if (!isStatic && lat != null && lng != null && observedAt >= (track.lastPositionAt ?? 0)) {
      track.lastPositionAt = observedAt;
      track.position = {
        lat,
        lng,
        observedAt,
        speedKnots: bounded(report.Sog, 0, 102.2),
        courseDeg: bounded(report.Cog, 0, 359.9),
        headingDeg: bounded(report.TrueHeading, 0, 359),
      };
    }

    tracks.delete(mmsi);
    tracks.set(mmsi, track);
    if (tracks.size > MAX_TRACKS) tracks.delete(tracks.keys().next().value!);
  }

  function snapshot(now: number): AisSnapshot {
    const byRegion = AIS_REGIONS.map((): AisVessel[] => []);
    for (const [mmsi, track] of tracks) {
      if (now - track.touchedAt > STATIC_TTL_MS) {
        tracks.delete(mmsi);
        continue;
      }
      const position = track.position;
      if (!position || now - position.observedAt > AIS_POSITION_TTL_MS) continue;
      const matchingRegion = aisRegion(position.lat, position.lng);
      const region = AIS_REGIONS.findIndex((candidate) => candidate === matchingRegion);
      if (region < 0) continue;
      byRegion[region].push({
        ...position, id: mmsi, mmsi, region: AIS_REGIONS[region].id,
        name: track.name, kind: track.kind ?? "unknown", destination: track.destination,
        flag: FLAGS_BY_MID[mmsi.slice(0, 3)],
      });
    }

    const corridorCounts = emptyAisCounts();
    byRegion.forEach((list, index) => {
      corridorCounts[AIS_REGIONS[index].id] = list.length;
      list.sort((a, b) => b.observedAt - a.observedAt || a.id.localeCompare(b.id));
    });
    const vessels: AisVessel[] = [];
    const largestRegion = Math.max(...byRegion.map((list) => list.length));
    for (let offset = 0; offset < largestRegion && vessels.length < AIS_MAX_VESSELS; offset++) {
      for (const list of byRegion) {
        if (list[offset] && vessels.length < AIS_MAX_VESSELS) vessels.push(list[offset]);
      }
    }
    return { vessels, corridorCounts };
  }

  return { ingest, snapshot };
}
