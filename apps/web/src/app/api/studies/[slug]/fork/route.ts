import { NextRequest, NextResponse } from "next/server";
import { CACHE_POLICY, withCachePolicy } from "@/lib/http-cache";
import { nanoid } from "nanoid";
import type { Study } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { forkStudyRecord, type StudyRecord } from "@/lib/studies-store";
import { persistStudy, readDevelopmentStudy, studyDatabaseFailure } from "@/lib/study-persistence";
import { studyCreationRetryAfter } from "@/lib/study-rate-limit";

async function postHandler(
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
    } catch (error) {
      const unavailable = studyDatabaseFailure("fork.read", slug, error);
      if (unavailable) return unavailable;
    }
    original ??= readDevelopmentStudy(slug, "fork.read");

    if (!original) {
      return NextResponse.json({ error: "Original study not found" }, { status: 404 });
    }

    const forkedData = forkStudyRecord(original, `fork-${nanoid(8)}`);
    return await persistStudy(forkedData, "fork.create");
  } catch (error) {
    console.error("[studies] Unable to fork snapshot", { error });
    return NextResponse.json({ error: "Failed to fork study" }, { status: 500 });
  }
}

// T30: Cache-Control coerente (2xx pela política; erros e escrita sem cache).
export const POST = withCachePolicy(postHandler, CACHE_POLICY.noStore);
