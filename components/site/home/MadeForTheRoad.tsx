"use client";

import { useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { Frame } from "@/components/primitives/Frame";
import { Icon, iconFor } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { siteContent } from "@/lib/content";
import { cn } from "@/lib/utils";

const road = siteContent.home.road;

/**
 * The one pinned moment on the homepage (the property gallery column is the
 * other on the site). The frame pins while the pillars cross-fade through, then
 * releases.
 *
 * Pinning only happens where it fits — the `pin` variant in globals.css is a
 * desktop-width, desktop-height, motion-allowed window. A 667px phone used to
 * pin a frame taller than its own screen and clip the headline under the
 * header. Everywhere else this is a plain stacked list with every body shown,
 * from the same markup, so there is no client-side switch and nothing to
 * mismatch on hydration.
 *
 * The bodies cross-fade inside one fixed-height cell instead of animating
 * `height: auto` under each row. Nothing below the active row moves, which is
 * the difference between a list that reads and a list that jumps. DPR §4.5, §7.2 ③
 */
export function MadeForTheRoad() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const count = road.pillars.length;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const i = Math.min(count - 1, Math.max(0, Math.floor(v * count)));
    setActive(i);
  });

  return (
    <section
      ref={ref}
      aria-labelledby="road-title"
      className="relative pin:h-[calc(100svh+var(--steps)*38svh)]"
      style={{ ["--steps" as string]: count }}
    >
      <div className="relative isolate overflow-hidden py-24 pin:sticky pin:top-0 pin:flex pin:h-svh pin:items-center pin:py-0">
        <div className="absolute inset-0 -z-10">
          <Frame
            seed="made-for-the-road"
            scene="highway"
            mood="night"
            muted
            fill
            anchor="center"
            sizes="100vw"
          />
          <div className="absolute inset-0 scrim-l" />
          <div className="absolute inset-0 bg-ink-900/55 lg:bg-ink-900/35" />
        </div>

        <div className="shell w-full pin:pt-[var(--header-h)]">
          <div className="max-w-xl">
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">{road.overline}</p>
            <h2 id="road-title" className="t-display-l mt-4 max-w-[13ch]">
              {road.title}
            </h2>
            <p className="mt-5 max-w-[50ch] text-[0.9375rem] leading-relaxed text-text-mid lg:text-base">
              {road.lede}
            </p>

            <ul className="mt-9 border-b border-[color:var(--hairline)]">
              {road.pillars.map((pillar, i) => (
                <li
                  key={pillar.title}
                  data-active={i === active}
                  className="group border-t border-[color:var(--hairline)] py-4 pin:py-3"
                >
                  <h3
                    className={cn(
                      "flex items-center gap-3 font-display text-lg leading-tight tracking-[-0.01em] text-text-hi transition-colors duration-500",
                      "pin:group-data-[active=false]:text-text-low",
                    )}
                    style={{ fontWeight: 700 }}
                  >
                    <Icon
                      name={iconFor(pillar.iconKey)}
                      size={20}
                      className="shrink-0 text-text-low transition-colors duration-500 pin:group-data-[active=true]:text-gold-500"
                    />
                    {pillar.title}
                  </h3>
                  {/* Stacked layout: every body, under its own title. */}
                  <p className="mt-2 pl-8 text-[0.9375rem] leading-relaxed text-text-mid pin:hidden">
                    {pillar.body}
                  </p>
                </li>
              ))}
            </ul>

            {/*
              Pinned layout: one cell, every body stacked in it, the active one
              visible. The cell is as tall as the longest body, so it never
              resizes as the copy changes.
            */}
            <div className="mt-6 hidden pin:grid">
              {road.pillars.map((pillar, i) => (
                <p
                  key={pillar.title}
                  className={cn(
                    "max-w-[50ch] text-base leading-relaxed text-text-mid transition-opacity duration-500 [grid-area:1/1]",
                    i === active ? "opacity-100" : "opacity-0",
                  )}
                >
                  {pillar.body}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
