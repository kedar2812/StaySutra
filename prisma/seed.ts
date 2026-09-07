/**
 * Seed script.
 *
 * Loads exactly the files in /content into the database, so the site reads the
 * same records whether it is served from the JSON (Phase 1, before the VPS
 * exists) or from Postgres. Phase 2's dashboard writes back to these same
 * tables, and the seed becomes a one-time bootstrap.
 *
 * Idempotent: every write is an upsert keyed on the natural slug, so it is safe
 * to re-run after editing content.
 *
 * Run with: npm run db:seed
 *
 * DPR §2 (Phase 1 content), §5, §12 (awkward content for staging).
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import type { Category, Destination, ManagedItem, PropertySeed, Story } from "../lib/types";

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
  }>("taxonomy.json");
  const destinations = await json<Destination[]>("destinations.json");
  const properties = await json<PropertySeed[]>("properties.json");
  const stories = await json<Story[]>("stories.json");
  const site = await json<Record<string, unknown>>("site.json");

  console.log("→ taxonomies");

  for (const c of taxonomy.categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        name: c.name,
        plural: c.plural,
        description: c.description,
        iconKey: c.iconKey,
        sortOrder: c.sortOrder,
      },
      update: {
        name: c.name,
        plural: c.plural,
        description: c.description,
        iconKey: c.iconKey,
        sortOrder: c.sortOrder,
      },
    });
  }

  for (const a of taxonomy.amenities) {
    await prisma.amenity.upsert({
      where: { slug: a.slug },
      create: {
        slug: a.slug,
        name: a.name,
        iconKey: a.iconKey,
        group: a.group ?? "More",
        sortOrder: a.sortOrder,
      },
      update: {
        name: a.name,
        iconKey: a.iconKey,
        group: a.group ?? "More",
        sortOrder: a.sortOrder,
      },
    });
  }

  for (const f of taxonomy.facilities) {
    await prisma.facility.upsert({
      where: { slug: f.slug },
      create: {
        slug: f.slug,
        name: f.name,
        iconKey: f.iconKey,
        description: f.description,
        sortOrder: f.sortOrder,
      },
      update: {
        name: f.name,
        iconKey: f.iconKey,
        description: f.description,
        sortOrder: f.sortOrder,
      },
    });
  }

  for (const e of taxonomy.experiences) {
    await prisma.experience.upsert({
      where: { slug: e.slug },
      create: {
        slug: e.slug,
        name: e.name,
        iconKey: e.iconKey,
        description: e.description,
        sortOrder: e.sortOrder,
      },
      update: {
        name: e.name,
        iconKey: e.iconKey,
        description: e.description,
        sortOrder: e.sortOrder,
      },
    });
  }

  console.log("→ destinations");

  for (const d of destinations) {
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
      create: { slug: d.slug, ...data },
      update: data,
    });
  }

  console.log("→ properties");

  for (const p of properties) {
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: p.categorySlug },
    });
    const destination = await prisma.destination.findUniqueOrThrow({
      where: { slug: p.destinationSlug },
    });

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
      maxGuests: p.maxGuests,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      beds: p.beds,
      checkInTime: p.checkInTime,
      checkOutTime: p.checkOutTime,
      minNights: p.minNights,
      startingPrice: p.startingPrice,
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

    const property = await prisma.property.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, ...data },
      update: data,
    });

    // Join rows are rebuilt rather than diffed — cheap, and always correct.
    await prisma.propertyAmenity.deleteMany({ where: { propertyId: property.id } });
    await prisma.propertyFacility.deleteMany({ where: { propertyId: property.id } });
    await prisma.propertyExperience.deleteMany({ where: { propertyId: property.id } });
    await prisma.nearbyRoute.deleteMany({ where: { propertyId: property.id } });
    await prisma.nearbyPlace.deleteMany({ where: { propertyId: property.id } });

    for (const [i, slug] of p.amenitySlugs.entries()) {
      const amenity = await prisma.amenity.findUnique({ where: { slug } });
      if (!amenity) {
        console.warn(`  ! unknown amenity "${slug}" on ${p.slug}`);
        continue;
      }
      await prisma.propertyAmenity.create({
        data: { propertyId: property.id, amenityId: amenity.id, sortOrder: i },
      });
    }

    for (const [i, slug] of p.facilitySlugs.entries()) {
      const facility = await prisma.facility.findUnique({ where: { slug } });
      if (!facility) {
        console.warn(`  ! unknown facility "${slug}" on ${p.slug}`);
        continue;
      }
      await prisma.propertyFacility.create({
        data: { propertyId: property.id, facilityId: facility.id, sortOrder: i },
      });
    }

    for (const [i, slug] of p.experienceSlugs.entries()) {
      const experience = await prisma.experience.findUnique({ where: { slug } });
      if (!experience) {
        console.warn(`  ! unknown experience "${slug}" on ${p.slug}`);
        continue;
      }
      await prisma.propertyExperience.create({
        data: { propertyId: property.id, experienceId: experience.id, sortOrder: i },
      });
    }

    for (const [i, route] of p.nearbyRoutes.entries()) {
      await prisma.nearbyRoute.create({
        data: {
          propertyId: property.id,
          title: route.title,
          distanceKm: route.distanceKm,
          note: route.note,
          sortOrder: i,
        },
      });
    }

    for (const [i, place] of p.nearbyPlaces.entries()) {
      await prisma.nearbyPlace.create({
        data: {
          propertyId: property.id,
          title: place.title,
          distanceKm: place.distanceKm,
          type: place.type,
          sortOrder: i,
        },
      });
    }
  }

  console.log("→ stories");

  const storyCategories = [
    { slug: "routes", name: "Routes", sortOrder: 1 },
    { slug: "stays", name: "Stays", sortOrder: 2 },
    { slug: "riding", name: "Riding", sortOrder: 3 },
  ];

  for (const c of storyCategories) {
    await prisma.storyCategory.upsert({
      where: { slug: c.slug },
      create: c,
      update: { name: c.name, sortOrder: c.sortOrder },
    });
  }

  for (const s of stories) {
    const category = await prisma.storyCategory.findUnique({
      where: { slug: s.categorySlug },
    });

    let bodyText = "";
    try {
      bodyText = await readFile(join(CONTENT, "stories", `${s.slug}.md`), "utf8");
    } catch {
      console.warn(`  ! no body markdown for story "${s.slug}"`);
    }

    const data = {
      title: s.title,
      excerpt: s.excerpt,
      // Phase 2's Tiptap editor replaces this with sanitised HTML. Until then
      // the markdown source is the record of truth and bodyHtml stays empty.
      bodyHtml: "",
      bodyText,
      categoryId: category?.id ?? null,
      destinationIds: s.destinationSlugs,
      authorName: s.authorName,
      readMinutes: s.readMinutes,
      status: "PUBLISHED" as const,
      publishedAt: new Date(s.publishedAt),
    };

    await prisma.story.upsert({
      where: { slug: s.slug },
      create: { slug: s.slug, ...data },
      update: data,
    });
  }

  console.log("→ site settings");

  const settings = (site.settings ?? {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(settings)) {
    if (key.startsWith("_")) continue;
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: value as never },
      update: { value: value as never },
    });
  }

  // Homepage sections, so Phase 2's content editor has something to edit on
  // day one rather than an empty screen.
  const home = (site.home ?? {}) as Record<string, unknown>;
  for (const [key, fields] of Object.entries(home)) {
    await prisma.siteSection.upsert({
      where: { key: `home.${key}` },
      create: { key: `home.${key}`, label: `Homepage — ${key}`, fields: fields as never },
      update: { fields: fields as never },
    });
  }

  const counts = {
    categories: await prisma.category.count(),
    destinations: await prisma.destination.count(),
    properties: await prisma.property.count(),
    stories: await prisma.story.count(),
    settings: await prisma.siteSetting.count(),
    sections: await prisma.siteSection.count(),
  };

  console.log("\nSeeded:", counts);
  console.log(
    "\nNo ratings, reviews or statistics were written — those only ever come " +
      "from real data. See docs/CONTENT-GAPS.md.",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
