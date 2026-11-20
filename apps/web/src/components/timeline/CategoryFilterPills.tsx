"use client";

import React from "react";
import { useTimelineStore, ALL_CATEGORIES } from "@/stores/timelineStore";
import { CATEGORY_LABEL, CATEGORY_TONE } from "@/components/ui/tones";
import { Chip } from "@/components/ui/Chip";

export const CategoryFilterPills: React.FC = () => {
  const activeCategories = useTimelineStore((s) => s.activeCategories);
  const toggleCategory = useTimelineStore((s) => s.toggleCategory);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {ALL_CATEGORIES.map((cat) => (
        <Chip
          key={cat}
          pressed={activeCategories.includes(cat)}
          tone={CATEGORY_TONE[cat]}
          onClick={() => toggleCategory(cat)}
        >
          {CATEGORY_LABEL[cat]}
        </Chip>
      ))}
    </div>
  );
};
