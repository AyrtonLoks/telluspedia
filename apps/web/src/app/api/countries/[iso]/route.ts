import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCountryData } from "@/lib/country-data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ iso: string }> }
) {
  const { iso } = await params;
  const upperIso = (iso || "").trim().toUpperCase();

  if (!upperIso || !/^[A-Z0-9_]{2,16}$/.test(upperIso)) {
    return NextResponse.json({ error: "Country not found" }, { status: 404 });
  }

  const yearParam = req.nextUrl?.searchParams?.get("year");
  const parsedYear = yearParam ? Number(yearParam) : null;
  const year = parsedYear !== null && Number.isFinite(parsedYear) ? parsedYear : null;

  if (year === null) {
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
          population: country.population !== null ? Number(country.population) : null,
        });
      }
    } catch {
      // Database fallback
    }
  }

  const countryData = getCountryData(upperIso, year);
  if (countryData) {
    return NextResponse.json(countryData);
  }

  return NextResponse.json({ error: "Country not found" }, { status: 404 });
}
