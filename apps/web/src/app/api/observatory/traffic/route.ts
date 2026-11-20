import { NextResponse } from "next/server";
import { aircraftSource, maritimeRoutesEnvelope, type TrafficPayload } from "@/lib/observatory-sources";
import { observatoryHeaders } from "@/lib/observatory-source";

// Dois conjuntos com procedências distintas, cada um no seu envelope { data, meta }.
export async function GET() {
  const aircraft = await aircraftSource.get();
  const payload: TrafficPayload = {
    aircraft: aircraft.envelope,
    maritimeRoutes: maritimeRoutesEnvelope(),
  };
  return NextResponse.json(payload, { headers: observatoryHeaders(aircraft) });
}
