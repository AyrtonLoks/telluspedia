import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCountryData, PILOT_COUNTRIES } from "@/lib/country-data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ iso: string }> }
) {
  const { iso } = await params;
  const upperIso = iso.toUpperCase();

  try {
    const country = await prisma.country.findUnique({
      where: { isoCode: upperIso },
      include: {
        indicators: true,
        dossierSections: true,
        milestones: true,
      },
    });

    if (country) {
      return NextResponse.json({
        ...country,
        population: Number(country.population),
      });
    }
  } catch {
    // Database fallback
  }

  const countryData = getCountryData(upperIso);
  if (countryData) {
    return NextResponse.json(countryData);
  }

  return NextResponse.json({ error: "Country not found" }, { status: 404 });
}
