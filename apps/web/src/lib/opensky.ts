import { type AircraftState } from "./observatory-data";
import { SourceUnavailableError } from "./observatory-source";
import { AIRCRAFT_DEFAULT_LIMIT, AIRCRAFT_MAX_LIMIT } from "./aircraft-config";

const TOKEN_URL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const STATES_URL = "https://opensky-network.org/api/states/all";
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
let token: { value: string; expiresAt: number } | null = null;
let retryAt = 0;

export function resetOpenSky() {
  token = null;
  retryAt = 0;
}

async function getBearerToken(clientId: string, clientSecret: string) {
  if (token && token.expiresAt > Date.now() + 30_000) return token.value;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new SourceUnavailableError(`Autenticação OpenSky respondeu HTTP ${response.status}`);

  const body: { access_token?: unknown; expires_in?: unknown } = await response.json();
  if (typeof body?.access_token !== "string" || !finite(body.expires_in) || body.expires_in <= 0) {
    throw new SourceUnavailableError("Token OpenSky inválido");
  }
  token = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return token.value;
}

export function normalizeOpenSkyFleet(body: unknown, limit = AIRCRAFT_DEFAULT_LIMIT): AircraftState[] {
  if (!body || typeof body !== "object" || !("states" in body) || !Array.isArray(body.states)) return [];

  const unique = new Map<string, AircraftState>();
  for (const state of body.states) {
    if (!Array.isArray(state) || state[8] !== false) continue;
    const [id, callsign, origin, positionTime, , lng, lat, barometric, , speed, heading, , , geometric] = state;
    const altitude = finite(geometric) ? geometric : barometric;
    if (
      typeof id !== "string" || !/^[\da-f]{6}$/i.test(id) ||
      !finite(lat) || !finite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 ||
      !finite(altitude) || !finite(speed) || speed < 0 ||
      !finite(heading) || heading < 0 || heading > 360 || !finite(positionTime) || positionTime <= 0
    ) continue;

    const icao24 = id.toLowerCase();
    const previous = unique.get(icao24);
    const positionTimestamp = positionTime * 1000;
    if (previous?.positionTimestamp && previous.positionTimestamp >= positionTimestamp) continue;
    unique.set(icao24, {
      icao24,
      callsign: typeof callsign === "string" ? callsign.trim() : "",
      originCountry: typeof origin === "string" && origin.trim() ? origin.trim() : "Indisponível",
      lng, lat, positionTimestamp,
      altitudeMeters: Math.round(altitude),
      velocityMs: speed,
      headingDeg: heading % 360,
    });
  }

  // Round-robin of geographic cells prevents dense regions dominating the sample.
  const cells = new Map<string, AircraftState[]>();
  for (const state of [...unique.values()].sort((a, b) => a.icao24.localeCompare(b.icao24))) {
    const key = `${Math.floor((state.lat + 90) / 15)}:${Math.floor((state.lng + 180) / 15)}`;
    const cell = cells.get(key);
    if (cell) cell.push(state);
    else cells.set(key, [state]);
  }
  const output: AircraftState[] = [];
  const max = Math.max(1, Math.min(limit, AIRCRAFT_MAX_LIMIT));
  const buckets = [...cells.values()];
  for (let row = 0; output.length < max && output.length < unique.size; row++) {
    for (const cell of buckets) {
      if (row < cell.length) output.push(cell[row]);
      if (output.length === max) break;
    }
  }
  return output;
}

export async function fetchOpenSkyFleet(): Promise<AircraftState[]> {
  const clientId = process.env.OPENSKY_CLIENT_ID?.trim();
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new SourceUnavailableError("Credenciais OpenSky indisponíveis no servidor");
  }
  if (Date.now() < retryAt) throw new SourceUnavailableError("Limite temporário do OpenSky");

  const fetchStates = async () => fetch(STATES_URL, {
    headers: { Authorization: `Bearer ${await getBearerToken(clientId, clientSecret)}` },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  let response = await fetchStates();
  if (response.status === 401) {
    token = null;
    response = await fetchStates();
  }
  if (response.status === 429) {
    const seconds = Number(response.headers.get("X-Rate-Limit-Retry-After-Seconds"));
    retryAt = Date.now() + (finite(seconds) && seconds > 0 ? seconds : 120) * 1000;
  }
  if (!response.ok) throw new SourceUnavailableError(`OpenSky respondeu HTTP ${response.status}`);

  const configuredLimit = Number(process.env.OPENSKY_AIRCRAFT_LIMIT);
  const limit = Number.isInteger(configuredLimit) && configuredLimit > 0 ? configuredLimit : AIRCRAFT_DEFAULT_LIMIT;
  const fleet = normalizeOpenSkyFleet(await response.json(), limit);
  if (!fleet.length) throw new SourceUnavailableError("OpenSky não retornou aeronaves com telemetria válida");
  return fleet;
}
