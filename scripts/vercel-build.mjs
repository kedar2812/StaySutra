#!/usr/bin/env node
/**
 * The Vercel demo's build. Vercel runs this instead of `npm run build`
 * (see vercel.json).
 *
 * The demo is the public website only. The dashboard is shown to the client
 * once their server exists, so its code is removed here before Next builds —
 * not hidden, not disabled: absent from the deployment. The VPS builds the
 * full app from the Dockerfile and never runs this script.
 *
 * It deletes source directories, so it refuses to run anywhere but Vercel.
 */
import { rmSync } from "node:fs";
import { execSync } from "node:child_process";

if (process.env.VERCEL !== "1") {
  console.error("scripts/vercel-build.mjs only runs on Vercel — it removes the dashboard source. Use `npm run build`.");
  process.exit(1);
}

const DASHBOARD = [
  "app/dashboard",
  "app/login",
  "app/library",
  "app/api/admin",
  "app/api/auth",
  "components/admin",
  "lib/cms",
];

for (const path of DASHBOARD) {
  rmSync(path, { recursive: true, force: true });
  console.log(`  − ${path}`);
}

execSync("npx prisma generate && npx next build", { stdio: "inherit" });
