import { requireUser, can } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { mediaUrl } from "@/lib/media";
import { priceLine } from "@/lib/pricing";
import { PropertyBoard, type BoardProperty } from "./PropertyBoard";

export const metadata = { title: "Properties" };

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const user = await requireUser();
  const { new: openNew } = await searchParams;
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

  const rows: BoardProperty[] = properties.map((p) => {
    const price = priceLine(p);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      featured: p.featured,
      riderFriendly: p.isRiderFriendly,
      category: p.category.name,
      destination: p.destination.name,
      city: p.city,
      maxGuests: p.maxGuests,
      bedrooms: p.bedrooms,
      photos: p._count.images,
      enquiries: p._count.enquiries,
      price: price ? price.amount : null,
      cover: p.images[0] ? mediaUrl(p.images[0].media.storageKey) : null,
      updatedAt: p.updatedAt.toISOString(),
    };
  });

  return <PropertyBoard properties={rows} canCreate={can(user.role, "property.edit")} openNew={openNew === "1"} />;
}
