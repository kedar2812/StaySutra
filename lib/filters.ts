import { properties } from "./content";
import type { PropertyView } from "./types";

/**
 * The URL is the state. Every filter is a query parameter, so a filtered view is
 * shareable, bookmarkable and back-button-correct, and the first load is
 * server-rendered. DPR §6.3
 */

export type SortKey = "recommended" | "price-asc" | "price-desc" | "newest";

export interface Filters {
  destination?: string;
  category?: string;
  riderFriendly: boolean;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  amenities: string[];
  sort: SortKey;
  page: number;
}

export const PER_PAGE = 12;

export type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

const int = (v: string | string[] | undefined): number | undefined => {
  const raw = first(v);
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function parseFilters(params: SearchParams): Filters {
  const sortRaw = first(params.sort);
  const sort: SortKey =
    sortRaw === "price-asc" || sortRaw === "price-desc" || sortRaw === "newest"
      ? sortRaw
      : "recommended";

  return {
    destination: first(params.destination) || undefined,
    category: first(params.category) || undefined,
    riderFriendly: first(params.riderFriendly) === "true",
    guests: int(params.guests),
    minPrice: int(params.minPrice),
    maxPrice: int(params.maxPrice),
    amenities: (first(params.amenities) ?? "").split(",").filter(Boolean),
    sort,
    page: int(params.page) ?? 1,
  };
}

export function toQuery(f: Partial<Filters>): string {
  const p = new URLSearchParams();
  if (f.destination) p.set("destination", f.destination);
  if (f.category) p.set("category", f.category);
  if (f.riderFriendly) p.set("riderFriendly", "true");
  if (f.guests) p.set("guests", String(f.guests));
  if (f.minPrice) p.set("minPrice", String(f.minPrice));
  if (f.maxPrice) p.set("maxPrice", String(f.maxPrice));
  if (f.amenities?.length) p.set("amenities", f.amenities.join(","));
  if (f.sort && f.sort !== "recommended") p.set("sort", f.sort);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  return p.toString();
}

export function applyFilters(f: Filters, pool: PropertyView[] = properties): PropertyView[] {
  const matched = pool.filter((p) => {
    if (f.destination && p.destination.slug !== f.destination) return false;
    if (f.category && p.category.slug !== f.category) return false;
    if (f.riderFriendly && !p.isRiderFriendly) return false;
    if (f.guests && p.maxGuests < f.guests) return false;
    if (f.minPrice && (p.startingPrice ?? 0) < f.minPrice) return false;
    if (f.maxPrice && (p.startingPrice ?? Number.MAX_SAFE_INTEGER) > f.maxPrice) return false;
    if (f.amenities.length) {
      const owned = new Set([
        ...p.amenities.map((a) => a.slug),
        ...p.facilities.map((a) => a.slug),
      ]);
      if (!f.amenities.every((a) => owned.has(a))) return false;
    }
    return true;
  });

  return sort(matched, f.sort);
}

function sort(items: PropertyView[], key: SortKey): PropertyView[] {
  const out = [...items];
  switch (key) {
    case "price-asc":
      return out.sort(
        (a, b) => (a.startingPrice ?? Infinity) - (b.startingPrice ?? Infinity),
      );
    case "price-desc":
      return out.sort((a, b) => (b.startingPrice ?? -1) - (a.startingPrice ?? -1));
    case "newest":
      return out.reverse();
    default:
      // Recommended: featured first, then any real rating, then the seed order.
      return out.sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return (b.ratingValue ?? 0) - (a.ratingValue ?? 0);
      });
  }
}

export function countActive(f: Filters): number {
  return (
    (f.destination ? 1 : 0) +
    (f.category ? 1 : 0) +
    (f.riderFriendly ? 1 : 0) +
    (f.guests ? 1 : 0) +
    (f.minPrice || f.maxPrice ? 1 : 0) +
    f.amenities.length
  );
}

/**
 * When a filter combination returns nothing, name the two filters most worth
 * loosening rather than showing a blank grid. DPR §6.3, §12
 */
export function loosenSuggestions(f: Filters): { key: keyof Filters; label: string }[] {
  const out: { key: keyof Filters; label: string }[] = [];
  if (f.amenities.length) out.push({ key: "amenities", label: "amenities" });
  if (f.minPrice || f.maxPrice) out.push({ key: "minPrice", label: "the price range" });
  if (f.guests) out.push({ key: "guests", label: "the group size" });
  if (f.category) out.push({ key: "category", label: "the property type" });
  if (f.destination) out.push({ key: "destination", label: "the destination" });
  if (f.riderFriendly) out.push({ key: "riderFriendly", label: "rider-friendly only" });
  return out.slice(0, 2);
}
