"use client";

import React from "react";
import { Users, Maximize2, DollarSign, Award, Landmark, HeartPulse, Shield, Leaf, Factory, ExternalLink, Quote, Info } from "lucide-react";
import { getSourceUrl } from "@/lib/citations";
import { DataCompleteness } from "@/lib/country-data";
import { useReaderStore } from "@/stores/readerStore";
import { useI18n } from "@/lib/i18n/useT";
import { formatNumber } from "@/lib/i18n/format";

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

export function formatSourceBadge(source: string, locale: "pt-BR" | "en" = "pt-BR"): string {
  const isEn = locale === "en";
  if (!source) return isEn ? "Official" : "Oficial";
  if (source.includes("Banco Mundial") && source.includes("IBGE")) return isEn ? "IBGE / WB" : "IBGE / BM";
  if (source.includes("Banco Mundial") && source.includes("BEA")) return isEn ? "World Bank / BEA" : "B. Mundial / BEA";
  if (source.includes("Banco Mundial")) return isEn ? "World Bank" : "B. Mundial";
  if (source.includes("US Census")) return "US Census";
  if (source.includes("E-Stat")) return "E-Stat";
  if (source.includes("Stats SA")) return "Stats SA";
  if (source.includes("Destatis")) return "Destatis";
  if (source.includes("CAPMAS")) return "CAPMAS";
  if (source.includes("IBGE")) return "IBGE";
  if (source.includes("PNUD")) return isEn ? "UNDP" : "PNUD";
  if (source.includes("OMS") || source.includes("WHO")) return isEn ? "WHO" : "OMS";
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
  locale: "pt-BR" | "en";
  onCite?: () => void;
}> = ({ source, sourceLabel, sourceUrl, title, detail, citeLabel, locale, onCite }) => (
  <div className="mt-auto flex min-w-0 items-center gap-1 pt-1 text-caption text-fg-muted">
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex shrink-0 items-center gap-0.5 text-accent hover:text-accent-hover hover:underline"
      title={title}
    >
      <span>{sourceLabel ?? formatSourceBadge(source, locale)}</span>
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
  unavailableText: string;
  citeLabel: string;
  openRepoText: string;
  sourcePrefix: string;
  locale: "pt-BR" | "en";
  onCite?: () => void;
}> = ({
  icon: Icon,
  label,
  value,
  source,
  sourceUrl,
  code,
  year,
  sourceNote,
  unavailableText,
  citeLabel,
  openRepoText,
  sourcePrefix,
  locale,
  onCite,
}) => {
  const detail = [code, year].filter(Boolean).join(" · ") || sourceNote;
  return (
    <div className="group flex min-w-0 flex-col rounded-card border border-line bg-surface-raised p-2.5">
      <div className="flex min-w-0 items-center gap-1.5 text-caption text-fg-secondary">
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
        <span className="truncate" title={label}>{label}</span>
      </div>
      <div className={value !== null ? "mt-1 font-mono text-body font-medium tabular-nums text-fg" : "mt-1 text-label text-fg-muted"}>
        {value ?? unavailableText}
      </div>
      {value !== null && (
        <SourceFooter
          source={source}
          sourceUrl={sourceUrl}
          detail={detail}
          title={`${sourcePrefix} ${source}${code && year ? ` (${code}, ${year})` : sourceNote ? ` (${sourceNote})` : ""} (${openRepoText})`}
          citeLabel={citeLabel}
          locale={locale}
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
  const { locale, t, tRaw } = useI18n();

  const popIndicator = indicators?.find((i) => i.indicatorCode === "SP.POP.TOTL");
  const areaIndicator = indicators?.find((i) => i.indicatorCode === "AG.SRF.TOTL.K2");
  const gdpIndicator = indicators?.find((i) => i.indicatorCode === "NY.GDP.MKTP.CD");
  const gdpPcapIndicator = indicators?.find((i) => i.indicatorCode === "NY.GDP.PCAP.CD");
  const hdiIndicator = indicators?.find((i) => i.indicatorCode === "UNDP.HDI");
  const lifeExpectancy = indicators?.find((i) => i.indicatorCode === "SP.DYN.LE00.IN");
  const militaryExp = indicators?.find((i) => i.indicatorCode === "MS.MIL.XPND.GD.ZS");
  const renewableEnergy = indicators?.find((i) => i.indicatorCode === "EG.FEC.RNEW.ZS");
  const co2PerCapita = indicators?.find((i) => i.indicatorCode === "EN.GHG.CO2.PC.CE.AR5");

  const popSource = popIndicator?.sourcePrimary || "Banco Mundial";
  const areaSource = areaIndicator?.sourcePrimary || "Natural Earth";
  const gdpSource = gdpIndicator?.sourcePrimary || "Banco Mundial";
  const gdpPcapSource = gdpPcapIndicator?.sourcePrimary || "Banco Mundial";
  const hdiSource = hdiIndicator?.sourcePrimary || "PNUD";
  const lifeSource = lifeExpectancy?.sourcePrimary || "OMS";
  const milSource = militaryExp?.sourcePrimary || "SIPRI";
  const renewSource = renewableEnergy?.sourcePrimary || "Banco Mundial";
  const co2Source = co2PerCapita?.sourcePrimary || "Banco Mundial";

  const popUrl = popIndicator?.sourceUrl || getSourceUrl(popSource, "SP.POP.TOTL");
  const areaUrl =
    areaIndicator?.sourceUrl ||
    getSourceUrl(areaSource, areaIndicator ? "AG.SRF.TOTL.K2" : undefined);
  const gdpUrl = gdpIndicator?.sourceUrl || getSourceUrl(gdpSource, "NY.GDP.MKTP.CD");
  const gdpPcapUrl = gdpPcapIndicator?.sourceUrl || getSourceUrl(gdpPcapSource, "NY.GDP.PCAP.CD");
  const hdiUrl = hdiIndicator?.sourceUrl || getSourceUrl(hdiSource, "UNDP.HDI");
  const lifeUrl = lifeExpectancy?.sourceUrl || getSourceUrl(lifeSource, "SP.DYN.LE00.IN");
  const milUrl = militaryExp?.sourceUrl || getSourceUrl(milSource, "MS.MIL.XPND.GD.ZS");
  const renewUrl = renewableEnergy?.sourceUrl || getSourceUrl(renewSource, "EG.FEC.RNEW.ZS");
  const co2Url = co2PerCapita?.sourceUrl || getSourceUrl(co2Source, "EN.GHG.CO2.PC.CE.AR5");

  const unavailableText = t("common.dataUnavailable", "Dado indisponível");
  const citeLabel = t("metrics.citeIndicator", "Gerar citação deste indicador");
  const openRepoText = t("metrics.openRepo", "Abrir Repositório");
  const sourcePrefix = t("inspector.sourcePrefix", "Fonte Primária:");

  const formatPop = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)} ${t("metrics.billion", "bilhões")}`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)} ${t("metrics.million", "milhões")}`;
    return formatNumber(num, locale);
  };

  const formatGdp = (val?: number) => {
    if (val === undefined || val === null) return unavailableText;
    if (val >= 1e12) return `$ ${(val / 1e12).toFixed(2)} ${t("metrics.trillion", "trilhões")}`;
    if (val >= 1e9) return `$ ${(val / 1e9).toFixed(1)} ${t("metrics.billion", "bilhões")}`;
    return `$ ${formatNumber(val, locale)}`;
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
    const wikiHost = locale === "en" ? "en.wikipedia.org" : "pt.wikipedia.org";
    return (
      <div
        data-testid="country-data-unavailable"
        className="space-y-2 rounded-card border border-line bg-surface-raised p-3.5 text-label"
      >
        <div className="flex items-center gap-2 font-semibold text-fg">
          <Info aria-hidden="true" className="h-4 w-4 shrink-0 text-warning" />
          <span>{t("metrics.indicatorsUnavailableTitle", "Indicadores ainda indisponíveis")}</span>
        </div>
        <p className="text-caption text-fg-secondary">
          {t("metrics.indicatorsUnavailablePrefix", "Os dados demográficos, econômicos e institucionais de")} {countryName}{" "}
          {t(
            "metrics.indicatorsUnavailableSuffix",
            "ainda não foram ingeridos na base local do TellusPedia. Consulte diretamente as fontes externas oficiais:"
          )}
        </p>
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {isoCode && !isHistoricalEntity && (
            <a
              href={`https://data.worldbank.org/country/${encodeURIComponent(isoCode)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-control border border-line-strong bg-surface px-2 py-1 text-caption font-medium text-fg transition-colors duration-fast ease-out hover:bg-surface-hover"
            >
              <span>{t("common.worldBank", "Banco Mundial")} ({isoCode})</span>
              <ExternalLink aria-hidden="true" className="h-3 w-3" />
            </a>
          )}
          <a
            href={`https://${wikiHost}/wiki/${encodeURIComponent(countryName)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-control border border-line-strong bg-surface px-2 py-1 text-caption font-medium text-fg transition-colors duration-fast ease-out hover:bg-surface-hover"
          >
            <span>{t("common.wikipedia", "Wikipédia")}</span>
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

  const sharedCard = { unavailableText, citeLabel, openRepoText, sourcePrefix, locale };
  const localizedGov = governmentType ? tRaw(`gov.${governmentType}`, governmentType) : null;
  const localizedHead = headOfState ? tRaw(`head.${headOfState}`, headOfState) : null;
  const localizedLeaderTitle = leaderTitle ? tRaw(`head.${leaderTitle}`, leaderTitle) : null;
  const localizedCurrency = currencyName
    ? isoCode
      ? tRaw(`country.${isoCode}.currency`, currencyName)
      : currencyName
    : null;
  const lifeUnit =
    locale === "en" && lifeExpectancy?.unit === "anos"
      ? t("common.years", "anos")
      : lifeExpectancy?.unit ?? "";

  return (
    <div className="grid grid-cols-2 gap-2 text-label">
      <MetricCard
        {...sharedCard}
        icon={Users}
        label={t("metrics.population", "População")}
        value={population !== null ? formatPop(population) : null}
        source={popSource}
        sourceUrl={popUrl}
        code={popIndicator?.year ? popIndicator.indicatorCode : undefined}
        year={popIndicator?.year}
        onCite={population !== null ? () => cite(`População Total (${formatPop(population)})`, popUrl, popIndicator?.year) : undefined}
      />
      <MetricCard
        {...sharedCard}
        icon={Maximize2}
        label={t("metrics.landArea", "Área territorial")}
        value={areaKm2 !== null ? `${formatNumber(areaKm2, locale)} km²` : null}
        source={areaSource}
        sourceUrl={areaUrl}
        code={areaIndicator?.year ? areaIndicator.indicatorCode : undefined}
        year={areaIndicator?.year}
        sourceNote={areaIndicator?.year ? undefined : "1:110m"}
        onCite={areaKm2 !== null ? () => cite(`Área Territorial (${formatNumber(areaKm2, locale)} km²)`, areaUrl, areaIndicator?.year) : undefined}
      />
      <MetricCard
        {...sharedCard}
        icon={DollarSign}
        label={t("metrics.nominalGdp", "PIB nominal")}
        value={gdpIndicator !== undefined ? formatGdp(gdpIndicator.value) : null}
        source={gdpSource}
        sourceUrl={gdpUrl}
        code={gdpIndicator?.indicatorCode}
        year={gdpIndicator?.year}
        onCite={gdpIndicator ? () => cite(`PIB Nominal (${formatGdp(gdpIndicator.value)})`, gdpUrl, gdpIndicator.year) : undefined}
      />
      <MetricCard
        {...sharedCard}
        icon={Award}
        label={t("metrics.hdi", "IDH")}
        value={hdiIndicator?.value !== undefined ? hdiIndicator.value.toFixed(3) : null}
        source={hdiSource}
        sourceUrl={hdiUrl}
        code={hdiIndicator?.indicatorCode}
        year={hdiIndicator?.year}
        onCite={hdiIndicator ? () => cite(`Índice de Desenvolvimento Humano (IDH: ${hdiIndicator.value.toFixed(3)})`, hdiUrl, hdiIndicator.year) : undefined}
      />
      {lifeExpectancy && (
        <MetricCard
          {...sharedCard}
          icon={HeartPulse}
          label={t("metrics.lifeExpectancy", "Expectativa de vida")}
          value={`${lifeExpectancy.value} ${lifeUnit}`}
          source={lifeSource}
          sourceUrl={lifeUrl}
          code={lifeExpectancy.indicatorCode}
          year={lifeExpectancy.year}
          onCite={() => cite(`Expectativa de Vida ao Nascer (${lifeExpectancy.value} ${lifeUnit})`, lifeUrl, lifeExpectancy.year)}
        />
      )}
      {militaryExp && (
        <MetricCard
          {...sharedCard}
          icon={Shield}
          label={t("metrics.militaryExp", "Gastos militares")}
          value={`${militaryExp.value}% ${t("metrics.ofGdp", "do PIB")}`}
          source={milSource}
          sourceUrl={milUrl}
          code={militaryExp.indicatorCode}
          year={militaryExp.year}
          onCite={() => cite(`Gastos Militares (% do PIB: ${militaryExp.value}%)`, milUrl, militaryExp.year)}
        />
      )}
      {gdpPcapIndicator && (
        <MetricCard
          {...sharedCard}
          icon={DollarSign}
          label={t("metrics.gdpPerCapita", "PIB per capita")}
          value={`$ ${formatNumber(Math.round(gdpPcapIndicator.value), locale)}`}
          source={gdpPcapSource}
          sourceUrl={gdpPcapUrl}
          code={gdpPcapIndicator.indicatorCode}
          year={gdpPcapIndicator.year}
          onCite={() => cite(`PIB per capita ($ ${formatNumber(Math.round(gdpPcapIndicator.value), locale)})`, gdpPcapUrl, gdpPcapIndicator.year)}
        />
      )}
      {renewableEnergy && (
        <MetricCard
          {...sharedCard}
          icon={Leaf}
          label={t("metrics.renewableEnergy", "Energia renovável")}
          value={`${formatNumber(renewableEnergy.value, locale)}%`}
          source={renewSource}
          sourceUrl={renewUrl}
          code={renewableEnergy.indicatorCode}
          year={renewableEnergy.year}
          onCite={() => cite(`Consumo de Energia Renovável (${renewableEnergy.value}%)`, renewUrl, renewableEnergy.year)}
        />
      )}
      {co2PerCapita && (
        <MetricCard
          {...sharedCard}
          icon={Factory}
          label={t("metrics.co2PerCapita", "CO₂ per capita")}
          value={`${formatNumber(co2PerCapita.value, locale)} t`}
          source={co2Source}
          sourceUrl={co2Url}
          code={co2PerCapita.indicatorCode}
          year={co2PerCapita.year}
          onCite={() => cite(`Emissões de CO₂ per capita (${co2PerCapita.value} t CO₂e/hab)`, co2Url, co2PerCapita.year)}
        />
      )}

      {/* Governo & Moeda */}
      {hasGovernmentBlock && (
        <div className="group col-span-2 flex flex-col gap-1 rounded-card border border-line bg-surface-raised p-2.5">
          <div className="flex items-center gap-1.5 text-caption text-fg-secondary">
            <Landmark aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
            <span>{t("metrics.regimeHeading", "Regime político e chefia")}</span>
          </div>
          {localizedGov || localizedHead ? (
            <div className="font-medium text-fg">
              {localizedGov || unavailableText}
              {localizedHead && (
                <>
                  {" "}· <span className="text-fg-secondary">{localizedHead}</span>
                </>
              )}
            </div>
          ) : (
            <div className="text-label text-fg-muted">{unavailableText}</div>
          )}
          {historicalLeader && (
            <div className="flex items-center gap-1 text-caption">
              <span className="text-fg-muted">{localizedLeaderTitle || t("metrics.eraLeader", "Líder da Época")}:</span>
              <strong className="font-medium text-fg">{historicalLeader}</strong>
            </div>
          )}
          {(localizedCurrency || currencyCode) && (
            <div className="text-caption text-fg-muted">
              {t("metrics.currency", "Moeda")}: {localizedCurrency || currencyCode}
              {localizedCurrency && currencyCode ? ` (${currencyCode})` : ""}
            </div>
          )}
          {(governmentType || headOfState) && (
            <SourceFooter
              source={t("metrics.constitutionsUn", "Constituições / ONU")}
              sourceLabel={t("metrics.constitutionsUn", "Constituições / ONU")}
              sourceUrl={getSourceUrl("ONU")}
              title={`${sourcePrefix} ${t("metrics.constitutionsUn", "Constituições / ONU")} (${openRepoText})`}
              citeLabel={t("metrics.citeInstitutional", "Gerar citação institucional")}
              locale={locale}
              onCite={() => cite(`Regime Político: ${localizedGov || "Indisponível"}${headOfState ? ` (${headOfState})` : ""}`, getSourceUrl("ONU"))}
            />
          )}
        </div>
      )}
    </div>
  );
};
