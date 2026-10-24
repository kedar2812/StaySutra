import { NextResponse } from "next/server";
import { syncAllFeeds } from "@/lib/server/calendar";
import { hasDatabase } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pull every connected calendar now.
 *
 * On the VPS the app already does this every 15 minutes by itself
 * (instrumentation.ts). This endpoint is for hosts without a long-running
 * process — a Vercel Cron, or a system crontab — and for a manual nudge:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://staysutra.in/api/cron/calendar-sync
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasDatabase()) return NextResponse.json({ error: "no_database" }, { status: 503 });

  const results = await syncAllFeeds();
  return NextResponse.json({
    synced: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
