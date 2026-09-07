import Link from "next/link";
import { Frame } from "@/components/primitives/Frame";
import { Icon, iconFor } from "@/components/primitives/Icon";
import { SectionHead } from "@/components/primitives/Rule";
import { Reveal } from "@/components/motion/Reveal";
import { SnapRail } from "@/components/site/SnapRail";
import { categories, countInCategory, siteContent } from "@/lib/content";
import { cn, plural } from "@/lib/utils";
import type { PlateScene } from "@/lib/plate";

const copy = siteContent.home.categories;

const SCENE_BY_CATEGORY: Record<string, PlateScene> = {
  villas: "coast",
  farmhouses: "plateau",
  resorts: "coast",
  homestays: "forest",
  "highway-stays": "highway",
  "mountain-stays": "ghat",
  "beach-stays": "coast",
};

/**
 * ⑤ Every category is a real, filtered entry into the listings — the tile is
 * the link, not a label above one.
 *
 * Seven categories do not divide into a single comfortable row, so the desktop
 * grid runs four tall tiles over three wide ones on a twelve-column track.
 * Both rows fill completely and the change of scale between them is the point:
 * a row of seven identical thumbnails is exactly the wall of tiles §4.6 rejects.
 */
export function Categories() {
  /*
   * `wide` is a desktop-grid concern only. The mobile rail holds every tile at
   * one ratio — a rail of alternating portrait and landscape cards inside
   * fixed-width slots comes out ragged, which reads as a bug rather than as an
   * edit.
   */
  const tile = (c: (typeof categories)[number], wide: boolean) => {
    const count = countInCategory(c.slug);

    return (
      <Link
        key={c.slug}
        href={`/stays?category=${c.slug}`}
        className={cn(
          "press group relative block h-full",
          wide ? "lg:col-span-4" : "lg:col-span-3",
        )}
      >
        <Frame
          seed={`category-${c.slug}`}
          scene={SCENE_BY_CATEGORY[c.slug]}
          ratio={wide ? "4/3" : "3/4"}
          muted
          sizes="(min-width:1024px) 30vw, 62vw"
          className="rounded-card"
          imgClassName="transition-transform duration-[500ms] ease-out-quint group-hover:scale-[1.05]"
        >
          <div className="absolute inset-0 scrim-b opacity-75" />

          <div className="absolute inset-x-0 bottom-0 p-4 lg:p-5">
            <Icon
              name={iconFor(c.iconKey)}
              size={22}
              className="text-text-low transition-colors duration-300 group-hover:text-gold-500"
            />
            <h3
              className="mt-3 font-display text-[1.125rem] uppercase leading-[0.95] tracking-[-0.02em] text-text-hi xl:text-[1.3125rem]"
              style={{ fontWeight: 800 }}
            >
              {c.plural}
            </h3>
            <p className="mt-2 max-w-[30ch] text-[0.8125rem] leading-snug text-text-low">
              {c.description}
            </p>
            <p className="t-caption mt-2.5 tabular-nums">
              {count > 0 ? plural(count, "stay") : "Onboarding"}
            </p>
          </div>
        </Frame>
      </Link>
    );
  };

  // Row one: four portrait tiles. Row two: three landscape tiles.
  const gridTiles = categories.map((c, i) => tile(c, i >= 4));
  const railTiles = categories.map((c) => tile(c, false));

  return (
    <section aria-labelledby="category-title" className="pb-24 lg:pb-32">
      <div className="shell">
        <Reveal>
          <SectionHead
            overline={copy.overline}
            title={<span id="category-title">{copy.title}</span>}
          />
        </Reveal>
      </div>

      <Reveal className="mt-12">
        <div className="shell hidden lg:block">
          <div className="grid grid-cols-12 gap-4">{gridTiles}</div>
        </div>
        <div className="lg:hidden">
          <SnapRail
            label="Stay categories"
            className="pb-2"
            itemClassName="w-[62vw] max-w-[17rem]"
          >
            {railTiles}
          </SnapRail>
        </div>
      </Reveal>
    </section>
  );
}
