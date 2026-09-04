/** Shapes shared by the seed content, the data layer and (in Phase 2) Prisma. */

export type PropertyStatus = "DRAFT" | "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED";
export type AvailabilityStatus = "AVAILABLE" | "ON_REQUEST" | "SOLD_OUT";

export interface Category {
  slug: string;
  name: string;
  plural: string;
  description: string;
  iconKey: string;
  sortOrder: number;
}

export interface Destination {
  slug: string;
  name: string;
  state: string;
  shortIntro: string;
  description: string;
  rideNote: string;
  bestSeason: string;
  /** Road character — the thing a rider actually wants to know. */
  roadNote: string;
  isFeatured: boolean;
  sortOrder: number;
  /** Copy is developer-drafted until the client supplies theirs. §16 */
  placeholder: boolean;
  /** Scene hint for the branded plate until real photography lands. */
  scene?: string;
  mood?: string;
}

export interface ManagedItem {
  slug: string;
  name: string;
  iconKey: string;
  group?: string;
  description?: string;
  sortOrder: number;
}

export interface PropertySeed {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  status: PropertyStatus;
  featured: boolean;
  featureOrder: number | null;
  categorySlug: string;
  destinationSlug: string;
  locality: string;
  city: string;
  state: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  beds: number;
  checkInTime: string;
  checkOutTime: string;
  minNights: number;
  startingPrice: number | null;
  priceNote: string | null;
  availability: AvailabilityStatus;
  isRiderFriendly: boolean;
  riderNote: string | null;
  amenitySlugs: string[];
  facilitySlugs: string[];
  experienceSlugs: string[];
  nearbyRoutes: { title: string; distanceKm: number | null; note: string }[];
  nearbyPlaces: { title: string; distanceKm: number | null; type: string }[];
  imageCount: number;
  /**
   * True until the client's own copy and photography replace this record.
   * The seed script refuses to write these to production without an explicit
   * flag, and CONTENT-GAPS.md tracks every one.
   */
  placeholder: boolean;
}

export interface Story {
  slug: string;
  title: string;
  excerpt: string;
  categorySlug: string;
  destinationSlugs: string[];
  authorName: string;
  readMinutes: number;
  publishedAt: string;
  placeholder: boolean;
}

/** A property joined to its taxonomy — what every view actually consumes. */
export interface PropertyView extends Omit<PropertySeed, "categorySlug" | "destinationSlug"> {
  category: Category;
  destination: Destination;
  amenities: ManagedItem[];
  facilities: ManagedItem[];
  experiences: ManagedItem[];
  /**
   * Ratings render only when a real value exists. There is deliberately no
   * seeded value anywhere in this repository. DPR §4.6
   */
  ratingValue: number | null;
  ratingCount: number | null;
}

/** A resolved image: a real Media row, or a demo photograph standing in for one. */
export interface MediaRef {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}
