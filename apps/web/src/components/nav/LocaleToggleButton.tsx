"use client";

import React from "react";
import { preloadEnMessages, useLocaleStore } from "@/stores/localeStore";
import { useI18n } from "@/lib/i18n/useT";
import { cn } from "@/components/ui/cn";

export interface LocaleToggleButtonProps {
  onAfterToggle?: () => void;
  className?: string;
}

export function LocaleToggleButton({ onAfterToggle, className }: LocaleToggleButtonProps) {
  const { locale, t } = useI18n();
  const toggleLocale = useLocaleStore((s) => s.toggleLocale);

  const handleClick = () => {
    toggleLocale();
    onAfterToggle?.();
  };

  return (
    <button
      type="button"
      data-testid="locale-switcher"
      aria-label={
        locale === "pt-BR"
          ? t("locale.switchToEn", "Switch language to English")
          : t("locale.switchToPt", "Mudar idioma para Português (Brasil)")
      }
      onClick={handleClick}
      onMouseEnter={preloadEnMessages}
      onFocus={preloadEnMessages}
      title={t("locale.title", "Idioma da interface (Português / English)")}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-panel border border-line bg-surface/86 px-2.5 font-mono text-caption font-medium tabular-nums text-fg-secondary shadow-e1 backdrop-blur-md transition-colors duration-fast ease-out hover:border-line-strong hover:bg-surface-hover hover:text-fg",
        className
      )}
    >
      {locale === "en" ? "EN" : "PT"}
    </button>
  );
}

/** Variante para páginas Server Component (`/studies`, `/dossies/[slug]`): recarrega SSR após atualizar o cookie. */
export function ServerLocaleToggleButton({ className }: { className?: string }) {
  return (
    <LocaleToggleButton
      className={className}
      onAfterToggle={() => {
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }}
    />
  );
}
