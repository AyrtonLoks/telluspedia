"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/useT";

export interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RouteError({ error, reset }: RouteErrorProps) {
  const { t } = useI18n();

  useEffect(() => {
    console.error("[telluspedia] Route error boundary caught failure", {
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <main
      data-testid="route-error-boundary"
      className="flex min-h-screen items-center justify-center bg-bg px-6 py-12 text-fg"
    >
      <div
        role="alert"
        className="w-full max-w-lg rounded-panel border border-line bg-surface p-8 text-center shadow-e2"
      >
        <div className="mx-auto flex size-11 items-center justify-center rounded-card border border-danger/30 bg-danger/10 text-danger">
          <AlertTriangle aria-hidden="true" className="size-5" />
        </div>
        <p className="mt-4 font-mono text-caption text-danger tabular-nums">
          {t("error.runtimeTag", "Erro de execução")}
        </p>
        <h1 className="mt-2 text-display font-semibold text-fg">
          {t("error.runtimeTitle", "Não foi possível carregar esta visualização")}
        </h1>
        <p className="mt-3 text-body text-fg-secondary">
          {t(
            "error.runtimeBody",
            "Ocorreu uma falha inesperada durante a renderização. Você pode tentar novamente ou continuar navegando pelos demais módulos do TellusPedia."
          )}
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-caption text-fg-muted tabular-nums">
            {t("error.reference", "Referência")}: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" onClick={() => reset()}>
            <RotateCcw aria-hidden="true" className="size-4" />
            {t("error.retry", "Tentar novamente")}
          </Button>
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-control border border-line bg-surface-raised px-4 text-label font-medium text-fg transition-colors duration-fast ease-out hover:border-line-strong hover:bg-surface-hover"
          >
            {t("error.backToGlobe", "Voltar ao globo")}
          </Link>
        </div>
        <nav
          aria-label={t("error.recoveryAria", "Atalhos de recuperação")}
          className="mt-6 flex flex-wrap items-center justify-center gap-4 border-t border-line pt-5 text-label text-accent"
        >
          <Link href="/compare" className="hover:text-accent-hover hover:underline">
            {t("error.comparator", "Comparador de países")}
          </Link>
          <Link href="/telluslab" className="hover:text-accent-hover hover:underline">
            {t("error.telluslab", "Dossiês e TellusLab")}
          </Link>
        </nav>
      </div>
    </main>
  );
}
