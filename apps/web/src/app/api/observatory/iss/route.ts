import { NextResponse } from "next/server";
import { issSource } from "@/lib/observatory-sources";
import { observatoryHeaders } from "@/lib/observatory-source";
import { enforceRateLimit } from "@/lib/rate-limit";

// Envelope { data, meta }: meta.source indica "live" | "fallback" (ver lib/observatory-source.ts).
export async function GET(request: Request) {
  const limit = await enforceRateLimit("observatory:iss", request);
  if (limit.blocked) return limit.blocked;

  const result = await issSource.get();
  return NextResponse.json(result.envelope, {
    headers: { ...observatoryHeaders(result), ...limit.headers },
  });
}
