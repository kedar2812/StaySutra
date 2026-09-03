import { NextResponse } from "next/server";
import { enquirySchema, refCode } from "@/lib/validation";
import { appendEnquiry } from "@/lib/server/enquiry-log";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

/**
 * Enquiry intake. Re-validates with the same schema the client used, checks the
 * honeypot and the fill time, rate limits by IP and by phone, then persists.
 *
 * Still to wire in P1-11, once the VPS and the mail domain exist:
 *   - Cloudflare Turnstile verification (TURNSTILE_SECRET_KEY)
 *   - Prisma write to Enquiry with UTM capture
 *   - Resend notification to ENQUIRY_NOTIFY_EMAIL, async with three retries
 * DPR §6.1
 */
export async function POST(request: Request) {
  const ip = clientIp(request.headers);

  if (!rateLimit(`ip:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const data = parsed.data;

  // Honeypot and minimum fill time. Both fail silently with a 200 so a bot
  // learns nothing from the response.
  const tooFast = data.startedAt !== undefined && Date.now() - data.startedAt < 3000;
  if (data.company || tooFast) {
    return NextResponse.json({ refCode: refCode() });
  }

  if (!rateLimit(`phone:${data.phone}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const code = refCode();

  try {
    await appendEnquiry({
      refCode: code,
      source: data.source,
      propertySlug: data.propertySlug ?? null,
      destinationSlug: data.destinationSlug ?? null,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      checkIn: data.checkIn || null,
      checkOut: data.checkOut || null,
      guests: data.guests ?? null,
      message: data.message ?? null,
      pageUrl: data.pageUrl ?? null,
      userAgent: request.headers.get("user-agent"),
      ip,
    });
  } catch (error) {
    // Losing the enquiry is the one outcome that is not acceptable here.
    console.error("[enquiry] persist failed", { refCode: code, error });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ refCode: code });
}
