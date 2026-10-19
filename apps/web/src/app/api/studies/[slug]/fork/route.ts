import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getMemoryStudy, saveMemoryStudy, StudyRecord } from "@/lib/studies-store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let original: any = null;
  try {
    original = await prisma.study.findUnique({
      where: { id: slug },
    });
  } catch {
    // Database fallback
  }

  if (!original) {
    original = getMemoryStudy(slug);
  }

  if (!original) {
    return NextResponse.json({ error: "Original study not found" }, { status: 404 });
  }

  const newSlug = `fork-${nanoid(8)}`;
  const forkedData: StudyRecord = {
    id: newSlug,
    parentId: original.id,
    title: `[Fork] ${original.title}`,
    description: original.description,
    timelineStartYear: original.timelineStartYear,
    timelineEndYear: original.timelineEndYear,
    selectedCountryIsos: original.selectedCountryIsos,
    activeCategories: original.activeCategories,
    cameraLat: original.cameraLat,
    cameraLng: original.cameraLng,
    cameraAltitude: original.cameraAltitude,
    markdownNotes: original.markdownNotes,
    createdAt: new Date().toISOString(),
  };

  try {
    const created = await prisma.study.create({
      data: forkedData,
    });
    saveMemoryStudy(forkedData);
    return NextResponse.json(created);
  } catch {
    saveMemoryStudy(forkedData);
    return NextResponse.json(forkedData);
  }
}
