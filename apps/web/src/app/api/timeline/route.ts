import { NextRequest, NextResponse } from "next/server";
import { CACHE_POLICY, withCachePolicy } from "@/lib/http-cache";
import { prisma } from "@/lib/prisma";
import { GLOBAL_MILESTONES, PILOT_COUNTRIES } from "@/lib/country-data";
import { parseTimelineQuery } from "@/lib/cosmos-validation";

async function getHandler(req: NextRequest) {
  const queryResult = parseTimelineQuery(req.nextUrl.searchParams);
  if (!queryResult.ok) {
    return NextResponse.json({ error: queryResult.error }, { status: 400 });
  }

  const { startYear, endYear, categories } = queryResult.value;

  try {
    const whereClause: {
      year: { gte: number; lte: number };
      category?: { in: typeof categories extends null ? never : NonNullable<typeof categories> };
    } = {
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
  const all = [...GLOBAL_MILESTONES];
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

// T30: Cache-Control coerente (2xx pela política; erros e escrita sem cache).
export const GET = withCachePolicy(getHandler, CACHE_POLICY.staticData);
