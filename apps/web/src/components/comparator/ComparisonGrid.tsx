"use client";

import React from "react";
import { X, ExternalLink, Quote } from "lucide-react";
import { getCountryData, CountryData } from "@/lib/country-data";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useReaderStore } from "@/stores/readerStore";
import { getSourceUrl } from "@/lib/citations";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

interface ComparisonCardProps {
  country: CountryData;
  onRemove: (iso: string) => void;
}

const ComparisonCountryCard: React.FC<ComparisonCardProps> = ({ country: c, onRemove }) => {
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
    if (num === null) return "Dado indisponível";
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)} bi`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)} mi`;
    return num.toLocaleString("pt-BR");
  };

  const formatGdp = (val?: number) => {
    if (val === undefined || val === null) return "Dado indisponível";
    if (val >= 1e12) return `$ ${(val / 1e12).toFixed(2)} tri`;
    if (val >= 1e9) return `$ ${(val / 1e9).toFixed(1)} bi`;
    return `$ ${val.toLocaleString("pt-BR")}`;
  };

  return (
    <div className="relative space-y-3 rounded-card border border-line bg-surface-raised p-3.5">
      {/* Header with remove button */}
      <div className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {c.flagSvgUrl && !flagError ? (
            <img
              src={c.flagSvgUrl}
              alt={`Bandeira de ${c.nameCommon}`}
              onError={() => setFlagError(true)}
              className="h-4 w-6 shrink-0 rounded-sm border border-line object-cover"
            />
          ) : (
            <span className="flex h-4 w-6 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-surface font-mono text-caption font-medium text-fg-secondary">
              {c.isoCode}
            </span>
          )}
          <div className="min-w-0">
            <h5 className="line-clamp-1 text-label font-semibold text-fg">{c.nameCommon}</h5>
            <span className="font-mono text-caption text-fg-muted">{c.isoCode}</span>
          </div>
        </div>

        <IconButton
          label={`Remover ${c.nameCommon}`}
          icon={<X />}
          size="sm"
          onClick={() => onRemove(c.isoCode)}
        />
      </div>

      {/* Data Rows */}
      <div className="space-y-2.5 text-label">
        <div>
          <span className="block text-caption text-fg-muted">Capital</span>
          <span className={c.capital ? "font-medium text-fg" : "text-fg-muted"}>
            {c.capital ?? "Dado indisponível"}
          </span>
        </div>

        <div>
          <span className="block text-caption text-fg-muted">
            População{popInd?.year ? ` (${popInd.year})` : ""}
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
            Área Territorial{areaInd?.year ? ` (${areaInd.year})` : ""}
          </span>
          <span
            className={
              c.areaKm2 !== null
                ? "font-mono font-medium tabular-nums text-fg"
                : "text-fg-muted"
            }
          >
            {c.areaKm2 !== null ? `${c.areaKm2.toLocaleString("pt-BR")} km²` : "Dado indisponível"}
          </span>
        </div>

        <div>
          <span className="block text-caption text-fg-muted">
            PIB Nominal{gdpInd?.year ? ` (${gdpInd.year})` : ""}
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
            PIB per capita{gdpPcapInd?.year ? ` (${gdpPcapInd.year})` : ""}
          </span>
          <span
            className={
              gdpPcap !== undefined
                ? "font-mono font-medium tabular-nums text-fg"
                : "text-fg-muted"
            }
          >
            {gdpPcap !== undefined ? `$ ${Math.round(gdpPcap).toLocaleString("pt-BR")}` : "Dado indisponível"}
          </span>
        </div>

        <div>
          <span className="block text-caption text-fg-muted">
            IDH{hdiInd?.year ? ` (${hdiInd.year})` : ""}
          </span>
          <span
            className={
              hdi !== undefined
                ? "font-mono font-medium tabular-nums text-fg"
                : "text-fg-muted"
            }
          >
            {hdi !== undefined ? hdi.toFixed(3) : "Dado indisponível"}
          </span>
        </div>

        <div>
          <span className="block text-caption text-fg-muted">
            Expectativa de Vida{lifeInd?.year ? ` (${lifeInd.year})` : ""}
          </span>
          <span
            className={
              lifeExp !== undefined
                ? "font-mono font-medium tabular-nums text-fg"
                : "text-fg-muted"
            }
          >
            {lifeExp !== undefined ? `${lifeExp} anos` : "Dado indisponível"}
          </span>
        </div>

        <div>
          <span className="block text-caption text-fg-muted">
            Energia Renovável{renewInd?.year ? ` (${renewInd.year})` : ""}
          </span>
          <span
            className={
              renewPct !== undefined
                ? "font-mono font-medium tabular-nums text-fg"
                : "text-fg-muted"
            }
          >
            {renewPct !== undefined ? `${renewPct.toLocaleString("pt-BR")}%` : "Dado indisponível"}
          </span>
        </div>

        <div>
          <span className="block text-caption text-fg-muted">
            CO₂ per capita{co2Ind?.year ? ` (${co2Ind.year})` : ""}
          </span>
          <span
            className={
              co2Pcap !== undefined
                ? "font-mono font-medium tabular-nums text-fg"
                : "text-fg-muted"
            }
          >
            {co2Pcap !== undefined ? `${co2Pcap.toLocaleString("pt-BR")} t` : "Dado indisponível"}
          </span>
        </div>

        <div>
          <span className="block text-caption text-fg-muted">Sistema de Governo</span>
          <span className={c.governmentType ? "line-clamp-2 text-caption text-fg-secondary" : "text-fg-muted"}>
            {c.governmentType ?? "Dado indisponível"}
          </span>
        </div>
      </div>
    </div>
  );
};

export const ComparisonGrid: React.FC = () => {
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
        Nenhum país selecionado para comparação. Adicione até 4 países para visualizar os dados lado a lado.
      </div>
    );
  }

  const handleGenerateComparisonCitation = () => {
    const names = countries.map((c) => c.nameCommon).join(", ");
    const isos = countries.map((c) => c.isoCode).join(",");
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/compare?c=${encodeURIComponent(isos)}`
        : `https://telluspedia.org/compare?c=${encodeURIComponent(isos)}`;

    setCitationModalOpen(true, {
      title: `Estudo Comparativo Multidimensional: ${names}`,
      countryName: countries[0]?.nameCommon || "TellusPedia",
      url,
      accessDate: new Date(),
      publicationYear: 2026,
    });
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
          <strong className="font-medium text-fg-secondary">Fontes primárias:</strong>
          {(["Banco Mundial", "PNUD", "OMS", "SIPRI", "Natural Earth"] as const).map((src, idx) => (
            <React.Fragment key={src}>
              {idx > 0 && <span aria-hidden="true">·</span>}
              <a
                href={getSourceUrl(src)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-accent hover:text-accent-hover hover:underline"
              >
                <span>{src}</span>
                <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerateComparisonCitation}
            title="Gerar Citação Acadêmica desta Comparação"
          >
            <Quote aria-hidden="true" className="h-3 w-3 text-accent" />
            <span>Citar comparação</span>
          </Button>
          <span className="font-mono text-caption text-fg-muted">Auditoria TellusPedia</span>
        </div>
      </footer>
    </div>
  );
};
