/**
 * What the client may edit on the website's pages, and how long each line may
 * be. The limits are the layout's limits: a hero lede past 220 characters runs
 * under the search bar on a phone, a pillar title past 40 wraps to three lines.
 * The dashboard refuses to save past them rather than letting a page break.
 *
 * Each section is stored whole as a SiteSection row keyed by its path
 * ("home.hero"); lib/content.ts lays it over the JSON default, so a field
 * nobody has touched keeps following the codebase. DPR §5.6, §10.8
 */

export type FieldDef =
  | { kind: "text"; path: string; label: string; max: number; hint?: string; multiline?: boolean }
  | { kind: "lines"; path: string; label: string; count: number; max: number; hint?: string }
  | { kind: "list"; path: string; label: string; itemLabel: string; fields: { key: string; label: string; max: number; multiline?: boolean }[]; hint?: string };

export interface SectionDef {
  key: string;
  page: string;
  title: string;
  description: string;
  fields: FieldDef[];
}

export const SECTIONS: SectionDef[] = [
  {
    key: "home.hero",
    page: "Homepage",
    title: "Hero",
    description: "The first thing anyone sees.",
    fields: [
      { kind: "text", path: "eyebrow", label: "Small line above", max: 48 },
      { kind: "lines", path: "titleLines", label: "Headline", count: 2, max: 26, hint: "Two lines. The second is gold." },
      { kind: "text", path: "lede", label: "Introduction", max: 220, multiline: true },
      { kind: "text", path: "primaryCta.label", label: "Main button", max: 22 },
      { kind: "text", path: "secondaryCta.label", label: "Second button", max: 30 },
      { kind: "list", path: "trust", label: "Promises under the buttons", itemLabel: "Promise", fields: [{ key: "title", label: "Title", max: 28 }, { key: "note", label: "Line under it", max: 50 }] },
    ],
  },
  {
    key: "home.featured",
    page: "Homepage",
    title: "Featured stays",
    description: "The heading over the featured stays.",
    fields: [
      { kind: "text", path: "title", label: "Heading", max: 32 },
      { kind: "text", path: "lede", label: "Line under it", max: 120, multiline: true },
    ],
  },
  {
    key: "home.road",
    page: "Homepage",
    title: "Made for the road",
    description: "The pinned section beside the rider photograph.",
    fields: [
      { kind: "text", path: "overline", label: "Small line above", max: 32 },
      { kind: "text", path: "title", label: "Heading", max: 60 },
      { kind: "text", path: "lede", label: "Introduction", max: 220, multiline: true },
      { kind: "list", path: "pillars", label: "Pillars", itemLabel: "Pillar", fields: [{ key: "title", label: "Title", max: 40 }, { key: "body", label: "Text", max: 200, multiline: true }] },
    ],
  },
  {
    key: "home.destinations",
    page: "Homepage",
    title: "Destinations",
    description: "The heading over the destination tiles.",
    fields: [
      { kind: "text", path: "title", label: "Heading", max: 36 },
      { kind: "text", path: "lede", label: "Line under it", max: 140, multiline: true },
    ],
  },
  {
    key: "home.owners",
    page: "Homepage",
    title: "For property owners",
    description: "The pitch to owners, and its list of services.",
    fields: [
      { kind: "text", path: "overline", label: "Small line above", max: 32 },
      { kind: "text", path: "title", label: "Heading", max: 64 },
      { kind: "text", path: "lede", label: "Introduction", max: 220, multiline: true },
      { kind: "text", path: "note", label: "Note on the photo", max: 70 },
      { kind: "list", path: "services", label: "Services", itemLabel: "Service", fields: [{ key: "title", label: "Title", max: 40 }, { key: "body", label: "What it means", max: 140, multiline: true }] },
    ],
  },
  {
    key: "home.finalCta",
    page: "Homepage",
    title: "Closing call to action",
    description: "The last thing on the homepage.",
    fields: [
      { kind: "lines", path: "titleLines", label: "Headline", count: 3, max: 22 },
      { kind: "text", path: "lede", label: "Line under it", max: 160, multiline: true },
    ],
  },
  {
    key: "about",
    page: "About",
    title: "About page",
    description: "The introduction at the top of /about.",
    fields: [
      { kind: "text", path: "title", label: "Heading", max: 40 },
      { kind: "text", path: "lede", label: "Introduction", max: 240, multiline: true },
    ],
  },
  {
    key: "riderFriendly",
    page: "Rider-friendly",
    title: "Rider-friendly page",
    description: "The argument at the top of /rider-friendly-stays.",
    fields: [
      { kind: "text", path: "title", label: "Heading", max: 44 },
      { kind: "text", path: "lede", label: "Introduction", max: 240, multiline: true },
      { kind: "text", path: "body", label: "Body", max: 520, multiline: true },
    ],
  },
  {
    key: "listProperty",
    page: "List your property",
    title: "Owner page",
    description: "The introduction at the top of /list-your-property.",
    fields: [
      { kind: "text", path: "title", label: "Heading", max: 64 },
      { kind: "text", path: "lede", label: "Introduction", max: 240, multiline: true },
      { kind: "list", path: "steps", label: "How it works", itemLabel: "Step", fields: [{ key: "title", label: "Title", max: 40 }, { key: "body", label: "Text", max: 180, multiline: true }] },
    ],
  },
];

/** Named image slots on the website, by page, for the "Page photos" tab. */
export const IMAGE_SLOTS: { key: string; label: string; page: string; ratio: string }[] = [
  { key: "staysutra-hero", label: "Homepage hero", page: "Homepage", ratio: "16/9" },
  { key: "made-for-the-road", label: "Made for the road", page: "Homepage", ratio: "4/3" },
  { key: "list-your-property", label: "Owner section", page: "Homepage", ratio: "4/3" },
  { key: "stays-index", label: "All stays — header", page: "Stays", ratio: "21/9" },
  { key: "rider-friendly", label: "Rider-friendly — header", page: "Rider-friendly", ratio: "21/9" },
  { key: "destinations-index", label: "Destinations — header", page: "Destinations", ratio: "21/9" },
  { key: "for-riders", label: "For riders — header", page: "For riders", ratio: "21/9" },
  { key: "rider-passport", label: "Rider passport — header", page: "Rider passport", ratio: "21/9" },
  { key: "stories-index", label: "Stories — header", page: "Stories", ratio: "21/9" },
  { key: "about-hero", label: "About — header", page: "About", ratio: "21/9" },
  { key: "about-band", label: "About — wide band", page: "About", ratio: "21/9" },
  { key: "list-your-property-hero", label: "Owners — header", page: "List your property", ratio: "21/9" },
  { key: "owner-band", label: "Owners — wide band", page: "List your property", ratio: "21/9" },
  { key: "contact-hero", label: "Contact — header", page: "Contact", ratio: "21/9" },
  { key: "legal-privacy", label: "Privacy — header", page: "Legal", ratio: "21/9" },
  { key: "legal-terms", label: "Terms — header", page: "Legal", ratio: "21/9" },
  { key: "not-found", label: "Page not found", page: "Other", ratio: "21/9" },
];

export function getAt(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

export function setAt<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const out = structuredClone(obj) as Record<string, unknown>;
  let node = out;
  for (const k of keys.slice(0, -1)) {
    node[k] = { ...((node[k] as Record<string, unknown>) ?? {}) };
    node = node[k] as Record<string, unknown>;
  }
  node[keys[keys.length - 1]!] = value;
  return out as T;
}

/** Checks a section's values against its limits. Returns field → message. */
export function validateSection(def: SectionDef, values: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of def.fields) {
    const v = getAt(values, f.path);
    if (f.kind === "text") {
      const s = String(v ?? "");
      if (!s.trim()) errors[f.path] = "This can’t be empty";
      else if (s.length > f.max) errors[f.path] = `Keep it to ${f.max} characters`;
    } else if (f.kind === "lines") {
      const lines = (v as string[]) ?? [];
      lines.forEach((l, i) => {
        if (!l?.trim()) errors[`${f.path}.${i}`] = "Line can’t be empty";
        else if (l.length > f.max) errors[`${f.path}.${i}`] = `Keep it to ${f.max} characters`;
      });
    } else {
      const rows = (v as Record<string, string>[]) ?? [];
      rows.forEach((row, i) =>
        f.fields.forEach((sub) => {
          const s = String(row?.[sub.key] ?? "");
          if (!s.trim()) errors[`${f.path}.${i}.${sub.key}`] = "Can’t be empty";
          else if (s.length > sub.max) errors[`${f.path}.${i}.${sub.key}`] = `Keep it to ${sub.max}`;
        }),
      );
    }
  }
  return errors;
}
