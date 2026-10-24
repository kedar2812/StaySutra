import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { mediaUrl } from "@/lib/media";
import { priceLine } from "@/lib/pricing";
import { Badge, Button, Card, EmptyState, Input, PageHeader } from "@/components/admin/ui";
import { AdminIcon } from "@/components/admin/icons";
import { createProperty } from "./actions";

export const metadata = { title: "Properties" };

const STATUS = {
  PUBLISHED: { tone: "ok", label: "Live" },
  DRAFT: { tone: "neutral", label: "Draft" },
  UNPUBLISHED: { tone: "warn", label: "Offline" },
  ARCHIVED: { tone: "neutral", label: "Archived" },
} as const;

export default async function PropertiesPage() {
  await requireUser();
  const properties = await db.property.findMany({
    where: { deletedAt: null },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      destination: { select: { name: true } },
      category: { select: { name: true } },
      images: { take: 1, orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }], include: { media: true } },
      _count: { select: { images: true, enquiries: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Properties"
        description="Everything a guest sees on a stay’s page is edited here."
        actions={
          <form action={createProperty} className="flex gap-2">
            <Input name="name" placeholder="New property name" className="w-56" aria-label="New property name" />
            <Button type="submit" variant="primary" icon="plus">Create</Button>
          </form>
        }
      />

      {properties.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((p) => {
            const cover = p.images[0];
            const price = priceLine(p);
            const s = STATUS[p.status];
            return (
              <Link key={p.id} href={`/dashboard/properties/${p.id}`} className="group block transition-transform duration-200 active:scale-[0.985]">
                <Card padded={false} className="overflow-hidden transition-[box-shadow] group-hover:ring-white/[0.12]">
                  <div className="relative aspect-[16/10] bg-ink-700">
                    {cover ? (
                      <Image src={mediaUrl(cover.media.storageKey)} alt="" fill sizes="(min-width:1280px) 30vw, (min-width:640px) 45vw, 100vw" className="object-cover transition-transform duration-700 ease-out-quint group-hover:scale-[1.03]" />
                    ) : (
                      <div className="grid size-full place-items-center text-text-dim"><AdminIcon name="media" size={28} /></div>
                    )}
                    <div className="absolute left-3 top-3 flex gap-1.5">
                      <Badge tone={s.tone} dot className="bg-ink-900/70 backdrop-blur">{s.label}</Badge>
                      {p.featured && <Badge tone="gold" className="bg-ink-900/70 backdrop-blur">Featured</Badge>}
                    </div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <p className="text-[0.75rem] font-medium uppercase tracking-[0.12em] text-text-dim">{p.category.name} · {p.destination.name}</p>
                    <h2 className="mt-1.5 truncate text-[1.0625rem] font-semibold tracking-[-0.01em] text-text-hi">{p.name}</h2>
                    <div className="mt-3 flex items-center justify-between text-[0.8125rem] text-text-low">
                      <span className="flex items-center gap-3 tabular-nums">
                        <span className="flex items-center gap-1"><AdminIcon name="users" size={14} />{p.maxGuests}</span>
                        <span className="flex items-center gap-1"><AdminIcon name="media" size={14} />{p._count.images}</span>
                        <span className="flex items-center gap-1"><AdminIcon name="inbox" size={14} />{p._count.enquiries}</span>
                      </span>
                      <span className="tabular-nums text-text-mid">{price ? `${price.amount}` : "No price"}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState icon="properties" title="No properties yet" body="Type a name above and press Create. You can fill in the rest as you go — nothing goes live until you publish it." />
        </Card>
      )}
    </>
  );
}
