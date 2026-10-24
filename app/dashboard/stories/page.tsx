import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { mediaUrl } from "@/lib/media";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { AdminIcon } from "@/components/admin/icons";
import { createStory } from "./actions";

export const metadata = { title: "Stories" };

export default async function StoriesPage() {
  await requireUser("story.edit");
  const stories = await db.story.findMany({
    where: { deletedAt: null },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: { coverMedia: true, category: true },
  });
  const drafts = stories.filter((s) => s.status === "DRAFT").length;

  return (
    <>
      <PageHeader
        title="Stories"
        description={drafts ? `${drafts} ${drafts === 1 ? "draft is" : "drafts are"} waiting — read, edit in your own voice, then publish.` : "The journal on the website."}
        actions={<form action={createStory}><Button type="submit" variant="primary" icon="plus">New story</Button></form>}
      />
      {stories.length ? (
        <Card padded={false} className="overflow-hidden">
          <ul className="divide-y divide-white/[0.05]">
            {stories.map((s) => (
              <li key={s.id}>
                <Link href={`/dashboard/stories/${s.id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-white/[0.03] sm:p-5">
                  <div className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-[10px] bg-ink-700 sm:w-28">
                    {s.coverMedia ? <Image src={mediaUrl(s.coverMedia.storageKey)} alt="" fill sizes="112px" className="object-cover" /> : <span className="grid size-full place-items-center text-text-dim"><AdminIcon name="stories" size={20} /></span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-medium text-text-hi">{s.title}</p>
                    <p className="mt-1 line-clamp-1 text-[0.8125rem] text-text-low">{s.excerpt || "No excerpt yet"}</p>
                    <p className="mt-1.5 text-[0.75rem] text-text-dim">{s.category?.name ?? "No category"} · {s.readMinutes} min read</p>
                  </div>
                  <Badge tone={s.status === "PUBLISHED" ? "ok" : "neutral"} dot>{s.status === "PUBLISHED" ? "Live" : "Draft"}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card><EmptyState icon="stories" title="No stories yet" body="Write about a ride, a road or a place. Stories bring people to the website from Google." /></Card>
      )}
    </>
  );
}
