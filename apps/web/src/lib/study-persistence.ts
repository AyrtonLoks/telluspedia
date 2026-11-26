import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { serverLogger } from "./server-logger";
import { getMemoryStudy, saveMemoryStudy, type StudyRecord } from "./studies-store";

type DatabaseOperation = "create" | "read" | "fork.read" | "fork.create";
const TEMPORARY_HEADERS = { "Cache-Control": "no-store", "X-Study-Persistence": "memory" };

function memoryAllowed() {
  return process.env.NODE_ENV !== "production";
}

export function studyDatabaseFailure(operation: DatabaseOperation, id: string, error: unknown) {
  serverLogger.error({
    route: "/api/studies",
    provider: "postgresql",
    status: memoryAllowed() ? undefined : 503,
    error,
    message: "Database operation failed",
    meta: { operation, id },
  });

  if (memoryAllowed()) return undefined;

  return NextResponse.json(
    { error: "O banco de dados de estudos está indisponível. Tente novamente em instantes." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

function warnTemporary(operation: DatabaseOperation, id: string) {
  serverLogger.warn({
    route: "/api/studies",
    provider: "memory-store",
    mode: "fallback",
    message: "Using temporary in-memory storage",
    meta: { operation, id },
  });
}

export function readDevelopmentStudy(id: string, operation: "read" | "fork.read") {
  if (!memoryAllowed()) return undefined;
  const study = getMemoryStudy(id);
  if (study) warnTemporary(operation, id);
  return study;
}

export function temporaryStudyResponse(study: StudyRecord) {
  return NextResponse.json(study, { headers: TEMPORARY_HEADERS });
}

export async function persistStudy(study: StudyRecord, operation: "create" | "fork.create") {
  let created;
  try {
    created = await prisma.study.create({
      data: {
        ...study,
        annotations: (study.annotations ?? []) as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    const unavailable = studyDatabaseFailure(operation, study.id, error);
    if (unavailable) return unavailable;

    warnTemporary(operation, study.id);
    saveMemoryStudy(study);
    return temporaryStudyResponse(study);
  }

  if (memoryAllowed()) saveMemoryStudy(study);
  return NextResponse.json(created);
}
