"use client";

import React, { useState } from "react";
import { Check, Download, FileImage, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/useT";

export interface ComparatorExportBarProps {
  onDownloadCsv: () => void;
  onDownloadPng?: () => Promise<void> | void;
  onDownloadSvg?: () => void;
  disabled?: boolean;
  csvTestId?: string;
  pngTestId?: string;
  svgTestId?: string;
}

/**
 * Barra discreta de exportação D14 do Comparador (D37):
 * - CSV (RFC 4180 com valores brutos e fontes primárias RN02)
 * - PNG 2× e SVG vetorial do gráfico ativo com legenda e atribuição institucional.
 */
export const ComparatorExportBar: React.FC<ComparatorExportBarProps> = ({
  onDownloadCsv,
  onDownloadPng,
  onDownloadSvg,
  disabled = false,
  csvTestId = "comparator-export-csv",
  pngTestId = "comparator-export-png",
  svgTestId = "comparator-export-svg",
}) => {
  const { t } = useI18n();
  const [doneKind, setDoneKind] = useState<"csv" | "png" | "svg" | null>(null);
  const [busyPng, setBusyPng] = useState(false);

  const flashDone = (kind: "csv" | "png" | "svg") => {
    setDoneKind(kind);
    setTimeout(() => {
      setDoneKind((curr) => (curr === kind ? null : curr));
    }, 1800);
  };

  const handleCsv = () => {
    onDownloadCsv();
    flashDone("csv");
  };

  const handleSvg = () => {
    if (!onDownloadSvg) return;
    onDownloadSvg();
    flashDone("svg");
  };

  const handlePng = async () => {
    if (!onDownloadPng || busyPng) return;
    setBusyPng(true);
    try {
      await onDownloadPng();
      flashDone("png");
    } finally {
      setBusyPng(false);
    }
  };

  return (
    <div
      role="group"
      aria-label={t("comp.exportGroupAria", "Exportar dados e gráfico da comparação")}
      className="flex flex-wrap items-center gap-1.5"
    >
      <Button
        size="sm"
        variant="secondary"
        data-testid={csvTestId}
        disabled={disabled}
        onClick={handleCsv}
        title={t(
          "comp.exportCsvTitle",
          "Baixar planilha CSV (RFC 4180) com valores brutos, anos de referência e fontes primárias (RN02)"
        )}
      >
        {doneKind === "csv" ? (
          <Check aria-hidden="true" className="h-3.5 w-3.5 text-success" />
        ) : (
          <FileSpreadsheet aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
        )}
        <span>{t("comp.exportCsv", "CSV")}</span>
      </Button>

      {onDownloadPng && (
        <Button
          size="sm"
          variant="secondary"
          data-testid={pngTestId}
          disabled={disabled || busyPng}
          onClick={handlePng}
          title={t(
            "comp.exportPngTitle",
            "Baixar imagem PNG de alta resolução do gráfico ativo com legenda e atribuição de fonte primária"
          )}
        >
          {doneKind === "png" ? (
            <Check aria-hidden="true" className="h-3.5 w-3.5 text-success" />
          ) : (
            <FileImage aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
          )}
          <span>{busyPng ? t("comp.exporting", "Gerando…") : t("comp.exportPng", "PNG")}</span>
        </Button>
      )}

      {onDownloadSvg && (
        <Button
          size="sm"
          variant="ghost"
          data-testid={svgTestId}
          disabled={disabled}
          onClick={handleSvg}
          title={t(
            "comp.exportSvgTitle",
            "Baixar gráfico vetorial SVG autônomo com legenda e atribuição de fonte primária (RN02)"
          )}
        >
          {doneKind === "svg" ? (
            <Check aria-hidden="true" className="h-3.5 w-3.5 text-success" />
          ) : (
            <Download aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          <span>{t("comp.exportSvg", "SVG")}</span>
        </Button>
      )}
    </div>
  );
};
