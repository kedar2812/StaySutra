"use client";

import Link from "next/link";
import { Frame } from "@/components/primitives/Frame";
import { Icon, iconFor } from "@/components/primitives/Icon";
import { SaveControl } from "./SaveControl";
import { cn, inr } from "@/lib/utils";
import type { PropertyView } from "@/lib/types";
import type { PlateScene, PlateMood } from "@/lib/plate";

type Scale = "lead" | "default" | "compact";

/**
 * The listing card. Three scales so a grid reads as an edit rather than as a
 * wall of identical tiles. DPR §4.6, §7.2 ④
 *
 * A card is for choosing which page to open, not a page in itself. It carries
 * what people compare on — type, place, name, capacity, price — and the three
 * rider facilities that make the case. The curator's note, the strongest line
 * on the property page, is kept for the lead card only: repeated on all nine
 * cards and cut off at three lines, it made each card about 1.2 phone screens
 * tall and turned the listing into a wall of truncated quotes.
 *
 * There is no "rider-friendly" badge. Eight of nine stays are, so the badge
 * said nothing; the facility row underneath says what it actually means.
 */
export function PropertyCard({
  property: p,
  scale = "default",
  sizes = "(min-width:1024px) 33vw, (min-width:640px) 50vw, 88vw",
  priority = false,
  className,
}: {
  property: PropertyView;
  scale?: Scale;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const lead = scale === "lead";

  // Rider facilities are the differentiator, so they get the row. Amenities
  // only fill in when a property has no facilities to show.
  const chips = (p.facilities.length ? p.facilities : p.amenities).slice(0, 3);

  const frame = (
    <Frame
      seed={p.slug}
      scene={p.destination.scene as PlateScene | undefined}
      mood={p.destination.mood as PlateMood | undefined}
      ratio={scale === "compact" ? "16/9" : "4/3"}
      fill={lead}
      sizes={sizes}
      priority={priority}
      className="rounded-card"
      imgClassName="transition-transform duration-[400ms] ease-out-quint group-hover:scale-[1.04]"
    >
      <SaveControl slug={p.slug} name={p.name} className="absolute right-3 top-3 z-20" />
    </Frame>
  );

  return (
    <article className={cn("group relative flex flex-col", lead && "h-full", className)}>
      {/*
        The lead card's photograph takes whatever height its column has left
        once the text is set, so it ends level with the two cards stacked
        beside it instead of stopping a third of the way down.
      */}
      {lead ? <div className="relative min-h-[20rem] flex-1">{frame}</div> : frame}

      <div className="flex flex-col pt-5">
        {/* Type and place, before the name — it is what people scan for. */}
        <p className="flex min-w-0 items-center gap-2 text-[0.8125rem] text-text-low">
          <Icon name={iconFor(p.category.iconKey)} size={15} className="shrink-0 opacity-80" />
          <span className="shrink-0">{p.category.name}</span>
          <span aria-hidden className="opacity-40">
            ·
          </span>
          <span className="min-w-0 truncate">
            {p.locality ? `${p.locality}, ` : ""}
            {p.destination.name}
          </span>
        </p>

        <div className="mt-1.5 flex items-start justify-between gap-4">
          <h3
            className={cn(
              "font-display leading-tight tracking-[-0.015em] text-text-hi",
              lead ? "text-2xl lg:text-[1.875rem]" : "text-xl",
            )}
            style={{ fontWeight: 700 }}
          >
            <Link href={`/stays/${p.slug}`} className="press-sm before:absolute before:inset-0">
              {p.name}
            </Link>
          </h3>

          {/* Rating renders only when a real value exists. DPR §12 */}
          {p.ratingValue !== null && (
            <span className="flex shrink-0 items-center gap-1 pt-1 text-gold-500">
              <Icon name="star" size={15} className="fill-current" />
              <span className="t-num text-sm">{p.ratingValue.toFixed(1)}</span>
            </span>
          )}
        </div>

        {/* The gold hairline wipe — hover feedback that reads as a highlighter. */}
        <span className="mt-3 block h-px w-full bg-[var(--hairline)]">
          <span className="block h-px w-0 bg-gold-500 transition-[width] duration-[420ms] ease-out-quint group-hover:w-full" />
        </span>

        {/* Capacity against price, on one baseline. Tabular figures so a column
            of cards aligns on the rupee. DPR §4.6 */}
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
          <p className="flex items-center gap-3.5 text-[0.875rem] text-text-mid">
            <span className="flex items-center gap-1.5">
              <Icon name="guests" size={15} className="shrink-0 text-text-low" />
              <span className="tabular-nums">{p.maxGuests}</span>
              <span className="sr-only">guests</span>
            </span>
            <span aria-hidden className="h-3 w-px bg-[var(--hairline-str)]" />
            <span className="flex items-center gap-1.5">
              <Icon name="bed" size={15} className="shrink-0 text-text-low" />
              <span className="tabular-nums">{p.bedrooms}</span>
              <span className="sr-only">{p.bedrooms === 1 ? "bedroom" : "bedrooms"}</span>
            </span>
          </p>

          {p.startingPrice !== null ? (
            <p className="flex shrink-0 items-baseline gap-1.5">
              <span className="text-xs text-text-low">from</span>
              <span className="t-num text-base text-text-hi" style={{ fontWeight: 700 }}>
                {inr(p.startingPrice)}
              </span>
              <span className="text-xs text-text-low">/ night</span>
            </p>
          ) : (
            <p className="shrink-0 text-[0.8125rem] text-text-low">Price on request</p>
          )}
        </div>

        {lead && p.curatorNote && (
          <p className="mt-5 max-w-[56ch] border-l border-gold-500/70 pl-4 text-[0.9375rem] leading-relaxed text-text-mid">
            {p.curatorNote}
          </p>
        )}

        {chips.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
            {chips.map((c) => (
              <li key={c.slug} className="flex items-center gap-1.5 text-[0.8125rem] text-text-low">
                <Icon name={iconFor(c.iconKey)} size={15} className="shrink-0" />
                {c.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
