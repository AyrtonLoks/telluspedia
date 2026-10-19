"use client";

import React, { useEffect, useState, use, Suspense } from "react";
import HomePage from "@/app/page";
import { ForkStudyBanner } from "@/components/study/ForkStudyBanner";
import { useGlobeStore } from "@/stores/globeStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useStudyStore } from "@/stores/studyStore";
import { useHistoricalRouteStore } from "@/stores/historicalRouteStore";

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
  const selectYear = useTimelineStore((s) => s.selectYear);
  const selectMilestone = useTimelineStore((s) => s.selectMilestone);
  const setSelectedIsos = useComparatorStore((s) => s.setSelectedIsos);
  const setStudyStore = useStudyStore((s) => s.setStudy);

  useEffect(() => {
    fetch(`/api/studies/${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setStudy(data);
          useStudyStore.getState().restoreStudy({
            id: data.id,
            parentId: data.parentId,
            title: data.title,
            description: data.description,
            notes: data.markdownNotes,
            historicalEra: data.historicalEra,
            isApollo11Active: data.isApollo11Active,
            geologicalMa: data.geologicalMa,
            activeRouteId: data.activeRouteId,
          });
          if (data.timelineStartYear && data.timelineEndYear) {
            setYearRange(data.timelineStartYear, data.timelineEndYear);
          }
          if (data.geologicalMa !== undefined && data.geologicalMa !== null && data.geologicalMa > 0) {
            useTimelineStore.getState().selectGeologicalMa(data.geologicalMa);
            selectYear(null);
            selectMilestone(null);
          } else {
            useTimelineStore.getState().selectGeologicalMa(null);
            if (data.historicalEra) {
              if (data.historicalEra === "PRUSSIA_1870") selectYear(1870);
              else if (data.historicalEra === "WW1_1914") selectYear(1914);
              else if (data.historicalEra === "WW2_1939") selectYear(1939);
              else if (data.historicalEra === "COLD_WAR_1969") {
                if (data.isApollo11Active) {
                  selectYear(1969);
                } else {
                  selectYear(1968);
                }
              }
            }
            if (data.isApollo11Active) {
              selectMilestone("glo-1969");
              selectYear(1969);
            } else {
              selectMilestone(null);
            }
          }
          if (data.activeRouteId) {
            useHistoricalRouteStore.getState().setActiveRouteId(data.activeRouteId);
            useTimelineStore.getState().setActiveRouteId(data.activeRouteId);
            if (data.activeRouteId === "magellan-1519" && !data.timelineStartYear) {
              setYearRange(1519, 1522);
              selectYear(1519);
            }
          } else {
            useHistoricalRouteStore.getState().setActiveRouteId(null);
            useTimelineStore.getState().setActiveRouteId(null);
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
  }, [slug, flyTo, setSelectedIso, setYearRange, selectYear, selectMilestone, setSelectedIsos, setStudyStore]);

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
