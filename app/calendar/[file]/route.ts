import { buildIcs } from "@/lib/calendar/ics";
import { exportEvents } from "@/lib/server/calendar";
import { hasDatabase } from "@/lib/server/db";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /calendar/<token>.ics — the availability feed Airbnb, Booking.com and the
 * rest import from us. The token is unguessable (cuid) and per channel, and
 * the dashboard can rotate it if a link ever leaks.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const token = file.replace(/\.ics$/i, "");
  if (!hasDatabase() || !/^[a-z0-9]{20,40}$/i.test(token)) {
    return new Response("Not found", { status: 404 });
  }

  const feed = await exportEvents(token);
  if (!feed) return new Response("Not found", { status: 404 });

  const body = buildIcs({
    name: feed.name,
    events: feed.events,
    domain: new URL(SITE_URL).hostname,
  });

  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `inline; filename="${token}.ics"`,
      // The platforms poll on their own schedule; never let a CDN hold a stale copy.
      "cache-control": "no-store, max-age=0",
      "x-robots-tag": "noindex",
    },
  });
}
