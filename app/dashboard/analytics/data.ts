import { Prisma } from "@prisma/client";
import { db } from "@/lib/server/db";
import { istDay } from "@/lib/server/analytics";
import { addDays } from "@/lib/calendar/dates";

/**
 * Every figure on Dashboard → Analytics, computed in Postgres.
 *
 * Visitors are counted per day: the visitor hash rotates daily (no cookies),
 * so a person who comes back on Tuesday counts again on Tuesday. That is the
 * honest unit for cookieless analytics, and the page says so.
 */

export type Range = "7d" | "30d" | "90d" | "12m";
export const RANGES: Record<Range, { days: number; bucket: "day" | "week"; label: string; prev: string }> = {
  "7d": { days: 7, bucket: "day", label: "Last 7 days", prev: "previous 7 days" },
  "30d": { days: 30, bucket: "day", label: "Last 30 days", prev: "previous 30 days" },
  "90d": { days: 90, bucket: "day", label: "Last 90 days", prev: "previous 90 days" },
  "12m": { days: 364, bucket: "week", label: "Last 12 months", prev: "previous 12 months" },
};

const LOCAL = Prisma.sql`(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')`;
const atIST = (day: string) => new Date(`${day}T00:00:00+05:30`);

interface Totals {
  visitors: number;
  views: number;
  whatsapp: number;
  seconds: number;
  sessions: number;
  bounced: number;
  enquiries: number;
  confirmed: number;
}

async function totals(from: Date, to: Date): Promise<Totals> {
  const [hits, bounce, enq] = await Promise.all([
    db.$queryRaw<{ views: number; visitors: number; whatsapp: number; seconds: number }[]>`
      SELECT count(*) FILTER (WHERE kind = 'PAGEVIEW')::int AS views,
             count(DISTINCT visitor) FILTER (WHERE kind = 'PAGEVIEW')::int AS visitors,
             count(*) FILTER (WHERE kind = 'WHATSAPP')::int AS whatsapp,
             coalesce(sum(seconds) FILTER (WHERE kind = 'PAGEVIEW'), 0)::int AS seconds
      FROM "SiteHit" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}`,
    db.$queryRaw<{ sessions: number; bounced: number }[]>`
      SELECT count(*)::int AS sessions, count(*) FILTER (WHERE n = 1)::int AS bounced
      FROM (SELECT visitor, count(*) AS n FROM "SiteHit"
            WHERE kind = 'PAGEVIEW' AND "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY visitor) t`,
    db.enquiry.groupBy({ by: ["status"], where: { deletedAt: null, createdAt: { gte: from, lt: to } }, _count: { _all: true } }),
  ]);
  const h = hits[0] ?? { views: 0, visitors: 0, whatsapp: 0, seconds: 0 };
  const b = bounce[0] ?? { sessions: 0, bounced: 0 };
  return {
    ...h,
    ...b,
    enquiries: enq.reduce((n, r) => n + r._count._all, 0),
    confirmed: enq.find((r) => r.status === "CONVERTED")?._count._all ?? 0,
  };
}

export async function loadAnalytics(range: Range) {
  const r = RANGES[range];
  const today = istDay();
  const firstDay = addDays(today, -(r.days - 1));
  const from = atIST(firstDay);
  const to = atIST(addDays(today, 1));
  const prevFrom = atIST(addDays(firstDay, -r.days));
  const bucket = r.bucket;

  const [now, before, series, enquirySeries, sources, pages, propViews, propEnquiries, properties, destinations, devices, heat, funnel, first, live] = await Promise.all([
    totals(from, to),
    totals(prevFrom, from),
    db.$queryRaw<{ d: string; views: number; visitors: number }[]>`
      SELECT to_char(date_trunc(${bucket}, ${LOCAL}), 'YYYY-MM-DD') AS d,
             count(*)::int AS views, count(DISTINCT visitor)::int AS visitors
      FROM "SiteHit" WHERE kind = 'PAGEVIEW' AND "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ d: string; n: number }[]>`
      SELECT to_char(date_trunc(${bucket}, ${LOCAL}), 'YYYY-MM-DD') AS d, count(*)::int AS n
      FROM "Enquiry" WHERE "deletedAt" IS NULL AND "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ source: string; visitors: number; enquiries: number; whatsapp: number }[]>`
      SELECT source,
             count(DISTINCT visitor) FILTER (WHERE kind = 'PAGEVIEW')::int AS visitors,
             count(*) FILTER (WHERE kind = 'ENQUIRY')::int AS enquiries,
             count(*) FILTER (WHERE kind = 'WHATSAPP')::int AS whatsapp
      FROM "SiteHit" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY source ORDER BY visitors DESC, enquiries DESC LIMIT 10`,
    db.$queryRaw<{ path: string; views: number; visitors: number; secs: number | null }[]>`
      SELECT path, count(*)::int AS views, count(DISTINCT visitor)::int AS visitors, avg(seconds)::float AS secs
      FROM "SiteHit" WHERE kind = 'PAGEVIEW' AND "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY path ORDER BY views DESC LIMIT 10`,
    db.$queryRaw<{ id: string; views: number; visitors: number; whatsapp: number }[]>`
      SELECT "propertyId" AS id,
             count(*) FILTER (WHERE kind = 'PAGEVIEW')::int AS views,
             count(DISTINCT visitor) FILTER (WHERE kind = 'PAGEVIEW')::int AS visitors,
             count(*) FILTER (WHERE kind = 'WHATSAPP')::int AS whatsapp
      FROM "SiteHit" WHERE "propertyId" IS NOT NULL AND "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY "propertyId"`,
    db.enquiry.groupBy({ by: ["propertyId"], where: { deletedAt: null, propertyId: { not: null }, createdAt: { gte: from, lt: to } }, _count: { _all: true } }),
    db.property.findMany({ where: { deletedAt: null }, select: { id: true, name: true, slug: true, status: true } }),
    db.$queryRaw<{ slug: string; visitors: number }[]>`
      SELECT destination AS slug, count(DISTINCT visitor)::int AS visitors
      FROM "SiteHit" WHERE kind = 'PAGEVIEW' AND destination IS NOT NULL AND "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY destination ORDER BY visitors DESC LIMIT 8`,
    db.$queryRaw<{ device: string; visitors: number }[]>`
      SELECT device, count(DISTINCT visitor)::int AS visitors
      FROM "SiteHit" WHERE kind = 'PAGEVIEW' AND "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY device`,
    db.$queryRaw<{ dow: number; h: number; n: number }[]>`
      SELECT extract(isodow FROM ${LOCAL})::int AS dow, extract(hour FROM ${LOCAL})::int AS h, count(*)::int AS n
      FROM "SiteHit" WHERE kind = 'PAGEVIEW' AND "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY 1, 2`,
    db.$queryRaw<{ visitors: number; stay: number; acted: number }[]>`
      SELECT count(DISTINCT visitor) FILTER (WHERE kind = 'PAGEVIEW')::int AS visitors,
             count(DISTINCT visitor) FILTER (WHERE kind = 'PAGEVIEW' AND "propertyId" IS NOT NULL)::int AS stay,
             count(DISTINCT visitor) FILTER (WHERE kind IN ('ENQUIRY', 'WHATSAPP'))::int AS acted
      FROM "SiteHit" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}`,
    db.siteHit.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    liveNow(),
  ]);

  // Fill every bucket, so the chart's x axis is time, not "days that had data".
  const step = bucket === "week" ? 7 : 1;
  const startKey = bucket === "week" ? mondayOf(firstDay) : firstDay;
  const byDay = new Map(series.map((s) => [s.d, s]));
  const enqByDay = new Map(enquirySeries.map((s) => [s.d, s.n]));
  const points: { d: string; visitors: number; views: number; enquiries: number }[] = [];
  for (let d = startKey; d <= today; d = addDays(d, step)) {
    points.push({ d, visitors: byDay.get(d)?.visitors ?? 0, views: byDay.get(d)?.views ?? 0, enquiries: enqByDay.get(d) ?? 0 });
  }

  const enqByProp = new Map(propEnquiries.map((e) => [e.propertyId, e._count._all]));
  const viewsByProp = new Map(propViews.map((p) => [p.id, p]));
  const stays = properties
    .map((p) => {
      const v = viewsByProp.get(p.id);
      const enquiries = enqByProp.get(p.id) ?? 0;
      return { id: p.id, name: p.name, slug: p.slug, live: p.status === "PUBLISHED", views: v?.views ?? 0, visitors: v?.visitors ?? 0, whatsapp: v?.whatsapp ?? 0, enquiries };
    })
    .sort((a, b) => b.visitors - a.visitors || b.enquiries - a.enquiries);

  const destNames = new Map((await db.destination.findMany({ select: { slug: true, name: true } })).map((d) => [d.slug, d.name]));

  return {
    range,
    meta: r,
    now,
    before,
    points,
    sources,
    pages,
    stays,
    destinations: destinations.map((d) => ({ label: destNames.get(d.slug) ?? d.slug, visitors: d.visitors })),
    devices,
    heat,
    funnel: funnel[0] ?? { visitors: 0, stay: 0, acted: 0 },
    since: first?.createdAt.toISOString() ?? null,
    live,
  };
}

export async function liveNow() {
  const since = new Date(Date.now() - 5 * 60_000);
  const rows = await db.$queryRaw<{ path: string; visitors: number }[]>`
    SELECT path, count(DISTINCT visitor)::int AS visitors FROM "SiteHit"
    WHERE kind = 'PAGEVIEW' AND "createdAt" >= ${since}
    GROUP BY path ORDER BY visitors DESC LIMIT 4`;
  const total = await db.$queryRaw<{ n: number }[]>`
    SELECT count(DISTINCT visitor)::int AS n FROM "SiteHit" WHERE kind = 'PAGEVIEW' AND "createdAt" >= ${since}`;
  return { visitors: total[0]?.n ?? 0, pages: rows };
}

function mondayOf(day: string) {
  const dow = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(day, -dow);
}

export type Analytics = Awaited<ReturnType<typeof loadAnalytics>>;
