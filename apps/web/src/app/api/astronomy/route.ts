import { NextRequest, NextResponse } from "next/server";
import { calculateSubsolarPoint, getSunDirectionVector } from "@/lib/astronomy";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const dtStr = searchParams.get("dt");
  const date = dtStr ? new Date(dtStr) : new Date();

  const subsolar = calculateSubsolarPoint(date);
  const sunDir = getSunDirectionVector(subsolar.latitude, subsolar.longitude);

  return NextResponse.json({
    subsolar_latitude: subsolar.latitude,
    subsolar_longitude: subsolar.longitude,
    timestamp: subsolar.timestamp,
    sun_direction: [sunDir.x, sunDir.y, sunDir.z],
  });
}
