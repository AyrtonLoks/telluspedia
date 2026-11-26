"use client";

import React from "react";
import { X, ExternalLink, Quote } from "lucide-react";
import { getCountryData, CountryData } from "@/lib/country-data";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useReaderStore } from "@/stores/readerStore";
import { getSourceUrl } from "@/lib/citations";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import {
  buildComparatorFilename,
  buildComparisonGridCsv,
  triggerBlobDownload,
} from "@/lib/comparator-export";
import { useI18n } from "@/lib/i18n/useT";
import { formatCountryName, formatNumber } from "@/lib/i18n/format";
import { ComparatorExportBar } from "./ComparatorExportBar";

interface ComparisonCardProps {
  country: CountryData;
  onRemove: (iso: string) => void;
}

const ComparisonCountryCard: React.FC<ComparisonCardProps> = ({ country: c, onRemove }) => {
  const { locale, t, tRaw } = useI18n();
  const displayName = formatCountryName(c.iso2, c.nameCommon, locale);
  const localizedGov = c.governmentType ? tRaw(`gov.${c.governmentType}`, c.governmentType) : null;
  const unavailable = t("common.dataUnavailable", "Dado indisponível");
  const [flagError, setFlagError] = React.useState(false);
  const popInd = c.indicators.find((i) => i.indicatorCode === "SP.POP.TOTL");
  const areaInd = c.indicators.find((i) => i.indicatorCode === "AG.SRF.TOTL.K2");
  const gdpInd = c.indicators.find((i) => i.indicatorCode === "NY.GDP.MKTP.CD");
  const gdpPcapInd = c.indicators.find((i) => i.indicatorCode === "NY.GDP.PCAP.CD");
  const hdiInd = c.indicators.find((i) => i.indicatorCode === "UNDP.HDI");
  const lifeInd = c.indicators.find((i) => i.indicatorCode === "SP.DYN.LE00.IN");
  const renewInd = c.indicators.find((i) => i.indicatorCode === "EG.FEC.RNEW.ZS");
  const co2Ind = c.indicators.find((i) => i.indicatorCode === "EN.GHG.CO2.PC.CE.AR5");
  const gdp = gdpInd?.value;
  const gdpPcap = gdpPcapInd?.value;
  const hdi = hdiInd?.value;
  const lifeExp = lifeInd?.value;
  const renewPct = renewInd?.value;
  const co2Pcap = co2Ind?.value;

  const formatPop = (num: number | null) => {
    if (num === null) return unavailable;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)} ${t("metrics.biShort", "bi")}`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)} ${t("metrics.miShort", "mi")}`;
    return formatNumber(num, locale);
  };

  const formatGdp = (val?: number) => {
    if (val === undefined || val === null) return unavailable;
    if (val >= 1e12) return `$ ${(val / 1e12).toFixed(2)} ${t("metrics.triShort", "tri")}`;
    if (val >= 1e9) return `$ ${(val / 1e9).toFixed(1)} ${t("metrics.biShort", "bi")}`;
    return `$ ${formatNumber(val, locale)}`;
  };

  return (
    <div className="relative space-y-3 rounded-card border border-line bg-surface-raised p-3.5">
      {/* Header with remove button */}
      <div className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {c.flagSvgUrl && !flagError ? (
            <img
              src={c.flagSvgUrl}
              alt={`${t("inspector.flagOf", "Bandeira de")} ${displayName}`}
              onError={() => setFlagError(true)}
              className="h-4 w-6 shrink-0 rounded-sm border border-line object-cover"
            />
          ) : (
            <span className="flex h-4 w-6 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-surface font-mono text-caption font-medium text-fg-secondary">
              {c.isoCode}
            </span>
          )}
          <div className="min-w-0">
            <h5 className="line-clamp-1 text-label font-semibold text-fg">{displayName}</h5>
            <span className="font-mono text-caption text-fg-muted">{c.isoCode}</span>
          </div>
        </div>

        <IconButton
          label={`${t("comp.remove", "Remover")} ${displayName}`}
          icon={<X />}
          size="sm"
          onClick={() => onRemove(c.isoCode)}
        />
      </div>

      {/* Data Rows */}
      <div className="space-y-2.5 text-label">
        <div>
          <span className="block text-caption text-fg-muted">{t("inspector.capital", "Capital")}</span>
          <span className={c.capital ? "font-medium text-fg" : "text-fg-muted"}>
            {c.capital ?? unavailable}
          </span>
        </div>

        <div>
          <span className="block text-caption text-fg-muted">
            {t("metrics.population", "População")}{popInd?.year ? ` (${popInd.year})` : ""}
          </span>
          <span
            className={
              c.population !== null
                ? "font-mono font-medium tabular-nums text-fg"
                : "text-fg-muted"
            }
          >
            {formatPop(c.population)}
          </span>
        </div>

        <div>
          <span className="block text-caption text-fg-muted">
            {t("metrics.landArea", "Área Territorial")}{areaInd?.year ? ` (${areaInd.year})` : ""}
          </span>
          <span
            className={
              c.areaKm2 !== null
                ? "font-mono font-medium tabular-nums text-fg"
                : "text-fg-muted"
            }
          >
            {c.areaKm2 !== null ? `${formatNumber(c.areaKm2, locale)} km²` : unavailable}
          </span>
        </div>

        <div>
          <span className="block text-caption text-fg-muted">
            {t("metrics.nominalGdp", "PIB Nominal")}{gdpInd?.year ? ` (${gdpInd.year})` : ""}
          </span>
          <span
            className={
              gdp !== undefined
                ? "font-mono font-medium tabular-nums text-warning"
                : "text-fg-muted"
            }
          >
            {formatGdp(gdp)}
          </span>
        </div>

        <div>
          <span className="block text-caption text-fg-muted">
            {t("metrics.gdpPerCapita", "PIB per capita")}{gdpPcapInd?.year ? ` (${gdpPcapInd.year})` : ""}
          </span>
          <span
            className={
              gdpPcap !== undefined
                ? "font-mono font-medium tabular-nums text-fg"
                : "text-fg-muted"
            }
          >
            {gdpPcap !== undefined ? `$ ${formatNumber(Math.round(gdpPcap), locale)}` : unavailable}
          </span>
        </div>

        <div>
          <span className="block text-caption text-fg-muted">
            {t("metrics.hdi", "IDH")}{hdiInd?.year ? ` (${hdiInd.year})` : ""}
          </span>
          <span
            className={
              hdi !== undefined
                ? "font-mono font-medium tabular-nums text-fg"
                : "text-fg-muted"
            }
          >
            {hdi !== undefined ? hdi.toFixed(3) : unavailable}
          </span>
        </div>

        <div>
          <span className="block text-caption text-fg-muted">
            {t("metrics.lifeExpectancy", "Expectativa de Vida")}{lifeInd?.year ? ` (${lifeInd.year})` : ""}
          </span>
          <span
            className={
              lifeExp !== undefined
                ? "font-mono font-medium tabular-nums text-fg"
                : "text-fg-muted"
            }
          >
            {lifeExp !== undefined ? `${lifeExp} ${t("common.years", "anos")}` : unavailable}
          </span>
        </div>

        <div>
          <span className="block text-caption text-fg-muted">
            {t("metrics.renewableEnergy", "Energia Renovável")}{renewInd?.year ? ` (${renewInd.year})` : ""}
          </span>
          <span
            className={
              renewPct !== undefined
                ? "font-mono font-medium tabular-nums text-fg"
                : "text-fg-muted"
            }
          >
            {renewPct !== undefined ? `${formatNumber(renewPct, locale)}%` : unavailable}
          </span>
        </div>

        <div>
          <span className="block text-caption text-fg-muted">
            {t("metrics.co2PerCapita", "CO₂ per capita")}{co2Ind?.year ? ` (${co2Ind.year})` : ""}
          </span>
          <span
            className={
              co2Pcap !== undefined
                ? "font-mono font-medium tabular-nums text-fg"
                : "text-fg-muted"
            }
          >
            {co2Pcap !== undefined ? `${formatNumber(co2Pcap, locale)} t` : unavailable}
          </span>
        </div>

        <div>
          <span className="block text-caption text-fg-muted">{t("comp.governmentSystem", "Sistema de Governo")}</span>
          <span className={localizedGov ? "line-clamp-2 text-caption text-fg-secondary" : "text-fg-muted"}>
            {localizedGov ?? unavailable}
          </span>
        </div>
      </div>
    </div>
  );
};

export const ComparisonGrid: React.FC = () => {
  const { locale, t } = useI18n();
  const storeSelectedIsos = useComparatorStore((s) => s.selectedIsos);
  const selectedIsos =
    typeof window === "undefined"
      ? useComparatorStore.getState().selectedIsos
      : storeSelectedIsos;
  const removeCountry = useComparatorStore((s) => s.removeCountry);
  const setCitationModalOpen = useReaderStore((s) => s.setCitationModalOpen);

  const countries = selectedIsos
    .map((iso) => getCountryData(iso))
    .filter((c): c is CountryData => c !== null);

  if (countries.length === 0) {
    return (
      <div className="p-8 text-center text-body text-fg-muted">
        {t("comp.emptyGrid", "Nenhum país selecionado para comparação. Adicione até 4 países para visualizar os dados lado a lado.")}
      </div>
    );
  }

  const handleGenerateComparisonCitation = () => {
    const names = countries.map((c) => formatCountryName(c.iso2, c.nameCommon, locale)).join(", ");
    const isos = countries.map((c) => c.isoCode).join(",");
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/compare?c=${encodeURIComponent(isos)}`
        : `https://telluspedia.org/compare?c=${encodeURIComponent(isos)}`;

    setCitationModalOpen(true, {
      title: `Estudo Comparativo Multidimensional: ${names}`,
      countryName: countries[0] ? formatCountryName(countries[0].iso2, countries[0].nameCommon, locale) : "TellusPedia",
      url,
      accessDate: new Date(),
      publicationYear: 2026,
    });
  };

  const handleDownloadGridCsv = () => {
    const csv = buildComparisonGridCsv(countries, locale);
    const filename = buildComparatorFilename(
      countries.map((c) => c.isoCode),
      "indicadores",
      "csv"
    );
    triggerBlobDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
  };

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[600px] gap-3"
        style={{
          gridTemplateColumns: `repeat(${countries.length}, minmax(180px, 1fr))`,
        }}
      >
        {countries.map((c) => (
          <ComparisonCountryCard key={c.isoCode} country={c} onRemove={removeCountry} />
        ))}
      </div>

      {/* Institutional cited sources footer */}
      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-caption text-fg-muted">
        <div className="flex flex-wrap items-center gap-1.5">
          <strong className="font-medium text-fg-secondary">{t("comp.primarySources", "Fontes primárias:")}</strong>
          {(["Banco Mundial", "PNUD", "OMS", "SIPRI", "Natural Earth"] as const).map((src, idx) => {
            const label =
              locale === "en"
                ? src === "Banco Mundial"
                  ? "World Bank"
                  : src === "PNUD"
                  ? "UNDP"
                  : src === "OMS"
                  ? "WHO"
                  : src
                : src;
            return (
              <React.Fragment key={src}>
                {idx > 0 && <span aria-hidden="true">·</span>}
                <a
                  href={getSourceUrl(src)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-accent hover:text-accent-hover hover:underline"
                >
                  <span>{label}</span>
                  <ExternalLink aria-hidden="true" className="h-3 w-3" />
                </a>
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ComparatorExportBar
            csvTestId="comparison-grid-export-csv"
            onDownloadCsv={handleDownloadGridCsv}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerateComparisonCitation}
            title={t("comp.citeComparisonTitle", "Gerar Citação Acadêmica desta Comparação")}
          >
            <Quote aria-hidden="true" className="h-3 w-3 text-accent" />
            <span>{t("comp.citeComparison", "Citar comparação")}</span>
          </Button>
          <span className="font-mono text-caption text-fg-muted">{t("comp.auditBrand", "Auditoria TellusPedia")}</span>
        </div>
      </footer>
    </div>
  );
};
