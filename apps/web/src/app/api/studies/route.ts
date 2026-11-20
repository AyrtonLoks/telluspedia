import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { saveMemoryStudy, type StudyRecord } from "@/lib/studies-store";
import { sanitizeStudy, studyInput } from "@/lib/study-schema";
import { studyCreationRetryAfter } from "@/lib/study-rate-limit";

const MAX_BODY_BYTES = 384 * 1024;

async function readBody(req: NextRequest) {
  const reader = req.body?.getReader();
  if (!reader) return { error: "Expected a JSON body", status: 400 } as const;

  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { error: "Study payload is too large", status: 413 } as const;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  try {
    return { data: JSON.parse(text) as unknown };
  } catch {
    return { error: "Invalid JSON", status: 400 } as const;
  }
}

export async function POST(req: NextRequest) {
  const retryAfter = studyCreationRetryAfter(req.headers);
  if (retryAfter) {
    return NextResponse.json({ error: "Too many study creations" }, {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    });
  }

  try {
    const body = await readBody(req);
    if ("error" in body) return NextResponse.json({ error: body.error }, { status: body.status });

    const validated = studyInput.safeParse(body.data);
    if (!validated.success) {
      return NextResponse.json({
        error: "Invalid study",
        issues: validated.error.issues.slice(0, 10).map(({ path, message }) => ({
          field: path.join("."),
          message,
        })),
      }, { status: 400 });
    }

    const studyData: StudyRecord = {
      ...sanitizeStudy(validated.data),
      id: `estudo-${nanoid(8)}`,
      createdAt: new Date().toISOString(),
    };

    try {
      const created = await prisma.study.create({ data: studyData });
      saveMemoryStudy(studyData);
      return NextResponse.json(created);
    } catch {
      // The existing in-memory fallback is covered by T08.
      saveMemoryStudy(studyData);
      return NextResponse.json(studyData);
    }
  } catch {
    return NextResponse.json({ error: "Failed to create study" }, { status: 500 });
  }
}
