import type { Metadata } from "next";
import { Hero } from "@/components/site/home/Hero";
import { SearchWidget } from "@/components/site/home/SearchWidget";
import { MadeForTheRoad } from "@/components/site/home/MadeForTheRoad";
import { FeaturedStays } from "@/components/site/home/FeaturedStays";
import { Categories } from "@/components/site/home/Categories";
import { Destinations } from "@/components/site/home/Destinations";
import { RiderPassport } from "@/components/site/home/RiderPassport";
import { ForTheRiders } from "@/components/site/home/ForTheRiders";
import { ListYourProperty } from "@/components/site/home/ListYourProperty";
import { StoriesBand } from "@/components/site/home/StoriesBand";
import { Trust } from "@/components/site/home/Trust";
import { FinalCta } from "@/components/site/home/FinalCta";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Curated stays across Maharashtra and Goa",
  description:
    "Handpicked villas, farmhouses, resorts and homestays — with secure bike parking, late check-in and hosts who ride. Lonavala, Karjat, Alibaug, Pune, Mumbai and Goa.",
  path: "/",
});

/**
 * Twelve sections, in order. No two consecutive sections share a layout
 * skeleton — hero, glass rail, pinned editorial list, mixed-scale grid,
 * two-row tile mosaic, asymmetric destination mosaic, the passport artefact,
 * two-column list, sticky-column argument, snap rail, hairline table, and
 * open type. DPR §7.2, §4.6
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <SearchWidget />
      <MadeForTheRoad />
      <FeaturedStays />
      <Categories />
      <Destinations />
      <RiderPassport />
      <ForTheRiders />
      <ListYourProperty />
      <StoriesBand />
      <Trust />
      <FinalCta />
    </>
  );
}
