import { NextResponse } from "next/server";
import { enquirySchema, refCode } from "@/lib/validation";
import { appendEnquiry } from "@/lib/server/enquiry-log";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { db, hasDatabase } from "@/lib/server/db";
import { getBlockedRangesFresh } from "@/lib/server/calendar";
import { isRangeFree } from "@/lib/calendar/dates";

export const runtime = "nodejs";

/**
 * Enquiry intake. Re-validates with the same schema the client used, checks the
 * honeypot and the fill time, rate limits by IP and by phone, then persists.
 *
 * With a database, the enquiry lands in the dashboard's inbox (Enquiry table,
 * UTM captured from the page URL). Without one — or if Postgres is briefly
 * down — it is appended to the write-ahead log instead, because losing an
 * enquiry is the one outcome that is not acceptable.
 *
 * Dates that clash with a booked night on any connected platform are refused
 * with a 409, so a guest cannot ask for a night Airbnb has already sold.
 *
 * Still to wire once the mail domain exists: Turnstile verification and the
 * Resend notification to ENQUIRY_NOTIFY_EMAIL. DPR §6.1
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

  const property =
    hasDatabase() && data.propertySlug
      ? await db.property
          .findUnique({ where: { slug: data.propertySlug }, select: { id: true, destinationId: true } })
          .catch(() => null)
      : null;

  if (property && data.checkIn && data.checkOut) {
    const blocked = await getBlockedRangesFresh(property.id).catch(() => []);
    if (!isRangeFree(data.checkIn, data.checkOut, blocked)) {
      return NextResponse.json({ error: "dates_unavailable" }, { status: 409 });
    }
  }

  if (hasDatabase()) {
    try {
      const destination =
        !property && data.destinationSlug
          ? await db.destination.findUnique({ where: { slug: data.destinationSlug }, select: { id: true } })
          : null;
      const utm = utmFrom(data.pageUrl);
      await db.enquiry.create({
        data: {
          refCode: code,
          source: data.source,
          propertyId: property?.id ?? null,
          destinationId: property?.destinationId ?? destination?.id ?? null,
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          checkIn: data.checkIn ? new Date(`${data.checkIn}T00:00:00Z`) : null,
          checkOut: data.checkOut ? new Date(`${data.checkOut}T00:00:00Z`) : null,
          guests: data.guests ?? null,
          message: data.message ?? null,
          pageUrl: data.pageUrl?.slice(0, 500) ?? null,
          utmSource: utm.source,
          utmMedium: utm.medium,
          utmCampaign: utm.campaign,
          userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
          ipAddress: ip,
        },
      });
      return NextResponse.json({ refCode: code });
    } catch (error) {
      console.error("[enquiry] database write failed, falling back to the log", { refCode: code, error });
    }
  }

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

function utmFrom(pageUrl: string | undefined) {
  try {
    const p = new URL(pageUrl ?? "").searchParams;
    return {
      source: p.get("utm_source")?.slice(0, 100) ?? null,
      medium: p.get("utm_medium")?.slice(0, 100) ?? null,
      campaign: p.get("utm_campaign")?.slice(0, 100) ?? null,
    };
  } catch {
    return { source: null, medium: null, campaign: null };
  }
}
