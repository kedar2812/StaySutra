"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { authorize, hashPassword, logActivity, sha256 } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { run, UserError } from "@/lib/server/action";
import { SITE_URL } from "@/lib/site";

const roles = ["OWNER", "MANAGER", "EDITOR"] as const;

/** A single-use link, valid for 72 hours. Only its hash is stored. */
async function issueLink(userId: string, kind: "INVITE" | "RESET") {
  const token = randomBytes(24).toString("base64url");
  await db.userToken.create({ data: { id: sha256(token), userId, kind, expiresAt: new Date(Date.now() + 72 * 3_600_000) } });
  return `${SITE_URL}/login/set-password?token=${token}`;
}

export async function inviteUser(input: { name: string; email: string; role: Role }) {
  return run(async () => {
    const me = await authorize("users.manage");
    const v = z.object({ name: z.string().trim().min(2).max(60), email: z.string().trim().toLowerCase().email(), role: z.enum(roles) }).parse(input);
    if (await db.user.findUnique({ where: { email: v.email } })) throw new UserError("Someone with that email already has an account.");
    const user = await db.user.create({
      // Unusable until they set their own: a random hash nobody knows.
      data: { ...v, passwordHash: await hashPassword(randomBytes(32).toString("hex")) },
    });
    await logActivity(me, "user.invite", "User", user.id, `${me.name} invited ${v.name} as ${v.role.toLowerCase()}`);
    return { link: await issueLink(user.id, "INVITE") };
  });
}

export async function resetLink(userId: string) {
  return run(async () => {
    const me = await authorize("users.manage");
    const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
    await logActivity(me, "user.reset", "User", userId, `${me.name} issued a password link for ${u.name}`);
    return { link: await issueLink(userId, "RESET") };
  });
}

export async function updateUser(userId: string, patch: { role?: Role; isActive?: boolean }) {
  return run(async () => {
    const me = await authorize("users.manage");
    if (userId === me.id && (patch.isActive === false || (patch.role && patch.role !== "OWNER"))) {
      throw new UserError("You can’t lock yourself out. Ask another owner to do that.");
    }
    const u = await db.user.update({ where: { id: userId }, data: patch });
    if (patch.isActive === false) await db.session.deleteMany({ where: { userId } });
    await logActivity(me, "user.update", "User", userId, `${me.name} ${patch.isActive === false ? "switched off" : patch.isActive ? "switched on" : `made ${u.name} ${u.role.toLowerCase()}`}${patch.isActive !== undefined ? ` ${u.name}` : ""}`);
  });
}

export async function signOutEverywhere(userId: string) {
  return run(async () => {
    const me = await authorize("users.manage");
    const { count } = await db.session.deleteMany({ where: { userId } });
    await logActivity(me, "user.signout", "User", userId, `${me.name} ended ${count} sessions`);
    return count;
  });
}
