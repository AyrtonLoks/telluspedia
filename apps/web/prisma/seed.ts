import { PrismaClient, DossierDimension, MilestoneCategory } from "@prisma/client";
import worldAtlas from "world-atlas/countries-110m.json";
import { PILOT_COUNTRIES, GLOBAL_MILESTONES, NUMERIC_TO_ISO } from "../src/lib/country-data";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting TellusPedia database seeding...");

  // Extract geometries from world atlas
  const topology = worldAtlas as any;
  const geometries = topology.objects.countries.geometries;
  const geometryMap: Record<string, any> = {};

  for (const geom of geometries) {
    const numericId = String(geom.id).padStart(3, "0");
    const iso = NUMERIC_TO_ISO[numericId];
    if (iso) {
      geometryMap[iso] = geom;
    }
  }

  // 1. Seed Pilot Countries
  for (const [iso, data] of Object.entries(PILOT_COUNTRIES)) {
    console.log(`Seeding country: ${data.nameCommon} (${iso})...`);

    const country = await prisma.country.upsert({
      where: { isoCode: iso },
      update: {
        nameCommon: data.nameCommon,
        nameOfficial: data.nameOfficial,
        capital: data.capital,
        population: BigInt(data.population),
        areaKm2: data.areaKm2,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        flagSvgUrl: data.flagSvgUrl,
        currencyCode: data.currencyCode,
        currencyName: data.currencyName,
        governmentType: data.governmentType,
        headOfState: data.headOfState,
        headOfGov: data.headOfGov || null,
        geometryJson: geometryMap[iso] || {},
      },
      create: {
        isoCode: iso,
        iso2: data.iso2,
        nameCommon: data.nameCommon,
        nameOfficial: data.nameOfficial,
        capital: data.capital,
        continent: data.continent,
        region: data.region,
        population: BigInt(data.population),
        areaKm2: data.areaKm2,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        flagSvgUrl: data.flagSvgUrl,
        currencyCode: data.currencyCode,
        currencyName: data.currencyName,
        governmentType: data.governmentType,
        headOfState: data.headOfState,
        headOfGov: data.headOfGov || null,
        geometryJson: geometryMap[iso] || {},
      },
    });

    // Seed Indicators
    for (const ind of data.indicators) {
      await prisma.countryIndicator.upsert({
        where: {
          countryIso_indicatorCode_year: {
            countryIso: iso,
            indicatorCode: ind.indicatorCode,
            year: ind.year,
          },
        },
        update: {
          value: ind.value,
          unit: ind.unit,
          sourcePrimary: ind.sourcePrimary,
        },
        create: {
          countryIso: iso,
          indicatorCode: ind.indicatorCode,
          indicatorName: ind.indicatorName,
          category: ind.category,
          year: ind.year,
          value: ind.value,
          unit: ind.unit,
          sourcePrimary: ind.sourcePrimary,
          referenceDate: new Date(`${ind.year}-12-31T00:00:00Z`),
        },
      });
    }

    // Seed Dossier Sections
    for (const sec of data.dossierSections) {
      await prisma.countryDossierSection.upsert({
        where: {
          countryIso_dimension: {
            countryIso: iso,
            dimension: sec.dimension as DossierDimension,
          },
        },
        update: {
          title: sec.title,
          contentMarkdown: sec.contentMarkdown,
          estimatedReadMin: sec.estimatedReadMin,
          citationsJson: sec.citationsJson,
        },
        create: {
          countryIso: iso,
          dimension: sec.dimension as DossierDimension,
          title: sec.title,
          contentMarkdown: sec.contentMarkdown,
          estimatedReadMin: sec.estimatedReadMin,
          citationsJson: sec.citationsJson,
        },
      });
    }

    // Seed Country Milestones
    for (const m of data.milestones) {
      await prisma.timelineMilestone.upsert({
        where: { id: m.id },
        update: {
          title: m.title,
          summary: m.summary,
          year: m.year,
          category: m.category as MilestoneCategory,
          countryIso: iso,
          latitude: m.latitude,
          longitude: m.longitude,
          sourcePrimary: m.sourcePrimary,
        },
        create: {
          id: m.id,
          title: m.title,
          summary: m.summary,
          year: m.year,
          exactDate: m.exactDate ? new Date(m.exactDate) : null,
          category: m.category as MilestoneCategory,
          countryIso: iso,
          latitude: m.latitude,
          longitude: m.longitude,
          sourcePrimary: m.sourcePrimary,
        },
      });
    }
  }

  // 2. Seed Global Milestones
  console.log("Seeding global historical milestones...");
  for (const gm of GLOBAL_MILESTONES) {
    await prisma.timelineMilestone.upsert({
      where: { id: gm.id },
      update: {
        title: gm.title,
        summary: gm.summary,
        year: gm.year,
        category: gm.category as MilestoneCategory,
        latitude: gm.latitude,
        longitude: gm.longitude,
        sourcePrimary: gm.sourcePrimary,
      },
      create: {
        id: gm.id,
        title: gm.title,
        summary: gm.summary,
        year: gm.year,
        exactDate: gm.exactDate ? new Date(gm.exactDate) : null,
        category: gm.category as MilestoneCategory,
        latitude: gm.latitude,
        longitude: gm.longitude,
        sourcePrimary: gm.sourcePrimary,
      },
    });
  }

  // 3. Seed Reference Study
  console.log("Seeding reference study...");
  await prisma.study.upsert({
    where: { id: "guerra-fria-br-de-k9x2" },
    update: {},
    create: {
      id: "guerra-fria-br-de-k9x2",
      parentId: null,
      title: "Análise Comparada da Guerra Fria: Brasil & Alemanha",
      description: "Estudo comparativo das tensões institucionais, geopolíticas e econômicas entre 1947 e 1991.",
      timelineStartYear: 1947,
      timelineEndYear: 1991,
      selectedCountryIsos: ["BRA", "DEU", "USA"],
      activeCategories: ["POLITICS_REGIMES", "WAR_MILITARY", "ECONOMY"],
      cameraLat: 20.0,
      cameraLng: 0.0,
      cameraAltitude: 2.5,
      markdownNotes: "Síntese das tensões e transições democráticas do período.",
    },
  });

  console.log("✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
