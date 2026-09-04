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
 * The listing card. Three scales so a grid can be editorial rather than a wall
 * of identical tiles. DPR §4.6, §7.2 ④
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
  const showBadge = p.featured && p.isRiderFriendly;
  const chips = [...p.facilities, ...p.amenities].slice(0, 3);

  return (
    <article className={cn("group relative", className)}>
      <Frame
        seed={p.slug}
        scene={p.destination.scene as PlateScene | undefined}
        mood={p.destination.mood as PlateMood | undefined}
        ratio={scale === "lead" ? "4/3" : scale === "compact" ? "16/9" : "4/3"}
        sizes={sizes}
        priority={priority}
        className="rounded-card"
        imgClassName="transition-transform duration-[400ms] ease-out-quint group-hover:scale-[1.04]"
      >
        <div className="pointer-events-none absolute inset-0 scrim-b opacity-45" />

        {showBadge && (
          <span className="absolute left-4 top-4 rounded-chip bg-gold-500 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-gold-ink">
            Rider favourite
          </span>
        )}

        <SaveControl slug={p.slug} name={p.name} className="absolute right-3 top-3" />

      </Frame>

      <div className="pt-5">
        <div className="flex items-start justify-between gap-4">
          <h3
            className={cn(
              "font-display uppercase leading-tight tracking-[-0.01em] text-text-hi",
              scale === "lead" ? "text-2xl lg:text-[1.75rem]" : "text-lg",
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

        <div className="mt-3 flex items-baseline justify-between gap-4">
          <p className="flex min-w-0 items-center gap-1.5 text-sm text-text-low">
            <Icon name="pin" size={14} className="shrink-0 opacity-70" />
            <span className="truncate">
              {p.locality ? `${p.locality}, ` : ""}
              {p.destination.name}
            </span>
          </p>

          {/*
            Set against the locality rather than over the photograph. Tabular
            figures so a column of cards aligns on the rupee. DPR §4.6
          */}
          {p.startingPrice !== null && (
            <p className="flex shrink-0 items-baseline gap-1.5">
              <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-text-low">
                from
              </span>
              <span className="t-num text-[0.9375rem] text-text-hi" style={{ fontWeight: 700 }}>
                {inr(p.startingPrice)}
              </span>
            </p>
          )}
        </div>

        {scale === "lead" && (
          <p className="mt-3 max-w-[46ch] text-[0.9375rem] leading-relaxed text-text-mid">
            {p.tagline}
          </p>
        )}

        {chips.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {chips.map((c) => (
              <li key={c.slug} className="flex items-center gap-1.5 text-[0.8125rem] text-text-low">
                <Icon name={iconFor(c.iconKey)} size={15} className="shrink-0 text-text-low" />
                {c.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
