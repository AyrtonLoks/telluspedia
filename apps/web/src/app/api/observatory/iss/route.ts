import { NextResponse } from "next/server";
import { issSource } from "@/lib/observatory-sources";
import { observatoryHeaders } from "@/lib/observatory-source";

// Envelope { data, meta }: meta.source indica "live" | "fallback" (ver lib/observatory-source.ts).
export async function GET() {
  const result = await issSource.get();
  return NextResponse.json(result.envelope, { headers: observatoryHeaders(result) });
}
