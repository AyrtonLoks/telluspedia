"use client";

import React, { useEffect, useState, use, Suspense } from "react";
import HomePage from "@/app/page";
import { ForkStudyBanner } from "@/components/study/ForkStudyBanner";
import { restoreStudySnapshot, type StudySnapshot } from "@/stores/actions";

function StudyContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [study, setStudy] = useState<StudySnapshot | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setStudy(null);
    fetch(`/api/studies/${slug}`, { signal: controller.signal })
      .then((response): Promise<StudySnapshot | null> | null => response.ok ? response.json() : null)
      .then((data) => {
        if (!data || controller.signal.aborted) return;
        restoreStudySnapshot(data);
        setStudy(data);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) console.error("Error loading study:", error);
      });
    return () => controller.abort();
  }, [slug]);

  return (
    <>
      {study && (
        <ForkStudyBanner
          studyId={study.id}
          parentId={study.parentId}
          title={study.title}
        />
      )}
      <HomePage />
    </>
  );
}

export default function StudyDirectPage(props: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <StudyContent params={props.params} />
    </Suspense>
  );
}
