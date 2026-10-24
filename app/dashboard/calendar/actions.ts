"use server";

import { z } from "zod";
import { authorize, logActivity } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { publishCalendar, run, UserError } from "@/lib/server/action";
import { syncFeed, type SyncResult } from "@/lib/server/calendar";
import { isIsoDate, isRangeFree, nightsBetween } from "@/lib/calendar/dates";
import { createId } from "@/lib/server/id";
import { CHANNELS, type ChannelKey } from "@/lib/calendar/channels";
import { SITE_URL } from "@/lib/site";

const url = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => !v || /^https?:\/\//i.test(v), "Starts with https://")
  .transform((v) => v || null);

const feedSchema = z.object({
  id: z.string().optional(),
  propertyId: z.string().min(1),
  channel: z.enum(Object.keys(CHANNELS) as [ChannelKey, ...ChannelKey[]]),
  label: z.string().trim().min(1, "Give it a name").max(40),
  importUrl: url,
  listingUrl: url,
  isActive: z.boolean().default(true),
});

export async function saveFeed(input: z.input<typeof feedSchema>) {
  return run(async () => {
    const user = await authorize("calendar.edit");
    const data = feedSchema.parse(input);
    const { id, ...fields } = data;
    const feed = id
      ? await db.calendarFeed.update({ where: { id }, data: fields })
      : await db.calendarFeed.create({ data: fields });
    await logActivity(user, id ? "calendar.feed.update" : "calendar.feed.create", "CalendarFeed", feed.id, `${user.name} ${id ? "updated" : "connected"} ${feed.label}`);
    let sync: SyncResult | null = null;
    if (feed.importUrl && feed.isActive) sync = await syncFeed(feed.id);
    publishCalendar();
    return { id: feed.id, sync, exportUrl: `${SITE_URL}/calendar/${feed.exportToken}.ics` };
  });
}

export async function deleteFeed(id: string) {
  return run(async () => {
    const user = await authorize("calendar.edit");
    const feed = await db.calendarFeed.delete({ where: { id } });
    await logActivity(user, "calendar.feed.delete", "CalendarFeed", id, `${user.name} disconnected ${feed.label}`);
    publishCalendar();
  });
}

export async function syncNow(propertyId: string) {
  return run(async () => {
    await authorize("calendar.edit");
    const feeds = await db.calendarFeed.findMany({ where: { propertyId, isActive: true, importUrl: { not: null } } });
    if (!feeds.length) throw new UserError("Connect a platform’s calendar first.");
    const results: SyncResult[] = [];
    for (const f of feeds) results.push(await syncFeed(f.id));
    publishCalendar();
    return results;
  });
}

export async function rotateExportLink(feedId: string) {
  return run(async () => {
    const user = await authorize("calendar.edit");
    const feed = await db.calendarFeed.update({ where: { id: feedId }, data: { exportToken: createId(16), lastExportedAt: null } });
    await logActivity(user, "calendar.feed.rotate", "CalendarFeed", feedId, `${user.name} issued a new StaySutra link for ${feed.label}`);
    return feed.exportToken;
  });
}

const blockSchema = z.object({
  propertyId: z.string().min(1),
  start: z.string().refine(isIsoDate, "Pick a start date"),
  end: z.string().refine(isIsoDate, "Pick an end date"),
  note: z.string().trim().max(200).optional(),
});

export async function addBlock(input: z.input<typeof blockSchema>) {
  return run(async () => {
    const user = await authorize("calendar.edit");
    const b = blockSchema.parse(input);
    if (b.end <= b.start) throw new UserError("The end has to be after the start.");
    const existing = await db.calendarBlock.findMany({
      where: { propertyId: b.propertyId, startDate: { lt: new Date(`${b.end}T00:00:00Z`) }, endDate: { gt: new Date(`${b.start}T00:00:00Z`) } },
      select: { startDate: true, endDate: true },
    });
    const overlaps = !isRangeFree(
      b.start,
      b.end,
      existing.map((e) => ({ start: e.startDate.toISOString().slice(0, 10), end: e.endDate.toISOString().slice(0, 10) })),
    );
    const block = await db.calendarBlock.create({
      data: {
        propertyId: b.propertyId,
        source: "MANUAL",
        startDate: new Date(`${b.start}T00:00:00Z`),
        endDate: new Date(`${b.end}T00:00:00Z`),
        note: b.note || null,
        createdById: user.id,
      },
    });
    const n = nightsBetween(b.start, b.end);
    await logActivity(user, "calendar.block", "CalendarBlock", block.id, `${user.name} blocked ${n} ${n === 1 ? "night" : "nights"} from ${b.start}`);
    publishCalendar();
    return { id: block.id, overlaps };
  });
}

export async function removeBlock(id: string) {
  return run(async () => {
    const user = await authorize("calendar.edit");
    const block = await db.calendarBlock.findUniqueOrThrow({ where: { id } });
    if (block.source === "FEED") throw new UserError("This booking comes from another platform. Change it there and it will update here.");
    await db.calendarBlock.delete({ where: { id } });
    await logActivity(user, "calendar.unblock", "CalendarBlock", id, `${user.name} reopened ${block.startDate.toISOString().slice(0, 10)}`);
    publishCalendar();
    return {
      propertyId: block.propertyId,
      start: block.startDate.toISOString().slice(0, 10),
      end: block.endDate.toISOString().slice(0, 10),
      note: block.note ?? undefined,
    };
  });
}
