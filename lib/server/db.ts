import { PrismaClient } from "@prisma/client";

/**
 * One Prisma client per process, created on first use — never at import.
 *
 * Lazy on purpose: the Vercel demo runs the public site from the JSON seed
 * with no database at all, and a client constructed at import time would make
 * every page that merely imports this module depend on one. Next's dev server
 * re-evaluates modules on every change, so the instance is parked on
 * globalThis or each reload would open a fresh connection pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function client(): PrismaClient {
  globalForPrisma.prisma ??= new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  return globalForPrisma.prisma;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const c = client();
    const value = Reflect.get(c, prop, c);
    return typeof value === "function" ? value.bind(c) : value;
  },
});

/**
 * The site runs from the JSON seed in /content when there is no database —
 * a fresh checkout, a `next build` inside Docker, or the Vercel demo. With
 * DATABASE_URL set, Postgres is the single source of truth and the dashboard
 * writes to it.
 */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

