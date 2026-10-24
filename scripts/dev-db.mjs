#!/usr/bin/env node
/**
 * A real Postgres for local development, with nothing installed system-wide.
 *
 * `npm run db:dev` starts it in the foreground (Ctrl+C stops it). Data lives in
 * `.data/pg`, which is git-ignored. The first run creates the cluster and the
 * `staysutra` database; after that it simply starts.
 *
 * Set DATABASE_URL in .env.local to:
 *   postgresql://staysutra:staysutra@localhost:5433/staysutra?schema=public
 *
 * Production does not use this — it runs Postgres 16 in docker-compose.yml.
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const dir = path.resolve(".data/pg");
const fresh = !existsSync(path.join(dir, "PG_VERSION"));

const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: "staysutra",
  password: "staysutra",
  port: 5433,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase("staysutra");

console.log("Postgres ready on localhost:5433 (database: staysutra). Ctrl+C to stop.");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
