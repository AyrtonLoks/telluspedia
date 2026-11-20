import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { restoreStudyRecord } from "@/lib/studies-store";
import { readDevelopmentStudy, studyDatabaseFailure, temporaryStudyResponse } from "@/lib/study-persistence";

type StudyWithRelations = Prisma.StudyGetPayload<{ include: { parent: true; forks: true } }>;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let study: StudyWithRelations | null = null;
  try {
    study = await prisma.study.findUnique({
      where: { id: slug },
      include: { parent: true, forks: true },
    });
  } catch (error) {
    const unavailable = studyDatabaseFailure("read", slug, error);
    if (unavailable) return unavailable;
  }

  if (study) return NextResponse.json({ ...study, ...restoreStudyRecord(study) });

  const memory = readDevelopmentStudy(slug, "read");
  if (memory) return temporaryStudyResponse(restoreStudyRecord(memory));

  return NextResponse.json({ error: "Study not found" }, { status: 404 });
}
