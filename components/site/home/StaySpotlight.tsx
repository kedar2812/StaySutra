import Link from "next/link";
import { Frame } from "@/components/primitives/Frame";
import { ButtonLink } from "@/components/primitives/Button";
import { Icon, iconFor } from "@/components/primitives/Icon";
import { shortDay } from "@/lib/calendar/dates";
import { priceLine } from "@/lib/pricing";
import { waMessage, whatsappLink } from "@/lib/site";
import type { PlateMood, PlateScene } from "@/lib/plate";
import type { PropertyView } from "@/lib/types";

/**
 * A single stay, given the whole stage.
 *
 * While the network is small, one listing in a four-up grid reads as a page
 * that forgot to load the rest. Given room, the same listing reads as a
 * flagship: three photographs, the facts a group decides on (how many it
 * sleeps, the pool), the price the way they will split it, and the next
 * weekend that is actually free — every number from the real record or the
 * real calendar. FeaturedStays switches back to its grid at three stays.
 */
export function StaySpotlight({
  property: p,
  weekend,
  priority = false,
}: {
  property: PropertyView;
  weekend: { checkIn: string; checkOut: string } | null;
  priority?: boolean;
}) {
  const price = priceLine(p);
  const [a, b, c] = p.images;
  const scene = p.destination.scene as PlateScene | undefined;
  const mood = p.destination.mood as PlateMood | undefined;
  const href = `/stays/${p.slug}`;
  const highlights = [
    { icon: "guests" as const, text: `Sleeps up to ${p.maxGuests}` },
    { icon: "bed" as const, text: `${p.bedrooms} bedrooms · ${p.bathrooms} baths` },
    ...p.amenities
      .filter((x) => ["pool", "garden", "pet-friendly", "outdoor-dining"].includes(x.slug))
      .slice(0, 2)
      .map((x) => ({ icon: iconFor(x.iconKey), text: x.name })),
  ];

  return (
    <article className="grid gap-10 lg:grid-cols-12 lg:gap-12">
      {/* Mosaic: one large frame, two beneath. The large one is the cover. */}
      <Link
        href={href}
        aria-label={`See ${p.name}`}
        className="press-sm group grid grid-cols-2 gap-2 lg:col-span-7"
      >
        <Frame
          media={a ?? null}
          seed={`${p.slug}-0`}
          scene={scene}
          mood={mood}
          ratio="16/9"
          priority={priority}
          sizes="(min-width:1024px) 56vw, 100vw"
          className="col-span-2 rounded-card"
          imgClassName="transition-transform duration-[700ms] ease-out-quint group-hover:scale-[1.03]"
        />
        <Frame
          media={b ?? null}
          seed={`${p.slug}-1`}
          scene={scene}
          mood="dawn"
          ratio="4/3"
          sizes="(min-width:1024px) 28vw, 50vw"
          className="rounded-card"
        />
        <Frame
          media={c ?? null}
          seed={`${p.slug}-2`}
          scene={scene}
          mood="night"
          ratio="4/3"
          sizes="(min-width:1024px) 28vw, 50vw"
          className="rounded-card"
        />
      </Link>

      <div className="flex flex-col lg:col-span-5 lg:pt-2">
        <p className="t-overline flex items-center gap-2">
          <Icon name={iconFor(p.category.iconKey)} size={15} className="text-text-low" />
          {p.category.name} · {p.locality ? `${p.locality}, ` : ""}
          {p.city}
        </p>

        <h3 className="t-display-m mt-4">
          <Link href={href} className="transition-colors hover:text-gold-400">
            {p.name}
          </Link>
        </h3>
        {p.tagline && <p className="t-lede mt-4 max-w-[38ch]">{p.tagline}</p>}

        <ul className="mt-8 grid grid-cols-2 gap-x-6 border-t border-[color:var(--hairline)]">
          {highlights.map((h) => (
            <li
              key={h.text}
              className="flex items-center gap-3 border-b border-[color:var(--hairline)] py-3.5 text-[0.9375rem] text-text-mid"
            >
              <Icon name={h.icon} size={19} className="shrink-0 text-text-low" />
              {h.text}
            </li>
          ))}
        </ul>

        {price && (
          <div className="mt-8">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="t-caption uppercase tracking-[0.14em]">{price.label}</span>
              <span className="t-num text-3xl text-text-hi" style={{ fontWeight: 800 }}>
                {price.amount}
              </span>
              <span className="t-caption">/ night, whole place</span>
            </p>
            {price.perHead && (
              <p className="mt-1.5 text-[0.9375rem] font-medium text-gold-400">{price.perHead}</p>
            )}
          </div>
        )}

        {weekend && (
          <p className="mt-6 flex items-center gap-2.5 text-[0.9375rem] text-text-mid">
            <span className="size-2 shrink-0 rounded-full bg-ok shadow-[0_0_0_4px_rgba(63,191,135,0.15)]" />
            Next free weekend:{" "}
            <span className="font-medium text-text-hi">
              {shortDay(weekend.checkIn)} → {shortDay(weekend.checkOut)}
            </span>
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap [&>a]:w-full sm:[&>a]:w-auto">
          <ButtonLink href={href} size="lg" icon="arrowRight">
            See the stay
          </ButtonLink>
          <ButtonLink
            href={whatsappLink(waMessage.property(p.name, p.destination.name, p.slug))}
            target="_blank"
            rel="noreferrer noopener"
            variant="outline"
            size="lg"
            icon="whatsapp"
            iconAfter={false}
          >
            Ask on WhatsApp
          </ButtonLink>
        </div>

        <p className="t-caption mt-6 max-w-[46ch]">
          Dates confirmed by a person, the same day. Nothing is paid on this site.
        </p>
      </div>
    </article>
  );
}
