import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/site/PageHero";
import { EmptyState } from "@/components/site/EmptyState";
import { JsonLd } from "@/components/site/JsonLd";
import { Frame } from "@/components/primitives/Frame";
import { ChipLink } from "@/components/primitives/Chip";
import { Reveal } from "@/components/motion/Reveal";
import { activeStoryCategories, stories } from "@/lib/content";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";
import { formatDate } from "@/lib/utils";
import type { SearchParams } from "@/lib/filters";

export const metadata: Metadata = pageMeta({
  title: "Stories from the road",
  description:
    "Route write-ups, road notes and what actually happened on the ride — from the Sahyadri ghats to the Konkan coast.",
  path: "/stories",
});

const trail = [
  { name: "Home", path: "/" },
  { name: "Stories", path: "/stories" },
];

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const raw = params.category;
  const category = (Array.isArray(raw) ? raw[0] : raw) || undefined;

  const filtered = category ? stories.filter((s) => s.categorySlug === category) : stories;
  const [lead, ...rest] = filtered;

  return (
    <>
      <PageHero
        overline="#staysutrariders"
        title="Stories from the road"
        lede="What the maps do not tell you: which ghat is worth the detour, what July actually does to visibility, and where the good chai is at 6am."
        seed="stories-index"
        scene="highway"
        mood="dawn"
        size="sm"
        trail={trail}
      />

      <div className="shell pb-24 lg:pb-32">
        <nav aria-label="Story categories" className="flex flex-wrap gap-2">
          <ChipLink href="/stories" active={!category}>
            All
          </ChipLink>
          {activeStoryCategories.map((c) => (
            <ChipLink
              key={c.slug}
              href={`/stories?category=${c.slug}`}
              active={category === c.slug}
            >
              {c.name}
            </ChipLink>
          ))}
        </nav>

        {!lead ? (
          <EmptyState
            className="mt-12"
            title="Nothing published here yet"
            body="The first write-ups are being finished. In the meantime, ask us about a route directly — we will tell you what we know."
            waMessage="Hi StaySutra, I'd like route advice for a ride I'm planning."
          />
        ) : (
          <>
            {/* Featured lead — a wide editorial card, not another grid tile. */}
            <Reveal className="mt-10">
              <Link href={`/stories/${lead.slug}`} className="press group block">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-center">
                  <Frame
                    seed={`story-${lead.slug}`}
                    ratio="16/9"
                    sizes="(min-width:1024px) 58vw, 92vw"
                    priority
                    className="rounded-card"
                    imgClassName="transition-transform duration-[520ms] ease-out-quint group-hover:scale-[1.03]"
                  />
                  <div>
                    <p className="t-caption tabular-nums">
                      {formatDate(lead.publishedAt)} · {lead.readMinutes} min read
                    </p>
                    <h2 className="t-display-m mt-4 max-w-[20ch] text-balance">
                      {lead.title}
                    </h2>
                    <p className="mt-5 max-w-[48ch] text-[1.0625rem] leading-relaxed text-text-mid">
                      {lead.excerpt}
                    </p>
                    <span className="mt-6 block h-px w-full max-w-[12rem] bg-[var(--hairline)]">
                      <span className="block h-px w-0 bg-gold-500 transition-[width] duration-[420ms] ease-out-quint group-hover:w-full" />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>

            {rest.length > 0 && (
              <Reveal className="mt-20 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((s) => (
                  <Link key={s.slug} href={`/stories/${s.slug}`} className="press group block">
                    <Frame
                      seed={`story-${s.slug}`}
                      ratio="4/3"
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
                    <p className="mt-3 text-[0.9375rem] leading-relaxed text-text-low">
                      {s.excerpt}
                    </p>
                  </Link>
                ))}
              </Reveal>
            )}
          </>
        )}
      </div>

      <JsonLd data={breadcrumbSchema(trail)} />
    </>
  );
}
