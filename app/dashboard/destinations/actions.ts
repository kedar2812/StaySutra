"use server";

import { z } from "zod";
import { authorize, logActivity } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { publishSite, run, UserError } from "@/lib/server/action";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name it").max(40),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens").max(60),
  state: z.string().trim().min(2).max(40),
  shortIntro: z.string().trim().min(10, "One sentence, at least").max(200),
  description: z.string().trim().max(3000),
  bestSeason: z.string().trim().max(120),
  rideNote: z.string().trim().max(400),
  roadNote: z.string().trim().max(400),
  tileMediaId: z.string().nullable(),
  heroMediaId: z.string().nullable(),
  isFeatured: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

/** Creating a destination builds its page — no code change, no deploy. DPR §10.6 */
export async function saveDestination(input: z.input<typeof schema>) {
  return run(async () => {
    const user = await authorize("taxonomy.edit");
    const { id, ...d } = schema.parse(input);
    const row = id ? await db.destination.update({ where: { id }, data: d }) : await db.destination.create({ data: d });
    await logActivity(user, id ? "destination.update" : "destination.create", "Destination", row.id, `${user.name} ${id ? "edited" : "added"} ${row.name}`);
    publishSite();
    return { id: row.id, slug: row.slug };
  });
}

export async function archiveDestination(id: string, restore = false) {
  return run(async () => {
    const user = await authorize("taxonomy.edit");
    if (!restore) {
      const live = await db.property.count({ where: { destinationId: id, deletedAt: null, status: "PUBLISHED" } });
      if (live) throw new UserError(`${live} live ${live === 1 ? "stay is" : "stays are"} in this destination. Move ${live === 1 ? "it" : "them"} first.`);
    }
    const row = await db.destination.update({ where: { id }, data: { deletedAt: restore ? null : new Date() } });
    await logActivity(user, restore ? "destination.restore" : "destination.archive", "Destination", id, `${user.name} ${restore ? "restored" : "removed"} ${row.name}`);
    publishSite();
  });
}
