"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authorize, can, logActivity } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { publishSite, run, UserError } from "@/lib/server/action";

const text = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters`);
const optText = (max: number) => text(max).transform((v) => v || null);
const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const propertySchema = z.object({
  id: z.string(),
  slug: z.string().trim().regex(slugRe, "Lowercase letters, numbers and hyphens only").max(80),
  name: text(80).min(2, "Give it a name"),
  tagline: text(140),
  description: text(4000).min(40, "Write at least a couple of sentences"),
  categoryId: z.string().min(1, "Pick a type"),
  destinationId: z.string().min(1, "Pick a destination"),
  featured: z.boolean(),
  featureOrder: z.number().int().min(1).max(99).nullable(),
  addressLine: optText(200),
  locality: optText(80),
  city: text(80).min(2, "Which town or city?"),
  state: text(80).min(2),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  maxGuests: z.number().int().min(1).max(500),
  bedrooms: z.number().int().min(0).max(100),
  bathrooms: z.number().int().min(0).max(100),
  beds: z.number().int().min(0).max(200).nullable(),
  sleeping: z.array(z.object({ room: text(40).min(1), beds: text(60).min(1) })).max(20),
  checkInTime: z.string().regex(/^$|^\d{2}:\d{2}$/).transform((v) => v || null),
  checkOutTime: z.string().regex(/^$|^\d{2}:\d{2}$/).transform((v) => v || null),
  minNights: z.number().int().min(1).max(60),
  startingPrice: z.number().int().min(0).max(10_000_000).nullable(),
  priceLabel: optText(24),
  priceGroupSize: z.number().int().min(1).max(500).nullable(),
  priceNote: optText(240),
  isRiderFriendly: z.boolean(),
  riderNote: optText(400),
  curatorNote: optText(600),
  houseRules: z.array(text(160).min(1)).max(30),
  cancellationPolicy: optText(1200),
  amenityIds: z.array(z.string()),
  facilityIds: z.array(z.string()),
  experienceIds: z.array(z.string()),
  images: z.array(z.object({ mediaId: z.string(), alt: text(200) })).max(60),
  metaTitle: optText(70),
  metaDescription: optText(170),
});

export type PropertyInput = z.input<typeof propertySchema>;

export async function saveProperty(input: PropertyInput) {
  return run(async () => {
    const user = await authorize("property.edit");
    const p = propertySchema.parse(input);
    const before = await db.property.findUniqueOrThrow({ where: { id: p.id }, select: { slug: true, status: true, name: true } });

    await db.$transaction(async (tx) => {
      // A live URL must never silently break: a slug change leaves a 301 behind.
      if (before.slug !== p.slug && before.status === "PUBLISHED") {
        await tx.slugRedirect.upsert({
          where: { entity_fromSlug: { entity: "property", fromSlug: before.slug } },
          create: { entity: "property", fromSlug: before.slug, toSlug: p.slug },
          update: { toSlug: p.slug },
        });
        await tx.slugRedirect.updateMany({ where: { entity: "property", toSlug: before.slug }, data: { toSlug: p.slug } });
      }

      await tx.property.update({
        where: { id: p.id },
        data: {
          slug: p.slug,
          name: p.name,
          tagline: p.tagline || null,
          description: p.description,
          categoryId: p.categoryId,
          destinationId: p.destinationId,
          featured: p.featured,
          featureOrder: p.featured ? (p.featureOrder ?? 1) : null,
          addressLine: p.addressLine,
          locality: p.locality,
          city: p.city,
          state: p.state,
          latitude: p.latitude,
          longitude: p.longitude,
          maxGuests: p.maxGuests,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          beds: p.beds,
          sleeping: p.sleeping,
          checkInTime: p.checkInTime,
          checkOutTime: p.checkOutTime,
          minNights: p.minNights,
          startingPrice: p.startingPrice,
          priceLabel: p.priceLabel,
          priceGroupSize: p.priceGroupSize,
          priceNote: p.priceNote,
          isRiderFriendly: p.isRiderFriendly,
          riderNote: p.riderNote,
          curatorNote: p.curatorNote,
          houseRules: p.houseRules,
          cancellationPolicy: p.cancellationPolicy,
          metaTitle: p.metaTitle,
          metaDescription: p.metaDescription,
        },
      });

      // Join rows are rebuilt, not diffed — cheap at this size and always right.
      await tx.propertyAmenity.deleteMany({ where: { propertyId: p.id } });
      await tx.propertyFacility.deleteMany({ where: { propertyId: p.id } });
      await tx.propertyExperience.deleteMany({ where: { propertyId: p.id } });
      await tx.propertyImage.deleteMany({ where: { propertyId: p.id } });
      if (p.amenityIds.length)
        await tx.propertyAmenity.createMany({ data: p.amenityIds.map((amenityId, sortOrder) => ({ propertyId: p.id, amenityId, sortOrder })) });
      if (p.facilityIds.length)
        await tx.propertyFacility.createMany({ data: p.facilityIds.map((facilityId, sortOrder) => ({ propertyId: p.id, facilityId, sortOrder })) });
      if (p.experienceIds.length)
        await tx.propertyExperience.createMany({ data: p.experienceIds.map((experienceId, sortOrder) => ({ propertyId: p.id, experienceId, sortOrder })) });
      const seen = new Set<string>();
      const images = p.images.filter((i) => !seen.has(i.mediaId) && seen.add(i.mediaId));
      if (images.length)
        await tx.propertyImage.createMany({
          data: images.map((img, sortOrder) => ({ propertyId: p.id, mediaId: img.mediaId, alt: img.alt, sortOrder, isCover: sortOrder === 0 })),
        });
    });

    await logActivity(user, "property.update", "Property", p.id, `${user.name} edited ${p.name}`);
    publishSite();
    return { savedAt: new Date().toISOString(), slug: p.slug };
  });
}

/** What has to be true before a property can go live. Specific, so it can be fixed. */
async function publishProblems(id: string): Promise<string[]> {
  const p = await db.property.findUniqueOrThrow({
    where: { id },
    include: { _count: { select: { images: true } }, images: { select: { alt: true } } },
  });
  const problems: string[] = [];
  if (!p._count.images) problems.push("Add at least one photo");
  if (p.images.some((i) => !i.alt.trim())) problems.push("Describe every photo (alt text)");
  if (p.description.trim().length < 40) problems.push("Write a description");
  if (!p.city) problems.push("Add the town or city");
  if (!p.maxGuests) problems.push("Say how many guests it sleeps");
  return problems;
}

export async function setPropertyStatus(id: string, status: "PUBLISHED" | "UNPUBLISHED" | "DRAFT") {
  return run(async () => {
    const user = await authorize(status === "PUBLISHED" ? "property.publish" : "property.edit");
    if (status === "PUBLISHED") {
      const problems = await publishProblems(id);
      if (problems.length) throw new UserError(`Before it can go live: ${problems.join(" · ")}.`);
    }
    const p = await db.property.update({ where: { id }, data: { status } });
    await logActivity(user, `property.${status.toLowerCase()}`, "Property", id, `${user.name} ${status === "PUBLISHED" ? "published" : "took down"} ${p.name}`);
    publishSite();
    return status;
  });
}

export async function createProperty(form: FormData) {
  const user = await authorize("property.edit");
  const name = String(form.get("name") ?? "").trim().slice(0, 80) || "Untitled property";
  const [category, destination] = await Promise.all([
    db.category.findFirst({ orderBy: { sortOrder: "asc" } }),
    db.destination.findFirst({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!category || !destination) throw new Error("Add a destination and a category first.");
  let slug = slugify(name);
  if (await db.property.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const p = await db.property.create({
    data: {
      name,
      slug,
      description: "",
      categoryId: category.id,
      destinationId: destination.id,
      city: destination.name,
      state: destination.state,
      maxGuests: 2,
      bedrooms: 1,
      bathrooms: 1,
      houseRules: [],
    },
  });
  await logActivity(user, "property.create", "Property", p.id, `${user.name} started ${name}`);
  redirect(`/dashboard/properties/${p.id}`);
}

export async function duplicateProperty(id: string) {
  const user = await authorize("property.edit");
  const src = await db.property.findUniqueOrThrow({
    where: { id },
    include: { amenities: true, facilities: true, experiences: true, images: true },
  });
  const { id: _id, slug, createdAt: _c, updatedAt: _u, icalToken: _t, viewCount: _v, amenities, facilities, experiences, images, ratingValue: _r, ...rest } = src;
  const copy = await db.property.create({
    data: {
      ...rest,
      sleeping: rest.sleeping ?? undefined,
      name: `${src.name} (copy)`,
      slug: `${slug}-copy-${Date.now().toString(36).slice(-4)}`,
      status: "DRAFT",
      featured: false,
      amenities: { create: amenities.map((a) => ({ amenityId: a.amenityId, sortOrder: a.sortOrder })) },
      facilities: { create: facilities.map((a) => ({ facilityId: a.facilityId, sortOrder: a.sortOrder })) },
      experiences: { create: experiences.map((a) => ({ experienceId: a.experienceId, sortOrder: a.sortOrder })) },
      images: { create: images.map((i) => ({ mediaId: i.mediaId, alt: i.alt, sortOrder: i.sortOrder, isCover: i.isCover })) },
    },
  });
  await logActivity(user, "property.duplicate", "Property", copy.id, `${user.name} duplicated ${src.name}`);
  redirect(`/dashboard/properties/${copy.id}`);
}

export async function archiveProperty(id: string, restore = false) {
  return run(async () => {
    const user = await authorize("property.delete");
    const p = await db.property.update({
      where: { id },
      data: restore ? { deletedAt: null, status: "DRAFT" } : { deletedAt: new Date(), status: "ARCHIVED" },
    });
    await logActivity(user, restore ? "property.restore" : "property.archive", "Property", id, `${user.name} ${restore ? "restored" : "archived"} ${p.name}`);
    publishSite();
  });
}

export async function checkSlug(slug: string, id: string) {
  const user = await authorize("property.edit");
  void can(user.role, "property.edit");
  const taken = await db.property.findFirst({ where: { slug, NOT: { id } }, select: { id: true } });
  return !taken;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70) || "property";
}
