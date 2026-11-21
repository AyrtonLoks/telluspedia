import { NextResponse } from "next/server";
import { CACHE_POLICY, withCachePolicy } from "@/lib/http-cache";
import { runHealthChecks } from "@/lib/health-check";

export const dynamic = "force-dynamic";

async function getHandler() {
  const report = await runHealthChecks();
  return NextResponse.json(report, {
    status: report.status === "ok" ? 200 : 503,
  });
}

// T30/T34: Health checks nunca devem ser cacheados por navegador ou CDN.
export const GET = withCachePolicy(getHandler, CACHE_POLICY.noStore);
