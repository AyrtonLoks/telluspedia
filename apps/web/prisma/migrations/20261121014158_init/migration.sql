-- CreateEnum
CREATE TYPE "DossierDimension" AS ENUM ('GEOGRAPHY', 'GOVERNMENT_POLITICS', 'ECONOMY_SOCIAL', 'HISTORY', 'BIOGRAPHIES', 'CULTURE_HUMANITIES', 'BIOLOGY_HEALTH', 'NEWS_CURRENT_AFFAIRS');

-- CreateEnum
CREATE TYPE "MilestoneCategory" AS ENUM ('POLITICS_REGIMES', 'ECONOMY', 'WAR_MILITARY', 'SCIENCE_CULTURE', 'HEALTH_PANDEMICS');

-- CreateTable
CREATE TABLE "Country" (
    "isoCode" TEXT NOT NULL,
    "iso2" TEXT NOT NULL,
    "nameCommon" TEXT NOT NULL,
    "nameOfficial" TEXT NOT NULL,
    "capital" TEXT NOT NULL,
    "continent" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "subregion" TEXT,
    "population" BIGINT NOT NULL,
    "areaKm2" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL,
    "flagSvgUrl" TEXT,
    "coatOfArmsUrl" TEXT,
    "currencyCode" TEXT NOT NULL,
    "currencyName" TEXT NOT NULL,
    "governmentType" TEXT NOT NULL,
    "headOfState" TEXT NOT NULL,
    "headOfGov" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("isoCode")
);

-- CreateTable
CREATE TABLE "CountryIndicator" (
    "id" TEXT NOT NULL,
    "countryIso" TEXT NOT NULL,
    "indicatorCode" TEXT NOT NULL,
    "indicatorName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "sourcePrimary" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "referenceDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryDossierSection" (
    "id" TEXT NOT NULL,
    "countryIso" TEXT NOT NULL,
    "dimension" "DossierDimension" NOT NULL,
    "title" TEXT NOT NULL,
    "contentMarkdown" TEXT NOT NULL,
    "estimatedReadMin" INTEGER NOT NULL DEFAULT 5,
    "citationsJson" JSONB NOT NULL,

    CONSTRAINT "CountryDossierSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineMilestone" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "exactDate" TIMESTAMP(3),
    "category" "MilestoneCategory" NOT NULL,
    "countryIso" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "sourcePrimary" TEXT NOT NULL,
    "referenceUrl" TEXT,

    CONSTRAINT "TimelineMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Study" (
    "id" VARCHAR(128) NOT NULL,
    "parentId" VARCHAR(128),
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "timelineStartYear" INTEGER NOT NULL,
    "timelineEndYear" INTEGER NOT NULL,
    "selectedCountryIsos" VARCHAR(32)[],
    "activeCategories" VARCHAR(64)[],
    "cameraLat" DOUBLE PRECISION NOT NULL,
    "cameraLng" DOUBLE PRECISION NOT NULL,
    "cameraAltitude" DOUBLE PRECISION NOT NULL,
    "markdownNotes" VARCHAR(50000),
    "historicalEra" VARCHAR(64),
    "isApollo11Active" BOOLEAN DEFAULT false,
    "geologicalMa" DOUBLE PRECISION,
    "activeRouteId" VARCHAR(64),
    "activeObservatoryLayers" VARCHAR(64)[] DEFAULT ARRAY[]::VARCHAR(64)[],
    "isCosmicMode" BOOLEAN DEFAULT false,
    "focusedCelestialBody" VARCHAR(64),
    "activeCosmicLayers" VARCHAR(64)[] DEFAULT ARRAY[]::VARCHAR(64)[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Study_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CountryIndicator_countryIso_category_idx" ON "CountryIndicator"("countryIso", "category");

-- CreateIndex
CREATE INDEX "CountryIndicator_indicatorCode_year_idx" ON "CountryIndicator"("indicatorCode", "year");

-- CreateIndex
CREATE UNIQUE INDEX "CountryIndicator_countryIso_indicatorCode_year_key" ON "CountryIndicator"("countryIso", "indicatorCode", "year");

-- CreateIndex
CREATE UNIQUE INDEX "CountryDossierSection_countryIso_dimension_key" ON "CountryDossierSection"("countryIso", "dimension");

-- CreateIndex
CREATE INDEX "TimelineMilestone_year_category_idx" ON "TimelineMilestone"("year", "category");

-- CreateIndex
CREATE INDEX "TimelineMilestone_countryIso_idx" ON "TimelineMilestone"("countryIso");

-- CreateIndex
CREATE INDEX "Study_parentId_idx" ON "Study"("parentId");

-- AddForeignKey
ALTER TABLE "CountryIndicator" ADD CONSTRAINT "CountryIndicator_countryIso_fkey" FOREIGN KEY ("countryIso") REFERENCES "Country"("isoCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryDossierSection" ADD CONSTRAINT "CountryDossierSection_countryIso_fkey" FOREIGN KEY ("countryIso") REFERENCES "Country"("isoCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineMilestone" ADD CONSTRAINT "TimelineMilestone_countryIso_fkey" FOREIGN KEY ("countryIso") REFERENCES "Country"("isoCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Study"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraints (alinhadas ao schema Zod em src/lib/study-schema.ts — T07/T20)
ALTER TABLE "Study"
  ADD CONSTRAINT "Study_timeline_range_check"
    CHECK ("timelineStartYear" >= -3000 AND "timelineEndYear" <= 3000 AND "timelineStartYear" <= "timelineEndYear"),
  ADD CONSTRAINT "Study_camera_bounds_check"
    CHECK ("cameraLat" >= -90 AND "cameraLat" <= 90 AND "cameraLng" >= -180 AND "cameraLng" <= 180 AND "cameraAltitude" >= 1.5 AND "cameraAltitude" <= 6),
  ADD CONSTRAINT "Study_geological_ma_check"
    CHECK ("geologicalMa" IS NULL OR ("geologicalMa" >= 0 AND "geologicalMa" <= 4600)),
  ADD CONSTRAINT "Study_array_limits_check"
    CHECK (
      cardinality("selectedCountryIsos") <= 50
      AND cardinality("activeCategories") <= 50
      AND cardinality("activeObservatoryLayers") <= 50
      AND cardinality("activeCosmicLayers") <= 50
    );
