import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Gallery } from "@/components/site/Gallery";
import { StickyEnquire } from "@/components/site/StickyEnquire";
import { CheckAvailability } from "@/components/site/CheckAvailability";
import { AmenityGroups } from "@/components/site/AmenityGroups";
import { EnquiryForm } from "@/components/site/EnquiryForm";
import { PropertyCard } from "@/components/site/PropertyCard";
import { SaveControl } from "@/components/site/SaveControl";
import { Breadcrumbs } from "@/components/site/PageHero";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import { JsonLd } from "@/components/site/JsonLd";
import { Chip } from "@/components/primitives/Chip";
import { Icon, iconFor } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { Plate } from "@/components/primitives/Plate";
import { Reveal } from "@/components/motion/Reveal";
import { AvailabilityCalendar } from "@/components/site/AvailabilityCalendar";
import { getBlockedRanges, getCalendarStatus } from "@/lib/server/calendar";
import { db, hasDatabase } from "@/lib/server/db";
import { getContent } from "@/lib/content";
import { breadcrumbSchema, lodgingSchema, pageMeta } from "@/lib/seo";
import { waMessage, whatsappLink } from "@/lib/site";
import { clockTime, plural } from "@/lib/utils";
import { priceLine } from "@/lib/pricing";
import { nextFreeWeekend, shortDay } from "@/lib/calendar/dates";
import type { PlateMood, PlateScene } from "@/lib/plate";
import type { PropertyView } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getContent()).getProperty(slug);
  if (!p) return {};

  return pageMeta({
    title: `${p.name}, ${p.destination.name}`,
    description:
      p.tagline ||
      `${p.category.name} in ${p.locality || p.city}, ${p.state}. Sleeps ${p.maxGuests}.`,
    path: `/stays/${p.slug}`,
  });
}

/**
 * The most important template on the site. Order is fixed by DPR §7.6:
 * gallery, header, two-column body with a sticky availability card, quick
 * facts, about, why we recommend it, amenities, rider facilities, experiences,
 * location, routes, house rules and policies, pricing, similar stays, review
 * structure (built, hidden), inline enquiry form.
 *
 * "Why StaySutra recommends it" is the one block on this page a marketplace
 * cannot copy, so it sits directly under the description at full editorial
 * weight rather than being folded into the tagline.
 *
 * It renders correctly with only the minimum fields filled — name, city, one
 * image and capacity — because every optional block hides rather than rendering
 * a blank heading.
 */
export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const c = await getContent();
  const settings = c.site.settings;
  const { getProperty, similarTo } = c;
  const { slug } = await params;
  const p = getProperty(slug);
  if (!p) {
    // A renamed live page leaves its old address behind as a permanent redirect.
    if (hasDatabase()) {
      const moved = await db.slugRedirect.findUnique({ where: { entity_fromSlug: { entity: "property", fromSlug: slug } } });
      if (moved) permanentRedirect(`/stays/${moved.toSlug}`);
    }
    notFound();
  }

  const scene = p.destination.scene as PlateScene | undefined;
  const mood = p.destination.mood as PlateMood | undefined;
  const wa = waMessage.property(p.name, p.destination.name, p.slug);
  const similar = similarTo(p);
  const price = priceLine(p);
  const [blocked, calendar] = hasDatabase()
    ? await Promise.all([getBlockedRanges(p.id), getCalendarStatus(p.id)])
    : [[], { channels: [] as string[], lastSyncedAt: null, listings: [] as { label: string; url: string }[] }];
  // Availability is only claimed when a platform's calendar is actually in
  // step. With none synced (the Vercel demo, or before Airbnb is connected)
  // the site cannot know which nights are free, so it says nothing.
  const synced = calendar.channels.length > 0;
  const weekend = synced ? nextFreeWeekend(blocked) : null;

  const trail = [
    { name: "Home", path: "/" },
    { name: "Stays", path: "/stays" },
    { name: p.destination.name, path: `/destinations/${p.destination.slug}` },
    { name: p.name, path: `/stays/${p.slug}` },
  ];

  return (
    <>
      {/* 1 · Gallery */}
      <section className="shell pt-[calc(var(--header-h)+1.75rem)]">
        <div className="mb-6">
          <Breadcrumbs trail={trail} />
        </div>
        <Gallery
          slug={p.slug}
          images={p.images}
          count={p.imageCount}
          name={p.name}
          scene={scene}
          mood={mood}
        />
      </section>

      {/* 2 · Header block */}
      <header className="shell mt-8 lg:mt-10">
        <div className="flex items-start justify-between gap-x-6">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Chip icon={iconFor(p.category.iconKey)}>{p.category.name}</Chip>
              {p.isRiderFriendly && <Chip icon="motorcycle">Rider-friendly</Chip>}
            </div>

            <h1 className="t-display-l mt-5">{p.name}</h1>

            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-text-low">
              <span className="flex items-center gap-1.5 text-[0.9375rem]">
                <Icon name="pin" size={16} className="shrink-0 opacity-70" />
                {p.locality ? `${p.locality}, ` : ""}
                {p.city}, {p.state}
              </span>
              {/* Rating renders only when a real value exists. DPR §12 */}
              {p.ratingValue !== null && (
                <span className="flex items-center gap-1.5 text-gold-500">
                  <Icon name="star" size={15} className="fill-current" />
                  <span className="t-num text-sm">{p.ratingValue.toFixed(1)}</span>
                  {p.ratingCount ? (
                    <span className="t-caption">({p.ratingCount})</span>
                  ) : null}
                </span>
              )}
            </p>
          </div>

          <SaveControl slug={p.slug} name={p.name} className="mt-1 shrink-0" />
        </div>

        {/*
          Trust, from facts only. A brand-new listing has no reviews yet and
          none are invented; what it does have is a live listing on a platform
          guests already trust, a calendar kept in step with it, and a person
          on the other end. DPR §4.6
        */}
        <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-[color:var(--hairline)] pt-5 text-[0.875rem] text-text-mid">
          {weekend && (
            <li className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-ok shadow-[0_0_0_4px_rgba(63,191,135,0.15)]" />
              Next free weekend{" "}
              <a href="#calendar" className="font-medium text-text-hi underline-offset-4 hover:underline">
                {shortDay(weekend.checkIn)} → {shortDay(weekend.checkOut)}
              </a>
            </li>
          )}
          {calendar.listings.map((l) => (
            <li key={l.url}>
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer noopener"
                className="press-sm flex items-center gap-2 transition-colors hover:text-text-hi"
              >
                <Icon name="check" size={15} className="text-ok" />
                Also listed on {l.label}
                <Icon name="arrowUpRight" size={13} className="text-text-low" />
              </a>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <Icon name="whatsapp" size={15} className="text-text-low" />
            Confirmed by a person, same day
          </li>
          <li className="flex items-center gap-2">
            <Icon name="shield" size={15} className="text-text-low" />
            Nothing paid on this site
          </li>
        </ul>
      </header>

      {/* 3 · Two-column body. Bottom padding clears the mobile CTA bar. */}
      <div className="shell mt-12 grid gap-x-16 gap-y-14 pb-20 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:pb-28">
        <div className="min-w-0">
          <QuickFacts property={p} />

          {/*
            The booking flow, in reading order, for the screens that have no
            sticky column. The mobile CTA bar anchors here rather than opening
            WhatsApp cold — a message that already carries dates gets answered
            once instead of three times.
          */}
          <section
            id="availability"
            data-wa-hide=""
            className="mt-12 scroll-mt-28 rounded-surface border border-[color:var(--hairline-str)] bg-ink-800/70 p-6 lg:hidden"
          >
            <h2
              className="font-display text-lg leading-tight tracking-[-0.01em] text-text-hi"
              style={{ fontWeight: 800 }}
            >
              Check availability
            </h2>
            <p className="t-caption mt-2">
              Confirmed by a person, not by a checkout page.
            </p>
            <CheckAvailability property={p} blocked={blocked} suggestWeekend={synced} variant="inline" className="mt-5" />
          </section>

          <Block title="About this stay">
            <div className="max-w-[68ch] space-y-4 text-[1.0625rem] leading-relaxed text-text-mid">
              {p.description.split("\n\n").map((para) => (
                <p key={para.slice(0, 24)}>{para}</p>
              ))}
            </div>
          </Block>

          {p.sleeping.length > 0 && (
            <Block title="Where you will sleep">
              <ul className="grid gap-3 sm:grid-cols-3">
                {p.sleeping.map((room) => (
                  <li
                    key={room.room}
                    className="rounded-card border border-[color:var(--hairline)] bg-ink-800/60 px-5 py-5"
                  >
                    <Icon name="bed" size={22} className="text-text-low" />
                    <p className="mt-4 text-[0.9375rem] font-medium text-text-hi">{room.room}</p>
                    <p className="t-caption mt-1">{room.beds}</p>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {synced && (
          <Block title="Availability" id="calendar">
            <div className="rounded-surface border border-[color:var(--hairline)] bg-ink-800/50 p-5 sm:p-7">
              <AvailabilityCalendar blocked={blocked} months={2} readOnly />
            </div>
            <p className="t-caption mt-4 flex items-start gap-2">
              <Icon name="calendar" size={15} className="mt-0.5 shrink-0" />
              <span>
                {calendar.channels.length
                  ? `Kept in step with ${calendar.channels.join(", ")}${
                      calendar.lastSyncedAt ? ` — checked ${relativeTime(calendar.lastSyncedAt)}` : ""
                    }. Struck-through nights are taken.`
                  : "Struck-through nights are taken. We confirm every date with a person before anything is paid."}
              </span>
            </p>
          </Block>
          )}

          {p.curatorNote && (
            <Block title="Why StaySutra recommends it">
              <figure className="border-l-2 border-gold-500 pl-6 lg:pl-8">
                <blockquote>
                  <p className="max-w-[54ch] text-[1.125rem] leading-relaxed text-text-hi lg:text-[1.25rem]">
                    {p.curatorNote}
                  </p>
                </blockquote>
                <figcaption className="t-caption mt-5 uppercase tracking-[0.16em]">
                  The StaySutra team
                </figcaption>
              </figure>
            </Block>
          )}

          {p.amenities.length > 0 && (
            <Block title="Amenities">
              <AmenityGroups items={p.amenities} />
            </Block>
          )}

          {/* 7 · The differentiator. It gets real estate. */}
          {p.isRiderFriendly && p.facilities.length > 0 && (
            <Block title="For the bike">
              <div className="rounded-surface border border-[color:var(--hairline-str)] bg-ink-800/70 p-6 lg:p-8">
                {p.riderNote && (
                  <p className="max-w-[58ch] text-[1.0625rem] leading-relaxed text-text-hi">
                    {p.riderNote}
                  </p>
                )}
                <ul className="mt-7 grid gap-x-8 sm:grid-cols-2">
                  {p.facilities.map((f) => (
                    <li
                      key={f.slug}
                      className="flex items-start gap-3.5 border-t border-[color:var(--hairline)] py-4"
                    >
                      <Icon
                        name={iconFor(f.iconKey)}
                        size={21}
                        className="mt-0.5 shrink-0 text-text-low"
                      />
                      <div>
                        <p className="text-[0.9375rem] font-medium leading-tight text-text-hi">
                          {f.name}
                        </p>
                        {f.description && <p className="t-caption mt-1">{f.description}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Block>
          )}

          {p.experiences.length > 0 && (
            <Block title="Things to do here">
              <ul className="flex flex-wrap gap-2">
                {p.experiences.map((e) => (
                  <li key={e.slug}>
                    <Chip icon={iconFor(e.iconKey)} tone="outline" className="px-3.5 py-2">
                      {e.name}
                    </Chip>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {/* 10 · Location. A static plate keeps interactive-map JS off the
              critical path; the link opens the real thing. DPR §7.6 (10) */}
          <Block title="Where it is">
            <div className="overflow-hidden rounded-card border border-[color:var(--hairline)]">
              <div className="relative aspect-[21/9]">
                <Plate seed={`map-${p.slug}`} scene={scene} mood="night" muted />
                <div className="absolute inset-0 grid place-items-center">
                  <span className="glass flex items-center gap-2 rounded-pill px-4 py-2 text-[0.8125rem] font-medium text-text-hi">
                    <Icon name="pin" size={15} />
                    {p.locality || p.city}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 bg-ink-800 px-5 py-4">
                <p className="text-[0.9375rem] text-text-mid">
                  {p.locality ? `${p.locality}, ` : ""}
                  {p.city}, {p.state}
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    p.latitude != null && p.longitude != null
                      ? `${p.latitude},${p.longitude}`
                      : `${p.name}, ${p.locality || ""} ${p.city} ${p.state}`,
                  )}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="press-sm inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-gold-500 transition-colors hover:text-gold-400"
                >
                  Open in Maps
                  <Icon name="arrowUpRight" size={15} />
                </a>
              </div>
            </div>

            {p.nearbyPlaces.length > 0 && (
              <ul className="mt-8 grid gap-x-10 sm:grid-cols-2">
                {p.nearbyPlaces.map((place) => (
                  <li
                    key={place.title}
                    className="flex items-baseline justify-between gap-4 border-t border-[color:var(--hairline)] py-3.5"
                  >
                    <span className="min-w-0 text-[0.9375rem] text-text-mid">
                      {place.title}
                      <span className="t-caption ml-2">{place.type}</span>
                    </span>
                    {place.distanceKm !== null && (
                      <span className="t-num shrink-0 text-sm text-text-low">
                        {place.distanceKm} km
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Block>

          {/* 11 · Nearby routes. Links are reserved for the Future Phase. */}
          {p.nearbyRoutes.length > 0 && (
            <Block title="Roads from here">
              <ul>
                {p.nearbyRoutes.map((route) => (
                  <li
                    key={route.title}
                    className="grid grid-cols-[1fr_auto] gap-x-6 border-t border-[color:var(--hairline)] py-5 last:border-b"
                  >
                    <div className="min-w-0">
                      <h3
                        className="font-display text-base leading-tight tracking-tight text-text-hi"
                        style={{ fontWeight: 700 }}
                      >
                        {route.title}
                      </h3>
                      {route.note && (
                        <p className="mt-1.5 max-w-[54ch] text-[0.9375rem] leading-relaxed text-text-low">
                          {route.note}
                        </p>
                      )}
                    </div>
                    {route.distanceKm !== null && route.distanceKm > 0 && (
                      <span className="t-num shrink-0 pt-1 text-sm text-text-low">
                        {route.distanceKm} km
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {/* House rules, times and the cancellation position. */}
          <Block title="House rules &amp; policies">
            <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <ul className="grid grid-cols-2 border-y border-[color:var(--hairline)]">
                  <li className="py-4 pr-4">
                    <p className="t-caption uppercase tracking-[0.14em]">Check-in</p>
                    <p className="t-num mt-1.5 text-lg text-text-hi">
                      {p.checkInTime ? clockTime(p.checkInTime) : "Ask us"}
                    </p>
                  </li>
                  <li className="border-l border-[color:var(--hairline)] py-4 pl-4">
                    <p className="t-caption uppercase tracking-[0.14em]">Check-out</p>
                    <p className="t-num mt-1.5 text-lg text-text-hi">
                      {p.checkOutTime ? clockTime(p.checkOutTime) : "Ask us"}
                    </p>
                  </li>
                </ul>
                {p.facilities.some((f) => f.slug === "late-check-in") && (
                  <p className="mt-4 flex items-start gap-2.5 text-[0.9375rem] leading-relaxed text-text-mid">
                    <Icon name="clock" size={17} className="mt-0.5 shrink-0 text-text-low" />
                    Late arrivals are expected here. Tell us roughly when you will get in and the
                    host will wait up.
                  </p>
                )}
                {p.minNights > 1 && (
                  <p className="t-caption mt-4">Minimum stay: {plural(p.minNights, "night")}.</p>
                )}
              </div>

              {p.houseRules.length > 0 && (
                <ul>
                  {p.houseRules.map((rule) => (
                    <li
                      key={rule}
                      className="flex items-start gap-3 border-t border-[color:var(--hairline)] py-3.5 last:border-b"
                    >
                      <Icon name="check" size={16} className="mt-1 shrink-0 text-text-low" />
                      <span className="text-[0.9375rem] leading-relaxed text-text-mid">{rule}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-9 rounded-card border border-[color:var(--hairline)] bg-ink-800/60 p-6">
              <h3 className="t-caption uppercase tracking-[0.16em] text-text-mid">Cancellation</h3>
              <p className="mt-3 max-w-[62ch] text-[0.9375rem] leading-relaxed text-text-mid">
                {p.cancellationPolicy ?? settings.policies.cancellation}
              </p>
              {!p.cancellationPolicy && (
                <p className="t-caption mt-3 max-w-[62ch]">{settings.policies.cancellationNote}</p>
              )}
            </div>
          </Block>

          {/* 9 · Pricing, with honest microcopy about what is confirmed when. */}
          <Block title="What it costs">
            <div className="flex flex-wrap items-end justify-between gap-6 rounded-surface border border-[color:var(--hairline)] bg-ink-800/60 px-6 py-6">
              <div className="max-w-[34ch]">
                {price ? (
                  <>
                    <p className="flex items-baseline gap-2">
                      <span className="t-caption uppercase tracking-[0.14em]">{price.label}</span>
                      <span className="t-num text-3xl text-text-hi">{price.amount}</span>
                      <span className="t-caption">/ night</span>
                    </p>
                    {price.perHead && (
                      <p className="mt-2 text-[0.9375rem] font-medium text-gold-400">{price.perHead}</p>
                    )}
                    <p className="t-caption mt-2">{p.priceNote ?? "per night"}</p>
                  </>
                ) : (
                  <p className="t-heading">Price on request</p>
                )}
              </div>
              <p className="max-w-[38ch] text-[0.9375rem] leading-relaxed text-text-low">
                Rates move with the season, the group size and the night of the week. We
                confirm the final number, and whether the dates are free, when you enquire —
                there is no instant booking here on purpose.
              </p>
            </div>

          </Block>

          {/*
            13 · Review structure. Built and hidden — it renders the moment real
            reviews exist, and is deliberately never stubbed with invented ones.
            DPR §7.6 (13), §4.6
          */}
          {p.ratingValue !== null && p.ratingCount ? (
            <Block title="What guests said">
              <p className="flex items-center gap-3">
                <Icon name="star" size={20} className="fill-current text-gold-500" />
                <span className="t-num text-2xl text-text-hi">{p.ratingValue.toFixed(1)}</span>
                <span className="t-caption">from {plural(p.ratingCount, "review")}</span>
              </p>
            </Block>
          ) : null}

        </div>

        <StickyEnquire property={p} blocked={blocked} suggestWeekend={synced} waMessage={wa} />
      </div>

      {/*
        14 · The long-form enquiry, after the two-column body rather than inside
        it. Inside, it sat directly beside the sticky card asking for the same
        dates and the same head count — two forms for one question.
      */}
      <section
        id="enquire"
        data-wa-hide=""
        aria-labelledby="enquire-title"
        className="scroll-mt-28 border-t border-[color:var(--hairline)]"
      >
        <div className="shell grid gap-12 py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20 lg:py-28">
          <div>
            <h2 id="enquire-title" className="t-display-m max-w-[14ch]">
              Ask about {p.name}
            </h2>
            <p className="mt-5 max-w-[42ch] text-[0.9375rem] leading-relaxed text-text-mid">
              Dates, group size, when you expect to roll in. We check with the host and reply
              on WhatsApp the same day, or by email if you would rather.
            </p>
            <a
              href={whatsappLink(wa)}
              target="_blank"
              rel="noreferrer noopener"
              className="press-sm mt-8 inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-medium text-text-hi underline decoration-[color:var(--hairline-str)] underline-offset-4 transition-colors hover:text-gold-400"
            >
              <Icon name="whatsapp" size={18} />
              Or message us on WhatsApp
            </a>
          </div>
          <div className="max-w-xl">
            <EnquiryForm source="PROPERTY" propertySlug={p.slug} waMessage={wa} withDates blocked={blocked} />
          </div>
        </div>
      </section>

      {/* 12 · Similar stays */}
      {similar.length > 0 && (
        <section
          aria-labelledby="similar-title"
          className="border-t border-[color:var(--hairline)] bg-ink-800/40"
        >
          <div className="shell py-20 lg:py-28">
            <Reveal>
              <h2 id="similar-title" className="t-display-m">
                You might also like
              </h2>
            </Reveal>
            <Reveal className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s) => (
                <PropertyCard
                  key={s.slug}
                  property={s}
                  sizes="(min-width:1024px) 30vw, 46vw"
                />
              ))}
            </Reveal>
            <p className="mt-12">
              <Link
                href={`/destinations/${p.destination.slug}`}
                className="press-sm inline-flex min-h-11 items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-mid transition-colors hover:text-gold-400"
              >
                All stays in {p.destination.name}
                <Icon name="arrowRight" size={16} />
              </Link>
            </p>
          </div>
        </section>
      )}

      <WhatsAppFloat message={wa} source={`property:${p.slug}`} desktopOnly />

      <JsonLd data={[lodgingSchema(p), breadcrumbSchema(trail)]} />
    </>
  );
}

/* — Blocks ————————————————————————————————————————————————— */

/** "12 minutes ago" — the age of the last calendar sync. */
function relativeTime(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function Block({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-14 scroll-mt-28 lg:mt-20">
      <h2
        className="font-display text-xl leading-tight tracking-[-0.01em] text-text-hi lg:text-2xl"
        style={{ fontWeight: 800 }}
      >
        {title}
      </h2>
      <Rule className="mt-4" />
      <div className="mt-7">{children}</div>
    </section>
  );
}

/**
 * 4 · Quick facts strip.
 *
 * Six facts, because check-out is the one people go looking for on the morning
 * they leave and it was the only fact on this list a guest could not find
 * without opening WhatsApp. Two columns on a phone, three on a tablet, six on a
 * desktop — the dividers follow the column count rather than assuming one.
 */
function QuickFacts({ property: p }: { property: PropertyView }) {
  const facts: { icon: Parameters<typeof Icon>[0]["name"]; label: string; value: string }[] = [
    { icon: "guests", label: "Guests", value: String(p.maxGuests) },
    { icon: "bed", label: p.bedrooms === 1 ? "Bedroom" : "Bedrooms", value: String(p.bedrooms) },
    { icon: "bath", label: p.bathrooms === 1 ? "Bathroom" : "Bathrooms", value: String(p.bathrooms) },
    { icon: "homestay", label: p.beds === 1 ? "Bed" : "Beds", value: String(p.beds) },
    // Times show only when the host has set them — a fact reading "Ask us"
    // is a slot spent on saying nothing.
    ...(p.checkInTime
      ? [{ icon: "clock" as const, label: "Check-in", value: clockTime(p.checkInTime) }]
      : []),
    ...(p.checkOutTime
      ? [{ icon: "clock" as const, label: "Check-out", value: clockTime(p.checkOutTime) }]
      : []),
  ];
  const cols =
    facts.length === 6
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
      : facts.length === 5
        ? "grid-cols-2 sm:grid-cols-5"
        : "grid-cols-2 sm:grid-cols-4";

  // Hairlines come from the 1px gap over a hairline background, so the
  // dividers are right for any number of facts at any column count.
  return (
    <ul className={`grid gap-px border-y border-[color:var(--hairline)] bg-[var(--hairline)] ${cols}`}>
      {facts.map((f) => (
        <li key={f.label} className="flex items-center gap-3 bg-ink-900 px-1 py-5 sm:px-4 sm:first:pl-0">
          <Icon name={f.icon} size={21} className="shrink-0 text-text-low" />
          <span className="min-w-0">
            <span className="t-num block text-lg text-text-hi">{f.value}</span>
            <span className="t-caption mt-0.5 block">{f.label}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
