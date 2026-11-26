"use client";

import React, { useMemo } from "react";
import { GitBranch } from "lucide-react";
import { getTransversalEntitiesForCountry } from "@/lib/transversal-meta";
import { useTransversalStore } from "@/stores/transversalStore";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/useT";

interface CountryTransversalSectionProps {
  isoCode: string;
}

/**
 * Conexões transversais de personalidades e temas associadas ao país (D38 / RN14).
 */
export const CountryTransversalSection: React.FC<CountryTransversalSectionProps> = ({
  isoCode,
}) => {
  const { locale, t } = useI18n();
  const entities = useMemo(() => getTransversalEntitiesForCountry(isoCode), [isoCode]);
  const activeEntityId = useTransversalStore((s) => s.activeEntityId);
  const activateEntity = useTransversalStore((s) => s.activateEntity);

  if (entities.length === 0) return null;

  return (
    <section
      data-testid="country-transversal-section"
      aria-label={t("transversal.countrySectionAria", "Linhas do tempo transversais deste país")}
      className="my-3 space-y-2 rounded-card border border-line bg-surface-raised p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-fg">
          <GitBranch aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
          <span>{t("transversal.countrySectionTitle", "Linhas Transversais (RN14)")}</span>
        </span>
        <span className="font-mono text-caption tabular-nums text-fg-muted">
          {entities.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {entities.map((item) => {
          const isActive = activeEntityId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`country-transversal-${item.id}`}
              onClick={() => void activateEntity(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-control border px-2 py-1 text-caption font-medium transition-colors duration-fast ease-out",
                isActive
                  ? "border-accent/50 bg-accent/15 text-accent"
                  : "border-line bg-surface text-fg-secondary hover:border-accent/40 hover:text-fg"
              )}
            >
              <span>{locale === "en" ? item.shortLabelEn : item.shortLabelPt}</span>
              <Badge tone="neutral">{item.spanLabel}</Badge>
            </button>
          );
        })}
      </div>
    </section>
  );
};
