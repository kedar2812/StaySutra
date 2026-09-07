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
 * Everything a booker compares on is above the fold of the card — type,
 * location, capacity, bedrooms, price — and then one line that no marketplace
 * carries: why this property is on the site at all. That line is the whole
 * difference between a curated network and an inventory feed, so it is given
 * its own labelled block rather than being folded into the tagline.
 *
 * Gold is deliberately almost absent here. A grid of six cards, each with a
 * solid gold badge, spends the §4.2 budget six times over in one viewport; the
 * rider badge is glass with a gold mark, and the only filled gold on the card
 * is the hover wipe, which can only ever be lit on one card at a time.
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

  // Rider facilities are the differentiator, so they get the chips. Amenities
  // only fill in when a property has no facilities to show.
  const chips = (p.facilities.length ? p.facilities : p.amenities).slice(0, 3);

  return (
    <article className={cn("group relative flex flex-col", className)}>
      <Frame
        seed={p.slug}
        scene={p.destination.scene as PlateScene | undefined}
        mood={p.destination.mood as PlateMood | undefined}
        ratio={lead ? "4/3" : scale === "compact" ? "16/9" : "4/3"}
        sizes={sizes}
        priority={priority}
        className="rounded-card"
        imgClassName="transition-transform duration-[400ms] ease-out-quint group-hover:scale-[1.04]"
      >
        <div className="pointer-events-none absolute inset-0 scrim-b opacity-45" />

        {p.isRiderFriendly && (
          <span className="glass-chip glass absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-pill py-1 pl-2 pr-3 text-[0.625rem] font-semibold uppercase tracking-[0.13em] text-text-hi">
            <Icon name="motorcycle" size={14} className="text-gold-500" />
            Rider-friendly
          </span>
        )}

        <SaveControl slug={p.slug} name={p.name} className="absolute right-3 top-3 z-20" />
      </Frame>

      <div className="flex flex-1 flex-col pt-5">
        {/* Type and place, before the name — it is what people scan for. */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] uppercase tracking-[0.13em] text-text-low">
          <span className="flex items-center gap-1.5">
            <Icon name={iconFor(p.category.iconKey)} size={14} className="shrink-0 opacity-80" />
            {p.category.name}
          </span>
          <span aria-hidden className="opacity-40">
            /
          </span>
          <span className="min-w-0 truncate normal-case tracking-[0.06em]">
            {p.locality ? `${p.locality}, ` : ""}
            {p.destination.name}
          </span>
        </p>

        <div className="mt-2 flex items-start justify-between gap-4">
          <h3
            className={cn(
              "font-display uppercase leading-tight tracking-[-0.01em] text-text-hi",
              lead ? "text-2xl lg:text-[1.75rem]" : "text-lg",
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
          <p className="flex items-center gap-3.5 text-[0.8125rem] text-text-mid">
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
              <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-text-low">
                from
              </span>
              <span className="t-num text-[0.9375rem] text-text-hi" style={{ fontWeight: 700 }}>
                {inr(p.startingPrice)}
              </span>
            </p>
          ) : (
            <p className="shrink-0 text-[0.75rem] uppercase tracking-[0.12em] text-text-low">
              Price on request
            </p>
          )}
        </div>

        {lead && (
          <p className="mt-4 max-w-[46ch] text-[0.9375rem] leading-relaxed text-text-mid">
            {p.tagline}
          </p>
        )}

        {/* Why it is here at all. A marketplace cannot write this line. */}
        {p.curatorNote && (
          <div className="mt-5 border-l border-[color:var(--hairline-str)] pl-4">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-text-low">
              Why StaySutra picked it
            </p>
            <p
              className={cn(
                "mt-1.5 text-[0.875rem] leading-relaxed text-text-mid",
                lead ? "max-w-[52ch]" : "line-clamp-3",
              )}
            >
              {p.curatorNote}
            </p>
          </div>
        )}

        {chips.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
            {chips.map((c) => (
              <li key={c.slug} className="flex items-center gap-1.5 text-[0.8125rem] text-text-low">
                <Icon name={iconFor(c.iconKey)} size={15} className="shrink-0" />
                {c.name}
              </li>
            ))}
          </ul>
        )}

        {/*
          The affordance, not a second link — the card already is one, and two
          overlapping links to the same href is a screen-reader tax for nothing.
        */}
        <p
          aria-hidden
          className="mt-auto flex items-center gap-2 pt-6 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-text-low transition-colors duration-300 group-hover:text-gold-500"
        >
          View stay
          <Icon
            name="arrowRight"
            size={15}
            className="transition-transform duration-300 ease-out-quint group-hover:translate-x-1"
          />
        </p>
      </div>
    </article>
  );
}
