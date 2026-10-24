/**
 * Pull every connected calendar once, from the command line.
 * The running app already does this every 15 minutes; this is for debugging
 * a feed on the server:  docker compose exec app npx tsx scripts/calendar-sync.ts
 */
import { syncAllFeeds } from "../lib/server/calendar";

syncAllFeeds()
  .then((results) => {
    for (const r of results) console.log(r.ok ? `✓ ${r.feedId}: ${r.events} events` : `✗ ${r.feedId}: ${r.error}`);
    process.exit(results.every((r) => r.ok) ? 0 : 1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
