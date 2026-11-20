import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import type { Study } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMemoryStudy, saveMemoryStudy, forkStudyRecord, type StudyRecord } from "@/lib/studies-store";
import { studyCreationRetryAfter } from "@/lib/study-rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const retryAfter = studyCreationRetryAfter(req.headers);
  if (retryAfter) {
    return NextResponse.json({ error: "Too many study creations" }, {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    });
  }

  try {
    const { slug } = await params;

    let original: Study | StudyRecord | null | undefined;
    try {
      original = await prisma.study.findUnique({ where: { id: slug } });
    } catch {
      // Database fallback.
    }
    original ??= getMemoryStudy(slug);

    if (!original) {
      return NextResponse.json({ error: "Original study not found" }, { status: 404 });
    }

    const forkedData = forkStudyRecord(original, `fork-${nanoid(8)}`);
    try {
      const created = await prisma.study.create({ data: forkedData });
      saveMemoryStudy(forkedData);
      return NextResponse.json(created);
    } catch {
      saveMemoryStudy(forkedData);
      return NextResponse.json(forkedData);
    }
  } catch {
    return NextResponse.json({ error: "Failed to fork study" }, { status: 500 });
  }
}
