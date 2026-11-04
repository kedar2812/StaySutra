import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import type { Role } from "@prisma/client";
import { db } from "./db";

/**
 * Dashboard sessions.
 *
 * A random 32-byte token lives in an httpOnly cookie; only its SHA-256 is
 * stored, as Session.id, so a database leak hands out no live sessions. The
 * database row is the authority — deactivating a user or pressing "sign out
 * everywhere" ends every session on the next request. Sessions roll: any use
 * within the 7-day window pushes expiry out again. Passwords are Argon2id.
 * DPR §3.1, §11
 */

export const SESSION_COOKIE = "ss_session";
const SESSION_DAYS = 7;
const DAY = 86_400_000;

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function hashPassword(password: string) {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** A hash to verify against when the email is unknown, so timing gives nothing away. */
let decoy: string | null = null;
export async function decoyVerify(password: string) {
  decoy ??= await hash(randomBytes(16).toString("hex"));
  await verifyPassword(decoy, password);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  await db.session.create({
    data: {
      id: sha256(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_DAYS * DAY),
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    },
  });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !process.env.INSECURE_COOKIES,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export type SessionUser = { id: string; email: string; name: string; role: Role };

/** The signed-in user for this request, or null. Cached per request. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: sha256(token) },
    include: { user: { select: { id: true, email: true, name: true, role: true, isActive: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;

  // Roll the window, at most once an hour.
  if (session.expiresAt.getTime() - Date.now() < SESSION_DAYS * DAY - 3_600_000) {
    await db.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + SESSION_DAYS * DAY) },
    });
  }
  const { isActive: _active, ...user } = session.user;
  return user;
});

/* — Permissions — DPR §5.8 ———————————————————————————————————— */

export type Capability =
  | "property.edit"
  | "property.publish"
  | "property.delete"
  | "calendar.edit"
  | "enquiry.manage"
  | "submission.manage"
  | "story.edit"
  | "taxonomy.edit"
  | "content.edit"
  | "media.edit"
  | "analytics.view"
  | "users.manage";

const MATRIX: Record<Role, Capability[]> = {
  OWNER: [
    "property.edit", "property.publish", "property.delete", "calendar.edit", "enquiry.manage",
    "submission.manage", "story.edit", "taxonomy.edit", "content.edit", "media.edit", "analytics.view", "users.manage",
  ],
  MANAGER: [
    "property.edit", "property.publish", "property.delete", "calendar.edit", "enquiry.manage",
    "submission.manage", "story.edit", "taxonomy.edit", "content.edit", "media.edit", "analytics.view",
  ],
  EDITOR: ["property.edit", "story.edit", "media.edit"],
};

export function can(role: Role, capability: Capability) {
  return MATRIX[role].includes(capability);
}

/** For pages: the user, or a redirect to sign in. */
export async function requireUser(capability?: Capability): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  if (capability && !can(user.role, capability)) redirect("/dashboard?denied=1");
  return user;
}

export class Forbidden extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
  }
}

/** For server actions: enforced on the server, never just hidden in the UI. */
export async function authorize(capability?: Capability): Promise<SessionUser> {
  const user = await getUser();
  if (!user) throw new Forbidden("Your session has ended. Sign in again.");
  if (capability && !can(user.role, capability)) throw new Forbidden();
  return user;
}

export async function logActivity(
  user: SessionUser | null,
  action: string,
  entity: string,
  entityId: string,
  summary: string,
  meta?: Record<string, unknown>,
) {
  await db.activityLog.create({
    data: { userId: user?.id ?? null, action, entity, entityId, summary, meta: meta as never },
  });
}
