import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { mediaUrl } from "@/lib/media";
import { StoryEditor } from "./StoryEditor";

export const metadata = { title: "Edit story" };

export default async function EditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("story.edit");
  const { id } = await params;
  const [s, categories, destinations] = await Promise.all([
    db.story.findUnique({ where: { id }, include: { coverMedia: true } }),
    db.storyCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    db.destination.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
  ]);
  if (!s || s.deletedAt) notFound();
  return (
    <StoryEditor
      status={s.status}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      destinations={destinations}
      initial={{
        id: s.id,
        title: s.title,
        slug: s.slug,
        excerpt: s.excerpt,
        body: s.bodyText,
        categoryId: s.categoryId,
        destinationSlugs: s.destinationIds,
        authorName: s.authorName,
        cover: s.coverMedia ? { id: s.coverMedia.id, src: mediaUrl(s.coverMedia.storageKey), alt: s.coverMedia.alt } : null,
        metaTitle: s.metaTitle ?? "",
        metaDescription: s.metaDescription ?? "",
      }}
    />
  );
}
