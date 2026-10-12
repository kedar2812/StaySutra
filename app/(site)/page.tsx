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
export default function HomePage() {
  return (
    <>
      <Hero />
      <SearchWidget />
      <FeaturedStays />
      <MadeForTheRoad />
      <Destinations />
      <StoriesBand />
      <ForTheRiders />
      <ListYourProperty />
      <FinalCta />
    </>
  );
}
