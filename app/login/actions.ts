"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { createSession, decoyVerify, verifyPassword } from "@/lib/server/auth";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");
  const ip = clientIp(await headers());

  if (!email || !password) return { error: "Enter your email and password.", email };
  // Slow a guesser down without locking a real person out for long.
  if (!rateLimit(`login:${ip}`, 10, 15 * 60_000) || !rateLimit(`login:${email}`, 6, 15 * 60_000)) {
    return { error: "Too many attempts. Wait a few minutes and try again.", email };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    await decoyVerify(password);
    return { error: "That email and password do not match.", email };
  }
  if (!(await verifyPassword(user.passwordHash, password))) {
    return { error: "That email and password do not match.", email };
  }
  if (!user.isActive) return { error: "This account has been switched off. Ask the owner.", email };

  await createSession(user.id);
  redirect(next.startsWith("/dashboard") ? next : "/dashboard");
}
