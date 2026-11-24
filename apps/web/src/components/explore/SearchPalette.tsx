"use client";

import React, { useId, useMemo, useRef, useState } from "react";
import { useExploreNavigation } from "./useExploreNavigation";
import { ArrowDown, ArrowUp, CornerDownLeft, Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { cn } from "@/components/ui/cn";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { SEARCH_GROUPS, exploreSuggestions, searchExplore, type SearchResult } from "@/lib/explore/search";
import { useLayoutStore, type RightPanelId } from "@/stores/layoutStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useI18n } from "@/lib/i18n/useT";
import { formatCountryName } from "@/lib/i18n/format";

export function SearchPalette({ onClose, previousFocus }: { onClose: () => void; previousFocus: HTMLElement | null }) {
  const { locale, t, tRaw } = useI18n();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const focusAfterClose = useRef<RightPanelId | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const { hasCountryContext, canApplyHere, navigate } = useExploreNavigation();
  const selectedIso = useGlobeStore((state) => state.selectedIso);
  const { isContemporary } = useEpochState();

  const groups = useMemo(() => {
    const results = query.trim() ? searchExplore(query) : exploreSuggestions(hasCountryContext ? selectedIso : null, isContemporary);
    const grouped = new Map<SearchResult["group"], SearchResult[]>();
    for (const result of results) {
      const group = grouped.get(result.group) ?? [];
      group.push(result);
      grouped.set(result.group, group);
    }
    return [...grouped];
  }, [query, selectedIso, isContemporary, hasCountryContext]);
  const results = groups.flatMap(([, entries]) => entries);
  const active = results[Math.min(activeIndex, results.length - 1)];

  const choose = (result: SearchResult, keyboard = false) => {
    if (keyboard && canApplyHere) {
      if (result.group === "country" || result.group === "historical") focusAfterClose.current = "country";
      if (result.group === "body") focusAfterClose.current = "cosmos";
      if (result.group === "layer") focusAfterClose.current = "observatory";
    }
    onClose();
    navigate(result);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || !results.length) return;
    if (event.key === "Enter" && active) {
      event.preventDefault();
      choose(active, true);
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const currentIndex = Math.max(0, results.indexOf(active));
      const next = (currentIndex + step + results.length) % results.length;
      setActiveIndex(next);
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        title={t("search.title", "Buscar no TellusPedia")}
        description={t("search.description", "Encontre países, eventos e comandos para explorar o globo.")}
        className="w-[min(92vw,36rem)]"
        onOpenAutoFocus={(event) => { event.preventDefault(); input.current?.focus(); }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (focusAfterClose.current) useLayoutStore.getState().requestRightPanelFocus(focusAfterClose.current);
          else previousFocus?.focus();
        }}
        footer={
          <div className="flex flex-wrap items-center gap-3 text-caption text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <ArrowUp size={13} aria-hidden="true" />
              <ArrowDown size={13} aria-hidden="true" /> {t("search.footerNavigate", "Navegar")}
            </span>
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft size={13} aria-hidden="true" /> {t("search.footerSelect", "Selecionar")}
            </span>
            <span>
              <kbd>Esc</kbd> {t("search.footerClose", "Fechar")}
            </span>
          </div>
        }
      >
        <label className="flex h-11 items-center gap-2.5 rounded-control border border-line bg-surface-sunken px-3 focus-within:border-accent">
          <Search className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <span className="sr-only">{t("search.inputLabel", "Buscar país, evento ou comando")}</span>
          <input
            ref={input}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={active ? `${listId}-${results.indexOf(active)}` : undefined}
            value={query}
            maxLength={100}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={onInputKeyDown}
            placeholder={t("search.placeholder", "País, evento ou comando…")}
            className="w-full bg-transparent text-fg placeholder:text-fg-muted focus-visible:outline-none"
          />
        </label>
        <div className="mt-4">
          {!query.trim() && (
            <p className="mb-2 text-label font-medium text-fg">
              {t("search.suggestions", "Sugestões")}
              {hasCountryContext && selectedIso ? ` · ${selectedIso}` : ""}
            </p>
          )}
          <ul id={listId} role="listbox" aria-label={t("search.resultsAria", "Resultados da busca")} className="space-y-3">
            {groups.map(([group, entries]) => {
              const groupLabel = t(`search.group.${group}`, SEARCH_GROUPS[group]);
              return (
                <li key={group} role="group" aria-label={groupLabel}>
                  <p className="mb-0.5 px-2.5 text-caption font-medium text-fg-muted" aria-hidden="true">{groupLabel}</p>
                  <ul role="presentation" className="space-y-0.5">
                    {entries.map((result) => {
                      const index = results.indexOf(result);
                      let displayTitle = result.title;
                      if (locale === "en") {
                        if (result.group === "country") {
                          const iso2 = result.keywords?.split(" ")[0];
                          displayTitle = formatCountryName(iso2, result.title, "en");
                        } else if (result.group === "body" && result.keywords) {
                          displayTitle = result.keywords;
                        } else if (result.group === "event" && result.id.startsWith("event:")) {
                          displayTitle = tRaw(`event.${result.id.slice("event:".length)}`, result.title);
                        } else if (result.group === "layer") {
                          if (result.id.startsWith("layer:NASA_GIBS:")) {
                            const pid = result.id.slice("layer:NASA_GIBS:".length);
                            displayTitle = `${t("search.prefix.satellite", "Satélite:")} ${tRaw(`obs.gibs.${pid}.name`, result.title)}`;
                          } else if (result.id.startsWith("layer:")) {
                            displayTitle = tRaw(`suggestions.layer.${result.id.slice("layer:".length)}`, result.title);
                          }
                        } else if (result.group === "choropleth" && result.id.startsWith("choropleth:")) {
                          const indId = result.id.slice("choropleth:".length);
                          displayTitle = `${t("search.prefix.thematic", "Mapa temático:")} ${tRaw(`choropleth.ind.${indId}.label`, result.title)}`;
                        } else if (result.group === "cosmicLayer" && result.id.startsWith("cosmicLayer:")) {
                          displayTitle = tRaw(`cosmic.layer.${result.id.slice("cosmicLayer:".length)}`, result.title);
                        } else if (result.group === "preset" && result.id.startsWith("preset:")) {
                          displayTitle = tRaw(`timeline.preset.${result.id.slice("preset:".length)}`, result.title);
                        } else if (result.group === "command") {
                          if (result.id === "compare:") displayTitle = t("search.cmd.compare", result.title);
                          else if (result.id === "route:/studies") displayTitle = t("search.cmd.studies", result.title);
                          else if (result.id.startsWith("year:")) {
                            displayTitle = `${t("search.cmd.goToYear", "Ir para")} ${result.id.slice("year:".length)}`;
                          }
                        }
                      }
                      return (
                        <li
                          id={`${listId}-${index}`}
                          key={result.id}
                          role="option"
                          aria-selected={result === active}
                          onPointerMove={() => setActiveIndex(index)}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => choose(result)}
                          className={cn(
                            "flex min-h-9 cursor-pointer flex-wrap items-center justify-between gap-x-3 rounded-control border border-transparent px-2.5 py-1.5 text-label text-fg",
                            result === active && "border-accent/30 bg-accent/10",
                          )}
                        >
                          <span className="font-medium">{displayTitle}</span>
                          {result.detail && <span className="text-caption text-fg-secondary">{result.detail}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
          {!results.length && (
            <p role="status" className="px-2.5 py-3 text-label text-fg-muted">
              {t("search.empty", "Nenhum resultado encontrado.")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
