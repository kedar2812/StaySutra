"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/primitives/Button";
import { Chip, FilterChip } from "@/components/primitives/Chip";
import { Icon, iconFor } from "@/components/primitives/Icon";
import { Sheet } from "@/components/primitives/Sheet";
import { amenities, categories, destinations, facilities } from "@/lib/content";
import { parseFilters, toQuery, countActive, type Filters, type SortKey } from "@/lib/filters";
import { track } from "@/lib/analytics";
import { inr, plural } from "@/lib/utils";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "newest", label: "Newest" },
];

const PRICE_BANDS = [
  { label: "Under ₹3,000", min: undefined, max: 3000 },
  { label: "₹3,000 – ₹8,000", min: 3000, max: 8000 },
  { label: "₹8,000 – ₹15,000", min: 8000, max: 15000 },
  { label: "₹15,000+", min: 15000, max: undefined },
];

/**
 * Sticky glass filter bar on desktop; a FILTERS (n) pill opening a
 * drag-dismissible sheet on mobile. Changes are written to the URL with
 * `replace`, so Back does not walk through every toggle. DPR §6.3, §7.3
 */
export function FilterBar({ resultCount }: { resultCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [sheet, setSheet] = useState(false);

  const filters = useMemo(
    () => parseFilters(Object.fromEntries(params.entries())),
    [params],
  );
  const active = countActive(filters);

  const apply = (next: Partial<Filters>, method: "replace" | "push" = "replace") => {
    const merged: Filters = { ...filters, ...next, page: 1 };
    const query = toQuery(merged);
    track("filter_apply", { ...next });
    startTransition(() => {
      const url = query ? `${pathname}?${query}` : pathname;
      if (method === "push") router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    });
  };

  const clearAll = () =>
    apply({
      destination: undefined,
      category: undefined,
      riderFriendly: false,
      guests: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      amenities: [],
    });

  const toggleAmenity = (slug: string) =>
    apply({
      amenities: filters.amenities.includes(slug)
        ? filters.amenities.filter((a) => a !== slug)
        : [...filters.amenities, slug],
    });

  const controls = (
    <>
      <SelectControl
        label="Destination"
        value={filters.destination ?? ""}
        onChange={(v) => apply({ destination: v || undefined })}
        options={[
          { value: "", label: "Anywhere" },
          ...destinations.map((d) => ({ value: d.slug, label: d.name })),
        ]}
      />
      <SelectControl
        label="Type"
        value={filters.category ?? ""}
        onChange={(v) => apply({ category: v || undefined })}
        options={[
          { value: "", label: "Any type" },
          ...categories.map((c) => ({ value: c.slug, label: c.plural })),
        ]}
      />
      <SelectControl
        label="Guests"
        value={filters.guests ? String(filters.guests) : ""}
        onChange={(v) => apply({ guests: v ? Number(v) : undefined })}
        options={[
          { value: "", label: "Any size" },
          ...[2, 4, 6, 8, 10, 12, 16, 20].map((n) => ({
            value: String(n),
            label: `${n}+ guests`,
          })),
        ]}
      />
      <SelectControl
        label="Price"
        value={
          PRICE_BANDS.findIndex(
            (b) => b.min === filters.minPrice && b.max === filters.maxPrice,
          ) >= 0
            ? String(
                PRICE_BANDS.findIndex(
                  (b) => b.min === filters.minPrice && b.max === filters.maxPrice,
                ),
              )
            : ""
        }
        onChange={(v) => {
          const band = v === "" ? undefined : PRICE_BANDS[Number(v)];
          apply({ minPrice: band?.min, maxPrice: band?.max });
        }}
        options={[
          { value: "", label: "Any price" },
          ...PRICE_BANDS.map((b, i) => ({ value: String(i), label: b.label })),
        ]}
      />
    </>
  );

  return (
    <>
      <div className="sticky top-[var(--header-h)] z-30 -mx-[var(--gutter)] px-[var(--gutter)] py-3 lg:py-4">
        <div className="glass rounded-surface px-4 py-3 lg:px-5">
          <div className="flex items-center gap-4">
            <p
              className="shrink-0 text-[0.8125rem] tabular-nums text-text-mid"
              aria-live="polite"
            >
              <span className="t-num text-base text-text-hi">{resultCount}</span>{" "}
              {resultCount === 1 ? "stay" : "stays"}
            </p>

            <div className="hidden flex-1 items-center gap-2 lg:flex">{controls}</div>

            <button
              type="button"
              onClick={() => apply({ riderFriendly: !filters.riderFriendly })}
              aria-pressed={filters.riderFriendly}
              className={[
                "press hidden shrink-0 items-center gap-2 rounded-pill border px-4 py-2 text-[0.8125rem] transition-colors lg:inline-flex",
                filters.riderFriendly
                  ? "border-transparent bg-gold-500 text-gold-ink"
                  : "border-[color:var(--hairline-str)] text-text-mid hover:text-text-hi",
              ].join(" ")}
            >
              <Icon name="motorcycle" size={16} />
              Rider-friendly
            </button>

            <button
              type="button"
              onClick={() => setSheet(true)}
              className="press ml-auto inline-flex shrink-0 items-center gap-2 rounded-pill border border-[color:var(--hairline-str)] px-4 py-2.5 text-[0.8125rem] text-text-hi lg:hidden"
            >
              <Icon name="filter" size={16} />
              Filters
              {active > 0 && (
                <span className="t-num rounded-pill bg-gold-500 px-1.5 py-0.5 text-[0.6875rem] text-gold-ink">
                  {active}
                </span>
              )}
            </button>

            <SelectControl
              label="Sort"
              hideLabel
              className="ml-auto hidden lg:block"
              value={filters.sort}
              onChange={(v) => apply({ sort: v as SortKey })}
              options={SORTS.map((s) => ({ value: s.key, label: s.label }))}
            />
          </div>

          {active > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[color:var(--hairline)] pt-3">
              {filters.destination && (
                <FilterChip onRemove={() => apply({ destination: undefined })}>
                  {destinations.find((d) => d.slug === filters.destination)?.name}
                </FilterChip>
              )}
              {filters.category && (
                <FilterChip onRemove={() => apply({ category: undefined })}>
                  {categories.find((c) => c.slug === filters.category)?.plural}
                </FilterChip>
              )}
              {filters.riderFriendly && (
                <FilterChip onRemove={() => apply({ riderFriendly: false })}>
                  Rider-friendly
                </FilterChip>
              )}
              {filters.guests && (
                <FilterChip onRemove={() => apply({ guests: undefined })}>
                  {plural(filters.guests, "guest")}+
                </FilterChip>
              )}
              {(filters.minPrice || filters.maxPrice) && (
                <FilterChip
                  onRemove={() => apply({ minPrice: undefined, maxPrice: undefined })}
                >
                  {filters.minPrice ? inr(filters.minPrice) : "Up to"}
                  {filters.maxPrice ? ` – ${inr(filters.maxPrice)}` : "+"}
                </FilterChip>
              )}
              {filters.amenities.map((slug) => (
                <FilterChip key={slug} onRemove={() => toggleAmenity(slug)}>
                  {[...amenities, ...facilities].find((a) => a.slug === slug)?.name ?? slug}
                </FilterChip>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="press-sm ml-1 text-[0.8125rem] text-text-low underline underline-offset-4 transition-colors hover:text-text-hi"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
        {pending && <span className="sr-only">Updating results</span>}
      </div>

      <Sheet
        open={sheet}
        onClose={() => setSheet(false)}
        title={`Filters${active ? ` (${active})` : ""}`}
        snapPoints={[0.5, 0.92]}
        footer={
          <div className="flex gap-3">
            <Button variant="quiet" onClick={clearAll} className="flex-1">
              Clear
            </Button>
            <Button onClick={() => setSheet(false)} className="flex-1">
              Show {resultCount}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 pt-2">
          <div className="grid gap-3">{controls}</div>

          <button
            type="button"
            onClick={() => apply({ riderFriendly: !filters.riderFriendly })}
            aria-pressed={filters.riderFriendly}
            className={[
              "press flex w-full items-center gap-3 rounded-card border px-4 py-3.5 text-left transition-colors",
              filters.riderFriendly
                ? "border-transparent bg-gold-500 text-gold-ink"
                : "border-[color:var(--hairline-str)] text-text-hi",
            ].join(" ")}
          >
            <Icon name="motorcycle" size={20} />
            <span className="flex-1 text-[0.9375rem] font-medium">Rider-friendly only</span>
            {filters.riderFriendly && <Icon name="check" size={18} />}
          </button>

          <fieldset>
            <legend className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-text-low">
              Rider facilities
            </legend>
            <div className="flex flex-wrap gap-2">
              {facilities.map((f) => (
                <button
                  key={f.slug}
                  type="button"
                  onClick={() => toggleAmenity(f.slug)}
                  aria-pressed={filters.amenities.includes(f.slug)}
                  className="press"
                >
                  <Chip
                    icon={iconFor(f.iconKey)}
                    tone={filters.amenities.includes(f.slug) ? "gold" : "outline"}
                    className="px-3 py-2"
                  >
                    {f.name}
                  </Chip>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-text-low">
              Amenities
            </legend>
            <div className="flex flex-wrap gap-2">
              {amenities.map((a) => (
                <button
                  key={a.slug}
                  type="button"
                  onClick={() => toggleAmenity(a.slug)}
                  aria-pressed={filters.amenities.includes(a.slug)}
                  className="press"
                >
                  <Chip
                    icon={iconFor(a.iconKey)}
                    tone={filters.amenities.includes(a.slug) ? "gold" : "outline"}
                    className="px-3 py-2"
                  >
                    {a.name}
                  </Chip>
                </button>
              ))}
            </div>
          </fieldset>

          <SelectControl
            label="Sort by"
            value={filters.sort}
            onChange={(v) => apply({ sort: v as SortKey })}
            options={SORTS.map((s) => ({ value: s.key, label: s.label }))}
          />
        </div>
      </Sheet>
    </>
  );
}

function SelectControl({
  label,
  value,
  onChange,
  options,
  hideLabel = false,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hideLabel?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="relative block">
        <span
          className={
            hideLabel
              ? "sr-only"
              : "mb-1.5 block text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-text-low lg:hidden"
          }
        >
          {label}
        </span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="press-sm w-full appearance-none rounded-pill border border-[color:var(--hairline-str)] bg-ink-800/60 py-2 pl-4 pr-9 text-[0.8125rem] text-text-hi outline-none transition-colors hover:border-white/25 focus:border-gold-500 lg:w-auto"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-ink-800">
              {o.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevronDown"
          size={15}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-low"
        />
      </label>
    </div>
  );
}
