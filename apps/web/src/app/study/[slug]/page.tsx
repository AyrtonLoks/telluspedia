import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GlobeExperienceShell } from "@/components/shell/GlobeExperienceShell";
import { buildStudyMetadata, loadStudyBySlug, loadStudyWithLineage } from "@/lib/server-loaders";
import { getServerLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

interface StudyPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StudyPageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getServerLocale()]);
  const study = await loadStudyBySlug(slug);
  return buildStudyMetadata(study, slug, locale);
}

export default async function StudyDirectPage({ params }: StudyPageProps) {
  const { slug } = await params;
  const loaded = await loadStudyWithLineage(slug);

  if (!loaded) {
    notFound();
  }

  return (
    <GlobeExperienceShell
      initialState={{
        kind: "study",
        study: loaded.study,
        lineage: loaded.lineage,
      }}
    />
  );
}
