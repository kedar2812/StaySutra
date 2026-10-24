"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { createSession, hashPassword, sha256 } from "@/lib/server/auth";

export type SetState = { error?: string };

export async function setPassword(_prev: SetState, form: FormData): Promise<SetState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < 10) return { error: "Use at least 10 characters." };
  if (password !== confirm) return { error: "The two passwords don’t match." };

  const row = await db.userToken.findUnique({ where: { id: sha256(token) }, include: { user: true } });
  if (!row || row.usedAt || row.expiresAt < new Date() || !row.user.isActive) {
    return { error: "This link has expired or was already used. Ask for a new one." };
  }
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.userToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    // A new password ends every other session.
    db.session.deleteMany({ where: { userId: row.userId } }),
  ]);
  await createSession(row.userId);
  redirect("/dashboard");
}
