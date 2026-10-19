import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getMemoryStudy, saveMemoryStudy, forkStudyRecord, StudyRecord } from "@/lib/studies-store";

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
  const forkedData: StudyRecord = forkStudyRecord(original, newSlug);

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
