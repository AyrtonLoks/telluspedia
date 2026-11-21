import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GlobeExperienceShell } from "@/components/shell/GlobeExperienceShell";
import { buildStudyMetadata, loadStudyBySlug, loadStudyWithLineage } from "@/lib/server-loaders";

export const dynamic = "force-dynamic";

interface StudyPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const study = await loadStudyBySlug(slug);
  return buildStudyMetadata(study, slug);
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
