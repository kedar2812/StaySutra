import { recordHit, recordLeave } from "@/lib/server/analytics";

export const runtime = "nodejs";

/**
 * The analytics beacon. The site posts here with navigator.sendBeacon: a page
 * view when a page is shown, and the visible time when it is left. Always
 * answers 204 — a beacon has no one to read a response, and nothing here may
 * ever surface as an error on the website. See lib/server/analytics.ts.
 */
export async function POST(request: Request) {
  const text = await request.text().catch(() => "");
  if (text.length > 2000) return new Response(null, { status: 204 });
  let body: { t?: string; id?: string; u?: string; r?: string; w?: number; s?: number } = {};
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 204 });
  }

  if (body.t === "leave" && body.id && typeof body.s === "number") {
    await recordLeave(request.headers, body.id, body.s);
  } else if (body.t === "view" && typeof body.u === "string") {
    await recordHit(request.headers, { kind: "PAGEVIEW", id: body.id, url: body.u, referrer: body.r ?? null, width: typeof body.w === "number" ? body.w : undefined });
  }
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
