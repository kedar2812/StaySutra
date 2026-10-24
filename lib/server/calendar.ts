import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "./db";
import { parseIcs } from "@/lib/calendar/ics";
import { addDays, mergeRanges, todayIST } from "@/lib/calendar/dates";
import type { BlockedRange } from "@/lib/types";

/**
 * iCal sync — the server half.
 *
 *   import  Every active CalendarFeed with an importUrl is fetched on a timer
 *           (instrumentation.ts, every 15 minutes) and from the dashboard's
 *           "Sync now". Its events replace that feed's CalendarBlocks.
 *   export  Each feed has its own export URL (/calendar/<token>.ics) holding
 *           every block on the property EXCEPT that feed's own, so Airbnb
 *           never receives its own reservations back as foreign blocks.
 *
 * iCal moves dates only. Prices, guests and listing details stay where they
 * are edited — here, in the dashboard. docs/CALENDAR-SYNC.md
 */

export const CALENDAR_TAG = "calendar";
const FETCH_TIMEOUT_MS = 20_000;
const MAX_BYTES = 2_000_000;

export type SyncResult =
  | { ok: true; feedId: string; events: number; added: number; removed: number }
  | { ok: false; feedId: string; error: string };

async function fetchFeed(url: string): Promise<string> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("The link must start with https://");
  }
  const res = await fetch(parsed, {
    headers: { "user-agent": "StaySutra-CalendarSync/1.0 (+https://staysutra.in)", accept: "text/calendar, */*" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`The platform answered ${res.status} ${res.statusText}`.trim());
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new Error("The calendar is larger than any real listing's");
  if (!text.includes("BEGIN:VCALENDAR")) {
    throw new Error("That link did not return a calendar. Copy the export (.ics) link, not the listing page.");
  }
  return text;
}

export async function syncFeed(feedId: string): Promise<SyncResult> {
  const feed = await db.calendarFeed.findUnique({ where: { id: feedId } });
  if (!feed?.importUrl) return { ok: false, feedId, error: "No import link set" };

  try {
    const events = parseIcs(await fetchFeed(feed.importUrl));
    // Past stays are history, not availability. A month of grace keeps a
    // just-finished booking visible to the person reconciling it.
    const horizon = addDays(todayIST(), -30);
    const current = events.filter((e) => e.end >= horizon);

    const existing = await db.calendarBlock.findMany({
      where: { feedId: feed.id },
      select: { id: true, uid: true },
    });
    const incoming = new Set(current.map((e) => e.uid));
    const stale = existing.filter((b) => !b.uid || !incoming.has(b.uid));
    const known = new Set(existing.map((b) => b.uid));

    await db.$transaction([
      db.calendarBlock.deleteMany({ where: { id: { in: stale.map((b) => b.id) } } }),
      ...current.map((e) =>
        db.calendarBlock.upsert({
          where: { feedId_uid: { feedId: feed.id, uid: e.uid } },
          create: {
            propertyId: feed.propertyId,
            feedId: feed.id,
            source: "FEED",
            uid: e.uid,
            startDate: new Date(`${e.start}T00:00:00Z`),
            endDate: new Date(`${e.end}T00:00:00Z`),
            summary: e.summary.slice(0, 200) || null,
          },
          update: {
            startDate: new Date(`${e.start}T00:00:00Z`),
            endDate: new Date(`${e.end}T00:00:00Z`),
            summary: e.summary.slice(0, 200) || null,
          },
        }),
      ),
      db.calendarFeed.update({
        where: { id: feed.id },
        data: {
          lastSyncedAt: new Date(),
          lastStatus: "OK",
          lastError: null,
          lastEventCount: current.length,
        },
      }),
    ]);

    refreshAvailability();
    return {
      ok: true,
      feedId,
      events: current.length,
      added: current.filter((e) => !known.has(e.uid)).length,
      removed: stale.length,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "TimeoutError"
          ? "The platform took too long to answer"
          : error.message
        : "Unknown error";
    // Keep the last good blocks. A platform outage must not open up dates
    // that are actually booked.
    await db.calendarFeed.update({
      where: { id: feed.id },
      data: { lastSyncedAt: new Date(), lastStatus: "ERROR", lastError: message.slice(0, 300) },
    });
    return { ok: false, feedId, error: message };
  }
}

export async function syncAllFeeds(): Promise<SyncResult[]> {
  const feeds = await db.calendarFeed.findMany({
    where: { isActive: true, importUrl: { not: null } },
    select: { id: true },
  });
  const results: SyncResult[] = [];
  // One at a time: a dozen listings on a 2-vCPU box do not need parallelism,
  // and the platforms rate-limit aggressive pollers.
  for (const f of feeds) results.push(await syncFeed(f.id));
  return results;
}

/**
 * Drops the cached availability. Outside a request (the background timer) Next
 * has no cache context to revalidate in and throws; the 15-minute cache expiry
 * covers that case, so the error is safe to ignore.
 */
export function refreshAvailability() {
  try {
    revalidateTag(CALENDAR_TAG);
  } catch {
    /* outside a request scope */
  }
}

/* — Reading ——————————————————————————————————————————————————— */

const toIso = (d: Date) => d.toISOString().slice(0, 10);

async function loadBlocked(propertyId: string): Promise<BlockedRange[]> {
  const today = todayIST();
  const blocks = await db.calendarBlock.findMany({
    where: {
      propertyId,
      endDate: { gt: new Date(`${today}T00:00:00Z`) },
      OR: [{ feedId: null }, { feed: { isActive: true } }],
    },
    select: { startDate: true, endDate: true },
  });
  return mergeRanges(blocks.map((b) => ({ start: toIso(b.startDate), end: toIso(b.endDate) })));
}

/**
 * Unavailable nights from today on, merged. Cached and tagged, so the public
 * property page reads the database at most once per sync or dashboard edit.
 */
export function getBlockedRanges(propertyId: string): Promise<BlockedRange[]> {
  return unstable_cache(() => loadBlocked(propertyId), ["blocked", propertyId], {
    tags: [CALENDAR_TAG],
    revalidate: 900,
  })();
}

/** Which platforms this property's calendar is synced with, for the public page. */
export function getCalendarStatus(propertyId: string) {
  return unstable_cache(
    async () => {
      const all = await db.calendarFeed.findMany({
        where: { propertyId, isActive: true },
        select: { label: true, lastSyncedAt: true, importUrl: true, lastStatus: true, listingUrl: true },
      });
      const feeds = all.filter((f) => f.importUrl && f.lastStatus === "OK");
      const last = feeds
        .map((f) => f.lastSyncedAt?.toISOString())
        .filter((x): x is string => Boolean(x))
        .sort()
        .at(-1);
      return {
        channels: feeds.map((f) => f.label),
        lastSyncedAt: last ?? null,
        // The same stay on a platform guests already trust is proof it exists.
        listings: all
          .filter((f) => f.listingUrl)
          .map((f) => ({ label: f.label, url: f.listingUrl! })),
      };
    },
    ["calendar-status", propertyId],
    { tags: [CALENDAR_TAG], revalidate: 900 },
  )();
}

/** Uncached — for the enquiry endpoint's final check before a hold is written. */
export const getBlockedRangesFresh = loadBlocked;

/** Everything one export link should carry. Null when the token is unknown. */
export async function exportEvents(token: string) {
  const feed = await db.calendarFeed.findUnique({
    where: { exportToken: token },
    include: { property: { select: { id: true, name: true } } },
  });
  const property =
    feed?.property ??
    (await db.property.findUnique({ where: { icalToken: token }, select: { id: true, name: true } }));
  if (!property) return null;

  const blocks = await db.calendarBlock.findMany({
    where: {
      propertyId: property.id,
      endDate: { gte: new Date(`${addDays(todayIST(), -1)}T00:00:00Z`) },
      // Never echo a platform's own bookings back to it.
      ...(feed ? { OR: [{ feedId: null }, { feedId: { not: feed.id } }] } : {}),
    },
    orderBy: { startDate: "asc" },
    include: { feed: { select: { label: true } } },
  });

  if (feed) {
    await db.calendarFeed.update({ where: { id: feed.id }, data: { lastExportedAt: new Date() } });
  }

  return {
    name: `${property.name} · StaySutra`,
    events: blocks.map((b) => ({
      uid: `ss-${b.id}`,
      start: toIso(b.startDate),
      end: toIso(b.endDate),
      // Deliberately vague — the other platforms do not need to know where a
      // booking came from, and guests' names never leave this server.
      summary: b.source === "MANUAL" ? "Blocked" : "Not available",
    })),
  };
}
