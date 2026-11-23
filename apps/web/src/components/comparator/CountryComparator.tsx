"use client";

import React, { useMemo, useState } from "react";
import { BarChart2, Plus, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useComparatorStore } from "@/stores/comparatorStore";
import { getAllCountries } from "@/lib/country-data";
import { searchComparableCountries } from "@/lib/comparator-data";
import { ComparisonGrid } from "./ComparisonGrid";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/useT";
import { formatCountryName } from "@/lib/i18n/format";

const ComparisonCharts = dynamic(
  () => import("./ComparisonCharts").then((m) => m.ComparisonCharts),
  { ssr: false }
);

export const CountryComparator: React.FC = () => {
  const { locale, t } = useI18n();
  const storeIsOpen = useComparatorStore((s) => s.isOpen);
  const storeSelectedIsos = useComparatorStore((s) => s.selectedIsos);
  const closeComparator = useComparatorStore((s) => s.closeComparator);
  const addCountry = useComparatorStore((s) => s.addCountry);

  const isOpen =
    typeof window === "undefined" ? useComparatorStore.getState().isOpen : storeIsOpen;
  const selectedIsos =
    typeof window === "undefined"
      ? useComparatorStore.getState().selectedIsos
      : storeSelectedIsos;

  const [query, setQuery] = useState("");
  const totalCatalogCount = useMemo(() => getAllCountries().length, []);
  const isFull = selectedIsos.length >= 4;

  // Sem retorno antecipado: com `open` falso o Dialog não renderiza nada e anima a saída (D17).
  const suggestions = useMemo(
    () => (isFull ? [] : searchComparableCountries(query, selectedIsos, query.trim() ? 10 : 8)),
    [query, selectedIsos, isFull]
  );

  const handleAdd = (iso: string) => {
    addCountry(iso);
    setQuery("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeComparator(); }}>
      <DialogContent
        className="h-[88vh] max-h-[88vh] w-[min(94vw,64rem)]"
        title={
          <span className="flex items-center gap-2.5">
            <BarChart2 aria-hidden="true" className="h-5 w-5 shrink-0 text-accent" />
            <span>{t("comp.title", "Comparador multidimensional de países (até 4 nações)")}</span>
          </span>
        }
        description={`${t("comp.descPrefix", "Compare indicadores oficiais lado a lado entre todos os")} ${totalCatalogCount} ${t("comp.descSuffix", "países do catálogo.")}`}
      >
        {/* Subheader: busca entre os 177 países + atalhos de adição */}
        <div className="mb-5 space-y-3 border-b border-line pb-3 text-caption">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative flex h-9 min-w-[16rem] flex-1 items-center gap-2 rounded-control border border-line bg-surface-sunken px-3 text-label">
              <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
              <span className="sr-only">{t("comp.searchSr", "Buscar país para adicionar ao comparador")}</span>
              <input
                type="text"
                value={query}
                disabled={isFull}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && suggestions.length > 0 && !isFull) {
                    e.preventDefault();
                    handleAdd(suggestions[0].isoCode);
                  } else if (e.key === "Escape" && query.length > 0) {
                    e.stopPropagation();
                    setQuery("");
                  }
                }}
                placeholder={
                  isFull
                    ? t("comp.searchFull", "Limite de 4 países atingido — remova um para trocar")
                    : `${t("comp.searchPlaceholderPrefix", "Buscar entre")} ${totalCatalogCount} ${t("comp.searchPlaceholderSuffix", "países ou código ISO…")}`
                }
                data-testid="comparator-country-search"
                className="w-full min-w-0 border-none bg-transparent text-fg placeholder:text-fg-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
              {query && (
                <button
                  type="button"
                  aria-label={t("comp.clearSearch", "Limpar busca de país")}
                  onClick={() => setQuery("")}
                  className="rounded-sm p-0.5 text-fg-muted hover:text-fg"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              )}
            </label>

            <span className="font-mono tabular-nums text-fg-muted">
              {selectedIsos.length}/4 {t("comp.selectedCount", "selecionados")}
            </span>
          </div>

          {!isFull && (
            <div
              className="flex flex-wrap items-center gap-1.5"
              data-testid="comparator-country-suggestions"
            >
              <span className="shrink-0 text-fg-muted">
                {query.trim() ? t("comp.results", "Resultados:") : t("comp.suggestions", "Sugestões:")}
              </span>
              {suggestions.length > 0 ? (
                suggestions.map((c) => (
                  <Button
                    key={c.isoCode}
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleAdd(c.isoCode)}
                  >
                    <Plus aria-hidden="true" className="h-3 w-3" />
                    <span>{formatCountryName(c.iso2, c.nameCommon, locale)}</span>
                    <span className="font-mono text-caption text-fg-muted">{c.isoCode}</span>
                  </Button>
                ))
              ) : (
                <span className="italic text-fg-muted">
                  {t("comp.noCountryFound", "Nenhum país disponível encontrado para")} “{query.trim()}”.
                </span>
              )}
            </div>
          )}
        </div>

        {/* Body: Grid and Recharts Charts */}
        <div className="space-y-6">
          <ComparisonGrid />
          <ComparisonCharts />
        </div>
      </DialogContent>
    </Dialog>
  );
};
