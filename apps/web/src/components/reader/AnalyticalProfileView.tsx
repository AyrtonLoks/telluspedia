"use client";

import React, { useMemo } from "react";
import {
  BarChart2,
  Compass,
  ExternalLink,
  Globe,
  Info,
  Quote,
  TrendingUp,
  Users,
} from "lucide-react";
import type { CountryData } from "@/lib/country-data";
import { buildCountryAnalyticalProfile } from "@/lib/country-analytics";
import { StudyContext } from "@/components/tellus-bridge/StudyContext";
import { useReaderStore } from "@/stores/readerStore";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useGlobeStore } from "@/stores/globeStore";
import { selectCountry } from "@/stores/actions";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { useI18n, type TranslateFn } from "@/lib/i18n/useT";
import { formatCountryName, formatNumber } from "@/lib/i18n/format";
import { WORLD_COUNTRIES_CATALOG } from "@/lib/country-data";

function localizeIndicatorLabel(code: string, fallback: string, t: TranslateFn): string {
  switch (code) {
    case "NY.GDP.MKTP.CD": return t("metrics.nominalGdp", fallback);
    case "NY.GDP.PCAP.CD": return t("metrics.gdpPerCapita", fallback);
    case "SP.POP.TOTL": return t("metrics.population", fallback);
    case "SP.DYN.LE00.IN": return t("metrics.lifeExpectancy", fallback);
    case "EG.FEC.RNEW.ZS": return t("metrics.renewableEnergy", fallback);
    case "EN.GHG.CO2.PC.CE.AR5": return t("metrics.co2PerCapita", fallback);
    case "MS.MIL.XPND.GD.ZS": return t("metrics.militaryExp", fallback);
    case "AG.SRF.TOTL.K2": return t("metrics.landArea", fallback);
    case "UNDP.HDI": return t("metrics.hdi", fallback);
    default: return fallback;
  }
}

export interface AnalyticalProfileViewProps {
  country: CountryData;
}

export const AnalyticalProfileView: React.FC<AnalyticalProfileViewProps> = ({ country }) => {
  const { locale, t, tRaw } = useI18n();
  const setCitationModalOpen = useReaderStore((s) => s.setCitationModalOpen);
  const setSelectedIsos = useComparatorStore((s) => s.setSelectedIsos);
  const openComparator = useComparatorStore((s) => s.openComparator);
  const setReaderOpen = useGlobeStore((s) => s.setReaderOpen);

  const profile = useMemo(() => buildCountryAnalyticalProfile(country), [country]);

  if (!profile) return null;

  const displayName = formatCountryName(country.iso2, profile.nameCommon, locale);
  const displayOfficial = profile.nameOfficial ? tRaw(`country.${country.isoCode}.official`, profile.nameOfficial) : null;
  const rawLocation = profile.region || profile.continent;
  const displayLocation = rawLocation ? tRaw(`region.${rawLocation}`, rawLocation) : null;
  const displayCurrency = profile.currencyLabel
    ? country.currencyName
      ? tRaw(`country.${country.isoCode}.currency`, country.currencyName) +
        (country.currencyCode ? ` (${country.currencyCode})` : "")
      : profile.currencyLabel
    : null;
  const formatAnalyticalVal = (raw: string) =>
    locale === "en"
      ? raw
          .replace(/trilhões/g, "trillion")
          .replace(/bilhões/g, "billion")
          .replace(/milhões/g, "million")
          .replace(/anos/g, "years")
          .replace(/do PIB/g, "of GDP")
          .replace(/hab\./g, "people")
          .replace(/(\d+),(\d+)/g, "$1.$2")
      : raw;
  const summarySentences =
    locale === "en"
      ? [
          `${displayName}${displayLocation ? ` is located in ${displayLocation}` : ""}${profile.capital ? ` with capital ${profile.capital}` : ""}.`,
          ...(country.summary ? [tRaw(`country.${country.isoCode}.summary`, country.summary)] : []),
        ]
      : profile.summarySentences;
  const unavailable = t("common.dataUnavailable", "Dado indisponível");
  const wikiHost = locale === "en" ? "en.wikipedia.org" : "pt.wikipedia.org";
  const worldBankCountryUrl = `https://data.worldbank.org/country/${encodeURIComponent(country.isoCode)}`;
  const wikipediaUrl = `https://${wikiHost}/wiki/${encodeURIComponent(displayName)}`;
  const wikidataUrl = country.wikidataQid
    ? `https://www.wikidata.org/wiki/${encodeURIComponent(country.wikidataQid)}`
    : null;

  const handleCiteProfile = () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/pais/${country.isoCode}`
        : `https://telluspedia.org/pais/${country.isoCode}`;

    setCitationModalOpen(true, {
      title: `${t("analytical.headingSuffix", "Perfil Analítico e Posição Global")}: ${displayName} (${country.isoCode})`,
      countryName: displayName,
      url,
      accessDate: new Date(),
      publicationYear: 2026,
    });
  };

  const handleCompareWithPeers = () => {
    const peerIsos = profile.peers.slice(0, 3).map((p) => p.isoCode);
    setSelectedIsos([country.isoCode, ...peerIsos]);
    setReaderOpen(false);
    openComparator();
  };

  const handleNavigatePeer = (iso: string) => {
    selectCountry(iso);
  };

  return (
    <article
      data-testid="reader-analytical-profile"
      className="max-h-[calc(85vh-6rem)] flex-1 overflow-y-auto px-6 py-4"
    >
      {/* Cabeçalho do Perfil Analítico */}
      <header className="mb-6 border-b border-line pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{t("analytical.badge", "Perfil Analítico & Posição Global")}</Badge>
            <Badge tone="neutral">{country.isoCode}</Badge>
            {profile.referenceDate && (
              <span className="font-mono text-caption tabular-nums text-fg-muted">
                Ref. WDI {profile.referenceDate}
              </span>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            data-testid="cite-analytical-profile"
            onClick={handleCiteProfile}
          >
            <Quote aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
            <span>{t("analytical.citeButton", "Citar Perfil Analítico")}</span>
          </Button>
        </div>

        <h1 className="mt-4 font-serif text-display font-bold leading-snug text-fg">
          {displayName} — {t("analytical.headingSuffix", "Perfil Analítico & Posição Global")}
        </h1>
        {displayOfficial && displayOfficial !== displayName && (
          <p className="mt-1 text-caption text-fg-secondary">{displayOfficial}</p>
        )}
      </header>

      {/* Síntese factual auditada (100% derivada de fontes oficiais) */}
      <section aria-label={t("analytical.summaryTitle", "Resumo factual auditado")} className="mb-6 space-y-3">
        <h2 className="flex items-center gap-2 text-title font-semibold text-fg">
          <Globe aria-hidden="true" className="h-4 w-4 text-accent" />
          <span>{t("analytical.summaryTitle", "Resumo Factual Auditado")}</span>
        </h2>

        {summarySentences.length > 0 && (
          <div className="space-y-2.5 font-serif text-body leading-relaxed text-fg-secondary">
            {summarySentences.map((sentence, idx) => (
              <p key={idx}>{sentence}</p>
            ))}
          </div>
        )}

        {/* Ficha administrativa e geográfica estruturada */}
        <dl className="grid grid-cols-2 gap-2.5 pt-2 sm:grid-cols-3">
          <div className="rounded-card border border-line bg-surface-raised p-3">
            <dt className="text-caption text-fg-muted">{t("inspector.capital", "Capital")}</dt>
            <dd className="mt-0.5 text-label font-medium text-fg">
              {profile.capital ?? unavailable}
            </dd>
          </div>
          <div className="rounded-card border border-line bg-surface-raised p-3">
            <dt className="text-caption text-fg-muted">{t("analytical.regionContinent", "Região / Continente")}</dt>
            <dd className="mt-0.5 text-label font-medium text-fg">
              {displayLocation || unavailable}
            </dd>
          </div>
          <div className="rounded-card border border-line bg-surface-raised p-3">
            <dt className="text-caption text-fg-muted">{t("metrics.currency", "Moeda")}</dt>
            <dd className="mt-0.5 text-label font-medium text-fg">
              {displayCurrency ?? unavailable}
            </dd>
          </div>
          <div className="rounded-card border border-line bg-surface-raised p-3">
            <dt className="text-caption text-fg-muted">{t("analytical.density", "Densidade demográfica")}</dt>
            <dd className="mt-0.5 font-mono text-label font-medium tabular-nums text-fg">
              {profile.populationDensityPerKm2 !== null
                ? `${formatNumber(profile.populationDensityPerKm2, locale)} ${t("analytical.densityUnit", "hab./km²")}`
                : unavailable}
            </dd>
          </div>
          <div className="rounded-card border border-line bg-surface-raised p-3">
            <dt className="text-caption text-fg-muted">{t("analytical.coordinates", "Coordenadas (Natural Earth)")}</dt>
            <dd className="mt-0.5 font-mono text-label font-medium tabular-nums text-fg">
              {profile.latitude !== null && profile.longitude !== null
                ? `${profile.latitude.toFixed(2)}°, ${profile.longitude.toFixed(2)}°`
                : unavailable}
            </dd>
          </div>
          <div className="rounded-card border border-line bg-surface-raised p-3">
            <dt className="text-caption text-fg-muted">{t("clock.timezone", "Fuso horário")}</dt>
            <dd className="mt-0.5 font-mono text-label font-medium text-fg">
              {profile.timezone ?? unavailable}
            </dd>
          </div>
        </dl>
      </section>

      {/* Ranking Global e Comparação Regional */}
      <section aria-label={t("analytical.rankingTitle", "Ranking global e comparação regional")} className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-title font-semibold text-fg">
            <TrendingUp aria-hidden="true" className="h-4 w-4 text-accent" />
            <span>{t("analytical.rankingTitle", "Posição Global & Média Regional")}</span>
          </h2>
          <span className="text-caption text-fg-muted">
            {t("analytical.rankingBase", "Base: 177 territórios Natural Earth · World Bank WDI (CC BY 4.0)")}
          </span>
        </div>

        {!profile.hasQuantitativeData ? (
          <div
            data-testid="analytical-no-quantitative-data"
            className="flex items-start gap-2.5 rounded-card border border-dashed border-line bg-surface-sunken p-4 text-label text-fg-secondary"
          >
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
            <p>
              {t("analytical.noQuantPrefix", "Não há séries quantitativas publicadas pelo Banco Mundial para")}{" "}
              <strong className="font-semibold text-fg">{displayName}</strong>.{" "}
              {t("analytical.noQuantSuffix", "Nenhum ranking ou estimativa sintética foi gerado.")}
            </p>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {profile.rankings.map((entry) => {
              const deltaPositive =
                entry.deltaVsRegionalAvgPct !== null && entry.deltaVsRegionalAvgPct >= 0;
              return (
                <div
                  key={entry.code}
                  data-testid={`analytical-rank-${entry.code}`}
                  className="flex flex-col justify-between gap-2 rounded-card border border-line bg-surface-raised p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-caption font-medium text-fg-secondary">
                        {localizeIndicatorLabel(entry.code, entry.label, t)}
                      </span>
                      <span className="mt-0.5 block font-mono text-title font-semibold tabular-nums text-fg">
                        {formatAnalyticalVal(entry.formattedValue)}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center rounded-control border border-accent/40 bg-accent/15 px-2 py-0.5 font-mono text-caption font-semibold tabular-nums text-accent">
                        #{entry.globalRank} / {entry.globalTotal}
                      </span>
                      <span className="mt-0.5 block font-mono text-caption tabular-nums text-fg-muted">
                        P{entry.globalPercentile} {t("analytical.globalPercentile", "global")}
                      </span>
                    </div>
                  </div>

                  {/* Barra de posição relativa no ranking global */}
                  <div
                    aria-hidden="true"
                    className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
                  >
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.max(4, entry.globalPercentile)}%` }}
                    />
                  </div>

                  {/* Comparação regional */}
                  {entry.regionalRank !== null &&
                    entry.regionalGroupName &&
                    entry.formattedRegionalAverage && (
                      <div className="flex flex-wrap items-center justify-between gap-1 text-caption text-fg-secondary">
                        <span>
                          {locale === "en"
                            ? `#${entry.regionalRank}/${entry.regionalTotal} ${t("analytical.inRegion", "em")} ${tRaw(`region.${entry.regionalGroupName}`, entry.regionalGroupName)}`
                            : `${entry.regionalRank}º/${entry.regionalTotal} em ${entry.regionalGroupName}`}
                        </span>
                        <span className="font-mono tabular-nums text-fg-muted">
                          {t("analytical.avg", "Média:")} {formatAnalyticalVal(entry.formattedRegionalAverage)}
                          {entry.deltaVsRegionalAvgPct !== null && (
                            <span
                              className={cn(
                                "ml-1.5 font-medium",
                                deltaPositive ? "text-success" : "text-warning"
                              )}
                            >
                              ({deltaPositive ? "+" : ""}
                              {formatNumber(entry.deltaVsRegionalAvgPct, locale)}%)
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                  {/* Rodapé de rastreabilidade RN02 */}
                  <div className="flex items-center justify-between gap-2 border-t border-line pt-2 text-caption text-fg-muted">
                    <span className="truncate font-mono tabular-nums">
                      {entry.code}
                      {entry.year ? ` · ${entry.year}` : ""}
                    </span>
                    <a
                      href={entry.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-accent hover:text-accent-hover hover:underline"
                    >
                      <span>{entry.sourcePrimary}</span>
                      <ExternalLink aria-hidden="true" className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {profile.missingIndicators.length > 0 && profile.hasQuantitativeData && (
          <p className="text-caption text-fg-muted">
            {t("analytical.missingPrefix", "Indicadores sem publicação oficial na base atual para")} {displayName}:{" "}
            {profile.missingIndicators
              .map((m) => `${localizeIndicatorLabel(m.code, m.label, t)} (${m.code})`)
              .join(", ")}.
          </p>
        )}
      </section>

      {/* Países mais próximos nos indicadores (Pares Comparáveis) */}
      {profile.peers.length > 0 && (
        <section aria-label={t("analytical.peersTitle", "Países mais próximos nos indicadores")} className="mb-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-title font-semibold text-fg">
              <Users aria-hidden="true" className="h-4 w-4 text-accent" />
              <span>{t("analytical.peersTitle", "Países mais próximos nos indicadores")}</span>
            </h2>

            <Button
              variant="secondary"
              size="sm"
              data-testid="compare-with-peers-button"
              onClick={handleCompareWithPeers}
            >
              <BarChart2 aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
              <span>{t("analytical.openInComparator", "Abrir no Comparador")}</span>
            </Button>
          </div>

          <p className="text-caption text-fg-muted">
            {t(
              "analytical.peersDesc",
              "Proximidade estatística calculada por distância padronizada (z-score) sobre os indicadores reais compartilhados (PIB, PIB per capita, população, expectativa de vida, renováveis e CO₂ per capita)."
            )}
          </p>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {profile.peers.map((peer) => {
              const peerName = formatCountryName(
                WORLD_COUNTRIES_CATALOG[peer.isoCode]?.iso2,
                peer.nameCommon,
                locale
              );
              return (
                <button
                  key={peer.isoCode}
                  type="button"
                  onClick={() => handleNavigatePeer(peer.isoCode)}
                  className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface-raised p-3 text-left transition-colors duration-fast ease-out hover:border-line-strong hover:bg-surface-hover"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-label font-semibold text-fg">
                        {peerName}
                      </span>
                      <span className="font-mono text-caption text-fg-muted">{peer.isoCode}</span>
                    </div>
                    <span className="block truncate text-caption text-fg-secondary">
                      {peer.region
                        ? tRaw(`region.${peer.region}`, peer.region)
                        : peer.continent
                        ? tRaw(`region.${peer.continent}`, peer.continent)
                        : t("analytical.globalCatalog", "Catálogo global")}
                      {peer.gdpPerCapita !== null
                        ? ` · ${t("choropleth.ind.NY.GDP.PCAP.CD.short", "PIB/hab.")} $ ${formatNumber(Math.round(peer.gdpPerCapita), locale)}`
                        : ""}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-control border border-line bg-surface px-2 py-0.5 font-mono text-caption tabular-nums text-fg-secondary">
                    {peer.similarityScore}%
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Fontes Primárias & Links Externos */}
      <footer className="mt-6 space-y-3 border-t border-line pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={worldBankCountryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("secondary", "sm")}
          >
            <Compass aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{t("common.worldBank", "Banco Mundial")} ({country.isoCode})</span>
            <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </a>
          <a
            href={wikipediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("secondary", "sm")}
          >
            <span>{t("common.wikipedia", "Wikipédia")} ({displayName})</span>
            <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </a>
          {wikidataUrl && (
            <a
              href={wikidataUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("secondary", "sm")}
            >
              <span>Wikidata ({country.wikidataQid})</span>
              <ExternalLink aria-hidden="true" className="h-3 w-3" />
            </a>
          )}
        </div>

        <StudyContext entityId={`country:${country.isoCode}`} />
      </footer>
    </article>
  );
};
