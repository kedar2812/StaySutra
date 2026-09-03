import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/site/PageHero";
import { FilterBar } from "@/components/site/FilterBar";
import { PropertyResults } from "@/components/site/PropertyResults";
import { JsonLd } from "@/components/site/JsonLd";
import { Icon, iconFor } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { Reveal } from "@/components/motion/Reveal";
import { facilities, riderFriendly, siteContent } from "@/lib/content";
import { applyFilters, parseFilters, type SearchParams } from "@/lib/filters";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";

const copy = siteContent.riderFriendly;

export const metadata: Metadata = pageMeta({
  title: "Rider-friendly stays",
  description:
    "Covered bike parking, late check-in, a wash-down tap, tools on site and hosts who ride. What rider-friendly actually means, and every StaySutra property that earns it.",
  path: "/rider-friendly-stays",
});

/**
 * A positioning page, not just a filtered listing — this page is the brand's
 * whole argument and gets its own keyword target. DPR §7.4
 */
export default async function RiderFriendlyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const count = applyFilters(filters, riderFriendly).length;

  return (
    <>
      <PageHero
        overline={copy.overline}
        title={copy.title}
        lede={copy.lede}
        seed="rider-friendly"
        scene="ghat"
        mood="dusk"
        trail={[
          { name: "Home", path: "/" },
          { name: "Rider-friendly stays", path: "/rider-friendly-stays" },
        ]}
      />

      <section className="shell py-20 lg:py-28">
        <Reveal className="grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <div>
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">The checklist</p>
            <h2 className="t-display-m mt-4 max-w-[14ch] text-balance">
              Eight questions we ask before a property goes up
            </h2>
            <p className="mt-6 max-w-[46ch] text-[0.9375rem] leading-relaxed text-text-mid">
              {copy.body}
            </p>
          </div>

          <ul className="grid gap-x-8 sm:grid-cols-2">
            {facilities.map((f) => (
              <li
                key={f.slug}
                className="flex items-start gap-4 border-t border-[color:var(--hairline)] py-5"
              >
                <Icon
                  name={iconFor(f.iconKey)}
                  size={24}
                  className="mt-0.5 shrink-0 text-text-low"
                />
                <div>
                  <h3 className="text-[0.9375rem] font-medium leading-tight text-text-hi">
                    {f.name}
                  </h3>
                  <p className="t-caption mt-1.5">{f.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      <div className="shell pb-24 lg:pb-32">
        <h2 className="t-display-l">The stays that qualify</h2>
        <Suspense fallback={null}>
          <FilterBar resultCount={count} />
        </Suspense>
        <PropertyResults
          filters={filters}
          pool={riderFriendly}
          basePath="/rider-friendly-stays"
          heading="Rider-friendly stays"
        />
      </div>

      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Rider-friendly stays", path: "/rider-friendly-stays" },
        ])}
      />
    </>
  );
}
