"use client";

import { selectCountry } from "@/stores/actions";

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

  const flyTo = useGlobeStore((s) => s.flyTo);

  useEffect(() => {
    if (iso) {
      const country = getCountryData(iso);
      if (country) {
        selectCountry(country.isoCode);
        if (
          country.latitude !== null &&
          country.longitude !== null &&
          (country.latitude !== 0 || country.longitude !== 0)
        ) {
          flyTo(country.latitude, country.longitude, 2.0);
        }
      } else {
        selectCountry(null);
      }
    }
  }, [iso, flyTo]);

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
