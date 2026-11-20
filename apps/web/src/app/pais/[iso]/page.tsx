import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GlobeExperienceShell } from "@/components/shell/GlobeExperienceShell";
import { buildCountryMetadata, loadCountryByIso } from "@/lib/server-loaders";

interface CountryPageProps {
  params: Promise<{ iso: string }>;
}

export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const { iso } = await params;
  const country = loadCountryByIso(iso);
  return buildCountryMetadata(country, iso);
}

export default async function CountryDirectPage({ params }: CountryPageProps) {
  const { iso } = await params;
  const country = loadCountryByIso(iso);

  if (!country) {
    notFound();
  }

  return (
    <GlobeExperienceShell
      initialState={{
        kind: "country",
        iso: country.isoCode,
        latitude: country.latitude,
        longitude: country.longitude,
      }}
    />
  );
}
