import { randomBytes } from "node:crypto";

/** Short, URL-safe, unguessable ids for file names and tokens. */
export function createId(bytes = 12): string {
  return randomBytes(bytes).toString("base64url").replace(/[-_]/g, "x").toLowerCase();
}
