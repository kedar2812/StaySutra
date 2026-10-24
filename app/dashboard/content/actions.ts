"use server";

import { z } from "zod";
import { authorize, logActivity } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { publishSite, run, UserError } from "@/lib/server/action";
import { SECTIONS, validateSection } from "@/lib/cms/sections";

export async function saveSection(key: string, values: Record<string, unknown>) {
  return run(async () => {
    const user = await authorize("content.edit");
    const def = SECTIONS.find((s) => s.key === key);
    if (!def) throw new UserError("Unknown section");
    const errors = validateSection(def, values);
    if (Object.keys(errors).length) return { errors };
    await db.siteSection.upsert({
      where: { key },
      create: { key, label: `${def.page} — ${def.title}`, fields: values as never, updatedById: user.id },
      update: { fields: values as never, updatedById: user.id },
    });
    await logActivity(user, "content.section", "SiteSection", key, `${user.name} edited ${def.page} — ${def.title}`);
    publishSite();
    return { errors: null };
  });
}

export async function resetSection(key: string) {
  return run(async () => {
    const user = await authorize("content.edit");
    await db.siteSection.deleteMany({ where: { key } });
    await logActivity(user, "content.reset", "SiteSection", key, `${user.name} restored the original ${key} copy`);
    publishSite();
  });
}

const settingsSchema = z.object({
  whatsappNumber: z.string().trim().regex(/^\d{10,15}$/, "Digits only, with country code — e.g. 918805895066"),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email("That doesn’t look like an email address"),
  instagram: z.string().trim().url("A full link, starting https://").or(z.literal("")),
  instagramHandle: z.string().trim().max(40),
  officeLocality: z.string().trim().max(60),
  responseTime: z.string().trim().max(120),
  announcement: z.object({
    enabled: z.boolean(),
    text: z.string().trim().max(120, "Keep it to 120 characters"),
    href: z.string().trim().max(200).refine((v) => !v || v.startsWith("/") || /^https?:\/\//.test(v), "A page like /stays or a full link"),
  }),
  cancellation: z.string().trim().min(20).max(800),
});

export async function saveSettings(input: z.input<typeof settingsSchema>) {
  return run(async () => {
    const user = await authorize("content.edit");
    const s = settingsSchema.parse(input);
    if (s.announcement.enabled && !s.announcement.text) throw new UserError("Write the announcement, or switch it off.");
    const current = await db.siteSetting.findUnique({ where: { key: "policies" } });
    const policies = { ...((current?.value as Record<string, unknown>) ?? {}), cancellation: s.cancellation };
    const entries: [string, unknown][] = [
      ["whatsappNumber", s.whatsappNumber],
      ["phone", s.phone],
      ["email", s.email],
      ["instagram", s.instagram],
      ["instagramHandle", s.instagramHandle],
      ["officeLocality", s.officeLocality],
      ["responseTime", s.responseTime],
      ["announcement", s.announcement],
      ["policies", policies],
    ];
    await db.$transaction(
      entries.map(([key, value]) => db.siteSetting.upsert({ where: { key }, create: { key, value: value as never }, update: { value: value as never } })),
    );
    await logActivity(user, "content.settings", "SiteSetting", "settings", `${user.name} updated contact details and settings`);
    publishSite();
  });
}

export async function saveSlot(key: string, mediaId: string | null) {
  return run(async () => {
    const user = await authorize("content.edit");
    const row = await db.siteSetting.findUnique({ where: { key: "imageSlots" } });
    const slots = { ...((row?.value as Record<string, string>) ?? {}) };
    const previous = slots[key] ?? null;
    if (mediaId) slots[key] = mediaId;
    else delete slots[key];
    await db.siteSetting.upsert({ where: { key: "imageSlots" }, create: { key: "imageSlots", value: slots }, update: { value: slots } });
    await logActivity(user, "content.image", "SiteSetting", key, `${user.name} changed the “${key}” photo`);
    publishSite();
    return { previous };
  });
}
