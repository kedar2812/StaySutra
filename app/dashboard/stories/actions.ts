"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authorize, logActivity } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { publishSite, run } from "@/lib/server/action";
import { parseProse, toPlainText } from "@/lib/prose";

const schema = z.object({
  id: z.string(),
  title: z.string().trim().min(4, "Give it a title").max(110),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens").max(90),
  excerpt: z.string().trim().min(20, "A sentence or two for the card").max(240),
  body: z.string().max(40_000),
  categoryId: z.string().nullable(),
  destinationSlugs: z.array(z.string()),
  authorName: z.string().trim().min(2).max(60),
  coverMediaId: z.string().nullable(),
  metaTitle: z.string().trim().max(70),
  metaDescription: z.string().trim().max(170),
});

export async function saveStory(input: z.input<typeof schema>) {
  return run(async () => {
    const user = await authorize("story.edit");
    const s = schema.parse(input);
    const words = toPlainText(parseProse(s.body)).split(/\s+/).filter(Boolean).length;
    await db.story.update({
      where: { id: s.id },
      data: {
        title: s.title,
        slug: s.slug,
        excerpt: s.excerpt,
        bodyText: s.body,
        bodyHtml: "",
        categoryId: s.categoryId,
        destinationIds: s.destinationSlugs,
        authorName: s.authorName,
        coverMediaId: s.coverMediaId,
        readMinutes: Math.max(1, Math.round(words / 220)),
        metaTitle: s.metaTitle || null,
        metaDescription: s.metaDescription || null,
      },
    });
    await logActivity(user, "story.update", "Story", s.id, `${user.name} edited “${s.title}”`);
    publishSite();
    return { savedAt: new Date().toISOString(), readMinutes: Math.max(1, Math.round(words / 220)) };
  });
}

export async function setStoryStatus(id: string, publish: boolean) {
  return run(async () => {
    const user = await authorize("story.edit");
    const s = await db.story.findUniqueOrThrow({ where: { id } });
    await db.story.update({ where: { id }, data: { status: publish ? "PUBLISHED" : "DRAFT", publishedAt: publish ? (s.publishedAt ?? new Date()) : s.publishedAt } });
    await logActivity(user, publish ? "story.publish" : "story.unpublish", "Story", id, `${user.name} ${publish ? "published" : "unpublished"} “${s.title}”`);
    publishSite();
  });
}

export async function createStory() {
  const user = await authorize("story.edit");
  const s = await db.story.create({
    data: { title: "Untitled story", slug: `story-${Date.now().toString(36)}`, excerpt: "", bodyHtml: "", bodyText: "", authorName: user.name },
  });
  redirect(`/dashboard/stories/${s.id}`);
}

export async function deleteStory(id: string, restore = false) {
  return run(async () => {
    const user = await authorize("story.edit");
    const s = await db.story.update({ where: { id }, data: { deletedAt: restore ? null : new Date(), ...(restore ? {} : { status: "DRAFT" as const }) } });
    await logActivity(user, "story.delete", "Story", id, `${user.name} ${restore ? "restored" : "deleted"} “${s.title}”`);
    publishSite();
  });
}
