"use client";

import React, { useEffect } from "react";
import { useI18n } from "@/lib/i18n/useT";

export interface GlobalErrorViewProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function GlobalErrorView({ error, reset }: GlobalErrorViewProps) {
  const { locale, t } = useI18n();

  useEffect(() => {
    console.error("[telluspedia] Global error boundary caught failure", {
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <html lang={locale} className="dark">
      <body className="min-h-screen bg-bg font-sans text-fg antialiased">
        <main
          data-testid="global-error-boundary"
          className="flex min-h-screen items-center justify-center bg-bg px-6 py-12 text-fg"
        >
          <div
            role="alert"
            className="w-full max-w-lg rounded-panel border border-line bg-surface p-8 text-center shadow-e2"
          >
            <p className="font-mono text-caption text-danger tabular-nums">
              {t("error.criticalTag", "Erro crítico da aplicação")}
            </p>
            <h1 className="mt-2 text-display font-semibold text-fg">
              {t("error.criticalTitle", "A interface precisou ser interrompida")}
            </h1>
            <p className="mt-3 text-body text-fg-secondary">
              {t(
                "error.criticalBody",
                "Detectamos uma falha no carregamento principal do TellusPedia. Tente restaurar a sessão ou recarregue a página inicial."
              )}
            </p>
            {error.digest && (
              <p className="mt-3 font-mono text-caption text-fg-muted tabular-nums">
                {t("error.reference", "Referência")}: {error.digest}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex h-9 items-center justify-center rounded-control bg-accent px-4 text-label font-medium text-accent-on transition-colors duration-fast ease-out hover:bg-accent-hover"
              >
                {t("error.retry", "Tentar novamente")}
              </button>
              <button
                type="button"
                onClick={() => window.location.assign("/")}
                className="inline-flex h-9 items-center justify-center rounded-control border border-line bg-surface-raised px-4 text-label font-medium text-fg transition-colors duration-fast ease-out hover:border-line-strong hover:bg-surface-hover"
              >
                {t("error.reloadHome", "Recarregar início")}
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
