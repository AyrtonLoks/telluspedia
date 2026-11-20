"use client";

import React from "react";
import { Users, Maximize2, DollarSign, Award, Landmark, HeartPulse, Shield, ExternalLink, Quote, Info } from "lucide-react";
import { getSourceUrl } from "@/lib/citations";
import { DataCompleteness } from "@/lib/country-data";
import { useReaderStore } from "@/stores/readerStore";

interface CountryMetricsGridProps {
  countryName?: string;
  isoCode?: string;
  population: number | null;
  areaKm2: number | null;
  currencyCode: string | null;
  currencyName: string | null;
  governmentType: string | null;
  headOfState: string | null;
  historicalLeader?: string;
  leaderTitle?: string;
  isHistoricalEntity?: boolean;
  completeness?: DataCompleteness;
  indicators?: {
    indicatorCode: string;
    indicatorName: string;
    value: number;
    unit: string;
    sourcePrimary?: string;
    year?: number;
    category?: string;
  }[];
}

export function formatSourceBadge(source: string): string {
  if (!source) return "Oficial";
  if (source.includes("Banco Mundial") && source.includes("IBGE")) return "IBGE / BM";
  if (source.includes("Banco Mundial") && source.includes("BEA")) return "B. Mundial / BEA";
  if (source.includes("Banco Mundial")) return "B. Mundial";
  if (source.includes("US Census")) return "US Census";
  if (source.includes("E-Stat")) return "E-Stat";
  if (source.includes("Stats SA")) return "Stats SA";
  if (source.includes("Destatis")) return "Destatis";
  if (source.includes("CAPMAS")) return "CAPMAS";
  if (source.includes("IBGE")) return "IBGE";
  if (source.includes("PNUD")) return "PNUD";
  if (source.includes("OMS") || source.includes("WHO")) return "OMS";
  if (source.includes("SIPRI")) return "SIPRI";
  if (source.includes("Natural Earth")) return "Natural Earth";
  if (source.length <= 12) return source;
  return source.slice(0, 10) + "…";
}

export const CountryMetricsGrid: React.FC<CountryMetricsGridProps> = ({
  countryName = "TellusPedia",
  isoCode,
  population,
  areaKm2,
  currencyCode,
  currencyName,
  governmentType,
  headOfState,
  historicalLeader,
  leaderTitle,
  isHistoricalEntity,
  completeness,
  indicators,
}) => {
  const setCitationModalOpen = useReaderStore((s) => s.setCitationModalOpen);

  const popIndicator = indicators?.find((i) => i.indicatorCode === "SP.POP.TOTL");
  const gdpIndicator = indicators?.find((i) => i.indicatorCode === "NY.GDP.MKTP.CD");
  const hdiIndicator = indicators?.find((i) => i.indicatorCode === "UNDP.HDI");
  const lifeExpectancy = indicators?.find((i) => i.indicatorCode === "SP.DYN.LE00.IN");
  const militaryExp = indicators?.find((i) => i.indicatorCode === "MS.MIL.XPND.GD.ZS");

  const popSource = popIndicator?.sourcePrimary || "Banco Mundial";
  const areaSource = "Natural Earth";
  const gdpSource = gdpIndicator?.sourcePrimary || "Banco Mundial";
  const hdiSource = hdiIndicator?.sourcePrimary || "PNUD";
  const lifeSource = lifeExpectancy?.sourcePrimary || "OMS";
  const milSource = militaryExp?.sourcePrimary || "SIPRI";

  const formatPop = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)} bilhões`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)} milhões`;
    return num.toLocaleString("pt-BR");
  };

  const formatGdp = (val?: number) => {
    if (val === undefined || val === null) return "Dado indisponível";
    if (val >= 1e12) return `$ ${(val / 1e12).toFixed(2)} trilhões`;
    if (val >= 1e9) return `$ ${(val / 1e9).toFixed(1)} bilhões`;
    return `$ ${val.toLocaleString("pt-BR")}`;
  };

  const hasAnyMetric =
    population !== null ||
    areaKm2 !== null ||
    gdpIndicator !== undefined ||
    hdiIndicator !== undefined ||
    lifeExpectancy !== undefined ||
    militaryExp !== undefined ||
    governmentType !== null ||
    headOfState !== null ||
    currencyCode !== null ||
    currencyName !== null ||
    Boolean(historicalLeader);

  if (completeness === "none" && !hasAnyMetric) {
    return (
      <div
        data-testid="country-data-unavailable"
        className="space-y-2 rounded-card border border-line bg-surface-raised p-3.5 text-label"
      >
        <div className="flex items-center gap-2 font-semibold text-fg">
          <Info aria-hidden="true" className="h-4 w-4 shrink-0 text-warning" />
          <span>Indicadores ainda indisponíveis</span>
        </div>
        <p className="text-caption text-fg-secondary">
          Os dados demográficos, econômicos e institucionais de {countryName} ainda não foram
          ingeridos na base local do TellusPedia. Consulte diretamente as fontes externas oficiais:
        </p>
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {isoCode && !isHistoricalEntity && (
            <a
              href={`https://data.worldbank.org/country/${encodeURIComponent(isoCode)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-control border border-line-strong bg-surface px-2 py-1 text-caption font-medium text-fg transition-colors duration-fast ease-out hover:bg-surface-hover"
            >
              <span>Banco Mundial ({isoCode})</span>
              <ExternalLink aria-hidden="true" className="h-3 w-3" />
            </a>
          )}
          <a
            href={`https://pt.wikipedia.org/wiki/${encodeURIComponent(countryName)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-control border border-line-strong bg-surface px-2 py-1 text-caption font-medium text-fg transition-colors duration-fast ease-out hover:bg-surface-hover"
          >
            <span>Wikipédia</span>
            <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  const hasGovernmentBlock =
    Boolean(governmentType) ||
    Boolean(headOfState) ||
    Boolean(historicalLeader) ||
    Boolean(currencyName) ||
    Boolean(currencyCode);

  return (
    <div className="grid grid-cols-2 gap-2 text-label">
      {/* População */}
      <div className="flex flex-col justify-between rounded-card border border-line bg-surface-raised p-2.5">
        <div className="mb-1 flex items-center justify-between gap-1 text-caption text-fg-secondary">
          <div className="flex items-center gap-1.5 truncate">
            <Users aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
            <span className="truncate">População</span>
          </div>
          {population !== null && (
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={getSourceUrl(popSource, "SP.POP.TOTL")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 rounded-sm px-1 text-caption text-accent hover:text-accent-hover hover:underline"
                title={`Fonte Primária: ${popSource} (Abrir Repositório)`}
              >
                <span>{formatSourceBadge(popSource)}</span>
                <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCitationModalOpen(true, {
                    title: `População Total (${formatPop(population)})`,
                    countryName,
                    url: getSourceUrl(popSource, "SP.POP.TOTL"),
                    accessDate: new Date(),
                    publicationYear: 2026,
                  });
                }}
                className="rounded-sm p-1 text-fg-muted transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-fg"
                title="Gerar citação deste indicador"
                aria-label="Gerar citação deste indicador"
              >
                <Quote aria-hidden="true" className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        <div
          className={
            population !== null
              ? "font-mono text-body font-medium tabular-nums text-fg"
              : "text-label text-fg-muted"
          }
        >
          {population !== null ? formatPop(population) : "Dado indisponível"}
        </div>
      </div>

      {/* Área */}
      <div className="flex flex-col justify-between rounded-card border border-line bg-surface-raised p-2.5">
        <div className="mb-1 flex items-center justify-between gap-1 text-caption text-fg-secondary">
          <div className="flex items-center gap-1.5 truncate">
            <Maximize2 aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
            <span className="truncate">Área Territorial</span>
          </div>
          {areaKm2 !== null && (
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={getSourceUrl(areaSource)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 rounded-sm px-1 text-caption text-accent hover:text-accent-hover hover:underline"
                title={`Fonte Primária: ${areaSource} (1:110m) (Abrir Repositório)`}
              >
                <span>{formatSourceBadge(areaSource)}</span>
                <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCitationModalOpen(true, {
                    title: `Área Territorial (${areaKm2.toLocaleString("pt-BR")} km²)`,
                    countryName,
                    url: getSourceUrl(areaSource),
                    accessDate: new Date(),
                    publicationYear: 2026,
                  });
                }}
                className="rounded-sm p-1 text-fg-muted transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-fg"
                title="Gerar citação deste indicador"
                aria-label="Gerar citação deste indicador"
              >
                <Quote aria-hidden="true" className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        <div
          className={
            areaKm2 !== null
              ? "font-mono text-body font-medium tabular-nums text-fg"
              : "text-label text-fg-muted"
          }
        >
          {areaKm2 !== null ? `${areaKm2.toLocaleString("pt-BR")} km²` : "Dado indisponível"}
        </div>
      </div>

      {/* PIB */}
      <div className="flex flex-col justify-between rounded-card border border-line bg-surface-raised p-2.5">
        <div className="mb-1 flex items-center justify-between gap-1 text-caption text-fg-secondary">
          <div className="flex items-center gap-1.5 truncate">
            <DollarSign aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
            <span className="truncate">PIB Nominal</span>
          </div>
          {gdpIndicator !== undefined && (
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={getSourceUrl(gdpSource, "NY.GDP.MKTP.CD")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 rounded-sm px-1 text-caption text-accent hover:text-accent-hover hover:underline"
                title={`Fonte Primária: ${gdpSource} (Abrir Repositório)`}
              >
                <span>{formatSourceBadge(gdpSource)}</span>
                <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCitationModalOpen(true, {
                    title: `PIB Nominal (${formatGdp(gdpIndicator.value)})`,
                    countryName,
                    url: getSourceUrl(gdpSource, "NY.GDP.MKTP.CD"),
                    accessDate: new Date(),
                    publicationYear: 2026,
                  });
                }}
                className="rounded-sm p-1 text-fg-muted transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-fg"
                title="Gerar citação deste indicador"
                aria-label="Gerar citação deste indicador"
              >
                <Quote aria-hidden="true" className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        <div
          className={
            gdpIndicator !== undefined
              ? "font-mono text-body font-medium tabular-nums text-fg"
              : "text-label text-fg-muted"
          }
        >
          {formatGdp(gdpIndicator?.value)}
        </div>
      </div>

      {/* IDH */}
      <div className="flex flex-col justify-between rounded-card border border-line bg-surface-raised p-2.5">
        <div className="mb-1 flex items-center justify-between gap-1 text-caption text-fg-secondary">
          <div className="flex items-center gap-1.5 truncate">
            <Award aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
            <span className="truncate">IDH Geral</span>
          </div>
          {hdiIndicator !== undefined && (
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={getSourceUrl(hdiSource, "UNDP.HDI")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 rounded-sm px-1 text-caption text-accent hover:text-accent-hover hover:underline"
                title={`Fonte Primária: ${hdiSource} (Abrir Repositório)`}
              >
                <span>{formatSourceBadge(hdiSource)}</span>
                <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCitationModalOpen(true, {
                    title: `Índice de Desenvolvimento Humano (IDH: ${hdiIndicator.value.toFixed(3)})`,
                    countryName,
                    url: getSourceUrl(hdiSource, "UNDP.HDI"),
                    accessDate: new Date(),
                    publicationYear: 2026,
                  });
                }}
                className="rounded-sm p-1 text-fg-muted transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-fg"
                title="Gerar citação deste indicador"
                aria-label="Gerar citação deste indicador"
              >
                <Quote aria-hidden="true" className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        <div
          className={
            hdiIndicator !== undefined
              ? "font-mono text-body font-medium tabular-nums text-fg"
              : "text-label text-fg-muted"
          }
        >
          {hdiIndicator?.value !== undefined ? hdiIndicator.value.toFixed(3) : "Dado indisponível"}
        </div>
      </div>

      {/* Indicadores Complementares de Saúde e Segurança (OMS / SIPRI) se presentes */}
      {lifeExpectancy && (
        <div className="flex flex-col justify-between rounded-card border border-line bg-surface-raised p-2.5">
          <div className="mb-1 flex items-center justify-between gap-1 text-caption text-fg-secondary">
            <div className="flex items-center gap-1.5 truncate">
              <HeartPulse aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
              <span className="truncate">Expectativa Vida</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={getSourceUrl(lifeSource, "SP.DYN.LE00.IN")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 rounded-sm px-1 text-caption text-accent hover:text-accent-hover hover:underline"
                title={`Fonte Primária: ${lifeSource} (Abrir Repositório)`}
              >
                <span>{formatSourceBadge(lifeSource)}</span>
                <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCitationModalOpen(true, {
                    title: `Expectativa de Vida ao Nascer (${lifeExpectancy.value} ${lifeExpectancy.unit})`,
                    countryName,
                    url: getSourceUrl(lifeSource, "SP.DYN.LE00.IN"),
                    accessDate: new Date(),
                    publicationYear: 2026,
                  });
                }}
                className="rounded-sm p-1 text-fg-muted transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-fg"
                title="Gerar citação deste indicador"
                aria-label="Gerar citação deste indicador"
              >
                <Quote aria-hidden="true" className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="font-mono text-body font-medium tabular-nums text-fg">
            {lifeExpectancy.value} {lifeExpectancy.unit}
          </div>
        </div>
      )}

      {militaryExp && (
        <div className="flex flex-col justify-between rounded-card border border-line bg-surface-raised p-2.5">
          <div className="mb-1 flex items-center justify-between gap-1 text-caption text-fg-secondary">
            <div className="flex items-center gap-1.5 truncate">
              <Shield aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
              <span className="truncate">Gastos Militares</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={getSourceUrl(milSource, "MS.MIL.XPND.GD.ZS")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 rounded-sm px-1 text-caption text-accent hover:text-accent-hover hover:underline"
                title={`Fonte Primária: ${milSource} (Abrir Repositório)`}
              >
                <span>{formatSourceBadge(milSource)}</span>
                <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCitationModalOpen(true, {
                    title: `Gastos Militares (% do PIB: ${militaryExp.value}%)`,
                    countryName,
                    url: getSourceUrl(milSource, "MS.MIL.XPND.GD.ZS"),
                    accessDate: new Date(),
                    publicationYear: 2026,
                  });
                }}
                className="rounded-sm p-1 text-fg-muted transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-fg"
                title="Gerar citação deste indicador"
                aria-label="Gerar citação deste indicador"
              >
                <Quote aria-hidden="true" className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="font-mono text-body font-medium tabular-nums text-fg">
            {militaryExp.value}% PIB
          </div>
        </div>
      )}

      {/* Governo & Moeda */}
      {hasGovernmentBlock && (
        <div className="col-span-2 rounded-card border border-line bg-surface-raised p-2.5">
          <div className="mb-1 flex items-center justify-between gap-1 text-caption text-fg-secondary">
            <div className="flex items-center gap-1.5">
              <Landmark aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
              <span>Regime Político & Chefia</span>
            </div>
            {(governmentType || headOfState) && (
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={getSourceUrl("ONU")}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-0.5 rounded-sm px-1 text-caption text-accent hover:text-accent-hover hover:underline"
                  title="Fonte Primária: Constituições Nacionais e Divisão de Assuntos Políticos da ONU (Abrir Repositório)"
                >
                  <span>Constituições / ONU</span>
                  <ExternalLink aria-hidden="true" className="h-3 w-3" />
                </a>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCitationModalOpen(true, {
                      title: `Regime Político: ${governmentType || "Indisponível"}${headOfState ? ` (${headOfState})` : ""}`,
                      countryName,
                      url: getSourceUrl("ONU"),
                      accessDate: new Date(),
                      publicationYear: 2026,
                    });
                  }}
                  className="rounded-sm p-1 text-fg-muted transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-fg"
                  title="Gerar citação institucional"
                  aria-label="Gerar citação institucional"
                >
                  <Quote aria-hidden="true" className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          {governmentType || headOfState ? (
            <div className="font-medium text-fg">
              {governmentType || "Dado indisponível"}
              {headOfState && (
                <>
                  {" "}· <span className="text-fg-secondary">{headOfState}</span>
                </>
              )}
            </div>
          ) : (
            <div className="text-label text-fg-muted">Dado indisponível</div>
          )}
          {historicalLeader && (
            <div className="mt-1 flex items-center gap-1 text-caption">
              <span className="text-fg-muted">{leaderTitle || "Líder da Época"}:</span>
              <strong className="font-medium text-fg">{historicalLeader}</strong>
            </div>
          )}
          {(currencyName || currencyCode) && (
            <div className="mt-0.5 text-caption text-fg-muted">
              Moeda: {currencyName || currencyCode}
              {currencyName && currencyCode ? ` (${currencyCode})` : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
