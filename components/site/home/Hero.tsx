"use client";

import { useRef } from "react";
import { Frame } from "@/components/primitives/Frame";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { MaskLines } from "@/components/motion/MaskLines";
import { ButtonLink } from "@/components/primitives/Button";
import { Icon, iconFor } from "@/components/primitives/Icon";
import { Unbroken } from "@/components/primitives/Unbroken";
import Link from "next/link";
import type { MediaRef } from "@/lib/types";
import type { SiteCopy } from "@/lib/content";

/**
 * ① The one cinematic moment on the site.
 *
 * The headline crops and overlaps the image rather than sitting in a safe left
 * column, and the trust strip is a single hairline-separated row rather than
 * four floating chips. Background scales 1.06 → 1.0 while the lines mask in.
 * DPR §7.2 ①
 */
export interface HeroStay {
  name: string;
  place: string;
  href: string;
  image: MediaRef | null;
  price: string | null;
}

export function Hero({
  copy: hero,
  media,
  stay,
}: {
  copy: SiteCopy["home"]["hero"];
  media: MediaRef | null;
  /** The newest live stay, floated over the photograph on wide screens. */
  stay?: HeroStay | null;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "6%"]);
  const fade = useTransform(scrollYProgress, [0, 0.9], [1, 0.35]);

  const [lineOne, lineTwo] = hero.titleLines;

  return (
    <section
      ref={ref}
      className="grain relative isolate flex min-h-[max(38rem,92svh)] flex-col justify-end overflow-hidden pb-16 pt-[calc(var(--header-h)+2rem)] lg:pb-24"
    >
      {/* Backdrop: scales down as the lines arrive, then parallaxes on scroll. */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={{ y: reduced ? 0 : y, opacity: fade, willChange: "transform" }}
      >
        <motion.div
          className="h-[112%] w-full"
          initial={reduced ? { scale: 1 } : { scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={reduced ? { duration: 0 } : { duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {/*
            Centre-anchored on purpose. A landscape photograph cropped into a
            phone-height hero and pinned to its bottom edge shows a hillside;
            the horizon is the shot.
          */}
          <Frame
            seed="staysutra-hero"
            media={media}
            scene="ghat"
            mood="dusk"
            fill
            priority
            anchor="center"
            sizes="100vw"
          />
        </motion.div>
        {/*
          Bottom, left and top scrims — each one where type sits, and nowhere
          else. There used to be a flat 30% tint over the whole frame as well,
          which, stacked under the other three, turned the road into mud. The
          right half of the frame is now the photograph, not a dark rectangle.
        */}
        <div className="absolute inset-0 scrim-b" />
        <div className="absolute inset-0 scrim-l opacity-90 lg:opacity-[0.85]" />
        <div className="absolute inset-0 scrim-t" />
      </motion.div>

      <div className="shell relative w-full">
        <motion.p
          data-motion=""
          className="t-overline"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          {hero.eyebrow}
        </motion.p>

        {/*
          The type is allowed to run past the container on large screens — this
          is the "oversized type as image" move, and it is the single highest
          leverage thing on the page. DPR §4.6
        */}
        <h1 className="t-display-xl mt-5 max-w-[18ch] lg:-ml-[0.055em]">
          <MaskLines
            lines={[
              <span key="1" className="block">
                {lineOne}
              </span>,
              <span key="2" className="block text-gold-500">
                {lineTwo}
              </span>,
            ]}
          />
        </h1>

        <div className="xl:flex xl:items-end xl:justify-between xl:gap-12">
          <div className="min-w-0">
          <motion.p
            data-motion=""
            className="t-lede mt-7 max-w-[52ch]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {hero.lede}
          </motion.p>

          <motion.div
            data-motion=""
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center [&>a]:w-full sm:[&>a]:w-auto"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <ButtonLink href={hero.primaryCta.href} size="lg" icon="arrowRight">
              {hero.primaryCta.label}
            </ButtonLink>
            <ButtonLink
              href={hero.secondaryCta.href}
              variant="outline"
              size="lg"
              icon="motorcycle"
              iconAfter={false}
            >
              {hero.secondaryCta.label}
            </ButtonLink>
          </motion.div>
          </div>
          {stay && (
            /*
              A way straight to the product for the visitor who came for a place,
              not a manifesto. It materialises — blur and scale together — after
              the headline has landed, and only where the photograph has room.
            */
            <motion.div
              data-motion=""
              className="hidden w-[19rem] shrink-0 xl:block"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={reduced ? { duration: 0.3, delay: 0.6 } : { type: "spring", bounce: 0, duration: 0.7, delay: 0.95 }}
              style={{ transformOrigin: "bottom right" }}
            >
              <Link href={stay.href} className="glass press group block overflow-hidden rounded-surface p-2.5">
                <Frame
                  seed="hero-stay"
                  media={stay.image}
                  ratio="16/9"
                  sizes="19rem"
                  className="rounded-card"
                  imgClassName="transition-transform duration-[600ms] ease-out-quint group-hover:scale-[1.04]"
                />
                <div className="flex items-end justify-between gap-3 px-2 pb-1.5 pt-3.5">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ok">
                      <span className="size-1.5 rounded-full bg-ok" />
                      Now open
                    </p>
                    <p className="on-glass mt-1.5 truncate text-[1.0625rem] font-semibold leading-tight">
                      {stay.name}
                    </p>
                    <p className="t-caption mt-1 truncate">
                      {stay.place}
                      {stay.price ? ` · ${stay.price}` : ""}
                    </p>
                  </div>
                  <Icon
                    name="arrowUpRight"
                    size={18}
                    className="mb-0.5 shrink-0 text-text-mid transition-transform duration-300 ease-out-quint group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </div>
              </Link>
            </motion.div>
          )}
        </div>

        {/* Trust strip — one hairline-separated row. Not four boxed cards. */}
        <motion.ul
          data-motion=""
          className="mt-14 grid grid-cols-2 border-t border-[color:var(--hairline)] lg:grid-cols-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.75 }}
        >
          {hero.trust.map((item, i) => (
            <li
              key={item.title}
              className={[
                "flex items-start gap-3 py-5 pr-5",
                i % 2 === 1 ? "border-l border-[color:var(--hairline)] pl-5" : "",
                "lg:border-l lg:border-[color:var(--hairline)] lg:pl-6 lg:first:border-l-0 lg:first:pl-0",
              ].join(" ")}
            >
              <Icon
                name={iconFor(item.iconKey)}
                size={22}
                className="mt-0.5 shrink-0 text-text-low"
              />
              <span className="min-w-0">
                <span className="block text-[0.9375rem] font-medium leading-tight text-text-hi">
                  <Unbroken>{item.title}</Unbroken>
                </span>
                <span className="t-caption mt-1 block">{item.note}</span>
              </span>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
