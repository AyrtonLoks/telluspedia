"use client";

import React from "react";
import type { ObservatoryMeta } from "@/lib/observatory-source";

export type DataSourceStatus = "loading" | "live" | "stale" | "computed" | "fallback" | "offline";

const STATUS_STYLE: Record<DataSourceStatus, { label: string; text: string; dot: string; pulse: boolean }> = {
  loading: { label: "Carregando…", text: "text-slate-400", dot: "bg-slate-400", pulse: true },
  live: { label: "Ao vivo", text: "text-emerald-400", dot: "bg-emerald-400", pulse: true },
  stale: { label: "Ao vivo · desatualizado", text: "text-amber-300", dot: "bg-amber-300", pulse: false },
  computed: { label: "Calculado", text: "text-sky-300", dot: "bg-sky-300", pulse: false },
  fallback: { label: "Simulado", text: "text-amber-400", dot: "bg-amber-400", pulse: false },
  offline: { label: "Offline", text: "text-slate-400", dot: "bg-slate-500", pulse: false },
};

export function resolveDataSourceStatus(
  meta: ObservatoryMeta,
  opts: { isLoading?: boolean; isOffline?: boolean } = {}
): DataSourceStatus {
  if (opts.isLoading) return "loading";
  if (opts.isOffline) return "offline";
  if (meta.source === "live") return meta.stale ? "stale" : "live";
  return meta.source;
}

function describe(meta: ObservatoryMeta, status: DataSourceStatus): string {
  const parts = [`Fonte: ${meta.provider}`];
  const fetched = new Date(meta.fetchedAt);
  if (fetched.getTime() > 0) {
    parts.push(`Obtido em: ${fetched.toLocaleString("pt-BR")}`);
  }
  if (meta.reason) parts.push(`Motivo: ${meta.reason}`);
  if (status === "fallback") parts.push("Estes dados não são uma leitura ao vivo.");
  return parts.join("\n");
}

export const DataSourceBadge: React.FC<{
  meta: ObservatoryMeta;
  isLoading?: boolean;
  isOffline?: boolean;
  testId?: string;
}> = ({ meta, isLoading, isOffline, testId }) => {
  const status = resolveDataSourceStatus(meta, { isLoading, isOffline });
  const style = STATUS_STYLE[status];

  return (
    <span
      data-testid={testId}
      data-source-status={status}
      title={status === "loading" ? undefined : describe(meta, status)}
      className={`${style.text} font-medium flex items-center gap-1 cursor-help`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${style.pulse ? "animate-pulse" : ""}`} />
      {style.label}
    </span>
  );
};
