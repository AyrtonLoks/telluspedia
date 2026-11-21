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

export interface AnalyticalProfileViewProps {
  country: CountryData;
}

export const AnalyticalProfileView: React.FC<AnalyticalProfileViewProps> = ({ country }) => {
  const setCitationModalOpen = useReaderStore((s) => s.setCitationModalOpen);
  const setSelectedIsos = useComparatorStore((s) => s.setSelectedIsos);
  const openComparator = useComparatorStore((s) => s.openComparator);
  const setReaderOpen = useGlobeStore((s) => s.setReaderOpen);

  const profile = useMemo(() => buildCountryAnalyticalProfile(country), [country]);

  if (!profile) return null;

  const worldBankCountryUrl = `https://data.worldbank.org/country/${encodeURIComponent(country.isoCode)}`;
  const wikipediaUrl = `https://pt.wikipedia.org/wiki/${encodeURIComponent(country.nameCommon)}`;
  const wikidataUrl = country.wikidataQid
    ? `https://www.wikidata.org/wiki/${encodeURIComponent(country.wikidataQid)}`
    : null;

  const handleCiteProfile = () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/pais/${country.isoCode}`
        : `https://telluspedia.org/pais/${country.isoCode}`;

    setCitationModalOpen(true, {
      title: `Perfil Analítico e Posição Global: ${country.nameCommon} (${country.isoCode})`,
      countryName: country.nameCommon,
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
            <Badge tone="accent">Perfil Analítico &amp; Posição Global</Badge>
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
            <span>Citar Perfil Analítico</span>
          </Button>
        </div>

        <h1 className="mt-4 font-serif text-display font-bold leading-snug text-fg">
          {profile.nameCommon} — Perfil Analítico &amp; Posição Global
        </h1>
        {profile.nameOfficial && profile.nameOfficial !== profile.nameCommon && (
          <p className="mt-1 text-caption text-fg-secondary">{profile.nameOfficial}</p>
        )}
      </header>

      {/* Síntese factual auditada (100% derivada de fontes oficiais) */}
      <section aria-label="Resumo factual auditado" className="mb-6 space-y-3">
        <h2 className="flex items-center gap-2 text-title font-semibold text-fg">
          <Globe aria-hidden="true" className="h-4 w-4 text-accent" />
          <span>Resumo Factual Auditado</span>
        </h2>

        {profile.summarySentences.length > 0 && (
          <div className="space-y-2.5 font-serif text-body leading-relaxed text-fg-secondary">
            {profile.summarySentences.map((sentence, idx) => (
              <p key={idx}>{sentence}</p>
            ))}
          </div>
        )}

        {/* Ficha administrativa e geográfica estruturada */}
        <dl className="grid grid-cols-2 gap-2.5 pt-2 sm:grid-cols-3">
          <div className="rounded-card border border-line bg-surface-raised p-3">
            <dt className="text-caption text-fg-muted">Capital</dt>
            <dd className="mt-0.5 text-label font-medium text-fg">
              {profile.capital ?? "Dado indisponível"}
            </dd>
          </div>
          <div className="rounded-card border border-line bg-surface-raised p-3">
            <dt className="text-caption text-fg-muted">Região / Continente</dt>
            <dd className="mt-0.5 text-label font-medium text-fg">
              {profile.region || profile.continent || "Dado indisponível"}
            </dd>
          </div>
          <div className="rounded-card border border-line bg-surface-raised p-3">
            <dt className="text-caption text-fg-muted">Moeda</dt>
            <dd className="mt-0.5 text-label font-medium text-fg">
              {profile.currencyLabel ?? "Dado indisponível"}
            </dd>
          </div>
          <div className="rounded-card border border-line bg-surface-raised p-3">
            <dt className="text-caption text-fg-muted">Densidade demográfica</dt>
            <dd className="mt-0.5 font-mono text-label font-medium tabular-nums text-fg">
              {profile.populationDensityPerKm2 !== null
                ? `${profile.populationDensityPerKm2.toLocaleString("pt-BR")} hab./km²`
                : "Dado indisponível"}
            </dd>
          </div>
          <div className="rounded-card border border-line bg-surface-raised p-3">
            <dt className="text-caption text-fg-muted">Coordenadas (Natural Earth)</dt>
            <dd className="mt-0.5 font-mono text-label font-medium tabular-nums text-fg">
              {profile.latitude !== null && profile.longitude !== null
                ? `${profile.latitude.toFixed(2)}°, ${profile.longitude.toFixed(2)}°`
                : "Dado indisponível"}
            </dd>
          </div>
          <div className="rounded-card border border-line bg-surface-raised p-3">
            <dt className="text-caption text-fg-muted">Fuso horário</dt>
            <dd className="mt-0.5 font-mono text-label font-medium text-fg">
              {profile.timezone ?? "Dado indisponível"}
            </dd>
          </div>
        </dl>
      </section>

      {/* Ranking Global e Comparação Regional */}
      <section aria-label="Ranking global e comparação regional" className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-title font-semibold text-fg">
            <TrendingUp aria-hidden="true" className="h-4 w-4 text-accent" />
            <span>Posição Global &amp; Média Regional</span>
          </h2>
          <span className="text-caption text-fg-muted">
            Base: 177 territórios Natural Earth · World Bank WDI (CC BY 4.0)
          </span>
        </div>

        {!profile.hasQuantitativeData ? (
          <div
            data-testid="analytical-no-quantitative-data"
            className="flex items-start gap-2.5 rounded-card border border-dashed border-line bg-surface-sunken p-4 text-label text-fg-secondary"
          >
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
            <p>
              Não há séries quantitativas publicadas pelo Banco Mundial para{" "}
              <strong className="font-semibold text-fg">{profile.nameCommon}</strong>. Nenhum
              ranking ou estimativa sintética foi gerado.
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
                        {entry.label}
                      </span>
                      <span className="mt-0.5 block font-mono text-title font-semibold tabular-nums text-fg">
                        {entry.formattedValue}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center rounded-control border border-accent/40 bg-accent/15 px-2 py-0.5 font-mono text-caption font-semibold tabular-nums text-accent">
                        #{entry.globalRank} / {entry.globalTotal}
                      </span>
                      <span className="mt-0.5 block font-mono text-caption tabular-nums text-fg-muted">
                        P{entry.globalPercentile} global
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
                          {entry.regionalRank}º/{entry.regionalTotal} em {entry.regionalGroupName}
                        </span>
                        <span className="font-mono tabular-nums text-fg-muted">
                          Média: {entry.formattedRegionalAverage}
                          {entry.deltaVsRegionalAvgPct !== null && (
                            <span
                              className={cn(
                                "ml-1.5 font-medium",
                                deltaPositive ? "text-success" : "text-warning"
                              )}
                            >
                              ({deltaPositive ? "+" : ""}
                              {entry.deltaVsRegionalAvgPct.toLocaleString("pt-BR")}%)
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
            Indicadores sem publicação oficial na base atual para {profile.nameCommon}:{" "}
            {profile.missingIndicators.map((m) => `${m.label} (${m.code})`).join(", ")}.
          </p>
        )}
      </section>

      {/* Países mais próximos nos indicadores (Pares Comparáveis) */}
      {profile.peers.length > 0 && (
        <section aria-label="Países mais próximos nos indicadores" className="mb-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-title font-semibold text-fg">
              <Users aria-hidden="true" className="h-4 w-4 text-accent" />
              <span>Países mais próximos nos indicadores</span>
            </h2>

            <Button
              variant="secondary"
              size="sm"
              data-testid="compare-with-peers-button"
              onClick={handleCompareWithPeers}
            >
              <BarChart2 aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
              <span>Abrir no Comparador</span>
            </Button>
          </div>

          <p className="text-caption text-fg-muted">
            Proximidade estatística calculada por distância padronizada (z-score) sobre os
            indicadores reais compartilhados (PIB, PIB per capita, população, expectativa de vida,
            renováveis e CO₂ per capita).
          </p>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {profile.peers.map((peer) => (
              <button
                key={peer.isoCode}
                type="button"
                onClick={() => handleNavigatePeer(peer.isoCode)}
                className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface-raised p-3 text-left transition-colors duration-fast ease-out hover:border-line-strong hover:bg-surface-hover"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-label font-semibold text-fg">
                      {peer.nameCommon}
                    </span>
                    <span className="font-mono text-caption text-fg-muted">{peer.isoCode}</span>
                  </div>
                  <span className="block truncate text-caption text-fg-secondary">
                    {peer.region || peer.continent || "Catálogo global"}
                    {peer.gdpPerCapita !== null
                      ? ` · PIB/hab. $ ${Math.round(peer.gdpPerCapita).toLocaleString("pt-BR")}`
                      : ""}
                  </span>
                </div>
                <span className="shrink-0 rounded-control border border-line bg-surface px-2 py-0.5 font-mono text-caption tabular-nums text-fg-secondary">
                  {peer.similarityScore}%
                </span>
              </button>
            ))}
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
            <span>Banco Mundial ({country.isoCode})</span>
            <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </a>
          <a
            href={wikipediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("secondary", "sm")}
          >
            <span>Wikipédia ({country.nameCommon})</span>
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
