import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/site/PageHero";
import { PropertyCard } from "@/components/site/PropertyCard";
import { DestinationTile } from "@/components/site/DestinationTile";
import { EnquiryForm } from "@/components/site/EnquiryForm";
import { EmptyState } from "@/components/site/EmptyState";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import { JsonLd } from "@/components/site/JsonLd";
import { Frame } from "@/components/primitives/Frame";
import { Icon } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { ButtonLink, TextLink } from "@/components/primitives/Button";
import { Reveal } from "@/components/motion/Reveal";
import {
  destinations,
  getDestination,
  nearbyDestinations,
  propertiesIn,
  storiesFor,
} from "@/lib/content";
import { breadcrumbSchema, destinationSchema, pageMeta } from "@/lib/seo";
import { waMessage } from "@/lib/site";
import { formatDate, plural } from "@/lib/utils";
import type { PlateMood, PlateScene } from "@/lib/plate";

export function generateStaticParams() {
  return destinations.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const d = getDestination(slug);
  if (!d) return {};

  return pageMeta({
    title: `Rider-friendly stays in ${d.name}`,
    description: `${d.shortIntro} Stays, road notes and the best season to ride ${d.name}, ${d.state}.`,
    path: `/destinations/${d.slug}`,
  });
}

/**
 * The destination template. A destination created in the dashboard renders a
 * complete page with no code change, and every optional section hides rather
 * than rendering a blank heading. DPR §7.5
 */
export default async function DestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const d = getDestination(slug);
  if (!d) notFound();

  const stays = propertiesIn(d.slug);
  const stories = storiesFor(d.slug);
  const nearby = nearbyDestinations(d.slug);
  const wa = waMessage.destination(d.name);

  const trail = [
    { name: "Home", path: "/" },
    { name: "Destinations", path: "/destinations" },
    { name: d.name, path: `/destinations/${d.slug}` },
  ];

  return (
    <>
      <PageHero
        overline={d.state}
        title={d.name}
        lede={d.shortIntro}
        seed={`destination-${d.slug}`}
        scene={d.scene as PlateScene | undefined}
        mood={d.mood as PlateMood | undefined}
        size="lg"
        trail={trail}
        meta={
          <p className="t-caption tabular-nums">
            {stays.length > 0 ? plural(stays.length, "stay") : "Stays being onboarded"}
          </p>
        }
      />

      {/* Long description + the rider brief, side by side. */}
      <section className="shell py-20 lg:py-28">
        <Reveal className="grid gap-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20">
          <div className="max-w-[68ch] space-y-5 text-[1.0625rem] leading-relaxed text-text-mid">
            {d.description.split("\n\n").map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
          </div>

          <aside aria-labelledby="ride-brief">
            <Rule className="mb-5 max-w-24" />
            <h2 id="ride-brief" className="t-overline">
              Why riders come here
            </h2>
            <dl className="mt-6">
              {[
                { icon: "route" as const, term: "Getting there", detail: d.rideNote },
                { icon: "motorcycle" as const, term: "Road character", detail: d.roadNote },
                { icon: "compass" as const, term: "Best season", detail: d.bestSeason },
              ]
                .filter((row) => row.detail)
                .map((row) => (
                  <div
                    key={row.term}
                    className="grid grid-cols-[auto_1fr] gap-x-4 border-t border-[color:var(--hairline)] py-5 last:border-b"
                  >
                    <Icon name={row.icon} size={21} className="mt-0.5 text-text-low" />
                    <div>
                      <dt className="text-[0.9375rem] font-medium text-text-hi">{row.term}</dt>
                      <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-text-low">
                        {row.detail}
                      </dd>
                    </div>
                  </div>
                ))}
            </dl>
          </aside>
        </Reveal>
      </section>

      {/* Stays here */}
      <section
        aria-labelledby="stays-here"
        className="border-t border-[color:var(--hairline)] bg-ink-800/40"
      >
        <div className="shell py-20 lg:py-28">
          <Reveal className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Rule className="mb-5 max-w-24" />
              <p className="t-overline">Where to sleep</p>
              <h2 id="stays-here" className="t-display-m mt-4">
                Stays in {d.name}
              </h2>
            </div>
            {stays.length > 0 && (
              <TextLink href={`/stays?destination=${d.slug}`}>
                Filter all {d.name} stays
              </TextLink>
            )}
          </Reveal>

          {stays.length > 0 ? (
            <Reveal className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {stays.map((p, i) => (
                <PropertyCard key={p.slug} property={p} priority={i < 3} />
              ))}
            </Reveal>
          ) : (
            <EmptyState
              className="mt-12"
              title="Stays here are being onboarded"
              body={`We are talking to hosts in ${d.name} now. In the meantime, tell us your dates and we will find you something nearby.`}
              waMessage={wa}
              actions={
                <ButtonLink href="/destinations" variant="quiet">
                  Nearby destinations
                </ButtonLink>
              }
            />
          )}
        </div>
      </section>

      {/* Related stories — hides entirely when there are none. */}
      {stories.length > 0 && (
        <section aria-labelledby="stories-here" className="shell py-20 lg:py-28">
          <Reveal>
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">From the road</p>
            <h2 id="stories-here" className="t-display-m mt-4">
              Stories from {d.name}
            </h2>
          </Reveal>
          <Reveal className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((s) => (
              <Link key={s.slug} href={`/stories/${s.slug}`} className="press group block">
                <Frame
                  seed={`story-${s.slug}`}
                  ratio="16/9"
                  muted
                  sizes="(min-width:1024px) 30vw, 45vw"
                  className="rounded-card"
                  imgClassName="transition-transform duration-[480ms] ease-out-quint group-hover:scale-[1.05]"
                />
                <p className="t-caption mt-4 tabular-nums">
                  {formatDate(s.publishedAt)} · {s.readMinutes} min read
                </p>
                <h3
                  className="mt-2 font-display text-lg uppercase leading-tight tracking-tight text-text-hi"
                  style={{ fontWeight: 700 }}
                >
                  {s.title}
                </h3>
              </Link>
            ))}
          </Reveal>
        </section>
      )}

      {/* Enquiry + nearby */}
      <section className="border-t border-[color:var(--hairline)]">
        <div className="shell grid gap-14 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20 lg:py-28">
          <div>
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">Tell us what you need</p>
            <h2 className="t-display-m mt-4 max-w-[16ch] text-balance">
              Planning a ride to {d.name}?
            </h2>
            <p className="mt-6 max-w-[44ch] text-[0.9375rem] leading-relaxed text-text-mid">
              Send us the dates and the group size. We come back the same day with
              what is actually free, and what the roads are doing that weekend.
            </p>

            {nearby.length > 0 && (
              <div className="mt-12">
                <h3 className="t-caption uppercase tracking-[0.18em] text-text-hi">
                  Nearby
                </h3>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {nearby.map((n) => (
                    <DestinationTile
                      key={n.slug}
                      destination={n}
                      parallax={false}
                      sizes="20vw"
                      className="min-h-[10rem]"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="max-w-xl">
            <EnquiryForm
              source="DESTINATION"
              destinationSlug={d.slug}
              waMessage={wa}
              withDates
            />
          </div>
        </div>
      </section>

      <WhatsAppFloat message={wa} source={`destination:${d.slug}`} />

      <JsonLd data={[destinationSchema(d), breadcrumbSchema(trail)]} />
    </>
  );
}
