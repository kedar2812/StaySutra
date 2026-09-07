import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import { getProperty, properties, similarTo } from "@/lib/content";
import { breadcrumbSchema, lodgingSchema, pageMeta } from "@/lib/seo";
import { settings, waMessage } from "@/lib/site";
import { inr, plural } from "@/lib/utils";
import type { PlateMood, PlateScene } from "@/lib/plate";
import type { PropertyView } from "@/lib/types";

export function generateStaticParams() {
  return properties.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getProperty(slug);
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
  const { slug } = await params;
  const p = getProperty(slug);
  if (!p) notFound();

  const scene = p.destination.scene as PlateScene | undefined;
  const mood = p.destination.mood as PlateMood | undefined;
  const wa = waMessage.property(p.name, p.destination.name, p.slug);
  const similar = similarTo(p);

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
        <Gallery slug={p.slug} count={p.imageCount} name={p.name} scene={scene} mood={mood} />
      </section>

      {/* 2 · Header block */}
      <header className="shell mt-10">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Chip icon={iconFor(p.category.iconKey)}>{p.category.name}</Chip>
              {p.isRiderFriendly && (
                <Chip icon="motorcycle" tone="gold">
                  Rider favourite
                </Chip>
              )}
              {p.availability === "ON_REQUEST" && <Chip>On request</Chip>}
            </div>

            <h1 className="t-display-l mt-5 text-balance">{p.name}</h1>

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

          <SaveControl slug={p.slug} name={p.name} className="shrink-0" />
        </div>
      </header>

      {/* 3 · Two-column body. Bottom padding clears the mobile CTA bar. */}
      <div className="shell mt-12 grid gap-x-16 gap-y-14 pb-32 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:pb-32">
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
            className="mt-12 scroll-mt-28 rounded-surface border border-[color:var(--hairline-str)] bg-ink-800/70 p-6 lg:hidden"
          >
            <h2
              className="font-display text-lg uppercase leading-tight tracking-[-0.01em] text-text-hi"
              style={{ fontWeight: 800 }}
            >
              Check availability
            </h2>
            <p className="t-caption mt-2">
              Confirmed by a person, not by a checkout page.
            </p>
            <CheckAvailability property={p} variant="inline" className="mt-5" />
          </section>

          <Block title="About this stay">
            <div className="max-w-[68ch] space-y-4 text-[1.0625rem] leading-relaxed text-text-mid">
              {p.description.split("\n\n").map((para) => (
                <p key={para.slice(0, 24)}>{para}</p>
              ))}
            </div>
          </Block>

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
                    `${p.name}, ${p.locality || ""} ${p.city} ${p.state}`,
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
                        className="font-display text-base uppercase leading-tight tracking-tight text-text-hi"
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
                      {p.checkInTime ?? "Flexible"}
                    </p>
                  </li>
                  <li className="border-l border-[color:var(--hairline)] py-4 pl-4">
                    <p className="t-caption uppercase tracking-[0.14em]">Check-out</p>
                    <p className="t-num mt-1.5 text-lg text-text-hi">
                      {p.checkOutTime ?? "Flexible"}
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
              <div>
                {p.startingPrice !== null ? (
                  <>
                    <p className="flex items-baseline gap-2">
                      <span className="t-caption uppercase tracking-[0.14em]">From</span>
                      <span className="t-num text-3xl text-text-hi">{inr(p.startingPrice)}</span>
                    </p>
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

          {/* 14 · Inline enquiry, in addition to the sticky card. */}
          <Block title="Ask about this stay" id="enquire">
            <div className="max-w-xl">
              <EnquiryForm source="PROPERTY" propertySlug={p.slug} waMessage={wa} withDates />
            </div>
          </Block>
        </div>

        <StickyEnquire property={p} waMessage={wa} />
      </div>

      {/* 12 · Similar stays */}
      {similar.length > 0 && (
        <section
          aria-labelledby="similar-title"
          className="border-t border-[color:var(--hairline)] bg-ink-800/40"
        >
          <div className="shell py-20 lg:py-28">
            <Reveal>
              <Rule className="mb-5 max-w-24" />
              <p className="t-overline">More like this</p>
              <h2 id="similar-title" className="t-display-m mt-4">
                Similar stays
              </h2>
            </Reveal>
            <Reveal className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((s) => (
                <PropertyCard
                  key={s.slug}
                  property={s}
                  scale="compact"
                  sizes="(min-width:1024px) 24vw, 46vw"
                />
              ))}
            </Reveal>
            <p className="mt-12">
              <Link
                href={`/destinations/${p.destination.slug}`}
                className="press-sm inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-500 transition-colors hover:text-gold-400"
              >
                All stays in {p.destination.name}
                <Icon name="arrowRight" size={16} />
              </Link>
            </p>
          </div>
        </section>
      )}

      <WhatsAppFloat message={wa} source={`property:${p.slug}`} raised />

      <JsonLd data={[lodgingSchema(p), breadcrumbSchema(trail)]} />
    </>
  );
}

/* — Blocks ————————————————————————————————————————————————— */

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
        className="font-display text-xl uppercase leading-tight tracking-[-0.01em] text-text-hi lg:text-2xl"
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
    { icon: "clock", label: "Check-in", value: p.checkInTime ?? "Flexible" },
    { icon: "clock", label: "Check-out", value: p.checkOutTime ?? "Flexible" },
  ];

  return (
    <ul className="grid grid-cols-2 border-y border-[color:var(--hairline)] sm:grid-cols-3 lg:grid-cols-6">
      {facts.map((f, i) => (
        <li
          key={f.label}
          className={[
            "flex items-center gap-3 py-5",
            i % 2 === 1 ? "border-l border-[color:var(--hairline)] pl-4" : "",
            i >= 2 ? "border-t border-[color:var(--hairline)] sm:border-t-0" : "",
            i % 3 === 0 ? "sm:border-l-0 sm:pl-0" : "sm:border-l sm:border-[color:var(--hairline)] sm:pl-4",
            i >= 3 ? "sm:border-t sm:border-[color:var(--hairline)] lg:border-t-0" : "",
            i === 0 ? "lg:border-l-0 lg:pl-0" : "lg:border-l lg:border-[color:var(--hairline)] lg:pl-4",
          ].join(" ")}
        >
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
