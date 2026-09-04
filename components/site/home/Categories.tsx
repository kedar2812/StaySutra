import Link from "next/link";
import { Frame } from "@/components/primitives/Frame";
import { Icon, iconFor } from "@/components/primitives/Icon";
import { SectionHead } from "@/components/primitives/Rule";
import { Reveal } from "@/components/motion/Reveal";
import { SnapRail } from "@/components/site/SnapRail";
import { categories, countInCategory, siteContent } from "@/lib/content";
import { plural } from "@/lib/utils";
import type { PlateScene } from "@/lib/plate";

const copy = siteContent.home.categories;

/** Tall 3:4 tiles, duotone imagery, type overlapping the image. DPR §7.2 ⑤ */
const SCENE_BY_CATEGORY: Record<string, PlateScene> = {
  villas: "coast",
  farmhouses: "plateau",
  resorts: "coast",
  "highway-stays": "highway",
  homestays: "forest",
  "mountain-stays": "ghat",
};

export function Categories() {
  const tiles = categories.map((c) => (
    <Link
      key={c.slug}
      href={`/stays?category=${c.slug}`}
      className="press group relative block h-full"
    >
      <Frame
        seed={`category-${c.slug}`}
        scene={SCENE_BY_CATEGORY[c.slug]}
        ratio="3/4"
        muted
        sizes="(min-width:1024px) 17vw, 62vw"
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
          {/* Type overlaps the image — the tile's name breaks the frame edge. */}
          <h3
            className="mt-3 font-display text-[1.125rem] uppercase leading-[0.95] tracking-[-0.02em] text-text-hi xl:text-[1.3125rem]"
            style={{ fontWeight: 800 }}
          >
            {c.plural}
          </h3>
          <p className="t-caption mt-2 tabular-nums">
            {countInCategory(c.slug) > 0
              ? plural(countInCategory(c.slug), "stay")
              : "Onboarding"}
          </p>
        </div>
      </Frame>
    </Link>
  ));

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
          <div className="grid grid-cols-6 gap-4">{tiles}</div>
        </div>
        <div className="lg:hidden">
          <SnapRail
            label="Stay categories"
            className="pb-2"
            itemClassName="w-[62vw] max-w-[17rem]"
          >
            {tiles}
          </SnapRail>
        </div>
      </Reveal>
    </section>
  );
}
