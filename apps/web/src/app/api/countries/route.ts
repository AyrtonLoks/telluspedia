import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllCountries } from "@/lib/country-data";

export async function GET() {
  const catalogCountries = getAllCountries();
  const dbByIso = new Map<
    string,
    {
      isoCode: string;
      iso2: string;
      nameCommon: string;
      nameOfficial: string;
      capital: string;
      continent: string;
      region: string;
      population: bigint;
      areaKm2: number;
      latitude: number;
      longitude: number;
      timezone: string;
      flagSvgUrl: string | null;
      currencyCode: string;
      governmentType: string;
      headOfState: string;
    }
  >();

  try {
    const dbCountries = await prisma.country.findMany({
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

    for (const c of dbCountries) {
      dbByIso.set(c.isoCode, c);
    }
  } catch {
    // Database not running or table empty -> use ingested catalog dataset
  }

  const response = catalogCountries.map((c) => {
    const db = dbByIso.get(c.isoCode);
    const population =
      db && db.population !== null && db.population !== undefined
        ? Number(db.population)
        : c.population;

    return {
      isoCode: c.isoCode,
      iso2: db?.iso2 || c.iso2,
      nameCommon: db?.nameCommon || c.nameCommon,
      nameOfficial: db?.nameOfficial || c.nameOfficial,
      capital: db?.capital || c.capital,
      continent: db?.continent || c.continent,
      region: db?.region || c.region,
      population,
      areaKm2: db?.areaKm2 ?? c.areaKm2,
      latitude: db?.latitude ?? c.latitude,
      longitude: db?.longitude ?? c.longitude,
      timezone: db?.timezone || c.timezone,
      flagSvgUrl: db?.flagSvgUrl || c.flagSvgUrl,
      currencyCode: db?.currencyCode || c.currencyCode,
      currencyName: c.currencyName,
      governmentType: db?.governmentType || c.governmentType,
      headOfState: db?.headOfState || c.headOfState,
      completeness: c.completeness,
      dataSource: c.dataSource,
      referenceDate: c.referenceDate,
      sourceUrl: c.sourceUrl,
      indicators: c.indicators,
    };
  });

  return NextResponse.json(response);
}
