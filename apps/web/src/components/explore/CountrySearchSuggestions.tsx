"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { countrySuggestions } from "@/lib/explore/search";
import { useExploreNavigation } from "./useExploreNavigation";
import { useI18n } from "@/lib/i18n/useT";

export function CountrySearchSuggestions({ iso }: { iso: string | null }) {
  const { t, tRaw } = useI18n();
  const { navigate } = useExploreNavigation();
  const { isContemporary } = useEpochState();
  const suggestions = countrySuggestions(iso, isContemporary);
  const event = suggestions.find((item) => item.group === "event");
  const actions = [...(event ? [event] : []), ...suggestions.filter((item) => item.group === "layer")];
  if (!actions.length) return null;

  const heading = t("suggestions.exploreInCountry", "Explorar neste país");

  return (
    <section aria-label={heading} className="shrink-0 border-t border-line p-3">
      <h3 className="mb-1.5 text-caption font-medium text-fg-secondary">{heading}</h3>
      <ul className="flex flex-wrap gap-1.5">
        {actions.map((item) => {
          let label = item.title;
          if (item.group === "layer" && item.id.startsWith("layer:")) {
            label = tRaw(`suggestions.layer.${item.id.slice("layer:".length)}`, item.title);
          } else if (item.group === "event" && item.id.startsWith("event:")) {
            label = tRaw(`event.${item.id.slice("event:".length)}`, item.title);
          }
          return (
            <li key={item.id} className={item.group === "event" ? "w-full" : undefined}>
              <button
                type="button"
                onClick={() => navigate(item)}
                title={item.detail}
                className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-control border border-line px-2 py-1 text-left text-caption text-fg hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span className="truncate">{label}</span>
                <ArrowUpRight className="h-3 w-3 shrink-0 text-fg-muted" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
