"use client";

import React, { useEffect, use, Suspense } from "react";
import HomePage from "@/app/page";
import { useGlobeStore } from "@/stores/globeStore";
import { getCountryData } from "@/lib/country-data";

function CountryContent({
  params,
}: {
  params: Promise<{ iso: string }>;
}) {
  const resolvedParams = use(params);
  const iso = resolvedParams.iso?.toUpperCase();

  const setSelectedIso = useGlobeStore((s) => s.setSelectedIso);
  const flyTo = useGlobeStore((s) => s.flyTo);

  useEffect(() => {
    if (iso) {
      setSelectedIso(iso);
      const country = getCountryData(iso);
      if (country && (country.latitude !== 0 || country.longitude !== 0)) {
        flyTo(country.latitude, country.longitude, 2.0);
      }
    }
  }, [iso, setSelectedIso, flyTo]);

  return <HomePage />;
}

export default function CountryDirectPage(props: {
  params: Promise<{ iso: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <CountryContent params={props.params} />
    </Suspense>
  );
}
