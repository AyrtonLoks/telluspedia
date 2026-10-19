import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PILOT_COUNTRIES } from "@/lib/country-data";

export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      select: {
        isoCode: true,
        iso2: true,
        nameCommon: true,
        nameOfficial: true,
        capital: true,
        continent: true,
        region: true,
        population: true,
        areaKm2: true,
        latitude: true,
        longitude: true,
        timezone: true,
        flagSvgUrl: true,
        currencyCode: true,
        governmentType: true,
        headOfState: true,
      },
    });

    if (countries && countries.length > 0) {
      const serialized = countries.map((c) => ({
        ...c,
        population: Number(c.population),
      }));
      return NextResponse.json(serialized);
    }
  } catch (err) {
    // Database not running or table empty -> use pilot fallback
  }

  const fallback = Object.values(PILOT_COUNTRIES).map((c) => ({
    isoCode: c.isoCode,
    iso2: c.iso2,
    nameCommon: c.nameCommon,
    nameOfficial: c.nameOfficial,
    capital: c.capital,
    continent: c.continent,
    region: c.region,
    population: c.population,
    areaKm2: c.areaKm2,
    latitude: c.latitude,
    longitude: c.longitude,
    timezone: c.timezone,
    flagSvgUrl: c.flagSvgUrl,
    currencyCode: c.currencyCode,
    governmentType: c.governmentType,
    headOfState: c.headOfState,
  }));

  return NextResponse.json(fallback);
}
