import { createHash, randomUUID } from "node:crypto";
import type { HitKind } from "@prisma/client";
import { db, hasDatabase } from "./db";
import { clientIp } from "./rate-limit";

/**
 * First-party, cookieless site analytics. See SiteHit in prisma/schema.prisma.
 *
 * Nothing here sets a cookie or stores an IP address. A visitor is a hash of
 * the IP and user agent salted with the date, so it is stable for one day and
 * meaningless the next — enough to count people, never enough to follow one.
 * The salt also folds in a server secret, so the hash cannot be recomputed
 * from a guessed IP by anyone who reads the database.
 */

const SECRET = process.env.ANALYTICS_SALT?.trim() || process.env.SESSION_SECRET?.trim() || process.env.CRON_SECRET?.trim() || process.env.DATABASE_URL?.trim() || "staysutra";

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python|node-fetch|axios|go-http|java\/|httpclient|monitor|uptime/i;

/** The calendar day in India — the day the business counts in. */
export function istDay(d = new Date()): string {
  return new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

export function visitorHash(headers: Headers): string {
  const ua = headers.get("user-agent") ?? "";
  return createHash("sha256").update(`${SECRET}|${istDay()}|${clientIp(headers)}|${ua}`).digest("hex").slice(0, 16);
}

export function isBot(headers: Headers): boolean {
  const ua = headers.get("user-agent") ?? "";
  return !ua || BOT.test(ua);
}

/** A signed-in dashboard user browsing their own site is not traffic. */
export function isTeam(headers: Headers): boolean {
  return /(?:^|;\s*)ss_session=/.test(headers.get("cookie") ?? "");
}

const SOURCES: [RegExp, string][] = [
  [/(^|\.)google\./, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)yahoo\./, "Yahoo"],
  [/instagram\.com$/, "Instagram"],
  [/(^|\.)facebook\.com$|(^|\.)fb\.(com|me)$/, "Facebook"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "X"],
  [/whatsapp\.(com|net)$|^wa\.me$/, "WhatsApp"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "YouTube"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "LinkedIn"],
  [/(^|\.)reddit\.com$/, "Reddit"],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, "ChatGPT"],
  [/(^|\.)perplexity\.ai$/, "Perplexity"],
  [/(^|\.)claude\.ai$/, "Claude"],
  [/(^|\.)airbnb\./, "Airbnb"],
  [/(^|\.)tripadvisor\./, "Tripadvisor"],
  [/(^|\.)booking\.com$/, "Booking.com"],
  [/mail\.|outlook\.|gmail/, "Email"],
];

const UTM_NAMES: Record<string, string> = {
  google: "Google",
  ig: "Instagram",
  instagram: "Instagram",
  fb: "Facebook",
  facebook: "Facebook",
  meta: "Facebook",
  whatsapp: "WhatsApp",
  wa: "WhatsApp",
  email: "Email",
  newsletter: "Email",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

/**
 * Where a visit came from, in words an owner uses. Campaign tags win over
 * the referrer; an ad (cpc, paid) is its own source.
 */
export function classify(referrerHost: string | null, utm: { source: string | null; medium: string | null }, ownHost: string | null): string | null {
  if (utm.medium && /cpc|ppc|paid|ads?$/i.test(utm.medium)) return `${UTM_NAMES[utm.source?.toLowerCase() ?? ""] ?? cap(utm.source ?? "")} ads`.trim();
  if (utm.source) return UTM_NAMES[utm.source.toLowerCase()] ?? cap(utm.source);
  // No referrer: either a typed address (Direct) or the next page of a visit
  // already under way — the caller inherits the day's source, else Direct.
  if (!referrerHost) return null;
  const host = referrerHost.replace(/^www\.|^m\.|^l\.|^lm\./, "");
  if (ownHost && host === ownHost.replace(/^www\./, "")) return null; // internal — inherit the day's source
  for (const [re, name] of SOURCES) if (re.test(host)) return name;
  return host;
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

export function deviceOf(ua: string, width?: number): string {
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return "Tablet";
  if (/mobi|iphone|ipod|android/i.test(ua)) return "Phone";
  if (width && width < 768) return "Phone";
  return "Desktop";
}

export function browserOf(ua: string): string | null {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\//i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return null;
}

export function osOf(ua: string): string | null {
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os x/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return null;
}

/** /stays/[slug] → property id, cached briefly so a page view costs one insert. */
const slugCache = new Map<string, { id: string | null; at: number }>();
async function propertyIdFor(path: string): Promise<string | null> {
  const m = /^\/stays\/([a-z0-9-]+)\/?$/.exec(path);
  if (!m) return null;
  const slug = m[1]!;
  const hit = slugCache.get(slug);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.id;
  const p = await db.property.findUnique({ where: { slug }, select: { id: true } }).catch(() => null);
  slugCache.set(slug, { id: p?.id ?? null, at: Date.now() });
  return p?.id ?? null;
}

/** The source this visitor arrived from today, if they have already been seen. */
async function sourceToday(visitor: string): Promise<string | null> {
  const since = new Date(`${istDay()}T00:00:00+05:30`);
  const first = await db.siteHit.findFirst({
    where: { visitor, createdAt: { gte: since }, kind: "PAGEVIEW" },
    orderBy: { createdAt: "asc" },
    select: { source: true },
  });
  return first?.source ?? null;
}

const IGNORED = /^\/(dashboard|login|api|library|calendar|go|_next)(\/|$)/;

/**
 * Record one hit. Never throws — analytics must not be able to break a page,
 * an enquiry or a WhatsApp redirect.
 */
export async function recordHit(
  headers: Headers,
  input: { kind: HitKind; id?: string; url: string; referrer?: string | null; width?: number },
): Promise<void> {
  if (!hasDatabase() || isBot(headers) || isTeam(headers)) return;
  try {
    const url = new URL(input.url, "http://local");
    const path = decodeURIComponent(url.pathname).slice(0, 300) || "/";
    if (input.kind === "PAGEVIEW" && IGNORED.test(path)) return;

    const ua = headers.get("user-agent") ?? "";
    const visitor = visitorHash(headers);
    const ownHost = headers.get("x-forwarded-host") ?? headers.get("host");
    let referrerHost: string | null = null;
    try {
      referrerHost = input.referrer ? new URL(input.referrer).hostname.toLowerCase() : null;
    } catch {}
    const utm = { source: url.searchParams.get("utm_source"), medium: url.searchParams.get("utm_medium"), campaign: url.searchParams.get("utm_campaign") };

    // A page view starts or continues the day's visit; a tap or an enquiry is
    // credited to whatever brought the visitor in today.
    const fresh = input.kind === "PAGEVIEW" ? classify(referrerHost, utm, ownHost?.split(":")[0] ?? null) : null;
    const source = fresh ?? (await sourceToday(visitor)) ?? "Direct";
    const dest = /^\/destinations\/([a-z0-9-]+)\/?$/.exec(path)?.[1] ?? null;

    await db.siteHit.create({
      data: {
        id: input.id && /^[a-zA-Z0-9-]{8,64}$/.test(input.id) ? input.id : randomUUID(),
        kind: input.kind,
        visitor,
        path,
        propertyId: await propertyIdFor(path),
        destination: dest,
        source: source.slice(0, 60),
        referrer: referrerHost && fresh ? referrerHost.slice(0, 120) : null,
        utmSource: utm.source?.slice(0, 80) ?? null,
        utmMedium: utm.medium?.slice(0, 80) ?? null,
        utmCampaign: utm.campaign?.slice(0, 120) ?? null,
        device: deviceOf(ua, input.width),
        browser: browserOf(ua),
        os: osOf(ua),
      },
    });

    // Keep two years and a month, no more. Cheap enough to do now and then.
    if (Math.random() < 0.002) {
      await db.siteHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 760 * 86_400_000) } } });
    }
  } catch (error) {
    if (!(error instanceof Error && /Unique constraint/.test(error.message))) console.error("[analytics] hit not recorded", error);
  }
}

/** The "left the page" beacon: how long the page was actually visible. */
export async function recordLeave(headers: Headers, id: string, seconds: number): Promise<void> {
  if (!hasDatabase() || isBot(headers) || !/^[a-zA-Z0-9-]{8,64}$/.test(id)) return;
  const s = Math.max(0, Math.min(Math.round(seconds), 30 * 60));
  try {
    await db.siteHit.updateMany({ where: { id, visitor: visitorHash(headers), kind: "PAGEVIEW" }, data: { seconds: s } });
  } catch (error) {
    console.error("[analytics] leave not recorded", error);
  }
}
