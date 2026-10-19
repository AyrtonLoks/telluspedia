import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GLOBAL_MILESTONES, PILOT_COUNTRIES } from "@/lib/country-data";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const startYear = searchParams.get("startYear") ? Number(searchParams.get("startYear")) : 1900;
  const endYear = searchParams.get("endYear") ? Number(searchParams.get("endYear")) : 2026;
  const categoriesStr = searchParams.get("categories");
  const categories = categoriesStr ? categoriesStr.split(",") : null;

  try {
    const whereClause: any = {
      year: {
        gte: startYear,
        lte: endYear,
      },
    };

    if (categories && categories.length > 0) {
      whereClause.category = { in: categories };
    }

    const milestones = await prisma.timelineMilestone.findMany({
      where: whereClause,
      orderBy: { year: "asc" },
    });

    if (milestones && milestones.length > 0) {
      return NextResponse.json(milestones);
    }
  } catch {
    // Database fallback
  }

  // Fallback using bundled data
  let all: any[] = [...GLOBAL_MILESTONES];
  for (const c of Object.values(PILOT_COUNTRIES)) {
    for (const m of c.milestones) {
      if (!all.some((item) => item.id === m.id)) {
        all.push(m);
      }
    }
  }

  const filtered = all.filter(
    (m) =>
      m.year >= startYear &&
      m.year <= endYear &&
      (!categories || categories.includes(m.category))
  );

  filtered.sort((a, b) => a.year - b.year);
  return NextResponse.json(filtered);
}
