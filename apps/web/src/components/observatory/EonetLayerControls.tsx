"use client";

import React from "react";
import { EONET_CATEGORIES, type EonetCategory, type EonetCategoryFilter } from "@/lib/observatory-data";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useI18n } from "@/lib/i18n/useT";

export function EonetLayerControls() {
  const { t } = useI18n();
  const category = useObservatoryStore((state) => state.eonetCategory);
  const setCategory = useObservatoryStore((state) => state.setEonetCategory);

  return (
    <label className="flex flex-col gap-1 text-caption text-fg-secondary">
      {t("obs.eonet.categoryLabel", "Categoria dos eventos")}
      <select
        className="min-w-0 rounded-control border border-line bg-surface px-2 py-1 text-fg"
        value={category}
        onChange={(event) => setCategory(event.target.value as EonetCategoryFilter)}
      >
        <option value="all">{t("obs.eonet.all", "Todas as categorias")}</option>
        {(Object.entries(EONET_CATEGORIES) as [EonetCategory, string][]).map(([id, name]) => (
          <option key={id} value={id}>{t(`obs.eonet.${id}`, name)}</option>
        ))}
      </select>
    </label>
  );
}
