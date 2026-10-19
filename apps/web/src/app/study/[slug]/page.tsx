"use client";

import React, { useEffect, useState, use, Suspense } from "react";
import HomePage from "@/app/page";
import { ForkStudyBanner } from "@/components/study/ForkStudyBanner";
import { useGlobeStore } from "@/stores/globeStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useComparatorStore } from "@/stores/comparatorStore";

function StudyContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [study, setStudy] = useState<any>(null);
  const flyTo = useGlobeStore((s) => s.flyTo);
  const setSelectedIso = useGlobeStore((s) => s.setSelectedIso);
  const setYearRange = useTimelineStore((s) => s.setYearRange);
  const setSelectedIsos = useComparatorStore((s) => s.setSelectedIsos);

  useEffect(() => {
    fetch(`/api/studies/${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setStudy(data);
          if (data.timelineStartYear && data.timelineEndYear) {
            setYearRange(data.timelineStartYear, data.timelineEndYear);
          }
          if (data.selectedCountryIsos && data.selectedCountryIsos.length > 0) {
            setSelectedIso(data.selectedCountryIsos[0]);
            setSelectedIsos(data.selectedCountryIsos);
          }
          if (data.cameraLat !== undefined && data.cameraLng !== undefined) {
            flyTo(data.cameraLat, data.cameraLng, data.cameraAltitude || 2.2);
          }
        }
      })
      .catch((err) => console.error("Error loading study:", err));
  }, [slug, flyTo, setSelectedIso, setYearRange, setSelectedIsos]);

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
