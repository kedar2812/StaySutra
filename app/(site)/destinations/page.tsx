import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { DestinationTile } from "@/components/site/DestinationTile";
import { JsonLd } from "@/components/site/JsonLd";
import { Reveal } from "@/components/motion/Reveal";
import { destinations } from "@/lib/content";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";

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
        overline="Where we ride"
        title="Destinations"
        lede="Six to start with, chosen because the roads to them are worth the ride and the hosts there understand who is arriving. More as both line up."
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
          <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <DestinationTile
              destination={lead}
              size="lg"
              sizes="(min-width:1024px) 66vw, 92vw"
              className="min-h-[26rem] sm:col-span-2 lg:col-span-4 lg:min-h-[30rem]"
            />
            {rest.slice(0, 2).map((d) => (
              <DestinationTile
                key={d.slug}
                destination={d}
                sizes="(min-width:1024px) 34vw, 45vw"
                className="min-h-[15rem] lg:col-span-2 lg:min-h-[14.5rem]"
              />
            ))}
            {rest.slice(2).map((d, i) => (
              <DestinationTile
                key={d.slug}
                destination={d}
                sizes="(min-width:1024px) 25vw, 45vw"
                className={
                  i === 0
                    ? "min-h-[18rem] sm:col-span-2 lg:col-span-3 lg:min-h-[19rem]"
                    : "min-h-[18rem] lg:col-span-3 lg:min-h-[19rem]"
                }
              />
            ))}
          </Reveal>
        )}
      </section>

      <JsonLd data={breadcrumbSchema(trail)} />
    </>
  );
}
