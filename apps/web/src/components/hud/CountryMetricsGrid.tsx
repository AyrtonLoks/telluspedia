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
        className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs"
      >
        <div className="flex items-center gap-2 text-amber-300 font-semibold">
          <Info className="w-4 h-4 shrink-0" />
          <span>Indicadores ainda indisponíveis</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Os dados demográficos, econômicos e institucionais de {countryName} ainda não foram
          ingeridos na base local do TellusPedia. Consulte diretamente as fontes externas oficiais:
        </p>
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {isoCode && !isHistoricalEntity && (
            <a
              href={`https://data.worldbank.org/country/${encodeURIComponent(isoCode)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-cyan-950 text-cyan-300 border border-slate-700 text-[10px] font-medium transition-colors"
            >
              <span>Banco Mundial ({isoCode})</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          <a
            href={`https://pt.wikipedia.org/wiki/${encodeURIComponent(countryName)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-cyan-950 text-slate-200 border border-slate-700 text-[10px] font-medium transition-colors"
          >
            <span>Wikipédia</span>
            <ExternalLink className="w-2.5 h-2.5" />
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
    <div className="grid grid-cols-2 gap-2 text-xs">
      {/* População */}
      <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1 gap-1">
          <div className="flex items-center gap-1.5 truncate">
            <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">População</span>
          </div>
          {population !== null && (
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={getSourceUrl(popSource, "SP.POP.TOTL")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-cyan-400/90 hover:text-cyan-200 hover:bg-slate-700/80 border border-slate-700/60 inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                title={`Fonte Primária: ${popSource} (Abrir Repositório)`}
              >
                <span>{formatSourceBadge(popSource)}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
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
                className="p-1 rounded bg-slate-800/80 hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-slate-700/60 transition-colors"
                title="Gerar citação deste indicador"
              >
                <Quote className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
        <div
          className={
            population !== null
              ? "font-semibold text-slate-100 text-sm"
              : "font-medium text-slate-500 text-xs"
          }
        >
          {population !== null ? formatPop(population) : "Dado indisponível"}
        </div>
      </div>

      {/* Área */}
      <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1 gap-1">
          <div className="flex items-center gap-1.5 truncate">
            <Maximize2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Área Territorial</span>
          </div>
          {areaKm2 !== null && (
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={getSourceUrl(areaSource)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-emerald-400/90 hover:text-emerald-200 hover:bg-slate-700/80 border border-slate-700/60 inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                title={`Fonte Primária: ${areaSource} (1:110m) (Abrir Repositório)`}
              >
                <span>{formatSourceBadge(areaSource)}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
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
                className="p-1 rounded bg-slate-800/80 hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-slate-700/60 transition-colors"
                title="Gerar citação deste indicador"
              >
                <Quote className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
        <div
          className={
            areaKm2 !== null
              ? "font-semibold text-slate-100 text-sm"
              : "font-medium text-slate-500 text-xs"
          }
        >
          {areaKm2 !== null ? `${areaKm2.toLocaleString("pt-BR")} km²` : "Dado indisponível"}
        </div>
      </div>

      {/* PIB */}
      <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1 gap-1">
          <div className="flex items-center gap-1.5 truncate">
            <DollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">PIB Nominal</span>
          </div>
          {gdpIndicator !== undefined && (
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={getSourceUrl(gdpSource, "NY.GDP.MKTP.CD")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-amber-400/90 hover:text-amber-200 hover:bg-slate-700/80 border border-slate-700/60 inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                title={`Fonte Primária: ${gdpSource} (Abrir Repositório)`}
              >
                <span>{formatSourceBadge(gdpSource)}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
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
                className="p-1 rounded bg-slate-800/80 hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-slate-700/60 transition-colors"
                title="Gerar citação deste indicador"
              >
                <Quote className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
        <div
          className={
            gdpIndicator !== undefined
              ? "font-semibold text-slate-100 text-sm"
              : "font-medium text-slate-500 text-xs"
          }
        >
          {formatGdp(gdpIndicator?.value)}
        </div>
      </div>

      {/* IDH */}
      <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1 gap-1">
          <div className="flex items-center gap-1.5 truncate">
            <Award className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">IDH Geral</span>
          </div>
          {hdiIndicator !== undefined && (
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={getSourceUrl(hdiSource, "UNDP.HDI")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-purple-400/90 hover:text-purple-200 hover:bg-slate-700/80 border border-slate-700/60 inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                title={`Fonte Primária: ${hdiSource} (Abrir Repositório)`}
              >
                <span>{formatSourceBadge(hdiSource)}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
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
                className="p-1 rounded bg-slate-800/80 hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-slate-700/60 transition-colors"
                title="Gerar citação deste indicador"
              >
                <Quote className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
        <div
          className={
            hdiIndicator !== undefined
              ? "font-semibold text-slate-100 text-sm"
              : "font-medium text-slate-500 text-xs"
          }
        >
          {hdiIndicator?.value !== undefined ? hdiIndicator.value.toFixed(3) : "Dado indisponível"}
        </div>
      </div>

      {/* Indicadores Complementares de Saúde e Segurança (OMS / SIPRI) se presentes */}
      {lifeExpectancy && (
        <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1 gap-1">
            <div className="flex items-center gap-1.5 truncate">
              <HeartPulse className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate">Expectativa Vida</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={getSourceUrl(lifeSource, "SP.DYN.LE00.IN")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-rose-400/90 hover:text-rose-200 hover:bg-slate-700/80 border border-slate-700/60 inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                title={`Fonte Primária: ${lifeSource} (Abrir Repositório)`}
              >
                <span>{formatSourceBadge(lifeSource)}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
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
                className="p-1 rounded bg-slate-800/80 hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-slate-700/60 transition-colors"
                title="Gerar citação deste indicador"
              >
                <Quote className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
          <div className="font-semibold text-slate-100 text-sm">
            {lifeExpectancy.value} {lifeExpectancy.unit}
          </div>
        </div>
      )}

      {militaryExp && (
        <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1 gap-1">
            <div className="flex items-center gap-1.5 truncate">
              <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">Gastos Militares</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={getSourceUrl(milSource, "MS.MIL.XPND.GD.ZS")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-indigo-400/90 hover:text-indigo-200 hover:bg-slate-700/80 border border-slate-700/60 inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                title={`Fonte Primária: ${milSource} (Abrir Repositório)`}
              >
                <span>{formatSourceBadge(milSource)}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
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
                className="p-1 rounded bg-slate-800/80 hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-slate-700/60 transition-colors"
                title="Gerar citação deste indicador"
              >
                <Quote className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
          <div className="font-semibold text-slate-100 text-sm">
            {militaryExp.value}% PIB
          </div>
        </div>
      )}

      {/* Governo & Moeda */}
      {hasGovernmentBlock && (
        <div className="col-span-2 p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1 gap-1">
            <div className="flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-cyan-400" />
              <span>Regime Político & Chefia</span>
            </div>
            {(governmentType || headOfState) && (
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={getSourceUrl("ONU")}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-cyan-300 hover:bg-slate-700/80 border border-slate-700/60 inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                  title="Fonte Primária: Constituições Nacionais e Divisão de Assuntos Políticos da ONU (Abrir Repositório)"
                >
                  <span>Constituições / ONU</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
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
                  className="p-1 rounded bg-slate-800/80 hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-slate-700/60 transition-colors"
                  title="Gerar citação institucional"
                >
                  <Quote className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
          {governmentType || headOfState ? (
            <div className="font-medium text-slate-200">
              {governmentType || "Dado indisponível"}
              {headOfState && (
                <>
                  {" "}• <span className="text-slate-400">{headOfState}</span>
                </>
              )}
            </div>
          ) : (
            <div className="font-medium text-slate-500 text-xs">Dado indisponível</div>
          )}
          {historicalLeader && (
            <div className="text-[11px] text-amber-300/90 mt-1 flex items-center gap-1 font-mono">
              <span className="text-slate-400">{leaderTitle || "Líder da Época"}:</span>
              <strong className="text-slate-200 font-semibold">{historicalLeader}</strong>
            </div>
          )}
          {(currencyName || currencyCode) && (
            <div className="text-[11px] text-slate-400 mt-0.5">
              Moeda: {currencyName || currencyCode}
              {currencyName && currencyCode ? ` (${currencyCode})` : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
