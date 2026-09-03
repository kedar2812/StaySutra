import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/site/PageHero";
import { Prose } from "@/components/site/Prose";
import { PropertyCard } from "@/components/site/PropertyCard";
import { DestinationTile } from "@/components/site/DestinationTile";
import { JsonLd } from "@/components/site/JsonLd";
import { Frame } from "@/components/primitives/Frame";
import { Icon } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { ButtonLink } from "@/components/primitives/Button";
import { Reveal } from "@/components/motion/Reveal";
import { Parallax } from "@/components/motion/Parallax";
import {
  getDestination,
  getStory,
  propertiesIn,
  stories,
  storyCategories,
} from "@/lib/content";
import { loadStoryBody } from "@/lib/prose";
import { articleSchema, breadcrumbSchema, pageMeta } from "@/lib/seo";
import { canonical } from "@/lib/site";
import { formatDate } from "@/lib/utils";

export function generateStaticParams() {
  return stories.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = getStory(slug);
  if (!s) return {};

  return {
    ...pageMeta({ title: s.title, description: s.excerpt, path: `/stories/${s.slug}` }),
    openGraph: {
      type: "article",
      url: canonical(`/stories/${s.slug}`),
      title: s.title,
      description: s.excerpt,
      publishedTime: s.publishedAt,
    },
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = getStory(slug);
  if (!s) notFound();

  const blocks = await loadStoryBody(s.slug);
  const category = storyCategories.find((c) => c.slug === s.categorySlug);
  const linkedDestinations = s.destinationSlugs
    .map((d) => getDestination(d))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));
  const relatedStays = linkedDestinations.flatMap((d) => propertiesIn(d.slug)).slice(0, 3);
  const more = stories.filter((other) => other.slug !== s.slug).slice(0, 3);

  const trail = [
    { name: "Home", path: "/" },
    { name: "Stories", path: "/stories" },
    { name: s.title, path: `/stories/${s.slug}` },
  ];

  return (
    <>
      <article>
        <header className="shell pt-[calc(var(--header-h)+1.75rem)]">
          <Breadcrumbs trail={trail} />

          <div className="mt-9 max-w-4xl">
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">{category?.name ?? "From the road"}</p>
            <h1 className="t-display-l mt-4 text-balance">{s.title}</h1>
            <p className="t-lede mt-6 max-w-[54ch]">{s.excerpt}</p>

            <p className="t-caption mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 tabular-nums">
              <span>{s.authorName}</span>
              <span aria-hidden className="text-text-low">·</span>
              <time dateTime={s.publishedAt}>{formatDate(s.publishedAt)}</time>
              <span aria-hidden className="text-text-low">·</span>
              <span>{s.readMinutes} min read</span>
            </p>
          </div>
        </header>

        <div className="shell mt-12">
          <Parallax className="overflow-hidden rounded-card">
            <Frame
              seed={`story-${s.slug}`}
              ratio="21/9"
              sizes="100vw"
              priority
              className="rounded-card"
            />
          </Parallax>
        </div>

        <div className="shell mt-14 lg:mt-20">
          {blocks ? (
            <Prose blocks={blocks} />
          ) : (
            <p className="max-w-[68ch] text-[1.0625rem] leading-relaxed text-text-low">
              This one is still being written. Ask us about the route on WhatsApp in
              the meantime — we will tell you what we know.
            </p>
          )}

          {/* Share row */}
          <div className="mt-16 max-w-[68ch] border-t border-[color:var(--hairline)] pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <span className="t-caption uppercase tracking-[0.18em]">Share</span>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `${s.title} — ${canonical(`/stories/${s.slug}`)}`,
                )}`}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Share on WhatsApp"
                className="press grid size-10 place-items-center rounded-pill border border-[color:var(--hairline)] text-text-low transition-colors hover:text-text-hi"
              >
                <Icon name="whatsapp" size={17} />
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(s.title)}&body=${encodeURIComponent(
                  canonical(`/stories/${s.slug}`),
                )}`}
                aria-label="Share by email"
                className="press grid size-10 place-items-center rounded-pill border border-[color:var(--hairline)] text-text-low transition-colors hover:text-text-hi"
              >
                <Icon name="mail" size={17} />
              </a>
            </div>
          </div>
        </div>
      </article>

      {/* Related destinations and stays — the internal link path back to money. */}
      {(linkedDestinations.length > 0 || relatedStays.length > 0) && (
        <section
          aria-labelledby="story-related"
          className="mt-24 border-t border-[color:var(--hairline)] bg-ink-800/40"
        >
          <div className="shell py-20 lg:py-28">
            <Reveal>
              <Rule className="mb-5 max-w-24" />
              <p className="t-overline">Ride it yourself</p>
              <h2 id="story-related" className="t-display-m mt-4">
                Where to stay
              </h2>
            </Reveal>

            {linkedDestinations.length > 0 && (
              <Reveal className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {linkedDestinations.map((d) => (
                  <DestinationTile
                    key={d.slug}
                    destination={d}
                    sizes="(min-width:1024px) 30vw, 45vw"
                    className="min-h-[14rem]"
                  />
                ))}
              </Reveal>
            )}

            {relatedStays.length > 0 && (
              <Reveal className="mt-14 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {relatedStays.map((p) => (
                  <PropertyCard
                    key={p.slug}
                    property={p}
                    sizes="(min-width:1024px) 30vw, 45vw"
                  />
                ))}
              </Reveal>
            )}

            <ButtonLink href="/stays" variant="outline" icon="arrowRight" className="mt-12">
              Explore all stays
            </ButtonLink>
          </div>
        </section>
      )}

      {more.length > 0 && (
        <section aria-labelledby="more-stories" className="shell py-20 lg:py-28">
          <Rule className="mb-5 max-w-24" />
          <h2 id="more-stories" className="t-overline">
            Read next
          </h2>
          <ul className="mt-6">
            {more.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/stories/${other.slug}`}
                  className="press-sm group grid grid-cols-[1fr_auto] items-center gap-6 border-t border-[color:var(--hairline)] py-6 last:border-b"
                >
                  <div className="min-w-0">
                    <h3
                      className="font-display text-lg uppercase leading-tight tracking-tight text-text-hi lg:text-xl"
                      style={{ fontWeight: 700 }}
                    >
                      {other.title}
                    </h3>
                    <p className="t-caption mt-2 tabular-nums">
                      {formatDate(other.publishedAt)} · {other.readMinutes} min read
                    </p>
                  </div>
                  <Icon
                    name="arrowRight"
                    size={20}
                    className="shrink-0 text-text-low transition-transform duration-300 ease-out-quint group-hover:translate-x-1"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <JsonLd data={[articleSchema(s), breadcrumbSchema(trail)]} />
    </>
  );
}
