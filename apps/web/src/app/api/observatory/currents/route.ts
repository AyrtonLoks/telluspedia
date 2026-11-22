import { NextResponse } from "next/server";
import { observatoryHeaders } from "@/lib/observatory-source";
import { currentsSource } from "@/lib/currents-source";

/**
 * Camada de Correntes Oceânicas Superficiais (D27b).
 * Retorna grade UV oceânica compacta (9 × 16 = 144 pontos com máscara terra/oceano)
 * via Open-Meteo Marine (Copernicus / NOAA) no envelope padrão `{ data, meta }` da T05,
 * com fallback climatológico explícito de giros oceânicos quando o provedor estiver indisponível.
 */
export async function GET() {
  const result = await currentsSource.get();
  return NextResponse.json(result.envelope, {
    headers: observatoryHeaders(result),
  });
}
