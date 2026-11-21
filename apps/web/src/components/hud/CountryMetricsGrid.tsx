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
    sourceUrl?: string;
    referenceDate?: string;
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


type IconType = React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

/**
 * Rodapé de fonte (RN02): fonte primária com link para o repositório, código e ano do indicador, e
 * a citação como ação secundária (aparece ao passar o mouse ou focar; sempre visível no toque).
 */
const SourceFooter: React.FC<{
  source: string;
  /** Rótulo exibido; sem ele, a fonte é abreviada por `formatSourceBadge`. */
  sourceLabel?: string;
  sourceUrl: string;
  title: string;
  detail?: string;
  citeLabel: string;
  onCite?: () => void;
}> = ({ source, sourceLabel, sourceUrl, title, detail, citeLabel, onCite }) => (
  <div className="mt-auto flex min-w-0 items-center gap-1 pt-1 text-caption text-fg-muted">
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex shrink-0 items-center gap-0.5 text-accent hover:text-accent-hover hover:underline"
      title={title}
    >
      <span>{sourceLabel ?? formatSourceBadge(source)}</span>
      <ExternalLink aria-hidden="true" className="h-3 w-3" />
    </a>
    {detail && <span className="min-w-0 truncate font-mono tabular-nums" title={detail}>· {detail}</span>}
    {onCite && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCite();
        }}
        className="ml-auto shrink-0 rounded-control p-1 text-fg-muted opacity-0 transition-opacity duration-fast ease-out hover:bg-surface-hover hover:text-fg focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
        title={citeLabel}
        aria-label={citeLabel}
      >
        <Quote aria-hidden="true" className="h-3 w-3" />
      </button>
    )}
  </div>
);

/** Cartão de indicador: nome inteiro, valor e, embaixo, a fonte (D16). */
const MetricCard: React.FC<{
  icon: IconType;
  label: string;
  value: string | null;
  source: string;
  sourceUrl: string;
  code?: string;
  year?: number;
  sourceNote?: string;
  onCite?: () => void;
}> = ({ icon: Icon, label, value, source, sourceUrl, code, year, sourceNote, onCite }) => {
  const detail = [code, year].filter(Boolean).join(" · ") || sourceNote;
  return (
    <div className="group flex min-w-0 flex-col rounded-card border border-line bg-surface-raised p-2.5">
      <div className="flex min-w-0 items-center gap-1.5 text-caption text-fg-secondary">
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
        <span className="truncate" title={label}>{label}</span>
      </div>
      <div className={value !== null ? "mt-1 font-mono text-body font-medium tabular-nums text-fg" : "mt-1 text-label text-fg-muted"}>
        {value ?? "Dado indisponível"}
      </div>
      {value !== null && (
        <SourceFooter
          source={source}
          sourceUrl={sourceUrl}
          detail={detail}
          title={`Fonte Primária: ${source}${code && year ? ` (${code}, ${year})` : sourceNote ? ` (${sourceNote})` : ""} (Abrir Repositório)`}
          citeLabel="Gerar citação deste indicador"
          onCite={onCite}
        />
      )}
    </div>
  );
};

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
  const areaIndicator = indicators?.find((i) => i.indicatorCode === "AG.SRF.TOTL.K2");
  const gdpIndicator = indicators?.find((i) => i.indicatorCode === "NY.GDP.MKTP.CD");
  const hdiIndicator = indicators?.find((i) => i.indicatorCode === "UNDP.HDI");
  const lifeExpectancy = indicators?.find((i) => i.indicatorCode === "SP.DYN.LE00.IN");
  const militaryExp = indicators?.find((i) => i.indicatorCode === "MS.MIL.XPND.GD.ZS");

  const popSource = popIndicator?.sourcePrimary || "Banco Mundial";
  const areaSource = areaIndicator?.sourcePrimary || "Natural Earth";
  const gdpSource = gdpIndicator?.sourcePrimary || "Banco Mundial";
  const hdiSource = hdiIndicator?.sourcePrimary || "PNUD";
  const lifeSource = lifeExpectancy?.sourcePrimary || "OMS";
  const milSource = militaryExp?.sourcePrimary || "SIPRI";

  const popUrl = popIndicator?.sourceUrl || getSourceUrl(popSource, "SP.POP.TOTL");
  const areaUrl =
    areaIndicator?.sourceUrl ||
    getSourceUrl(areaSource, areaIndicator ? "AG.SRF.TOTL.K2" : undefined);
  const gdpUrl = gdpIndicator?.sourceUrl || getSourceUrl(gdpSource, "NY.GDP.MKTP.CD");
  const hdiUrl = hdiIndicator?.sourceUrl || getSourceUrl(hdiSource, "UNDP.HDI");
  const lifeUrl = lifeExpectancy?.sourceUrl || getSourceUrl(lifeSource, "SP.DYN.LE00.IN");
  const milUrl = militaryExp?.sourceUrl || getSourceUrl(milSource, "MS.MIL.XPND.GD.ZS");

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

  const cite = (title: string, url: string, year?: number) =>
    setCitationModalOpen(true, { title, countryName, url, accessDate: new Date(), publicationYear: year ?? 2026 });

  return (
    <div className="grid grid-cols-2 gap-2 text-label">
      <MetricCard
        icon={Users}
        label="População"
        value={population !== null ? formatPop(population) : null}
        source={popSource}
        sourceUrl={popUrl}
        code={popIndicator?.year ? popIndicator.indicatorCode : undefined}
        year={popIndicator?.year}
        onCite={population !== null ? () => cite(`População Total (${formatPop(population)})`, popUrl, popIndicator?.year) : undefined}
      />
      <MetricCard
        icon={Maximize2}
        label="Área territorial"
        value={areaKm2 !== null ? `${areaKm2.toLocaleString("pt-BR")} km²` : null}
        source={areaSource}
        sourceUrl={areaUrl}
        code={areaIndicator?.year ? areaIndicator.indicatorCode : undefined}
        year={areaIndicator?.year}
        sourceNote={areaIndicator?.year ? undefined : "1:110m"}
        onCite={areaKm2 !== null ? () => cite(`Área Territorial (${areaKm2.toLocaleString("pt-BR")} km²)`, areaUrl, areaIndicator?.year) : undefined}
      />
      <MetricCard
        icon={DollarSign}
        label="PIB nominal"
        value={gdpIndicator !== undefined ? formatGdp(gdpIndicator.value) : null}
        source={gdpSource}
        sourceUrl={gdpUrl}
        code={gdpIndicator?.indicatorCode}
        year={gdpIndicator?.year}
        onCite={gdpIndicator ? () => cite(`PIB Nominal (${formatGdp(gdpIndicator.value)})`, gdpUrl, gdpIndicator.year) : undefined}
      />
      <MetricCard
        icon={Award}
        label="IDH"
        value={hdiIndicator?.value !== undefined ? hdiIndicator.value.toFixed(3) : null}
        source={hdiSource}
        sourceUrl={hdiUrl}
        code={hdiIndicator?.indicatorCode}
        year={hdiIndicator?.year}
        onCite={hdiIndicator ? () => cite(`Índice de Desenvolvimento Humano (IDH: ${hdiIndicator.value.toFixed(3)})`, hdiUrl, hdiIndicator.year) : undefined}
      />
      {lifeExpectancy && (
        <MetricCard
          icon={HeartPulse}
          label="Expectativa de vida"
          value={`${lifeExpectancy.value} ${lifeExpectancy.unit}`}
          source={lifeSource}
          sourceUrl={lifeUrl}
          code={lifeExpectancy.indicatorCode}
          year={lifeExpectancy.year}
          onCite={() => cite(`Expectativa de Vida ao Nascer (${lifeExpectancy.value} ${lifeExpectancy.unit})`, lifeUrl, lifeExpectancy.year)}
        />
      )}
      {militaryExp && (
        <MetricCard
          icon={Shield}
          label="Gastos militares"
          value={`${militaryExp.value}% do PIB`}
          source={milSource}
          sourceUrl={milUrl}
          code={militaryExp.indicatorCode}
          year={militaryExp.year}
          onCite={() => cite(`Gastos Militares (% do PIB: ${militaryExp.value}%)`, milUrl, militaryExp.year)}
        />
      )}

      {/* Governo & Moeda */}
      {hasGovernmentBlock && (
        <div className="group col-span-2 flex flex-col gap-1 rounded-card border border-line bg-surface-raised p-2.5">
          <div className="flex items-center gap-1.5 text-caption text-fg-secondary">
            <Landmark aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
            <span>Regime político e chefia</span>
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
            <div className="flex items-center gap-1 text-caption">
              <span className="text-fg-muted">{leaderTitle || "Líder da Época"}:</span>
              <strong className="font-medium text-fg">{historicalLeader}</strong>
            </div>
          )}
          {(currencyName || currencyCode) && (
            <div className="text-caption text-fg-muted">
              Moeda: {currencyName || currencyCode}
              {currencyName && currencyCode ? ` (${currencyCode})` : ""}
            </div>
          )}
          {(governmentType || headOfState) && (
            <SourceFooter
              source="Constituições / ONU"
              sourceLabel="Constituições / ONU"
              sourceUrl={getSourceUrl("ONU")}
              title="Fonte Primária: Constituições Nacionais e Divisão de Assuntos Políticos da ONU (Abrir Repositório)"
              citeLabel="Gerar citação institucional"
              onCite={() => cite(`Regime Político: ${governmentType || "Indisponível"}${headOfState ? ` (${headOfState})` : ""}`, getSourceUrl("ONU"))}
            />
          )}
        </div>
      )}
    </div>
  );
};
