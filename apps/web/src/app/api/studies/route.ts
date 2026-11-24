import { NextRequest, NextResponse } from "next/server";
import { CACHE_POLICY, withCachePolicy } from "@/lib/http-cache";
import { nanoid } from "nanoid";
import type { StudyRecord } from "@/lib/studies-store";
import { listStudies, parseStudyListQuery } from "@/lib/study-gallery";
import { persistStudy } from "@/lib/study-persistence";
import { sanitizeStudy, studyInput } from "@/lib/study-schema";
import { studyCreationRetryAfterAsync } from "@/lib/study-rate-limit";
import { serverLogger } from "@/lib/server-logger";

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

async function postHandler(req: NextRequest) {
  const retryAfter = await studyCreationRetryAfterAsync(req.headers);
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

    return await persistStudy(studyData, "create");
  } catch (error) {
    serverLogger.error({
      route: "/api/studies",
      provider: "postgresql",
      status: 500,
      error,
      message: "Unable to create snapshot",
    });
    return NextResponse.json({ error: "Failed to create study" }, { status: 500 });
  }
}

async function getHandler(req: NextRequest) {
  const query = parseStudyListQuery(req.nextUrl.searchParams);
  const result = await listStudies(query);

  if (result.persistence === "unavailable") {
    return NextResponse.json(
      { error: "O banco de dados de estudos está indisponível. Tente novamente em instantes." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (result.persistence === "memory") {
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
        "X-Study-Persistence": "memory",
      },
    });
  }

  return NextResponse.json(result);
}

// T30/D23: Cache-Control coerente (listagem pública com cache curto; memória/erros e escrita sem cache).
export const GET = withCachePolicy(getHandler, CACHE_POLICY.study);
export const POST = withCachePolicy(postHandler, CACHE_POLICY.noStore);
