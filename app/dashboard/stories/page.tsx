import Link from "next/link";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { mediaUrl } from "@/lib/media";
import { Badge, Card, EmptyState, FadeImage, PageHeader } from "@/components/admin/ui";
import { AdminIcon } from "@/components/admin/icons";
import { NewStoryButton } from "./NewStoryButton";

export const metadata = { title: "Stories" };

export default async function StoriesPage() {
  await requireUser("story.edit");
  const stories = await db.story.findMany({
    where: { deletedAt: null },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: { coverMedia: true, category: true },
  });
  const drafts = stories.filter((s) => s.status === "DRAFT").length;
  const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

  return (
    <>
      <PageHeader
        title="Stories"
        description={drafts ? `${drafts} ${drafts === 1 ? "draft is" : "drafts are"} waiting — read, edit in your own voice, then publish.` : "The journal on the website. Stories bring people in from Google."}
        actions={<NewStoryButton />}
      />
      {stories.length ? (
        <Card padded={false} className="overflow-hidden">
          <ul className="p-1.5">
            {stories.map((s) => (
              <li key={s.id}>
                <Link href={`/dashboard/stories/${s.id}`} className="group flex items-center gap-4 rounded-[16px] p-2.5 transition-colors hover:bg-fill sm:p-3">
                  <div className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-[12px] bg-fill-2 sm:w-28">
                    {s.coverMedia ? (
                      <FadeImage src={mediaUrl(s.coverMedia.storageKey)} alt="" fill sizes="112px" className="object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                    ) : (
                      <span className="grid size-full place-items-center text-fg-4">
                        <AdminIcon name="stories" size={22} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-callout font-semibold text-fg">{s.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-subhead text-fg-3">{s.excerpt || "No excerpt yet"}</p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-footnote text-fg-3">
                      <span>{s.category?.name ?? "No category"}</span>
                      <span className="text-fg-4">—</span>
                      <span>{s.readMinutes} min read</span>
                      <span className="text-fg-4">—</span>
                      <span>Edited {fmt.format(s.updatedAt)}</span>
                    </p>
                  </div>
                  <Badge tone={s.status === "PUBLISHED" ? "ok" : "neutral"} dot>
                    {s.status === "PUBLISHED" ? "Live" : "Draft"}
                  </Badge>
                  <AdminIcon name="chevronRight" size={16} className="hidden shrink-0 text-fg-4 sm:block" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card>
          <EmptyState icon="stories" title="No stories yet" body="Write about a ride, a road or a place. Stories bring people to the website from Google." action={<NewStoryButton />} />
        </Card>
      )}
    </>
  );
}
