import type { Metadata } from "next";
import { Hero } from "@/components/site/home/Hero";
import { SearchWidget } from "@/components/site/home/SearchWidget";
import { FeaturedStays } from "@/components/site/home/FeaturedStays";
import { MadeForTheRoad } from "@/components/site/home/MadeForTheRoad";
import { Destinations } from "@/components/site/home/Destinations";
import { StoriesBand } from "@/components/site/home/StoriesBand";
import { ForTheRiders } from "@/components/site/home/ForTheRiders";
import { ListYourProperty } from "@/components/site/home/ListYourProperty";
import { FinalCta } from "@/components/site/home/FinalCta";
import { pageMeta } from "@/lib/seo";
import { getContent } from "@/lib/content";
import { priceLine } from "@/lib/pricing";

export const metadata: Metadata = pageMeta({
  title: "Curated stays across Maharashtra and Goa",
  description:
    "Handpicked villas, farmhouses, resorts and homestays — with secure bike parking, late check-in and hosts who ride. Lonavala, Karjat, Alibaug, Pune, Mumbai and Goa.",
  path: "/",
});

/**
 * Eight sections, stays first.
 *
 * The page used to run twelve sections and about nineteen phone screens, with
 * the properties holding one of them and the same four promises — curated,
 * late check-in, parking, support — made three separate times. It now opens on
 * the stays, makes the rider argument once, and gives the unbuilt parts of the
 * ecosystem one honest section instead of two plus a passport pitch.
 *
 * Categories left the homepage (the type filter on /stays and in the search
 * does the same job without seven tiles reading "1 stay"), and the
 * five-column "Why book with us" strip went with them. DPR §7.2, §4.6
 */
export default async function HomePage() {
  const c = await getContent();
  const lead = c.featuredProperties[0] ?? c.properties[0];
  return (
    <>
      <Hero
        copy={c.site.home.hero}
        media={c.slot("staysutra-hero")}
        stay={
          lead
            ? {
                name: lead.name,
                place: `${lead.locality ? `${lead.locality}, ` : ""}${lead.city}`,
                href: `/stays/${lead.slug}`,
                image: lead.images[1] ?? lead.images[0] ?? null,
                price: lead.startingPrice ? `${priceLine(lead)!.amount}/night` : null,
              }
            : null
        }
      />
      {/*
        Search earns its place once there is something to narrow down. With one
        or two stays it offers six destinations and seven types that mostly
        lead to an empty grid — choice without a payoff — so it waits.
      */}
      {c.properties.length >= 3 && (
        <SearchWidget
          destinations={c.destinations.map((d) => ({
            slug: d.slug,
            name: d.name,
            state: d.state,
            count: c.countIn(d.slug),
          }))}
          categories={c.categories.map((k) => ({
            slug: k.slug,
            plural: k.plural,
            count: c.countInCategory(k.slug),
          }))}
        />
      )}
      <FeaturedStays />
      <MadeForTheRoad copy={c.site.home.road} media={c.slot("made-for-the-road")} />
      <Destinations />
      <StoriesBand />
      <ForTheRiders />
      <ListYourProperty />
      <FinalCta />
    </>
  );
}
