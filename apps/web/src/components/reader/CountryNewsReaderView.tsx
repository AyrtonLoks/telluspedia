"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Clock, ExternalLink, Newspaper, Quote, RefreshCw } from "lucide-react";
import type { CountryData } from "@/lib/country-data";
import type { CountryNewsEnvelope } from "@/lib/gdelt-types";
import { useReaderStore } from "@/stores/readerStore";
import { StudyContext } from "@/components/tellus-bridge/StudyContext";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/useT";
import { formatCountryName } from "@/lib/i18n/format";

interface CountryNewsReaderViewProps {
  country: CountryData;
}

function formatReaderNewsDate(iso: string, locale: string): string {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return iso;
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(ts)) + " UTC";
  } catch {
    return iso;
  }
}

export const CountryNewsReaderView: React.FC<CountryNewsReaderViewProps> = ({ country }) => {
  const { locale, t } = useI18n();
  const displayName = formatCountryName(country.iso2, country.nameCommon, locale);
  const setCitationModalOpen = useReaderStore((s) => s.setCitationModalOpen);
  const curatedSection = country.dossierSections?.find(
    (s) => s.dimension === "NEWS_CURRENT_AFFAIRS"
  );

  const [envelope, setEnvelope] = useState<CountryNewsEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshToken((v) => v + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/countries/${encodeURIComponent(country.isoCode)}/news`, {
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
  }, [country.isoCode, refreshToken]);

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
    ? t("news.liveBadgeFull", "Ao vivo · GDELT 2.0 Doc API")
    : meta?.stale
    ? t("news.staleBadgeFull", "Última leitura válida (cache)")
    : t("news.fallbackBadgeFull", "Provedor externo indisponível");

  return (
    <article
      data-testid="reader-country-news-view"
      className="max-h-[calc(85vh-6rem)] flex-1 overflow-y-auto px-6 py-4"
    >
      <div className="border-b border-line pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">NEWS_CURRENT_AFFAIRS</Badge>
            <Badge tone={badgeTone}>{badgeLabel}</Badge>
            {meta?.fetchedAt && (
              <span className="inline-flex items-center gap-1 font-mono text-caption tabular-nums text-fg-muted">
                <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                <span>{formatReaderNewsDate(meta.fetchedAt, locale)}</span>
              </span>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={triggerRefresh}
            disabled={loading}
          >
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{t("news.refresh", "Atualizar")}</span>
          </Button>
        </div>

        <h1 className="mt-4 font-serif text-display font-bold leading-snug text-fg">
          {t("news.readerTitlePrefix", "Atualidades Geopolíticas & Imprensa Internacional —")}{" "}
          {displayName}
        </h1>
        <p className="mt-1 text-caption text-fg-secondary">
          {t(
            "news.readerSubtitle",
            "Monitoramento indexado pela GDELT 2.0 Doc API (janela de 7 dias, cache SWR de 30 min e URLs HTTPS auditadas)."
          )}
        </p>
      </div>

      {curatedSection && (
        <section className="mt-6 space-y-3 rounded-card border border-line bg-surface-raised p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-title font-semibold text-fg">{curatedSection.title}</h2>
            <Badge tone="accent">{t("reader.curatedBadge", "Curado RN13")}</Badge>
          </div>
          <div className="space-y-3 font-serif text-body leading-relaxed text-fg">
            {curatedSection.contentMarkdown.split("\n\n").map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 text-title font-semibold text-fg">
            <Newspaper aria-hidden="true" className="h-5 w-5 text-accent" />
            <span>{t("news.feedHeading", "Manchetes recentes vinculadas ao território")}</span>
          </h2>
          <span className="font-mono text-caption tabular-nums text-fg-muted">
            {articles.length} {t("news.itemsSuffix", "registros")}
          </span>
        </div>

        {loading && !envelope ? (
          <div className="rounded-card border border-line bg-surface-raised p-5 text-label text-fg-secondary">
            {t("news.loadingText", "Buscando manchetes recentes auditadas na GDELT Project API…")}
          </div>
        ) : articles.length > 0 ? (
          <div className="space-y-2.5">
            {articles.map((article) => (
              <div
                key={article.id}
                data-testid="reader-news-card"
                className="rounded-card border border-line bg-surface-raised p-4 transition-colors duration-fast ease-out hover:border-line-strong"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 text-body font-semibold leading-snug text-fg hover:text-accent hover:underline"
                  >
                    <span>{article.title}</span>
                  </a>
                  <Badge tone="neutral">{article.domain}</Badge>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-caption text-fg-muted">
                  <span className="font-mono tabular-nums">
                    {formatReaderNewsDate(article.seenAt, locale)}
                    {article.language ? ` · ${article.language}` : ""}
                    {article.sourceCountry ? ` · ${article.sourceCountry}` : ""}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setCitationModalOpen(true, {
                          title: `${article.title} (${article.domain})`,
                          countryName: displayName,
                          dimensionName: "NEWS_CURRENT_AFFAIRS",
                          url: article.url,
                          accessDate: new Date(),
                          publicationYear: Number(article.seenAt.slice(0, 4)) || 2026,
                        });
                      }}
                    >
                      <Quote aria-hidden="true" className="h-3 w-3 text-accent" />
                      <span>{t("reader.generateCitation", "Gerar citação")}</span>
                    </Button>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClasses("secondary", "sm")}
                    >
                      <span>{t("news.readSource", "Fonte original")}</span>
                      <ExternalLink aria-hidden="true" className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            data-testid="reader-news-empty"
            className="space-y-3 rounded-card border border-line bg-surface-raised p-5"
          >
            <p className="text-body leading-relaxed text-fg-secondary">
              {meta?.source === "fallback"
                ? t(
                    "news.readerFallbackDetail",
                    "O provedor GDELT 2.0 Doc API não respondeu dentro do tempo limite ou encontra-se indisponível. Em conformidade com a política de integridade de dados (T03/T05), o TellusPedia não exibe manchetes simuladas."
                  )
                : t(
                    "news.degradedEmpty",
                    "Nenhuma manchete indexada nos últimos 7 dias para este recorte na GDELT 2.0."
                  )}
            </p>
            {meta?.reason && (
              <p className="font-mono text-caption text-fg-muted">
                {t("news.diagnosticLabel", "Diagnóstico T05:")} {meta.reason}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href="https://www.gdeltproject.org/"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("secondary", "sm")}
              >
                <span>GDELT Project</span>
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://news.un.org/"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("secondary", "sm")}
              >
                <span>UN News</span>
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}
      </section>

      <StudyContext entityId={`country:${country.isoCode}`} />
    </article>
  );
};
