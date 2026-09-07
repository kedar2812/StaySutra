import taxonomy from "@/content/taxonomy.json";
import destinationsRaw from "@/content/destinations.json";
import propertiesRaw from "@/content/properties.json";
import storiesRaw from "@/content/stories.json";
import site from "@/content/site.json";
import type {
  Category,
  Destination,
  ManagedItem,
  PropertySeed,
  PropertyView,
  Story,
  StoryCategory,
} from "./types";

/**
 * The Phase 1 content source.
 *
 * Phase 1 ships the schema (prisma/schema.prisma) but reads through this module,
 * so the public site is correct before a single admin screen exists. `prisma/seed.ts`
 * loads exactly these files into the database, and Phase 2's dashboard writes back
 * to the same tables — the shapes here and in the schema are deliberately identical.
 */

export const categories = [...(taxonomy.categories as Category[])].sort(
  (a, b) => a.sortOrder - b.sortOrder,
);
export const amenities = taxonomy.amenities as ManagedItem[];
export const facilities = [...(taxonomy.facilities as ManagedItem[])].sort(
  (a, b) => a.sortOrder - b.sortOrder,
);
export const experiences = taxonomy.experiences as ManagedItem[];

export const destinations = [...(destinationsRaw as Destination[])].sort(
  (a, b) => a.sortOrder - b.sortOrder,
);

export const stories = [...(storiesRaw as Story[])].sort((a, b) =>
  b.publishedAt.localeCompare(a.publishedAt),
);

/**
 * Every story category the taxonomy knows about, and — separately — the ones a
 * reader can actually filter by. A chip that leads to an empty page is the
 * single loudest "this is a demo" signal on a content site, so the UI renders
 * `activeStoryCategories` and Phase 2 fills the rest in simply by publishing.
 */
export const storyCategories = taxonomy.storyCategories as StoryCategory[];

export const activeStoryCategories = storyCategories.filter((c) =>
  stories.some((s) => s.categorySlug === c.slug),
);

export function getStoryCategory(slug: string): StoryCategory | undefined {
  return storyCategories.find((c) => c.slug === slug);
}

export const siteContent = site;

/* — Lookups ————————————————————————————————————————————————— */

const byslug = <T extends { slug: string }>(items: T[]) =>
  new Map(items.map((i) => [i.slug, i]));

const categoryMap = byslug(categories);
const destinationMap = byslug(destinations);
const amenityMap = byslug(amenities);
const facilityMap = byslug(facilities);
const experienceMap = byslug(experiences);

function hydrate(seed: PropertySeed): PropertyView {
  const category = categoryMap.get(seed.categorySlug);
  const destination = destinationMap.get(seed.destinationSlug);
  if (!category) throw new Error(`Unknown category "${seed.categorySlug}" on ${seed.slug}`);
  if (!destination) throw new Error(`Unknown destination "${seed.destinationSlug}" on ${seed.slug}`);

  const pick = <T>(map: Map<string, T>, slugs: string[]) =>
    slugs.map((s) => map.get(s)).filter((x): x is T => Boolean(x));

  return {
    ...seed,
    category,
    destination,
    amenities: pick(amenityMap, seed.amenitySlugs),
    facilities: pick(facilityMap, seed.facilitySlugs),
    experiences: pick(experienceMap, seed.experienceSlugs),
    // No rating is seeded anywhere. The UI must handle null, and does. DPR §4.6
    ratingValue: null,
    ratingCount: null,
  };
}

export const properties: PropertyView[] = (propertiesRaw as PropertySeed[])
  .filter((p) => p.status === "PUBLISHED")
  .map(hydrate);

export function getProperty(slug: string): PropertyView | undefined {
  return properties.find((p) => p.slug === slug);
}

export function getDestination(slug: string): Destination | undefined {
  return destinationMap.get(slug);
}

export function getCategory(slug: string): Category | undefined {
  return categoryMap.get(slug);
}

export function getStory(slug: string): Story | undefined {
  return stories.find((s) => s.slug === slug);
}

/* — Derived ————————————————————————————————————————————————— */

export function propertiesIn(destinationSlug: string): PropertyView[] {
  return properties.filter((p) => p.destination.slug === destinationSlug);
}

export function countIn(destinationSlug: string): number {
  return propertiesIn(destinationSlug).length;
}

export function countInCategory(categorySlug: string): number {
  return properties.filter((p) => p.category.slug === categorySlug).length;
}

export const featuredProperties = properties
  .filter((p) => p.featured)
  .sort((a, b) => (a.featureOrder ?? 99) - (b.featureOrder ?? 99));

export const riderFriendly = properties.filter((p) => p.isRiderFriendly);

/** Same destination first, then same category, excluding the current property. */
export function similarTo(property: PropertyView, limit = 4): PropertyView[] {
  const sameDestination = properties.filter(
    (p) => p.slug !== property.slug && p.destination.slug === property.destination.slug,
  );
  const sameCategory = properties.filter(
    (p) =>
      p.slug !== property.slug &&
      p.destination.slug !== property.destination.slug &&
      p.category.slug === property.category.slug,
  );
  return [...sameDestination, ...sameCategory].slice(0, limit);
}

export function storiesFor(destinationSlug: string): Story[] {
  return stories.filter((s) => s.destinationSlugs.includes(destinationSlug));
}

export function nearbyDestinations(slug: string, limit = 3): Destination[] {
  return destinations.filter((d) => d.slug !== slug).slice(0, limit);
}

/** The price band shown on listings, computed rather than declared. */
export function priceRange(items: PropertyView[]): { min: number; max: number } | null {
  const prices = items.map((p) => p.startingPrice).filter((p): p is number => p !== null);
  if (!prices.length) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
