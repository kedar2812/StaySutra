import { cache } from "react";
import { unstable_cache } from "next/cache";
import taxonomy from "@/content/taxonomy.json";
import destinationsRaw from "@/content/destinations.json";
import propertiesRaw from "@/content/properties.json";
import storiesRaw from "@/content/stories.json";
import siteJson from "@/content/site.json";
import mediaRaw from "@/content/media.json";
import slotsRaw from "@/content/slots.json";
import { db, hasDatabase } from "./server/db";
import { mediaUrl, toMediaRef } from "./media";
import type {
  Category,
  Destination,
  ManagedItem,
  MediaRef,
  MediaSeed,
  PropertySeed,
  PropertyView,
  Story,
  StoryCategory,
} from "./types";

/**
 * The content source for the public site.
 *
 * With a database, everything is read from Postgres — the dashboard writes
 * there, and every write calls `revalidateTag(CONTENT_TAG)` so the next request
 * sees it. Without one (a fresh checkout, a Docker build, the Vercel demo), the
 * same shape is built from the JSON seed in /content, which is also exactly
 * what `prisma/seed.ts` loads into a new database.
 *
 * One snapshot per request: `getContent()` is wrapped in React's `cache`, so
 * the layout, the page and its metadata share a single read.
 */

export type SiteCopy = typeof siteJson;
export const CONTENT_TAG = "content";

export interface ContentData {
  source: "database" | "seed";
  site: SiteCopy;
  slots: Record<string, MediaRef>;
  categories: Category[];
  amenities: ManagedItem[];
  facilities: ManagedItem[];
  experiences: ManagedItem[];
  destinations: Destination[];
  properties: PropertyView[];
  /** Published only, newest first. Each carries its markdown body. */
  stories: (Story & { body: string })[];
  storyCategories: StoryCategory[];
}

export type Content = ReturnType<typeof bind>;

export const getContent = cache(async (): Promise<Content> => {
  const data = hasDatabase() ? await loadCached() : loadFromSeed();
  return bind(data);
});

const loadCached = unstable_cache(() => loadFromDatabase(), ["content-v2"], {
  tags: [CONTENT_TAG],
  revalidate: 3600,
});

/* — Helpers over a snapshot ——————————————————————————————————— */

function bind(data: ContentData) {
  const bySlug = <T extends { slug: string }>(items: T[]) =>
    new Map(items.map((i) => [i.slug, i]));
  const propertyMap = bySlug(data.properties);
  const destinationMap = bySlug(data.destinations);
  const categoryMap = bySlug(data.categories);
  const storyMap = bySlug(data.stories);

  const propertiesIn = (destinationSlug: string) =>
    data.properties.filter((p) => p.destination.slug === destinationSlug);

  return {
    ...data,

    /** The photograph assigned to a named image slot, or null for a plate. */
    slot: (key: string): MediaRef | null => data.slots[key] ?? null,

    getProperty: (slug: string) => propertyMap.get(slug),
    getDestination: (slug: string) => destinationMap.get(slug),
    getCategory: (slug: string) => categoryMap.get(slug),
    getStory: (slug: string) => storyMap.get(slug),
    getStoryCategory: (slug: string) => data.storyCategories.find((c) => c.slug === slug),

    /**
     * Story categories a reader can actually filter by. A chip that leads to an
     * empty page is the loudest "this is a demo" signal on a content site.
     */
    activeStoryCategories: data.storyCategories.filter((c) =>
      data.stories.some((s) => s.categorySlug === c.slug),
    ),

    featuredProperties: data.properties
      .filter((p) => p.featured)
      .sort((a, b) => (a.featureOrder ?? 99) - (b.featureOrder ?? 99)),

    riderFriendly: data.properties.filter((p) => p.isRiderFriendly),

    propertiesIn,
    countIn: (destinationSlug: string) => propertiesIn(destinationSlug).length,
    countInCategory: (categorySlug: string) =>
      data.properties.filter((p) => p.category.slug === categorySlug).length,

    /**
     * Same destination first, then same category, then whatever is closest in
     * price — so the row is as full as the network allows.
     */
    similarTo(property: PropertyView, limit = 3): PropertyView[] {
      const others = data.properties.filter((p) => p.slug !== property.slug);
      const price = property.startingPrice ?? 0;
      const ordered = [
        ...others.filter((p) => p.destination.slug === property.destination.slug),
        ...others.filter(
          (p) =>
            p.destination.slug !== property.destination.slug &&
            p.category.slug === property.category.slug,
        ),
        ...[...others].sort(
          (a, b) =>
            Math.abs((a.startingPrice ?? price) - price) -
            Math.abs((b.startingPrice ?? price) - price),
        ),
      ];
      return [...new Map(ordered.map((p) => [p.slug, p])).values()].slice(0, limit);
    },

    storiesFor: (destinationSlug: string) =>
      data.stories.filter((s) => s.destinationSlugs.includes(destinationSlug)),

    nearbyDestinations: (slug: string, limit = 3) =>
      data.destinations.filter((d) => d.slug !== slug).slice(0, limit),
  };
}

/** What the client-side filter bar needs — ids and labels, not whole records. */
export function filterOptions(c: Content) {
  return {
    destinations: c.destinations.map((d) => ({ slug: d.slug, name: d.name })),
    categories: c.categories.map((k) => ({
      slug: k.slug,
      plural: k.plural,
      count: c.countInCategory(k.slug),
    })),
    amenities: c.amenities.map((a) => ({ slug: a.slug, name: a.name, iconKey: a.iconKey })),
    facilities: c.facilities.map((f) => ({ slug: f.slug, name: f.name, iconKey: f.iconKey })),
  };
}

/** The price band shown on listings, computed rather than declared. */
export function priceRange(items: PropertyView[]): { min: number; max: number } | null {
  const prices = items.map((p) => p.startingPrice).filter((p): p is number => p !== null);
  if (!prices.length) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/* — From the JSON seed ———————————————————————————————————————— */

const seedMedia = new Map((mediaRaw as MediaSeed[]).map((m) => [m.storageKey, m]));

function seedRef(storageKey: string | undefined): MediaRef | null {
  if (!storageKey) return null;
  const m = seedMedia.get(storageKey);
  return m ? toMediaRef(m) : { src: mediaUrl(storageKey), alt: "" };
}

const seedSlots = (): Record<string, MediaRef> =>
  Object.fromEntries(
    Object.entries(slotsRaw as Record<string, string>).flatMap(([k, v]) => {
      const ref = seedRef(v);
      return ref ? [[k, ref]] : [];
    }),
  );

function loadFromSeed(): ContentData {
  const categories = [...(taxonomy.categories as Category[])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const amenities = taxonomy.amenities as ManagedItem[];
  const facilities = [...(taxonomy.facilities as ManagedItem[])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const experiences = taxonomy.experiences as ManagedItem[];
  const slots = seedSlots();

  const destinations = [...(destinationsRaw as Destination[])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((d) => ({ ...d, tile: slots[`destination-${d.slug}`] ?? null, hero: null }));

  const pick = <T extends { slug: string }>(items: T[], slugs: string[]) =>
    slugs
      .map((s) => items.find((i) => i.slug === s))
      .filter((x): x is T => Boolean(x));

  const properties = (propertiesRaw as PropertySeed[])
    .filter((p) => p.status === "PUBLISHED")
    .map((seed): PropertyView => {
      const category = categories.find((c) => c.slug === seed.categorySlug);
      const destination = destinations.find((d) => d.slug === seed.destinationSlug);
      if (!category) throw new Error(`Unknown category "${seed.categorySlug}" on ${seed.slug}`);
      if (!destination)
        throw new Error(`Unknown destination "${seed.destinationSlug}" on ${seed.slug}`);
      const images = (seed.gallery ?? [])
        .map((key) => seedRef(key))
        .filter((x): x is MediaRef => Boolean(x));
      const { gallery: _gallery, categorySlug: _c, destinationSlug: _d, ...rest } = seed;
      return {
        ...rest,
        id: seed.slug,
        sleeping: seed.sleeping ?? [],
        images,
        imageCount: images.length || seed.imageCount,
        category,
        destination,
        amenities: pick(amenities, seed.amenitySlugs),
        facilities: pick(facilities, seed.facilitySlugs),
        experiences: pick(experiences, seed.experienceSlugs),
        ratingValue: null,
        ratingCount: null,
      };
    });

  // Seed stories ship as drafts: they are developer-written and wait for the
  // client to read, edit and publish them from the dashboard.
  const stories = (storiesRaw as Story[])
    .filter((s) => s.status === "PUBLISHED")
    .map((s) => ({ ...s, body: "", cover: slots[`story-${s.slug}`] ?? null }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return {
    source: "seed",
    site: siteJson,
    slots,
    categories,
    amenities,
    facilities,
    experiences,
    destinations,
    properties,
    stories,
    storyCategories: taxonomy.storyCategories as StoryCategory[],
  };
}

/* — From Postgres ———————————————————————————————————————————— */

/** Sets `value` at a dotted path ("home.hero") inside a deep clone of `target`. */
function setPath<T>(target: T, path: string, value: unknown): T {
  const keys = path.split(".");
  let node = target as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) {
    if (typeof node[key] !== "object" || node[key] === null) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  const last = keys[keys.length - 1]!;
  const current = node[last];
  // Merge objects so a section saved before a new field existed keeps the
  // seed's default for that field instead of rendering undefined.
  node[last] =
    current && typeof current === "object" && !Array.isArray(current) && value && typeof value === "object" && !Array.isArray(value)
      ? { ...(current as object), ...(value as object) }
      : value;
  return target;
}

async function loadFromDatabase(): Promise<ContentData> {
  const [
    categories,
    amenities,
    facilities,
    experiences,
    destinations,
    properties,
    stories,
    storyCategories,
    sections,
    settings,
  ] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.amenity.findMany({ orderBy: [{ sortOrder: "asc" }] }),
    db.facility.findMany({ orderBy: { sortOrder: "asc" } }),
    db.experience.findMany({ orderBy: { sortOrder: "asc" } }),
    db.destination.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: "asc" },
      include: { tileMedia: true, heroMedia: true },
    }),
    db.property.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: [{ featureOrder: "asc" }, { updatedAt: "desc" }],
      include: {
        category: true,
        destination: true,
        images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }], include: { media: true } },
        amenities: { orderBy: { sortOrder: "asc" }, include: { amenity: true } },
        facilities: { orderBy: { sortOrder: "asc" }, include: { facility: true } },
        experiences: { orderBy: { sortOrder: "asc" }, include: { experience: true } },
        nearbyRoutes: { orderBy: { sortOrder: "asc" } },
        nearbyPlaces: { orderBy: { sortOrder: "asc" } },
      },
    }),
    db.story.findMany({
      where: { status: "PUBLISHED", deletedAt: null, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: "desc" },
      include: { category: true, coverMedia: true },
    }),
    db.storyCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    db.siteSection.findMany(),
    db.siteSetting.findMany(),
  ]);

  // Copy: the JSON is the schema and the default; saved sections overlay it.
  let site = structuredClone(siteJson) as SiteCopy;
  for (const s of sections) site = setPath(site, s.key, s.fields);
  const settingMap = new Map(settings.map((s) => [s.key, s.value]));
  for (const [key, value] of settingMap) {
    if (key === "imageSlots") continue;
    site = setPath(site, `settings.${key}`, value);
  }

  // Image slots: { slotKey: mediaId } → resolved references.
  const slotIds = (settingMap.get("imageSlots") ?? {}) as Record<string, string>;
  const slotMedia = await db.media.findMany({ where: { id: { in: Object.values(slotIds) } } });
  const mediaById = new Map(slotMedia.map((m) => [m.id, m]));
  const slots: Record<string, MediaRef> = {};
  for (const [key, id] of Object.entries(slotIds)) {
    const m = mediaById.get(id);
    if (m) slots[key] = toMediaRef(m);
  }

  // Plate hints (scene, mood) are design data, not content; they stay in JSON.
  const plateHints = new Map(
    (destinationsRaw as Destination[]).map((d) => [d.slug, { scene: d.scene, mood: d.mood }]),
  );

  const destinationViews: Destination[] = destinations.map((d) => ({
    slug: d.slug,
    name: d.name,
    state: d.state,
    shortIntro: d.shortIntro,
    description: d.description,
    rideNote: d.rideNote ?? "",
    bestSeason: d.bestSeason ?? "",
    roadNote: d.roadNote ?? "",
    isFeatured: d.isFeatured,
    sortOrder: d.sortOrder,
    placeholder: false,
    ...plateHints.get(d.slug),
    tile: d.tileMedia ? toMediaRef(d.tileMedia) : (slots[`destination-${d.slug}`] ?? null),
    hero: d.heroMedia ? toMediaRef(d.heroMedia) : null,
  }));
  const destinationBySlug = new Map(destinationViews.map((d) => [d.slug, d]));

  const item = (x: { slug: string; name: string; iconKey: string; sortOrder: number }, extra?: Partial<ManagedItem>): ManagedItem => ({
    slug: x.slug,
    name: x.name,
    iconKey: x.iconKey,
    sortOrder: x.sortOrder,
    ...extra,
  });

  const propertyViews: PropertyView[] = properties.map((p) => {
    const destination = destinationBySlug.get(p.destination.slug)!;
    const images = p.images.map((i) => toMediaRef(i.media, i.alt));
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline ?? "",
      description: p.description,
      status: p.status,
      featured: p.featured,
      featureOrder: p.featureOrder,
      locality: p.locality ?? "",
      city: p.city,
      state: p.state,
      latitude: p.latitude,
      longitude: p.longitude,
      maxGuests: p.maxGuests,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      beds: p.beds ?? 0,
      sleeping: Array.isArray(p.sleeping) ? (p.sleeping as { room: string; beds: string }[]) : [],
      checkInTime: p.checkInTime ?? "",
      checkOutTime: p.checkOutTime ?? "",
      minNights: p.minNights ?? 1,
      startingPrice: p.startingPrice,
      priceLabel: p.priceLabel,
      priceGroupSize: p.priceGroupSize,
      priceNote: p.priceNote,
      availability: p.availability,
      isRiderFriendly: p.isRiderFriendly,
      riderNote: p.riderNote,
      curatorNote: p.curatorNote,
      houseRules: p.houseRules,
      cancellationPolicy: p.cancellationPolicy,
      amenitySlugs: p.amenities.map((a) => a.amenity.slug),
      facilitySlugs: p.facilities.map((f) => f.facility.slug),
      experienceSlugs: p.experiences.map((e) => e.experience.slug),
      nearbyRoutes: p.nearbyRoutes.map((r) => ({
        title: r.title,
        distanceKm: r.distanceKm,
        note: r.note ?? "",
      })),
      nearbyPlaces: p.nearbyPlaces.map((r) => ({
        title: r.title,
        distanceKm: r.distanceKm,
        type: r.type ?? "",
      })),
      images,
      imageCount: images.length,
      placeholder: false,
      category: {
        slug: p.category.slug,
        name: p.category.name,
        plural: p.category.plural,
        description: p.category.description ?? "",
        iconKey: p.category.iconKey,
        sortOrder: p.category.sortOrder,
      },
      destination,
      amenities: p.amenities.map((a) => item(a.amenity, { group: a.amenity.group })),
      facilities: p.facilities.map((f) =>
        item(f.facility, { description: f.facility.description ?? undefined }),
      ),
      experiences: p.experiences.map((e) =>
        item(e.experience, { description: e.experience.description ?? undefined }),
      ),
      ratingValue: p.ratingValue === null ? null : Number(p.ratingValue),
      ratingCount: p.ratingCount,
    };
  });

  return {
    source: "database",
    site,
    slots,
    categories: categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      plural: c.plural,
      description: c.description ?? "",
      iconKey: c.iconKey,
      sortOrder: c.sortOrder,
    })),
    amenities: amenities.filter((a) => a.isActive).map((a) => item(a, { group: a.group })),
    facilities: facilities
      .filter((f) => f.isActive)
      .map((f) => item(f, { description: f.description ?? undefined })),
    experiences: experiences
      .filter((e) => e.isActive)
      .map((e) => item(e, { description: e.description ?? undefined })),
    destinations: destinationViews,
    properties: propertyViews,
    stories: stories.map((s) => ({
      slug: s.slug,
      title: s.title,
      excerpt: s.excerpt,
      categorySlug: s.category?.slug ?? "",
      destinationSlugs: s.destinationIds,
      authorName: s.authorName,
      readMinutes: s.readMinutes,
      publishedAt: (s.publishedAt ?? s.createdAt).toISOString(),
      placeholder: false,
      status: "PUBLISHED" as const,
      body: s.bodyText,
      cover: s.coverMedia ? toMediaRef(s.coverMedia) : (slots[`story-${s.slug}`] ?? null),
    })),
    storyCategories: storyCategories.map((c) => ({ slug: c.slug, name: c.name })),
  };
}
