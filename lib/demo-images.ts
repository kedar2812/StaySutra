import type { MediaRef } from "./types";

/**
 * DEMO PHOTOGRAPHY — REMOVE BEFORE LAUNCH.
 *
 * The client's own photography does not exist yet (docs/CONTENT-GAPS.md item 1).
 * Until it does, every image slot resolved through `Frame` falls back to this
 * map rather than to a generated plate, so the site can be shown to the client
 * as it is meant to look.
 *
 * These are real photographs under the Unsplash License (free for commercial
 * use, no attribution required) — but they are NOT photographs of these
 * properties. Nothing here may survive to launch. Deleting this one file
 * restores the generated plates everywhere, with no other change.
 *
 * Keyed by the same `seed` every call site already passes, so wiring it in
 * required no changes at any call site. DPR §4.6, §4.7, §12
 */

const img = (src: string, alt: string): MediaRef => ({ src, alt });

/* — Properties ————————————————————————————————————————————————— */

const PROPERTIES: Record<string, MediaRef> = {
  "the-bikers-den-lonavala": img(
    "/img/prop/the-bikers-den-lonavala.jpg",
    "A timber house lit from within at dusk, reflected in still water",
  ),
  "coastal-rider-villa-alibaug": img(
    "/img/prop/coastal-rider-villa-alibaug.jpg",
    "An infinity pool and loungers on a terrace above the sea",
  ),
  "riverside-camp-karjat": img(
    "/img/prop/riverside-camp-karjat.jpg",
    "A tent pitched among trees at blue hour",
  ),
  "the-halt-khopoli": img(
    "/img/prop/the-halt-khopoli.jpg",
    "A rider in a dark jacket on an open road",
  ),
  "ridgeline-house-lonavala": img(
    "/img/prop/ridgeline-house-lonavala.jpg",
    "A lodge on a ridge beneath a sky full of stars",
  ),
  "old-portuguese-house-goa": img(
    "/img/prop/old-portuguese-house-goa.jpg",
    "A shaded courtyard with a hammock and a long dining table",
  ),
  "the-lawn-house-pune": img(
    "/img/prop/the-lawn-house-pune.jpg",
    "A low modern house with its outdoor lighting on at night",
  ),
  "sea-line-resort-alibaug": img(
    "/img/prop/sea-line-resort-alibaug.jpg",
    "An open-sided terrace lounge with deep sofas and hanging chairs",
  ),
  "the-terrace-mumbai": img(
    "/img/prop/the-terrace-mumbai.jpg",
    "A small balcony set with a table and two chairs",
  ),
};

/* — Everything else ———————————————————————————————————————————— */

const SEEDS: Record<string, MediaRef> = {
  ...PROPERTIES,

  // Home
  "staysutra-hero": img(
    "/img/hero/ghat-dusk.jpg",
    "A road winding down through the ghats at dusk",
  ),
  "made-for-the-road": img(
    "/img/story/riding-the-sahyadris-in-july.jpg",
    "A road running between dense green trees",
  ),
  "list-your-property": img(
    "/img/prop/the-lawn-house-pune.jpg",
    "A low modern house with its outdoor lighting on at night",
  ),

  // Destinations
  "destination-lonavala": img("/img/dest/lonavala.jpg", "Ridges receding into mist above Lonavala at dusk"),
  "destination-karjat": img("/img/dest/karjat.jpg", "A waterfall running through forest near Karjat"),
  "destination-alibaug": img("/img/dest/alibaug.jpg", "A fishing boat drawn up on the sand at Alibaug"),
  "destination-pune": img("/img/dest/pune.jpg", "Wooded hills on the approach to Pune"),
  "destination-mumbai": img("/img/dest/mumbai.jpg", "A house among trees under open sky outside Mumbai"),
  "destination-goa": img("/img/dest/goa.jpg", "Palms in silhouette against the sea at sunset in Goa"),

  // Categories
  "category-villas": img("/img/cat/villas.jpg", "A stone villa terrace shaded by a wide umbrella"),
  "category-farmhouses": img("/img/cat/farmhouses.jpg", "A fire pit burning against a stone wall at night"),
  "category-resorts": img("/img/cat/resorts.jpg", "A lit swimming pool after dark"),
  "category-highway-stays": img("/img/cat/highway-stays.jpg", "A motorcyclist on a road curving through hills"),
  "category-homestays": img("/img/cat/homestays.jpg", "A living room with low sofas and a wooden floor"),
  "category-mountain-stays": img("/img/cat/mountain-stays.jpg", "A range of mountains seen from high ground"),
  "category-beach-stays": img("/img/dest/alibaug.jpg", "A fishing boat drawn up on the sand"),

  // Stories
  "story-the-old-road-over-khandala": img(
    "/img/story/the-old-road-over-khandala.jpg",
    "A road climbing the side of a hill",
  ),
  "story-what-rider-friendly-actually-means": img(
    "/img/story/what-rider-friendly-actually-means.jpg",
    "Two motorcycles standing on the road",
  ),
  "story-coast-road-to-kashid": img(
    "/img/story/coast-road-to-kashid.jpg",
    "Palm trees along the water on the coast road",
  ),
  "story-riding-the-sahyadris-in-july": img(
    "/img/story/riding-the-sahyadris-in-july.jpg",
    "A road running between dense green trees in the monsoon",
  ),
  "story-two-days-to-goa-the-slow-way": img(
    "/img/story/two-days-to-goa-the-slow-way.jpg",
    "A single palm on a beach with the ocean behind it",
  ),

  // Page heroes and editorial bands — reused deliberately across pages.
  "stays-index": img("/img/hero/ghat-dusk.jpg", "A road winding down through the ghats at dusk"),
  "destinations-index": img("/img/dest/lonavala.jpg", "Ridges receding into mist at dusk"),
  "for-riders": img("/img/story/what-rider-friendly-actually-means.jpg", "Two motorcycles standing on the road"),
  "rider-passport": img("/img/cat/highway-stays.jpg", "A motorcyclist on a road curving through hills"),
  "rider-passport-band": img("/img/hero/ghat-dusk.jpg", "A road winding down through the ghats at dusk"),
  "stories-index": img("/img/story/the-old-road-over-khandala.jpg", "A road climbing the side of a hill"),
  "rider-friendly": img("/img/cat/highway-stays.jpg", "A motorcyclist on a road curving through hills"),
  "about-hero": img("/img/story/the-old-road-over-khandala.jpg", "A road climbing the side of a hill"),
  "about-band": img("/img/dest/goa.jpg", "Palms in silhouette against the sea at sunset"),
  "contact-hero": img("/img/dest/alibaug.jpg", "A fishing boat drawn up on the sand"),
  "owner-band": img("/img/prop/sea-line-resort-alibaug.jpg", "An open-sided terrace lounge above the sea"),
  "list-your-property-hero": img("/img/cat/villas.jpg", "A stone villa terrace shaded by a wide umbrella"),
  "legal-privacy": img("/img/dest/pune.jpg", "Wooded hills at first light"),
  "legal-terms": img("/img/dest/pune.jpg", "Wooded hills at first light"),
  "not-found": img("/img/cat/highway-stays.jpg", "A motorcyclist on a road curving through hills"),
};

/**
 * Gallery frames are seeded `<propertySlug>-<index>`. One photograph per
 * property exists, so a gallery rotates through the whole property pool
 * starting from the property's own image — nine identical frames would read
 * worse than nine different rooms.
 */
const POOL = Object.keys(PROPERTIES);

function galleryImage(seed: string): MediaRef | null {
  const m = /^(.*)-(\d+)$/.exec(seed);
  if (!m) return null;
  const [, slug, n] = m;
  const start = POOL.indexOf(slug!);
  if (start < 0) return null;
  return PROPERTIES[POOL[(start + Number(n)) % POOL.length]!]!;
}

/** The demo photograph for a seed, or null to fall back to a generated plate. */
export function demoImage(seed: string): MediaRef | null {
  return SEEDS[seed] ?? galleryImage(seed);
}
