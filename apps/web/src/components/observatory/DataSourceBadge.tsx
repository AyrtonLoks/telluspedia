"use client";

import React from "react";
import type { ObservatoryMeta } from "@/lib/observatory-source";
import { Badge } from "@/components/ui/Badge";
import { type Tone } from "@/components/ui/tones";
import { useI18n, type TranslateFn } from "@/lib/i18n/useT";
import type { Locale } from "@/lib/i18n/types";

export type DataSourceStatus = "loading" | "live" | "stale" | "computed" | "fallback" | "offline";

const STATUS_STYLE: Record<DataSourceStatus, { label: string; tone: Tone; dot: "solid" | "hollow"; pulse: boolean }> = {
  loading: { label: "Carregando…", tone: "neutral", dot: "solid", pulse: true },
  live: { label: "Ao vivo", tone: "success", dot: "solid", pulse: true },
  stale: { label: "Ao vivo · desatualizado", tone: "warning", dot: "solid", pulse: false },
  computed: { label: "Calculado", tone: "accent", dot: "solid", pulse: false },
  // Ponto vazado: "Simulado" não pode depender só da cor para se diferenciar de "desatualizado".
  fallback: { label: "Simulado", tone: "warning", dot: "hollow", pulse: false },
  offline: { label: "Offline", tone: "neutral", dot: "solid", pulse: false },
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

function describe(meta: ObservatoryMeta, status: DataSourceStatus, locale: Locale, t: TranslateFn): string {
  const parts = [`${t("common.source", "Fonte")}: ${meta.provider}`];
  const fetched = new Date(meta.fetchedAt);
  if (fetched.getTime() > 0) {
    parts.push(`${t("obs.status.fetchedAt", "Obtido em")}: ${fetched.toLocaleString(locale)}`);
  }
  if (meta.reason) parts.push(`${t("obs.status.reason", "Motivo")}: ${meta.reason}`);
  if (status === "fallback") parts.push(t("obs.status.notLive", "Estes dados não são uma leitura ao vivo."));
  return parts.join("\n");
}

export const DataSourceBadge: React.FC<{
  meta: ObservatoryMeta;
  isLoading?: boolean;
  isOffline?: boolean;
  testId?: string;
}> = ({ meta, isLoading, isOffline, testId }) => {
  const { locale, t } = useI18n();
  const status = resolveDataSourceStatus(meta, { isLoading, isOffline });
  const style = STATUS_STYLE[status];

  return (
    <Badge
      data-testid={testId}
      data-source-status={status}
      title={status === "loading" ? undefined : describe(meta, status, locale, t)}
      tone={style.tone}
      dot={style.dot}
      pulse={style.pulse}
      className="cursor-help"
    >
      {t(`obs.status.${status}`, style.label)}
    </Badge>
  );
};
