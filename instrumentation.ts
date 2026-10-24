/**
 * Runs once when the Next server boots.
 *
 * On the VPS the app is one long-running Node process, so it keeps every
 * connected calendar fresh by itself — no cron container, no extra service.
 * Serverless hosts (Vercel) skip this and use /api/cron/calendar-sync instead.
 * Set CALENDAR_SYNC=off to disable it, e.g. on a second app container.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL || process.env.VERCEL || process.env.CALENDAR_SYNC === "off") return;

  const flag = globalThis as unknown as { __staysutraCalendarSync?: boolean };
  if (flag.__staysutraCalendarSync) return;
  flag.__staysutraCalendarSync = true;

  const minutes = Math.max(5, Number(process.env.CALENDAR_SYNC_MINUTES) || 15);
  const { syncAllFeeds } = await import("./lib/server/calendar");

  const run = async () => {
    try {
      const results = await syncAllFeeds();
      const failed = results.filter((r) => !r.ok);
      if (failed.length) console.warn("[calendar] sync failures", failed);
    } catch (error) {
      console.error("[calendar] sync crashed", error);
    }
  };

  // First pass shortly after boot, once the server is serving traffic.
  setTimeout(run, 30_000).unref?.();
  setInterval(run, minutes * 60_000).unref?.();
}
