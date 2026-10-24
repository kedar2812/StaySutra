/**
 * Seed script — a one-time bootstrap for a new database.
 *
 * Loads /content into Postgres: the taxonomies, destinations, the media
 * library (the client's photography, already in /public/media), properties
 * with their galleries, the image slots, and the developer-drafted stories as
 * DRAFTS for the client to read and publish. After this the dashboard is the
 * source of truth; nothing here runs again on its own.
 *
 * Idempotent — every write is an upsert on a natural key — so re-running it
 * after editing /content is safe. It never deletes anything the dashboard made.
 *
 * Copy (site.json) and settings are deliberately NOT written: the JSON is the
 * default, and only what the client edits is stored. That way a copy fix in
 * site.json still reaches every section nobody has touched.
 *
 * Optional: SEED_OWNER_EMAIL, SEED_OWNER_NAME and SEED_OWNER_PASSWORD create
 * the first OWNER account. Otherwise use `npm run user:create`.
 *
 * Run with: npm run db:seed
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import type {
  Category,
  Destination,
  ManagedItem,
  MediaSeed,
  PropertySeed,
  Story,
  StoryCategory,
} from "../lib/types";

const prisma = new PrismaClient();
const CONTENT = join(process.cwd(), "content");

async function json<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(join(CONTENT, file), "utf8")) as T;
}

async function main() {
  const taxonomy = await json<{
    categories: Category[];
    amenities: ManagedItem[];
    facilities: ManagedItem[];
    experiences: ManagedItem[];
    storyCategories: StoryCategory[];
  }>("taxonomy.json");
  const destinations = await json<Destination[]>("destinations.json");
  const properties = await json<PropertySeed[]>("properties.json");
  const stories = await json<Story[]>("stories.json");
  const media = await json<MediaSeed[]>("media.json");
  const slots = await json<Record<string, string>>("slots.json");

  console.log("→ media library");
  const mediaId = new Map<string, string>();
  for (const m of media) {
    const row = await prisma.media.upsert({
      where: { storageKey: m.storageKey },
      create: { ...m },
      // Never overwrite alt text the client has since edited.
      update: { width: m.width, height: m.height, sizeBytes: m.sizeBytes },
    });
    mediaId.set(m.storageKey, row.id);
  }

  console.log("→ taxonomies");
  for (const [i, c] of taxonomy.categories.entries()) {
    const data = {
      name: c.name,
      plural: c.plural,
      description: c.description,
      iconKey: c.iconKey,
      sortOrder: c.sortOrder ?? i,
    };
    await prisma.category.upsert({ where: { slug: c.slug }, create: { slug: c.slug, ...data }, update: data });
  }
  for (const [i, a] of taxonomy.amenities.entries()) {
    const data = { name: a.name, iconKey: a.iconKey, group: a.group ?? "More", sortOrder: a.sortOrder ?? i };
    await prisma.amenity.upsert({ where: { slug: a.slug }, create: { slug: a.slug, ...data }, update: data });
  }
  for (const [i, f] of taxonomy.facilities.entries()) {
    const data = { name: f.name, iconKey: f.iconKey, description: f.description, sortOrder: f.sortOrder ?? i };
    await prisma.facility.upsert({ where: { slug: f.slug }, create: { slug: f.slug, ...data }, update: data });
  }
  for (const [i, e] of taxonomy.experiences.entries()) {
    const data = { name: e.name, iconKey: e.iconKey, description: e.description, sortOrder: e.sortOrder ?? i };
    await prisma.experience.upsert({ where: { slug: e.slug }, create: { slug: e.slug, ...data }, update: data });
  }
  for (const [i, c] of taxonomy.storyCategories.entries()) {
    await prisma.storyCategory.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, sortOrder: i },
      update: { name: c.name, sortOrder: i },
    });
  }

  console.log("→ destinations");
  for (const d of destinations) {
    const tile = slots[`destination-${d.slug}`];
    const data = {
      name: d.name,
      state: d.state,
      shortIntro: d.shortIntro,
      description: d.description,
      rideNote: d.rideNote,
      roadNote: d.roadNote,
      bestSeason: d.bestSeason,
      isFeatured: d.isFeatured,
      sortOrder: d.sortOrder,
    };
    await prisma.destination.upsert({
      where: { slug: d.slug },
      create: { slug: d.slug, ...data, tileMediaId: tile ? mediaId.get(tile) : undefined },
      update: data,
    });
  }

  console.log("→ properties");
  for (const p of properties) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: p.categorySlug } });
    const destination = await prisma.destination.findUniqueOrThrow({ where: { slug: p.destinationSlug } });

    const data = {
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      status: p.status,
      featured: p.featured,
      featureOrder: p.featureOrder,
      categoryId: category.id,
      destinationId: destination.id,
      locality: p.locality,
      city: p.city,
      state: p.state,
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
      maxGuests: p.maxGuests,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      beds: p.beds,
      sleeping: p.sleeping ?? [],
      checkInTime: p.checkInTime || null,
      checkOutTime: p.checkOutTime || null,
      minNights: p.minNights,
      startingPrice: p.startingPrice,
      priceLabel: p.priceLabel ?? null,
      priceGroupSize: p.priceGroupSize ?? null,
      priceNote: p.priceNote,
      availability: p.availability,
      isRiderFriendly: p.isRiderFriendly,
      riderNote: p.riderNote,
      curatorNote: p.curatorNote,
      houseRules: p.houseRules,
      cancellationPolicy: p.cancellationPolicy,
      // Ratings are deliberately left null. Never seed a fake value. DPR §4.6
      ratingValue: null,
      ratingCount: null,
    };

    const existing = await prisma.property.findUnique({ where: { slug: p.slug } });
    if (existing) {
      console.log(`  · ${p.slug} exists — left as the dashboard has it`);
      continue;
    }
    const property = await prisma.property.create({ data: { slug: p.slug, ...data } });

    const link = async <T>(
      slugs: string[],
      find: (slug: string) => Promise<{ id: string } | null>,
      create: (id: string, i: number) => Promise<T>,
      kind: string,
    ) => {
      for (const [i, slug] of slugs.entries()) {
        const row = await find(slug);
        if (!row) console.warn(`  ! unknown ${kind} "${slug}" on ${p.slug}`);
        else await create(row.id, i);
      }
    };
    await link(p.amenitySlugs, (slug) => prisma.amenity.findUnique({ where: { slug } }),
      (amenityId, sortOrder) => prisma.propertyAmenity.create({ data: { propertyId: property.id, amenityId, sortOrder } }), "amenity");
    await link(p.facilitySlugs, (slug) => prisma.facility.findUnique({ where: { slug } }),
      (facilityId, sortOrder) => prisma.propertyFacility.create({ data: { propertyId: property.id, facilityId, sortOrder } }), "facility");
    await link(p.experienceSlugs, (slug) => prisma.experience.findUnique({ where: { slug } }),
      (experienceId, sortOrder) => prisma.propertyExperience.create({ data: { propertyId: property.id, experienceId, sortOrder } }), "experience");

    for (const [i, r] of p.nearbyRoutes.entries()) {
      await prisma.nearbyRoute.create({ data: { propertyId: property.id, title: r.title, distanceKm: r.distanceKm, note: r.note, sortOrder: i } });
    }
    for (const [i, r] of p.nearbyPlaces.entries()) {
      await prisma.nearbyPlace.create({ data: { propertyId: property.id, title: r.title, distanceKm: r.distanceKm, type: r.type, sortOrder: i } });
    }

    for (const [i, key] of (p.gallery ?? []).entries()) {
      const id = mediaId.get(key);
      const m = media.find((x) => x.storageKey === key);
      if (!id || !m) {
        console.warn(`  ! gallery image "${key}" is not in content/media.json`);
        continue;
      }
      await prisma.propertyImage.create({
        data: { propertyId: property.id, mediaId: id, alt: m.alt, sortOrder: i, isCover: i === 0 },
      });
    }

    // The Airbnb channel exists from day one so the dashboard asks for its
    // iCal link rather than leaving the client to discover the feature.
    if (p.slug === "kashele-farmhouse-karjat") {
      await prisma.calendarFeed.create({
        data: {
          propertyId: property.id,
          channel: "AIRBNB",
          label: "Airbnb",
          listingUrl: "https://www.airbnb.co.uk/rooms/1755648454354415608",
        },
      });
    }
  }

  console.log("→ stories (as drafts)");
  const categoryBySlug = new Map(
    (await prisma.storyCategory.findMany()).map((c) => [c.slug, c.id]),
  );
  for (const s of stories) {
    if (await prisma.story.findUnique({ where: { slug: s.slug } })) continue;
    let body = "";
    try {
      body = await readFile(join(CONTENT, "stories", `${s.slug}.md`), "utf8");
    } catch {
      console.warn(`  ! no body markdown for story "${s.slug}"`);
    }
    const cover = slots[`story-${s.slug}`];
    await prisma.story.create({
      data: {
        slug: s.slug,
        title: s.title,
        excerpt: s.excerpt,
        bodyHtml: "",
        bodyText: body,
        categoryId: categoryBySlug.get(s.categorySlug) ?? null,
        destinationIds: s.destinationSlugs,
        authorName: s.authorName,
        readMinutes: s.readMinutes,
        status: s.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
        publishedAt: s.status === "PUBLISHED" ? new Date(s.publishedAt) : null,
        coverMediaId: cover ? mediaId.get(cover) : undefined,
      },
    });
  }

  console.log("→ image slots");
  const existingSlots = await prisma.siteSetting.findUnique({ where: { key: "imageSlots" } });
  const merged = {
    ...Object.fromEntries(
      Object.entries(slots).flatMap(([k, v]) => (mediaId.get(v) ? [[k, mediaId.get(v)!]] : [])),
    ),
    ...((existingSlots?.value as Record<string, string> | undefined) ?? {}),
  };
  await prisma.siteSetting.upsert({
    where: { key: "imageSlots" },
    create: { key: "imageSlots", value: merged },
    update: { value: merged },
  });

  const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD;
  if (email && password && !(await prisma.user.findUnique({ where: { email } }))) {
    await prisma.user.create({
      data: {
        email,
        name: process.env.SEED_OWNER_NAME?.trim() || "Owner",
        role: "OWNER",
        passwordHash: await hash(password),
      },
    });
    console.log(`→ owner account ${email}`);
  }

  console.log("\nSeeded:", {
    media: await prisma.media.count(),
    destinations: await prisma.destination.count(),
    properties: await prisma.property.count(),
    stories: await prisma.story.count(),
    users: await prisma.user.count(),
  });
  console.log("No ratings, reviews or statistics were written — those only ever come from real data.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
