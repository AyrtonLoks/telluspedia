import { NextResponse } from "next/server";
import { aisSource } from "@/lib/ais-source";
import { observatoryHeaders } from "@/lib/observatory-source";

export const runtime = "nodejs";

export async function GET() {
  const result = await aisSource.get();
  return NextResponse.json(result.envelope, { headers: observatoryHeaders(result) });
}
