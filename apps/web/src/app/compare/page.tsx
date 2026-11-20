import React from "react";
import type { Metadata } from "next";
import { GlobeExperienceShell } from "@/components/shell/GlobeExperienceShell";
import { buildCompareMetadata, parseCompareIsos } from "@/lib/server-loaders";

interface ComparePageProps {
  searchParams: Promise<{ c?: string | string[] }>;
}

export async function generateMetadata({ searchParams }: ComparePageProps): Promise<Metadata> {
  const resolved = await searchParams;
  const isos = parseCompareIsos(resolved.c);
  return buildCompareMetadata(isos);
}

export default async function CompareDirectPage({ searchParams }: ComparePageProps) {
  const resolved = await searchParams;
  const isos = parseCompareIsos(resolved.c);

  return <GlobeExperienceShell initialState={{ kind: "compare", isos }} />;
}
