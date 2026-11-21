"use client";

import React from "react";
import { BarChart2, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useComparatorStore } from "@/stores/comparatorStore";
import { PILOT_COUNTRIES } from "@/lib/country-data";
import { ComparisonGrid } from "./ComparisonGrid";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

const ComparisonCharts = dynamic(
  () => import("./ComparisonCharts").then((m) => m.ComparisonCharts),
  { ssr: false }
);

export const CountryComparator: React.FC = () => {
  const isOpen = useComparatorStore((s) => s.isOpen);
  const closeComparator = useComparatorStore((s) => s.closeComparator);
  const selectedIsos = useComparatorStore((s) => s.selectedIsos);
  const addCountry = useComparatorStore((s) => s.addCountry);

  // Sem retorno antecipado: com `open` falso o Dialog não renderiza nada e anima a saída (D17).
  const availableCountries = Object.values(PILOT_COUNTRIES).filter(
    (c) => !selectedIsos.includes(c.isoCode)
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeComparator(); }}>
      <DialogContent
        className="h-[88vh] max-h-[88vh] w-[min(94vw,64rem)]"
        title={
          <span className="flex items-center gap-2.5">
            <BarChart2 aria-hidden="true" className="h-5 w-5 shrink-0 text-accent" />
            <span>Comparador multidimensional de países (até 4 nações)</span>
          </span>
        }
        description="Compare indicadores demográficos, econômicos e institucionais lado a lado."
      >
        {/* Subheader: Add country quick chips */}
        <div className="mb-5 flex items-center gap-2 overflow-x-auto border-b border-line pb-3 text-caption">
          <span className="shrink-0 text-fg-muted">Adicionar nação:</span>
          {availableCountries.length > 0 && selectedIsos.length < 4 ? (
            availableCountries.map((c) => (
              <Button
                key={c.isoCode}
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={() => addCountry(c.isoCode)}
              >
                <Plus aria-hidden="true" className="h-3 w-3" />
                <span>{c.nameCommon}</span>
              </Button>
            ))
          ) : (
            <span className="italic text-fg-muted">
              {selectedIsos.length >= 4 ? "Limite de 4 países atingido." : "Todos os países adicionados."}
            </span>
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
