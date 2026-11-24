/**
 * Logger estruturado minimalista para rotas de servidor e provedores externos (T47).
 *
 * Em produção (`NODE_ENV === "production"` ou `LOG_FORMAT === "json"`), emite JSON compacto
 * de uma linha com `timestamp`, `level`, `route`, `provider`, `mode`, `durationMs`, `status`
 * e sanitização obrigatória para nunca vazar credenciais, tokens ou PII.
 */

export type ServerLogLevel = "info" | "warn" | "error";
export type ServerLogMode = "live" | "stale" | "fallback" | "computed";

export interface ServerLogInput {
  level: ServerLogLevel;
  route: string;
  message: string;
  provider?: string;
  mode?: ServerLogMode;
  durationMs?: number;
  status?: number;
  cache?: "hit" | "miss";
  reason?: string;
  error?: unknown;
  meta?: Record<string, unknown>;
}

export interface StructuredLogRecord {
  timestamp: string;
  level: ServerLogLevel;
  route: string;
  message: string;
  provider?: string;
  mode?: ServerLogMode;
  durationMs?: number;
  status?: number;
  cache?: "hit" | "miss";
  reason?: string;
  meta?: Record<string, string | number | boolean | null>;
}

export interface FormatLogOptions {
  now?: Date;
  json?: boolean;
}

const SENSITIVE_KEY_PATTERN =
  /pass(word|phrase)?|secret|token|api[-_]?key|auth(orization)?|cookie|session|credential|private[-_]?key|database[-_]?url|redis[-_]?url|email|phone|cpf|ssn|ip[-_]?address|client[-_]?ip/i;

const MAX_TEXT_LENGTH = 240;

/**
 * Remove segredos comuns (credenciais em URI, Bearer/Basic tokens, query keys e e-mails)
 * de strings antes de emitir logs estruturados.
 */
export function redactSensitiveText(input: string): string {
  let text = input
    // URLs com credenciais embutidas (postgres://user:pass@host, redis://:pass@host, https://user:pass@host)
    .replace(/([a-z][a-z0-9+.-]*:\/\/)([^/\s@]+)@/gi, "$1[REDACTED]@")
    // Connection strings inteiras de banco/redis que ainda contenham segmentos sensíveis
    .replace(/\b(postgres(?:ql)?|rediss?|mysql|mongodb(?:\+srv)?):\/\/[^\s"'`]+/gi, "$1://[REDACTED]")
    // Cabeçalhos ou trechos Bearer / Basic (preserva o esquema sem expor credencial)
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{6,}/gi, "$1 [REDACTED]")
    // Parâmetros de query ou pares chave=valor sensíveis (sem sobreescrever "Bearer [REDACTED]")
    .replace(
      /\b(api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|auth[_-]?token|token|secret|password|passwd|pwd|map[_-]?key|client[_-]?secret|authorization)\s*([=:])\s*(?!(?:Bearer|Basic)\s+\[REDACTED\])([^\s&,;"'<>]+)/gi,
      "$1$2[REDACTED]"
    )
    // Endereços de e-mail (PII)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length > MAX_TEXT_LENGTH) {
    text = `${text.slice(0, MAX_TEXT_LENGTH - 1)}…`;
  }
  return text;
}

/**
 * Extrai uma descrição segura de erro sem expor stack traces nem segredos de conexão.
 */
export function safeErrorLabel(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    const base = code ? `${error.name}:${code}` : error.name;
    const message = error.message ? redactSensitiveText(error.message) : "";
    if (!message || message === base) return base;
    // Evita duplicar segredos em mensagens longas de drivers de banco
    if (/\[REDACTED\]/.test(message)) return `${base} (${message})`;
    return `${base}: ${message}`;
  }
  if (typeof error === "string" && error.trim()) {
    return redactSensitiveText(error);
  }
  return "UnknownError";
}

function sanitizeMetaValue(key: string, value: unknown): string | number | boolean | null | undefined {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return "[REDACTED]";
  }
  if (value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return redactSensitiveText(value);
  if (value instanceof Error) return safeErrorLabel(value);
  return undefined;
}

function sanitizeMeta(
  meta: Record<string, unknown> | undefined
): Record<string, string | number | boolean | null> | undefined {
  if (!meta) return undefined;
  const sanitized: Record<string, string | number | boolean | null> = {};
  let hasKeys = false;
  for (const [key, rawValue] of Object.entries(meta)) {
    const value = sanitizeMetaValue(key, rawValue);
    if (value !== undefined) {
      sanitized[key] = value;
      hasKeys = true;
    }
  }
  return hasKeys ? sanitized : undefined;
}

export function buildStructuredLogRecord(
  input: ServerLogInput,
  now: Date = new Date()
): StructuredLogRecord {
  const record: StructuredLogRecord = {
    timestamp: now.toISOString(),
    level: input.level,
    route: redactSensitiveText(input.route),
    message: redactSensitiveText(input.message),
  };

  if (input.provider) record.provider = redactSensitiveText(input.provider);
  if (input.mode) record.mode = input.mode;
  if (typeof input.durationMs === "number" && Number.isFinite(input.durationMs)) {
    record.durationMs = Math.max(0, Math.round(input.durationMs));
  }
  if (typeof input.status === "number" && Number.isFinite(input.status)) {
    record.status = Math.trunc(input.status);
  }
  if (input.cache) record.cache = input.cache;

  const reason = input.reason
    ? redactSensitiveText(input.reason)
    : input.error !== undefined
      ? safeErrorLabel(input.error)
      : undefined;
  if (reason) record.reason = reason;

  const meta = sanitizeMeta(input.meta);
  if (meta) record.meta = meta;

  return record;
}

function isJsonLogEnabled(explicit?: boolean): boolean {
  if (typeof explicit === "boolean") return explicit;
  if (process.env.LOG_FORMAT === "json") return true;
  if (process.env.LOG_FORMAT === "pretty") return false;
  return process.env.NODE_ENV === "production";
}

export function formatServerLog(input: ServerLogInput, options: FormatLogOptions = {}): string {
  const record = buildStructuredLogRecord(input, options.now);
  if (isJsonLogEnabled(options.json)) {
    return JSON.stringify(record);
  }

  const parts = [`[${record.route}]`, record.message];
  if (record.provider) parts.push(`provider=${record.provider}`);
  if (record.mode) parts.push(`mode=${record.mode}`);
  if (record.status !== undefined) parts.push(`status=${record.status}`);
  if (record.durationMs !== undefined) parts.push(`durationMs=${record.durationMs}`);
  if (record.cache) parts.push(`cache=${record.cache}`);
  if (record.reason) parts.push(`reason=${record.reason}`);
  if (record.meta) parts.push(JSON.stringify(record.meta));
  return parts.join(" ");
}

/**
 * Emite log estruturado respeitando `console.info` / `console.warn` / `console.error`
 * (mantém compatibilidade com mocks de teste e evita overlay de `console.error` em dev).
 */
export function logServerEvent(input: ServerLogInput, options: FormatLogOptions = {}): StructuredLogRecord {
  const record = buildStructuredLogRecord(input, options.now);
  const line = isJsonLogEnabled(options.json)
    ? JSON.stringify(record)
    : formatServerLog(input, { ...options, json: false });

  if (input.level === "error") {
    console.error(line);
  } else if (input.level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }

  return record;
}

export const serverLogger = {
  info: (input: Omit<ServerLogInput, "level">, options?: FormatLogOptions) =>
    logServerEvent({ ...input, level: "info" }, options),
  warn: (input: Omit<ServerLogInput, "level">, options?: FormatLogOptions) =>
    logServerEvent({ ...input, level: "warn" }, options),
  error: (input: Omit<ServerLogInput, "level">, options?: FormatLogOptions) =>
    logServerEvent({ ...input, level: "error" }, options),
};
