import { NextResponse } from "next/server";
import { aisSource } from "@/lib/ais-source";
import { observatoryHeaders } from "@/lib/observatory-source";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limit = await enforceRateLimit("observatory:ais", request);
  if (limit.blocked) return limit.blocked;

  const result = await aisSource.get();
  return NextResponse.json(result.envelope, {
    headers: { ...observatoryHeaders(result), ...limit.headers },
  });
}
