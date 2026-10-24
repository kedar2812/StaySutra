"use server";

import { z } from "zod";
import { authorize, logActivity } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { publishSite, run, UserError } from "@/lib/server/action";
import { mediaUrl } from "@/lib/media";
import { removeUpload } from "@/lib/server/storage";

export interface MediaItem {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  originalName: string;
  folder: string | null;
  sizeBytes: number;
  isDecorative: boolean;
  createdAt: string;
  uses: number;
}

export async function listMedia(): Promise<MediaItem[]> {
  await authorize();
  const rows = await db.media.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { propertyImages: true, destinationHeroes: true, destinationTiles: true, storyCovers: true, propertyOgImages: true } },
    },
  });
  const slots = (await db.siteSetting.findUnique({ where: { key: "imageSlots" } }))?.value as Record<string, string> | undefined;
  const slotUses = new Map<string, number>();
  for (const id of Object.values(slots ?? {})) slotUses.set(id, (slotUses.get(id) ?? 0) + 1);
  return rows.map((m) => ({
    id: m.id,
    src: mediaUrl(m.storageKey),
    alt: m.alt,
    width: m.width,
    height: m.height,
    originalName: m.originalName,
    folder: m.folder,
    sizeBytes: m.sizeBytes,
    isDecorative: m.isDecorative,
    createdAt: m.createdAt.toISOString(),
    uses: Object.values(m._count).reduce((a, b) => a + b, 0) + (slotUses.get(m.id) ?? 0),
  }));
}

const updateSchema = z.object({
  id: z.string(),
  alt: z.string().trim().max(200),
  isDecorative: z.boolean(),
  folder: z.string().trim().max(60).nullable().optional(),
});

export async function updateMedia(input: z.input<typeof updateSchema>) {
  return run(async () => {
    await authorize("media.edit");
    const m = updateSchema.parse(input);
    if (!m.alt && !m.isDecorative) throw new UserError("Describe the photo, or mark it decorative.");
    await db.media.update({ where: { id: m.id }, data: { alt: m.alt, isDecorative: m.isDecorative, ...(m.folder !== undefined ? { folder: m.folder || null } : {}) } });
    publishSite();
  });
}

/** Where a photo is used — deleting is refused while anything still points at it. */
async function usage(id: string): Promise<string[]> {
  const [props, dests, stories, slots] = await Promise.all([
    db.propertyImage.findMany({ where: { mediaId: id }, select: { property: { select: { name: true } } } }),
    db.destination.findMany({ where: { OR: [{ heroMediaId: id }, { tileMediaId: id }] }, select: { name: true } }),
    db.story.findMany({ where: { coverMediaId: id }, select: { title: true } }),
    db.siteSetting.findUnique({ where: { key: "imageSlots" } }),
  ]);
  const slotKeys = Object.entries((slots?.value as Record<string, string>) ?? {}).filter(([, v]) => v === id).map(([k]) => k);
  return [
    ...props.map((p) => `${p.property.name} gallery`),
    ...dests.map((d) => `${d.name} destination`),
    ...stories.map((s) => `“${s.title}”`),
    ...slotKeys.map((k) => `website image “${k}”`),
  ];
}

export async function deleteMedia(id: string) {
  return run(async () => {
    const user = await authorize("media.edit");
    const uses = await usage(id);
    if (uses.length) throw new UserError(`Still used by ${uses.slice(0, 3).join(", ")}${uses.length > 3 ? ` and ${uses.length - 3} more` : ""}. Replace it there first.`);
    const m = await db.media.delete({ where: { id } });
    // Seed photography is part of the codebase; only uploads are removed from disk.
    if (!m.storageKey.startsWith("/")) await removeUpload(m.storageKey);
    await logActivity(user, "media.delete", "Media", id, `${user.name} deleted ${m.originalName}`);
  });
}
