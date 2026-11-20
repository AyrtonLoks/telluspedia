"use client";

import { EONET_CATEGORIES, type EonetCategoryFilter } from "@/lib/observatory-data";
import { useObservatoryStore } from "@/stores/observatoryStore";

export function EonetLayerControls() {
  const category = useObservatoryStore((state) => state.eonetCategory);
  const setCategory = useObservatoryStore((state) => state.setEonetCategory);

  return (
    <label className="flex flex-col gap-1 text-caption text-fg-secondary">
      Categoria dos eventos
      <select
        className="min-w-0 rounded-control border border-line bg-surface px-2 py-1 text-fg"
        value={category}
        onChange={(event) => setCategory(event.target.value as EonetCategoryFilter)}
      >
        <option value="all">Todas as categorias</option>
        {Object.entries(EONET_CATEGORIES).map(([id, name]) => (
          <option key={id} value={id}>{name}</option>
        ))}
      </select>
    </label>
  );
}
