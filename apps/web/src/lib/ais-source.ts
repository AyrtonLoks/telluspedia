import { AIS_MESSAGE_TYPES, createAisAccumulator } from "./ais-accumulator";
import { AIS_REGIONS, type AisSnapshot } from "./ais-data";
import { simulatedAisSnapshot } from "./ais-demo";
import { createObservatorySource, SourceUnavailableError } from "./observatory-source";

const STREAM_URL = "wss://stream.aisstream.io/v0/stream";
const IDLE_TIMEOUT_MS = 90_000;
const INITIAL_WAIT_MS = 1800;
const OPEN_TIMEOUT_MS = 10_000;

export function createAisFeed(openSocket = () => new WebSocket(STREAM_URL)) {
  const fleet = createAisAccumulator();
  const decoder = new TextDecoder();
  let socket: WebSocket | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let reconnectAt = 0;
  let retries = 0;
  let startup: Promise<void> | undefined;

  function connect(apiKey: string) {
    if (socket || Date.now() < reconnectAt) return;
    const stream = openSocket();
    stream.binaryType = "arraybuffer";
    socket = stream;

    let ready: () => void = () => {};
    startup = new Promise<void>((resolve) => { ready = resolve; });
    const startupTimer = setTimeout(ready, INITIAL_WAIT_MS);
    let closed = false;
    function finishStartup() {
      clearTimeout(startupTimer);
      ready();
    }
    function closeStream(scheduleBackoff: boolean) {
      if (closed) return;
      closed = true;
      clearTimeout(openTimer);
      finishStartup();
      if (socket === stream) {
        socket = null;
        if (scheduleBackoff) {
          reconnectAt = Date.now() + Math.min(60_000, 2500 * 2 ** retries) + Math.random() * 1000;
          retries = Math.min(6, retries + 1);
        }
      }
      // Guarda contra reentrância: no WebSocket do Node/undici, `close()` em CONNECTING (0)
      // dispara `"error"` sincronamente antes de encerrar o handshake.
      if (stream.readyState === 0 || stream.readyState === 1) {
        try {
          stream.close();
        } catch {
          // Ignora erro se o socket já estiver em encerramento.
        }
      }
    }
    const openTimer = setTimeout(() => closeStream(true), OPEN_TIMEOUT_MS);

    stream.addEventListener("open", () => {
      if (socket !== stream || closed) return;
      clearTimeout(openTimer);
      try {
        stream.send(JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: AIS_REGIONS.map(({ south, west, north, east }) => [[south, west], [north, east]]),
          FilterMessageTypes: AIS_MESSAGE_TYPES,
        }));
      } catch {
        closeStream(true);
      }
    });
    stream.addEventListener("message", (event) => {
      if (socket !== stream || closed) return;
      const raw = event.data;
      if (typeof raw !== "string" && !(raw instanceof ArrayBuffer)) return;
      const body = typeof raw === "string" ? raw : decoder.decode(raw);
      try {
        const frame = JSON.parse(body);
        if (frame?.MessageType === "SubscriptionConfirmation") retries = 0;
        if (frame?.error) {
          closeStream(true);
          return;
        }
        fleet.ingest(frame, Date.now());
      } catch {
        // Malformed frames have no effect on the last valid report.
      }
    });
    stream.addEventListener("error", () => closeStream(true));
    stream.addEventListener("close", () => closeStream(true));
  }

  async function snapshot(apiKey: string): Promise<AisSnapshot> {
    connect(apiKey);
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      const idleSocket = socket;
      socket = null;
      if (idleSocket && (idleSocket.readyState === 0 || idleSocket.readyState === 1)) {
        try {
          idleSocket.close();
        } catch {
          // Ignora falha ao fechar socket ocioso.
        }
      }
    }, IDLE_TIMEOUT_MS);
    idleTimer.unref?.();

    let data = fleet.snapshot(Date.now());
    if (data.vessels.length === 0) {
      await startup;
      data = fleet.snapshot(Date.now());
    }
    if (!socket || socket.readyState !== 1 || data.vessels.length === 0) {
      throw new SourceUnavailableError("Fluxo AIS indisponível ou sem posições recentes na cobertura");
    }
    return data;
  }

  return { snapshot };
}

const feed = createAisFeed();
export const aisSource = createObservatorySource({
  name: "ais",
  liveProvider: "AIS Stream",
  liveTtlMs: 15_000,
  lastGoodMaxAgeMs: 60_000,
  fetchLive: () => {
    const apiKey = process.env.AISSTREAM_API_KEY?.trim();
    if (!apiKey) throw new SourceUnavailableError("AIS Stream ainda não configurado no servidor");
    return feed.snapshot(apiKey);
  },
  fallback: simulatedAisSnapshot,
});
