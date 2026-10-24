"use server";

import { z } from "zod";
import type { EnquiryStatus } from "@prisma/client";
import { authorize, logActivity } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { publishCalendar, run, UserError } from "@/lib/server/action";
import { getBlockedRangesFresh } from "@/lib/server/calendar";
import { isRangeFree } from "@/lib/calendar/dates";

/**
 * The enquiry state machine: NEW → CONTACTED → CONVERTED | CLOSED_LOST, and
 * either end can be reopened to CONTACTED. Nothing else is allowed. DPR §5.3
 */
const NEXT: Record<EnquiryStatus, EnquiryStatus[]> = {
  NEW: ["CONTACTED", "CONVERTED", "CLOSED_LOST"],
  CONTACTED: ["CONVERTED", "CLOSED_LOST"],
  CONVERTED: ["CONTACTED"],
  CLOSED_LOST: ["CONTACTED"],
};

const LABEL: Record<EnquiryStatus, string> = {
  NEW: "new",
  CONTACTED: "contacted",
  CONVERTED: "confirmed",
  CLOSED_LOST: "closed",
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function setEnquiryStatus(id: string, status: EnquiryStatus) {
  return run(async () => {
    const user = await authorize("enquiry.manage");
    const e = await db.enquiry.findUniqueOrThrow({ where: { id }, include: { calendarBlock: true } });
    if (!NEXT[e.status].includes(status)) throw new UserError(`An enquiry that is ${LABEL[e.status]} cannot go straight to ${LABEL[status]}.`);

    let held: "held" | "clash" | "none" = "none";
    await db.enquiry.update({ where: { id }, data: { status } });

    // Confirming a stay holds its nights, and the hold goes out to every
    // connected platform on their next check. Reopening releases them.
    if (status === "CONVERTED" && e.propertyId && e.checkIn && e.checkOut && !e.calendarBlock) {
      const blocked = await getBlockedRangesFresh(e.propertyId);
      if (isRangeFree(iso(e.checkIn), iso(e.checkOut), blocked)) {
        await db.calendarBlock.create({
          data: {
            propertyId: e.propertyId,
            source: "ENQUIRY",
            enquiryId: e.id,
            startDate: e.checkIn,
            endDate: e.checkOut,
            note: `${e.name} · ${e.refCode}`,
            createdById: user.id,
          },
        });
        held = "held";
      } else held = "clash";
    }
    if (status !== "CONVERTED" && e.calendarBlock) {
      await db.calendarBlock.delete({ where: { id: e.calendarBlock.id } });
    }
    if (held !== "none" || e.calendarBlock) publishCalendar();

    await logActivity(user, "enquiry.status", "Enquiry", id, `${user.name} marked ${e.name}’s enquiry ${LABEL[status]}`, { from: e.status, to: status });
    return { status, held };
  });
}

export async function addNote(id: string, body: string) {
  return run(async () => {
    const user = await authorize("enquiry.manage");
    const text = z.string().trim().min(1, "Write something first").max(2000).parse(body);
    const note = await db.enquiryNote.create({ data: { enquiryId: id, authorId: user.id, body: text } });
    // A note means someone is on it.
    await db.enquiry.updateMany({ where: { id, status: "NEW" }, data: { status: "CONTACTED" } });
    return { id: note.id, body: note.body, author: user.name, createdAt: note.createdAt.toISOString() };
  });
}

export async function archiveEnquiry(id: string, restore = false) {
  return run(async () => {
    const user = await authorize("enquiry.manage");
    const e = await db.enquiry.update({ where: { id }, data: { deletedAt: restore ? null : new Date() } });
    await logActivity(user, restore ? "enquiry.restore" : "enquiry.archive", "Enquiry", id, `${user.name} ${restore ? "restored" : "archived"} ${e.name}’s enquiry`);
  });
}
