"use client";

import { applyTimelinePreset, selectCountry, selectHistoricalRoute } from "@/stores/actions";

import React, { useEffect } from "react";
import { sceneOpenedBy, sceneHasTrajectoryKind } from "@/lib/scenes/catalog";
import { usePathname, useSearchParams } from "next/navigation";
import { resolveLaunch, studyUrl } from "@/lib/tellus-bridge/catalog";
import { findMilestoneById, getCountryData } from "@/lib/country-data";
import type { ObservatoryLayerId } from "@/lib/observatory-data";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useTimelineStore, ALL_CATEGORIES } from "@/stores/timelineStore";

const observatoryLayers = new Set<ObservatoryLayerId>([
  "NASA_FIRMS", "NASA_EONET", "ISS_SATELLITES", "FLIGHTS_OPENSKY", "MARITIME_ROUTES",
]);

export function EntityLaunch() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const launch = pathname === "/" || pathname.startsWith("/pais/")
    ? resolveLaunch(new URLSearchParams(query)) : null;
  const entity = launch?.link;
  const isReaderOpen = useGlobeStore(state => state.isReaderOpen);

  useEffect(() => {
    if (!entity) return;
    if ((entity.kind === "dossier" || entity.kind === "figure") && window.location.pathname !== entity.target) {
      window.location.replace(entity.target + "?" + query);
      return;
    }
    const key = entity.entityId.split(":")[1];
    const globe = useGlobeStore.getState();
    const timeline = useTimelineStore.getState();
    const cosmic = useCosmicStore.getState();
    const observatory = useObservatoryStore.getState();
    globe.setReaderOpen(false);
    cosmic.exitToEarthView();
    observatory.setPanelOpen(false);

    if (entity.kind === "country") {
      const country = getCountryData(key);
      if (!country) {
        globe.setSelectedIso(null);
        return;
      }
      selectCountry(country.isoCode);
      if (
        country.latitude !== null &&
        country.longitude !== null &&
        (country.latitude !== 0 || country.longitude !== 0)
      ) {
        globe.flyTo(country.latitude, country.longitude, 2);
      }
    } else if (entity.kind === "event") {
      const event = findMilestoneById(key);
      if (!event) return;
      globe.setSelectedIso(null);
      timeline.setGeologicalMa(null);
      timeline.setAllCategories([...ALL_CATEGORIES]);
      if (!timeline.isExpanded) timeline.toggleExpanded();
      timeline.setYearRange(event.year - 15, event.year + 15);
      const scene = sceneOpenedBy(key);
      selectHistoricalRoute(scene && sceneHasTrajectoryKind(scene.id, "surface") ? scene.id : null);
      timeline.selectYear(event.year);
      timeline.selectMilestone(event.id);
      if (event.latitude !== undefined && event.longitude !== undefined) {
        globe.flyTo(event.latitude, event.longitude, event.preferredAltitude ?? 1.8);
      }
    } else if (entity.kind === "era") {
      globe.setSelectedIso(null);
      applyTimelinePreset(key);
      if (!timeline.isExpanded) timeline.toggleExpanded();
    } else if (entity.kind === "observatory") {
      globe.setSelectedIso(null);
      selectHistoricalRoute(null);
      timeline.setGeologicalMa(null);
      timeline.selectMilestone(null);
      timeline.selectYear(null);
      if (key === "COSMOS") {
        cosmic.enterCosmicView("EARTH");
      } else if (observatoryLayers.has(key as ObservatoryLayerId)) {
        observatory.setLayerActive(key as ObservatoryLayerId, true);
        observatory.setPanelOpen(true);
      }
    }
  }, [entity, query]);

  if (!launch?.origin || !entity || isReaderOpen) return null;
  return (
    <nav
      aria-label="Origem do estudo"
      className="fixed left-6 top-[7.5rem] z-30 rounded-card border border-line bg-surface/86 px-3 py-2 text-label text-accent shadow-e1 backdrop-blur-md"
    >
      <a href={studyUrl(launch.origin.slug, launch.origin.nodeId, entity.entityId)} className="hover:text-accent-hover hover:underline">
        ← Retornar ao nó {launch.origin.nodeId}
      </a>
    </nav>
  );
}
