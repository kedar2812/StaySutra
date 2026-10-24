import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { Forbidden } from "./auth";
import { CONTENT_TAG } from "@/lib/content";
import { CALENDAR_TAG } from "./calendar";

/**
 * What every dashboard server action returns. The client shows `error`
 * inline, next to the thing that failed, and maps `fields` onto the form.
 */
export type Result<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fields?: Record<string, string> };

export async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof Forbidden) return { ok: false, error: error.message };
    if (error instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of error.issues) fields[issue.path.join(".")] ??= issue.message;
      return { ok: false, error: "Some fields need another look.", fields };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "That is already in use — it has to be unique." };
    }
    if (error instanceof UserError) return { ok: false, error: error.message };
    console.error("[dashboard action]", error);
    return { ok: false, error: "Something went wrong on our side. Nothing was changed." };
  }
}

/** An error whose message is written for the person using the dashboard. */
export class UserError extends Error {}

/** After any change the public site shows, so the next page view has it. */
export function publishSite() {
  revalidateTag(CONTENT_TAG);
}

export function publishCalendar() {
  revalidateTag(CALENDAR_TAG);
}
