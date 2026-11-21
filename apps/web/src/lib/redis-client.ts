import net from "node:net";
import tls from "node:tls";

const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_REDIS_TIMEOUT_MS = 1000;

export interface ParsedRedisUrl {
  host: string;
  port: number;
  tls: boolean;
  username?: string;
  password?: string;
  db: number;
}

export type RespValue = string | number | null | RespValue[];

export class RedisProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedisProtocolError";
  }
}

export function parseRedisUrl(rawUrl: string): ParsedRedisUrl | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    return null;
  }

  const host = parsed.hostname || "127.0.0.1";
  const port = parsed.port ? Number.parseInt(parsed.port, 10) : DEFAULT_REDIS_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }

  const pathSegment = parsed.pathname.replace(/^\/+/, "");
  let db = 0;
  if (pathSegment.length > 0) {
    if (!/^\d+$/.test(pathSegment)) return null;
    db = Number.parseInt(pathSegment, 10);
  }

  const username = parsed.username ? decodeURIComponent(parsed.username) : undefined;
  const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;

  return {
    host,
    port,
    tls: parsed.protocol === "rediss:",
    username,
    password,
    db,
  };
}

export function encodeRespCommand(args: readonly string[]): Buffer {
  const chunks: Buffer[] = [Buffer.from(`*${args.length}\r\n`, "utf8")];
  for (const arg of args) {
    const payload = Buffer.from(arg, "utf8");
    chunks.push(Buffer.from(`$${payload.byteLength}\r\n`, "utf8"), payload, Buffer.from("\r\n", "utf8"));
  }
  return Buffer.concat(chunks);
}

interface ParseResult {
  value: RespValue;
  nextOffset: number;
  isError?: boolean;
}

function findCrlf(buffer: Buffer, start: number): number {
  for (let i = start; i + 1 < buffer.length; i++) {
    if (buffer[i] === 0x0d && buffer[i + 1] === 0x0a) return i;
  }
  return -1;
}

export function parseRespValue(buffer: Buffer, offset = 0): ParseResult | null {
  if (offset >= buffer.length) return null;

  const prefix = String.fromCharCode(buffer[offset]);
  const lineEnd = findCrlf(buffer, offset + 1);
  if (lineEnd === -1) return null;

  const line = buffer.subarray(offset + 1, lineEnd).toString("utf8");

  if (prefix === "+") {
    return { value: line, nextOffset: lineEnd + 2 };
  }

  if (prefix === "-") {
    return { value: line, nextOffset: lineEnd + 2, isError: true };
  }

  if (prefix === ":") {
    const parsedInt = Number.parseInt(line, 10);
    if (!Number.isFinite(parsedInt)) {
      throw new RedisProtocolError("Malformed Redis integer reply");
    }
    return { value: parsedInt, nextOffset: lineEnd + 2 };
  }

  if (prefix === "$") {
    const byteLength = Number.parseInt(line, 10);
    if (!Number.isInteger(byteLength) || byteLength < -1) {
      throw new RedisProtocolError("Malformed Redis bulk string length");
    }
    if (byteLength === -1) {
      return { value: null, nextOffset: lineEnd + 2 };
    }
    const payloadStart = lineEnd + 2;
    const payloadEnd = payloadStart + byteLength;
    if (payloadEnd + 2 > buffer.length) return null;
    return {
      value: buffer.subarray(payloadStart, payloadEnd).toString("utf8"),
      nextOffset: payloadEnd + 2,
    };
  }

  if (prefix === "*") {
    const count = Number.parseInt(line, 10);
    if (!Number.isInteger(count) || count < -1) {
      throw new RedisProtocolError("Malformed Redis array length");
    }
    if (count === -1) {
      return { value: null, nextOffset: lineEnd + 2 };
    }
    const items: RespValue[] = [];
    let cursor = lineEnd + 2;
    for (let i = 0; i < count; i++) {
      const item = parseRespValue(buffer, cursor);
      if (!item) return null;
      if (item.isError) {
        throw new RedisProtocolError(String(item.value));
      }
      items.push(item.value);
      cursor = item.nextOffset;
    }
    return { value: items, nextOffset: cursor };
  }

  throw new RedisProtocolError(`Unsupported RESP prefix: ${prefix}`);
}

export async function executeRedisCommands(
  config: ParsedRedisUrl,
  commands: readonly (readonly string[])[],
  timeoutMs = DEFAULT_REDIS_TIMEOUT_MS
): Promise<RespValue[]> {
  const prologue: (readonly string[])[] = [];
  if (config.password !== undefined) {
    if (config.username) {
      prologue.push(["AUTH", config.username, config.password]);
    } else {
      prologue.push(["AUTH", config.password]);
    }
  }
  if (config.db > 0) {
    prologue.push(["SELECT", String(config.db)]);
  }

  const allCommands = [...prologue, ...commands];
  const payload = Buffer.concat(allCommands.map((cmd) => encodeRespCommand(cmd)));

  return new Promise<RespValue[]>((resolve, reject) => {
    let settled = false;
    let incoming: Buffer = Buffer.alloc(0);
    const replies: { value: RespValue; isError?: boolean }[] = [];

    const socket = config.tls
      ? tls.connect({
          host: config.host,
          port: config.port,
          minVersion: "TLSv1.2",
          servername: net.isIP(config.host) ? undefined : config.host,
        })
      : net.createConnection({
          host: config.host,
          port: config.port,
        });

    const cleanup = () => {
      socket.removeAllListeners();
      if (!socket.destroyed) {
        socket.destroy();
      }
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const succeed = (values: RespValue[]) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(values);
    };

    socket.setTimeout(timeoutMs);

    socket.on("timeout", () => {
      fail(new Error(`Redis request timed out after ${timeoutMs}ms`));
    });

    socket.on("error", (error) => {
      fail(error);
    });

    socket.on("close", () => {
      if (!settled) {
        fail(new Error("Redis connection closed before completing commands"));
      }
    });

    socket.on(config.tls ? "secureConnect" : "connect", () => {
      socket.write(payload);
    });

    socket.on("data", (chunk: Buffer) => {
      incoming = incoming.length === 0 ? chunk : Buffer.concat([incoming, chunk]);

      try {
        let offset = 0;
        while (replies.length < allCommands.length) {
          const parsed = parseRespValue(incoming, offset);
          if (!parsed) break;
          replies.push({ value: parsed.value, isError: parsed.isError });
          offset = parsed.nextOffset;
        }
        if (offset > 0) {
          incoming = incoming.subarray(offset);
        }

        if (replies.length === allCommands.length) {
          const firstError = replies.find((entry) => entry.isError);
          if (firstError) {
            fail(new RedisProtocolError(String(firstError.value)));
            return;
          }
          succeed(replies.slice(prologue.length).map((entry) => entry.value));
        }
      } catch (error) {
        fail(error instanceof Error ? error : new Error("Invalid Redis response"));
      }
    });
  });
}

export async function incrementRedisFixedWindow(
  rawUrl: string,
  key: string,
  ttlMs: number,
  timeoutMs = DEFAULT_REDIS_TIMEOUT_MS
): Promise<number> {
  const config = parseRedisUrl(rawUrl);
  if (!config) {
    throw new RedisProtocolError("Invalid REDIS_URL");
  }

  const replies = await executeRedisCommands(
    config,
    [
      ["INCR", key],
      ["PEXPIRE", key, String(Math.max(1000, Math.ceil(ttlMs)))],
    ],
    timeoutMs
  );

  const count = replies[0];
  if (typeof count !== "number" || !Number.isFinite(count)) {
    throw new RedisProtocolError("Unexpected INCR reply from Redis");
  }
  return count;
}
