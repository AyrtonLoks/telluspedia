import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { saveMemoryStudy, StudyRecord } from "@/lib/studies-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slug = `estudo-${nanoid(8)}`;

    const studyData: StudyRecord = {
      id: slug,
      parentId: body.parentId || null,
      title: body.title || "Estudo Planetário",
      description: body.description || "",
      timelineStartYear: body.timelineStartYear || 1974,
      timelineEndYear: body.timelineEndYear || 2024,
      selectedCountryIsos: body.selectedCountryIsos || [],
      activeCategories: body.activeCategories || [],
      cameraLat: body.cameraLat ?? 0,
      cameraLng: body.cameraLng ?? 0,
      cameraAltitude: body.cameraAltitude ?? 2.5,
      markdownNotes: body.markdownNotes || "",
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
