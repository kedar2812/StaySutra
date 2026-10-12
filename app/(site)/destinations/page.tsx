import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { DestinationTile } from "@/components/site/DestinationTile";
import { JsonLd } from "@/components/site/JsonLd";
import { Reveal } from "@/components/motion/Reveal";
import { destinations } from "@/lib/content";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = pageMeta({
  title: "Destinations",
  description:
    "Lonavala, Karjat, Alibaug, Pune, Mumbai and Goa — where StaySutra has stays, what the roads are like, and when to ride them.",
  path: "/destinations",
});

const trail = [
  { name: "Home", path: "/" },
  { name: "Destinations", path: "/destinations" },
];

export default function DestinationsPage() {
  const [lead, ...rest] = destinations;

  return (
    <>
      <PageHero
        title="Places worth riding to."
        lede="Six regions across Maharashtra and Goa, chosen because the roads to them are worth the journey and the hosts there understand who is arriving."
        seed="destinations-index"
        scene="ghat"
        mood="dusk"
        size="sm"
        trail={trail}
      />

      <section aria-labelledby="dest-list" className="shell pb-24 lg:pb-32">
        <h2 id="dest-list" className="sr-only">
          All destinations
        </h2>
        {lead && (
          /*
            Six columns. The lead takes four and two rows; two tiles stack
            beside it; the rest run three across underneath. The lead used to
            span one row only, which pushed the second side tile down a row and
            left a hole the width of a tile at the right of the grid.
          */
          <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <DestinationTile
              destination={lead}
              size="lg"
              sizes="(min-width:1024px) 66vw, 92vw"
              className="min-h-[26rem] sm:col-span-2 lg:col-span-4 lg:row-span-2 lg:min-h-[32rem]"
            />
            {rest.map((d, i) => (
              <DestinationTile
                key={d.slug}
                destination={d}
                sizes="(min-width:1024px) 33vw, 45vw"
                className={cn(
                  "min-h-[16rem] lg:col-span-2",
                  // An odd tile out on the two-column layout takes the full row.
                  i === rest.length - 1 && rest.length % 2 === 1 && "sm:col-span-2 lg:col-span-2",
                )}
              />
            ))}
          </Reveal>
        )}
      </section>

      <JsonLd data={breadcrumbSchema(trail)} />
    </>
  );
}
