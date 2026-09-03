import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/site/PageHero";
import { FilterBar } from "@/components/site/FilterBar";
import { PropertyResults } from "@/components/site/PropertyResults";
import { PropertyGridSkeleton } from "@/components/primitives/Skeleton";
import { JsonLd } from "@/components/site/JsonLd";
import { applyFilters, parseFilters, type SearchParams } from "@/lib/filters";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Explore stays",
  description:
    "Every StaySutra property, filterable by destination, type, group size, price and rider facilities. Covered bike parking, late check-in, hosts who ride.",
  path: "/stays",
});

/**
 * Filtered views canonicalise to the clean listing URL, so a hundred filter
 * combinations do not become a hundred indexed pages. DPR §8.1
 */
export default async function StaysPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const count = applyFilters(filters).length;

  return (
    <>
      <PageHero
        overline="Every stay we have"
        title="Explore stays"
        lede="Mountains, beaches, forests or highways — filtered the way a rider actually chooses: by what happens to the bike overnight."
        seed="stays-index"
        scene="ghat"
        mood="dawn"
        size="sm"
        trail={[
          { name: "Home", path: "/" },
          { name: "Stays", path: "/stays" },
        ]}
      />

      <div className="shell pb-24 lg:pb-32">
        <Suspense fallback={null}>
          <FilterBar resultCount={count} />
        </Suspense>
        <Suspense fallback={<PropertyGridSkeleton />}>
          <PropertyResults filters={filters} heading="Stays" />
        </Suspense>
      </div>

      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Stays", path: "/stays" },
        ])}
      />
    </>
  );
}
