import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { saveMemoryStudy, StudyRecord } from "@/lib/studies-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slug = `estudo-${nanoid(8)}`;

    const sanitizedMa =
      typeof body.geologicalMa === "number" &&
      Number.isFinite(body.geologicalMa) &&
      body.geologicalMa > 0 &&
      body.geologicalMa <= 4600
        ? body.geologicalMa
        : null;

    const sanitizedRouteId =
      typeof body.activeRouteId === "string" && body.activeRouteId.trim().length > 0
        ? body.activeRouteId.trim()
        : null;

    const isAnachronistic =
      sanitizedMa !== null ||
      (typeof body.timelineEndYear === "number" && body.timelineEndYear < 1957) ||
      sanitizedRouteId === "magellan-1519" ||
      ["PRUSSIA_1870", "WW1_1914", "WW2_1939"].includes(body.historicalEra || "");

    const studyData: StudyRecord = {
      id: slug,
      parentId: body.parentId || null,
      title: body.title || "Estudo Planetário",
      description: body.description || "",
      timelineStartYear: body.timelineStartYear || 1974,
      timelineEndYear: body.timelineEndYear || 2024,
      selectedCountryIsos: Array.isArray(body.selectedCountryIsos) ? body.selectedCountryIsos : [],
      activeCategories: Array.isArray(body.activeCategories) ? body.activeCategories : [],
      cameraLat: typeof body.cameraLat === "number" ? body.cameraLat : 0,
      cameraLng: typeof body.cameraLng === "number" ? body.cameraLng : 0,
      cameraAltitude: typeof body.cameraAltitude === "number" ? body.cameraAltitude : 2.5,
      markdownNotes: body.markdownNotes || "",
      historicalEra: sanitizedMa !== null ? null : (body.historicalEra ?? null),
      isApollo11Active: sanitizedMa !== null ? false : (body.isApollo11Active ?? false),
      geologicalMa: sanitizedMa,
      activeRouteId: sanitizedRouteId,
      activeObservatoryLayers:
        isAnachronistic
          ? []
          : Array.isArray(body.activeObservatoryLayers)
            ? body.activeObservatoryLayers
            : [],
      isCosmicMode: Boolean(body.isCosmicMode),
      focusedCelestialBody: body.focusedCelestialBody ?? null,
      activeCosmicLayers: Array.isArray(body.activeCosmicLayers) ? body.activeCosmicLayers : [],
      createdAt: new Date().toISOString(),
    };

    try {
      const created = await prisma.study.create({
        data: studyData,
      });
      saveMemoryStudy(studyData);
      return NextResponse.json(created);
    } catch {
      // Prisma offline fallback
      saveMemoryStudy(studyData);
      return NextResponse.json(studyData);
    }
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to create study", detail: err?.message }, { status: 500 });
  }
}
