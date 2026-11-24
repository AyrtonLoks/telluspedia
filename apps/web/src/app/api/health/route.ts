import { NextRequest, NextResponse } from "next/server";
import { CACHE_POLICY, withCachePolicy } from "@/lib/http-cache";
import { runHealthChecks } from "@/lib/health-check";

export const dynamic = "force-dynamic";

function wantsProviderDetail(req?: NextRequest | Request): boolean {
  if (!req) return false;
  try {
    const searchParams = "nextUrl" in req ? req.nextUrl.searchParams : new URL(req.url).searchParams;
    const raw = searchParams.get("detail")?.trim().toLowerCase();
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

async function getHandler(req: NextRequest) {
  const report = await runHealthChecks({ includeProviders: wantsProviderDetail(req) });
  return NextResponse.json(report, {
    status: report.status === "ok" ? 200 : 503,
  });
}

// T30/T34/T47: Health checks nunca devem ser cacheados por navegador ou CDN.
export const GET = withCachePolicy(getHandler, CACHE_POLICY.noStore);
