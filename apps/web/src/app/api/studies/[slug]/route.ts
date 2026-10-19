import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemoryStudy } from "@/lib/studies-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const study = await prisma.study.findUnique({
      where: { id: slug },
      include: {
        parent: true,
        forks: true,
      },
    });
    if (study) return NextResponse.json(study);
  } catch {
    // Database fallback
  }

  const memory = getMemoryStudy(slug);
  if (memory) return NextResponse.json(memory);

  return NextResponse.json({ error: "Study not found" }, { status: 404 });
}
