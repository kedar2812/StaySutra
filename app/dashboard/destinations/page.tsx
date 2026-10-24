import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { mediaUrl } from "@/lib/media";
import { DestinationBoard } from "./DestinationBoard";

export const metadata = { title: "Destinations" };

export default async function DestinationsPage() {
  await requireUser("taxonomy.edit");
  const rows = await db.destination.findMany({
    where: { deletedAt: null },
    orderBy: { sortOrder: "asc" },
    include: { tileMedia: true, heroMedia: true, _count: { select: { properties: { where: { status: "PUBLISHED", deletedAt: null } } } } },
  });
  return (
    <DestinationBoard
      destinations={rows.map((d) => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        state: d.state,
        shortIntro: d.shortIntro,
        description: d.description,
        bestSeason: d.bestSeason ?? "",
        rideNote: d.rideNote ?? "",
        roadNote: d.roadNote ?? "",
        isFeatured: d.isFeatured,
        sortOrder: d.sortOrder,
        tile: d.tileMedia ? { id: d.tileMedia.id, src: mediaUrl(d.tileMedia.storageKey), alt: d.tileMedia.alt } : null,
        hero: d.heroMedia ? { id: d.heroMedia.id, src: mediaUrl(d.heroMedia.storageKey), alt: d.heroMedia.alt } : null,
        stays: d._count.properties,
      }))}
    />
  );
}
