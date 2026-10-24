import { notFound } from "next/navigation";
import { can, requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { mediaUrl } from "@/lib/media";
import { PropertyEditor } from "./PropertyEditor";

export const metadata = { title: "Edit property" };

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("property.edit");
  const { id } = await params;
  const [p, categories, destinations, amenities, facilities, experiences] = await Promise.all([
    db.property.findUnique({
      where: { id },
      include: {
        amenities: { orderBy: { sortOrder: "asc" } },
        facilities: { orderBy: { sortOrder: "asc" } },
        experiences: { orderBy: { sortOrder: "asc" } },
        images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }], include: { media: true } },
        _count: { select: { enquiries: true } },
      },
    }),
    db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.destination.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }),
    db.amenity.findMany({ where: { isActive: true }, orderBy: [{ group: "asc" }, { sortOrder: "asc" }] }),
    db.facility.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.experience.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!p || p.deletedAt) notFound();

  return (
    <PropertyEditor
      canPublish={can(user.role, "property.publish")}
      canDelete={can(user.role, "property.delete")}
      status={p.status}
      updatedAt={p.updatedAt.toISOString()}
      options={{
        categories: categories.map((c) => ({ id: c.id, name: c.name })),
        destinations: destinations.map((d) => ({ id: d.id, name: d.name, state: d.state })),
        amenities: amenities.map((a) => ({ id: a.id, name: a.name, group: a.group })),
        facilities: facilities.map((a) => ({ id: a.id, name: a.name })),
        experiences: experiences.map((a) => ({ id: a.id, name: a.name })),
      }}
      initial={{
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline ?? "",
        description: p.description,
        categoryId: p.categoryId,
        destinationId: p.destinationId,
        featured: p.featured,
        featureOrder: p.featureOrder,
        addressLine: p.addressLine ?? "",
        locality: p.locality ?? "",
        city: p.city,
        state: p.state,
        latitude: p.latitude,
        longitude: p.longitude,
        maxGuests: p.maxGuests,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        beds: p.beds,
        sleeping: Array.isArray(p.sleeping) ? (p.sleeping as { room: string; beds: string }[]) : [],
        checkInTime: p.checkInTime ?? "",
        checkOutTime: p.checkOutTime ?? "",
        minNights: p.minNights ?? 1,
        startingPrice: p.startingPrice,
        priceLabel: p.priceLabel ?? "",
        priceGroupSize: p.priceGroupSize,
        priceNote: p.priceNote ?? "",
        isRiderFriendly: p.isRiderFriendly,
        riderNote: p.riderNote ?? "",
        curatorNote: p.curatorNote ?? "",
        houseRules: p.houseRules,
        cancellationPolicy: p.cancellationPolicy ?? "",
        amenityIds: p.amenities.map((a) => a.amenityId),
        facilityIds: p.facilities.map((a) => a.facilityId),
        experienceIds: p.experiences.map((a) => a.experienceId),
        images: p.images.map((i) => ({ mediaId: i.mediaId, alt: i.alt, src: mediaUrl(i.media.storageKey) })),
        metaTitle: p.metaTitle ?? "",
        metaDescription: p.metaDescription ?? "",
      }}
    />
  );
}
