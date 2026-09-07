"use client";

import { useRef, useState } from "react";
import { Frame } from "@/components/primitives/Frame";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { Icon, iconFor } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { siteContent } from "@/lib/content";
import { cn } from "@/lib/utils";

const road = siteContent.home.road;

/**
 * ③ The one pinned moment on the homepage (the property gallery is the other on
 * the site — two in total, by design). The image column pins while the pillars
 * cross-fade through, then releases.
 *
 * An editorial numbered list on a full-bleed image, not a four-card grid.
 * Under reduced motion it collapses to a plain stacked list with no pinning.
 * DPR §7.2 ③, §4.5
 */
export function MadeForTheRoad() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const i = Math.min(road.pillars.length - 1, Math.floor(v * road.pillars.length));
    setActive(i < 0 ? 0 : i);
  });

  if (reduced) return <StackedFallback />;

  return (
    <section
      ref={ref}
      aria-labelledby="road-title"
      className="relative"
      style={{ height: `${(road.pillars.length + 1) * 52}vh` }}
    >
      <div className="sticky top-0 flex min-h-[38rem] items-center overflow-hidden py-16 h-svh">
        <div className="absolute inset-0 -z-10">
          <Frame seed="made-for-the-road" scene="highway" mood="night" muted fill sizes="100vw" />
          <div className="absolute inset-0 scrim-l" />
          <div className="absolute inset-0 bg-ink-900/45" />
        </div>

        <div className="shell w-full">
          <div className="max-w-2xl">
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">{road.overline}</p>
            <h2 id="road-title" className="t-display-m mt-4 max-w-[16ch] text-balance">
              {road.title}
            </h2>
            <p className="mt-5 max-w-[52ch] text-[0.9375rem] leading-relaxed text-text-mid lg:text-base">
              {road.lede}
            </p>

            <ol className="mt-9">
              {road.pillars.map((pillar, i) => {
                const on = i === active;
                return (
                  <li key={pillar.number}>
                    <div
                      className={cn(
                        "grid grid-cols-[auto_1fr] gap-x-5 border-t border-[color:var(--hairline)] py-3.5 transition-colors duration-500 last:border-b",
                        on ? "border-[color:var(--hairline-str)]" : "",
                      )}
                    >
                      <span
                        className={cn(
                          "t-num pt-1 text-sm tabular-nums transition-colors duration-500",
                          on ? "text-gold-500" : "text-text-low",
                        )}
                      >
                        {pillar.number}
                      </span>
                      <div>
                        <h3
                          className={cn(
                            "flex items-center gap-3 font-display text-base uppercase leading-tight tracking-tight transition-colors duration-500 lg:text-lg",
                            on ? "text-text-hi" : "text-text-low",
                          )}
                          style={{ fontWeight: 700 }}
                        >
                          <Icon
                            name={iconFor(pillar.iconKey)}
                            size={20}
                            className="shrink-0 transition-opacity duration-500"
                            style={{ opacity: on ? 1 : 0.55 }}
                          />
                          {pillar.title}
                        </h3>
                        <motion.p
                          className="overflow-hidden text-sm leading-relaxed text-text-mid lg:text-[0.9375rem]"
                          initial={false}
                          animate={{
                            height: on ? "auto" : 0,
                            opacity: on ? 1 : 0,
                            marginTop: on ? 8 : 0,
                          }}
                          transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
                        >
                          {pillar.body}
                        </motion.p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

function StackedFallback() {
  return (
    <section aria-labelledby="road-title" className="section relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Frame seed="made-for-the-road" scene="highway" mood="night" muted fill sizes="100vw" />
        <div className="absolute inset-0 bg-ink-900/78" />
      </div>
      <div className="shell max-w-2xl">
        <Rule className="mb-5 max-w-24" />
        <p className="t-overline">{road.overline}</p>
        <h2 id="road-title" className="t-display-l mt-4 max-w-[15ch]">
          {road.title}
        </h2>
        <p className="t-lede mt-6">{road.lede}</p>
        <ol className="mt-12">
          {road.pillars.map((p) => (
            <li
              key={p.number}
              className="grid grid-cols-[auto_1fr] gap-x-5 border-t border-[color:var(--hairline)] py-6"
            >
              <span className="t-num pt-1 text-sm text-text-low">{p.number}</span>
              <div>
                <h3
                  className="flex items-center gap-3 font-display text-lg uppercase text-text-hi"
                  style={{ fontWeight: 700 }}
                >
                  <Icon name={iconFor(p.iconKey)} size={20} className="shrink-0 text-text-low" />
                  {p.title}
                </h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-text-mid">{p.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
