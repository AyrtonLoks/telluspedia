"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";
import type { CountryNewsEnvelope } from "@/lib/gdelt-types";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { useGlobeStore } from "@/stores/globeStore";
import { useReaderStore } from "@/stores/readerStore";
import { preloadReaderMode } from "@/lib/panel-preload";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n/useT";

interface CountryNewsSectionProps {
  isoCode: string;
}

function formatShortUtcDate(iso: string, locale: string): string {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "";
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(new Date(ts));
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * Atualidades geopolíticas por país via GDELT 2.0 Doc API (D38 / RN13.8 / T05).
 * Nunca bloqueia o carregamento do país e oculta-se em épocas históricas/geológicas (RN09).
 */
export const CountryNewsSection: React.FC<CountryNewsSectionProps> = ({ isoCode }) => {
  const { locale, t } = useI18n();
  const epoch = useEpochState();
  const setReaderOpen = useGlobeStore((s) => s.setReaderOpen);
  const setActiveDimension = useReaderStore((s) => s.setActiveDimension);

  const [envelope, setEnvelope] = useState<CountryNewsEnvelope | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!epoch.isContemporary || !isoCode) return;
    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/countries/${encodeURIComponent(isoCode)}/news`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as CountryNewsEnvelope;
      })
      .then((json) => {
        if (!controller.signal.aborted) {
          setEnvelope(json);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setEnvelope(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [epoch.isContemporary, isoCode]);

  if (!epoch.isContemporary) return null;

  const articles = envelope?.data.articles ?? [];
  const meta = envelope?.meta;
  const badgeTone =
    meta?.source === "live" && !meta.stale
      ? "success"
      : meta?.stale
      ? "warning"
      : "neutral";
  const badgeLabel = loading
    ? t("news.loadingBadge", "Consultando…")
    : meta?.source === "live" && !meta.stale
    ? t("news.liveBadge", "Ao vivo · GDELT")
    : meta?.stale
    ? t("news.staleBadge", "Cache anterior")
    : t("news.fallbackBadge", "Indisponível");

  const openReaderNews = () => {
    setActiveDimension("NEWS_CURRENT_AFFAIRS");
    setReaderOpen(true);
  };

  return (
    <section
      data-testid="country-news-section"
      aria-label={t("news.sectionAria", "Atualidades geopolíticas via GDELT")}
      className="my-3 space-y-2 rounded-card border border-line bg-surface-raised p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-fg">
          <Newspaper aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
          <span>{t("news.sectionTitle", "Atualidades (GDELT 2.0)")}</span>
        </span>
        <Badge tone={badgeTone} title={meta?.reason || meta?.provider}>
          {badgeLabel}
        </Badge>
      </div>

      {loading && !envelope ? (
        <p className="text-caption text-fg-muted">
          {t("news.loadingText", "Buscando manchetes recentes auditadas na GDELT Project API…")}
        </p>
      ) : articles.length > 0 ? (
        <ul className="space-y-1.5">
          {articles.slice(0, 3).map((article) => (
            <li
              key={article.id}
              className="rounded-control border border-line bg-surface p-2 transition-colors duration-fast ease-out hover:border-line-strong"
            >
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="country-news-headline"
                className="block space-y-1 text-caption text-fg hover:text-accent"
              >
                <span className="line-clamp-2 font-medium leading-snug">{article.title}</span>
                <span className="flex items-center justify-between gap-2 font-mono text-caption tabular-nums text-fg-muted">
                  <span className="truncate">{article.domain}</span>
                  <span className="inline-flex shrink-0 items-center gap-1">
                    <span>{formatShortUtcDate(article.seenAt, locale)}</span>
                    <ExternalLink aria-hidden="true" className="h-3 w-3 text-accent" />
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p data-testid="country-news-degraded" className="text-caption leading-relaxed text-fg-secondary">
          {meta?.source === "fallback"
            ? t(
                "news.degradedUnavailable",
                "Feed GDELT temporariamente indisponível. Nenhuma manchete sintética é exibida."
              )
            : t(
                "news.degradedEmpty",
                "Nenhuma manchete indexada nos últimos 7 dias para este recorte na GDELT 2.0."
              )}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-line pt-2 text-caption">
        <button
          type="button"
          data-testid="country-news-open-reader"
          onMouseEnter={preloadReaderMode}
          onFocus={preloadReaderMode}
          onClick={openReaderNews}
          className="font-medium text-accent hover:text-accent-hover hover:underline"
        >
          {t("news.openInReader", "Abrir atualidades no dossiê →")}
        </button>
        <a
          href="https://www.gdeltproject.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-fg-muted hover:text-fg hover:underline"
        >
          <span>GDELT Project</span>
          <ExternalLink aria-hidden="true" className="h-3 w-3" />
        </a>
      </div>
    </section>
  );
};
