"use client";

import React, { useEffect, use, Suspense } from "react";
import HomePage from "@/app/page";
import { useComparatorStore } from "@/stores/comparatorStore";

function CompareContent({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const resolvedParams = use(searchParams);
  const openComparator = useComparatorStore((s) => s.openComparator);
  const setSelectedIsos = useComparatorStore((s) => s.setSelectedIsos);

  useEffect(() => {
    if (resolvedParams.c) {
      const isos = resolvedParams.c.split(",").map((i) => i.trim().toUpperCase());
      setSelectedIsos(isos);
    }
    openComparator();
  }, [resolvedParams.c, setSelectedIsos, openComparator]);

  return <HomePage />;
}

export default function CompareDirectPage(props: {
  searchParams: Promise<{ c?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <CompareContent searchParams={props.searchParams} />
    </Suspense>
  );
}
