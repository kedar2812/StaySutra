import type { Metadata } from "next";
import { Hero } from "@/components/site/home/Hero";
import { SearchWidget } from "@/components/site/home/SearchWidget";
import { MadeForTheRoad } from "@/components/site/home/MadeForTheRoad";
import { FeaturedStays } from "@/components/site/home/FeaturedStays";
import { Categories } from "@/components/site/home/Categories";
import { Destinations } from "@/components/site/home/Destinations";
import { ForTheRiders } from "@/components/site/home/ForTheRiders";
import { ListYourProperty } from "@/components/site/home/ListYourProperty";
import { StoriesBand } from "@/components/site/home/StoriesBand";
import { FinalCta } from "@/components/site/home/FinalCta";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Rider-friendly stays across the Sahyadris and the Konkan",
  description:
    "Handpicked stays chosen for covered bike parking, late check-in and hosts who ride. Lonavala, Karjat, Alibaug, Pune, Mumbai and Goa.",
  path: "/",
});

/**
 * Ten sections, in order. No two consecutive sections share a layout skeleton —
 * hero, glass rail, pinned editorial list, mixed-scale grid, tall tile row,
 * asymmetric mosaic, two-column list, image + prose, snap rail, and open type.
 * DPR §7.2, §4.6
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
      <ForTheRiders />
      <ListYourProperty />
      <StoriesBand />
      <FinalCta />
    </>
  );
}
