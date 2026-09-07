"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { Wordmark } from "./Wordmark";
import { ButtonLink } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { siteContent } from "@/lib/content";
import { spring } from "@/lib/motion";
import { brand, waMessage, whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";

const nav = siteContent.nav;

/**
 * The route bar.
 *
 * Navigation drawn as a road: a measured hairline with a node at every stop and
 * the stop you are on lit in gold. Minor ticks run the length of it like the
 * gradations on a map scale.
 *
 * The bar never leaves. It detaches from the page edge and takes on glass once
 * you move off the top, and page progress is traced around its own border, so
 * the indicator follows the corner radius instead of cutting across it.
 *
 * DPR §7.1 (glass, content scrolls underneath), §4.5 (interruptible springs,
 * feedback on pointer-down, reduced-motion fallbacks).
 */

export function Header() {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  const [condensed, setCondensed] = useState(false);
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 240,
    damping: 40,
    mass: 0.3,
  });
  // strokeDashoffset runs 1 → 0 as the page is consumed.
  const traced = useTransform(progress, (v) => 1 - v);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setCondensed(window.scrollY > 64);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  /*
   * The traced border is a real <rect>, so it needs real pixels. The bar's
   * width and radius animate, so observe it rather than assuming.
   */
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const r = entry?.contentRect;
      if (r) setBox({ w: el.offsetWidth, h: el.offsetHeight });
    });
    observer.observe(el);
    setBox({ w: el.offsetWidth, h: el.offsetHeight });
    return () => observer.disconnect();
  }, []);

  /*
   * The specular highlight follows the pointer across the bar.
   *
   * Position is written straight to the element as a custom property on an
   * animation frame — it is deliberately not React state, so sweeping the
   * cursor over the header costs no render and touches only compositor work.
   * Under reduced motion it is skipped outright: a highlight chasing the
   * pointer is incidental movement, which is exactly what that setting asks
   * us to drop.
   */
  useEffect(() => {
    const el = bar.current;
    if (!el || reduced) return;

    let frame = 0;
    let px = 0;
    let py = 0;

    const paint = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--gx", `${((px - r.left) / r.width) * 100}%`);
      el.style.setProperty("--gy", `${((py - r.top) / r.height) * 100}%`);
    };

    const move = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const enter = () => el.style.setProperty("--sheen", "1");
    const leave = () => {
      el.style.setProperty("--sheen", "0");
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced]);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-pill focus:bg-gold-500 focus:px-5 focus:py-2.5 focus:text-xs focus:font-semibold focus:uppercase focus:tracking-widest focus:text-gold-ink"
      >
        Skip to content
      </a>

      {/* Pinned. It does not retract, condense away, or hide. */}
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <motion.div
          ref={bar}
          animate={{
            maxWidth: condensed ? 1240 : 1420,
            borderRadius: condensed ? 18 : 22,
          }}
          transition={reduced ? { duration: 0.2 } : spring.ui}
          className={cn(
            "relative mx-auto flex items-center gap-3 px-3 sm:gap-5 sm:px-5",
            condensed ? "glass-liquid" : "border-t border-transparent",
          )}
        >
          <Link
            href="/"
            aria-label={`${brand.name} — home`}
            className="press-sm relative z-10 flex h-[3.75rem] shrink-0 items-center sm:h-[4.5rem]"
          >
            <Wordmark size="sm" showLockup={!condensed} />
          </Link>

          {/*
            Six stops. At lg the road, the wordmark and a gold CTA together
            overrun the bar and the labels start wrapping, so the route appears
            at xl and the drawer covers everything below it.
          */}
          <div className="relative z-10 hidden min-w-0 flex-1 justify-center xl:flex">
            <Route pathname={pathname} reduced={!!reduced} />
          </div>

          <div className="relative z-10 ml-auto flex shrink-0 items-center gap-2 xl:ml-0">
            {/*
              Owner acquisition is the second revenue line, so it is the one
              gold element in the bar rather than an outline afterthought. It
              never drops below the fold on mobile either — it shortens.
            */}
            <ButtonLink
              href="/list-your-property"
              size="sm"
              icon="arrowUpRight"
              className="px-3.5 max-sm:[&>svg]:hidden sm:px-4"
            >
              <span className="hidden 2xl:inline">List your property</span>
              <span className="2xl:hidden">List yours</span>
            </ButtonLink>

            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="press -mr-1 grid size-11 place-items-center rounded-pill text-text-hi xl:hidden"
            >
              <Icon name="menu" />
            </button>
          </div>

          {/*
            Page progress, drawn around the bar's own border. pathLength
            normalises the perimeter to 1, so the dash offset is the scroll
            fraction directly and the line follows the corner radius rather
            than cutting across it.
          */}
          {box.w > 0 && (
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 overflow-visible"
              width={box.w}
              height={box.h}
              viewBox={`0 0 ${box.w} ${box.h}`}
              fill="none"
            >
              {/*
                A rect path natively begins top-left and runs right. Mirrored
                vertically it begins bottom-left and runs right instead — the
                edge the eye already reads as progress — then wraps the corner
                and carries on around. The shape is symmetric, so the mirror
                costs nothing.
              */}
              <motion.rect
                transform={`scale(1,-1) translate(0,${-box.h})`}
                x={0.75}
                y={0.75}
                width={Math.max(0, box.w - 1.5)}
                height={Math.max(0, box.h - 1.5)}
                rx={condensed ? 17.25 : 21.25}
                pathLength={1}
                stroke="var(--color-gold-500)"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeDasharray="1 1"
                style={{ strokeDashoffset: traced }}
                opacity={0.85}
              />
            </svg>
          )}
        </motion.div>
      </header>

      <MobileNav open={open} onClose={() => setOpen(false)} pathname={pathname} />
    </>
  );
}

/* — The route ————————————————————————————————————————————————— */

function Route({ pathname, reduced }: { pathname: string; reduced: boolean }) {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <nav aria-label="Primary" className="relative px-2">
      {/*
        The road, measured. A hairline with minor gradations along it — the
        marks are a scale, not a claim, so nothing here asserts a distance the
        site cannot back up.
      */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--hairline)]"
      />
      <span
        aria-hidden
        className="absolute inset-x-0 top-1/2 h-[5px] -translate-y-[3px] opacity-45"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, var(--hairline-str) 0 1px, transparent 1px 11px)",
          maskImage: "linear-gradient(to bottom, #000 0 2px, transparent 2px)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 0 2px, transparent 2px)",
        }}
      />

      <ul className="relative flex items-center" onMouseLeave={() => setHover(null)}>
        {nav.map((item, i) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          const lit = active || hover === item.href;

          return (
            <li key={item.href} className="relative flex items-center">
              {/* Milestone between stops — a taller gradation on the road. */}
              {i > 0 && (
                <span
                  aria-hidden
                  className="h-2 w-px shrink-0 bg-[var(--hairline-str)] opacity-70"
                />
              )}

              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onMouseEnter={() => setHover(item.href)}
                className="press-sm group relative flex flex-col items-center gap-1.5 px-3 py-2.5 2xl:px-4"
              >
                {/* The stop. Gold when you are on it. */}
                <span aria-hidden className="grid h-2.5 place-items-center">
                  <motion.span
                    className={cn(
                      "block rounded-pill border",
                      lit
                        ? "border-gold-500 bg-gold-500"
                        : "border-[color:var(--hairline-str)] bg-ink-900",
                    )}
                    animate={{
                      width: active ? 8 : lit ? 7 : 5,
                      height: active ? 8 : lit ? 7 : 5,
                    }}
                    transition={reduced ? { duration: 0.15 } : spring.ui}
                  />
                </span>

                <span
                  className={cn(
                    "text-[0.6875rem] font-semibold uppercase leading-none tracking-[0.13em] transition-colors duration-200",
                    lit ? "text-text-hi" : "text-text-low",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* — Mobile ————————————————————————————————————————————————————— */

function MobileNav({
  open,
  onClose,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
}) {
  const reduced = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const returnTo = useRef<Element | null>(null);

  /* Body scroll lock, focus trap, and focus returned to the trigger. DPR §6.5 */
  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const first = panel.current?.querySelector<HTMLElement>(
      "a, button, [tabindex]:not([tabindex='-1'])",
    );
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>(
        "a, button, [tabindex]:not([tabindex='-1'])",
      );
      if (!items.length) return;
      const firstEl = items[0]!;
      const lastEl = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      (returnTo.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-ink-900/70 xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />

          {/* Slides in from the right, dismisses to the right. DPR §4.5 */}
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-y-0 right-0 z-[61] flex w-[min(22rem,88vw)] flex-col bg-ink-800 xl:hidden"
            style={{ borderLeft: "1px solid var(--hairline)" }}
            initial={reduced ? { opacity: 0 } : { x: "100%" }}
            animate={reduced ? { opacity: 1 } : { x: 0 }}
            exit={reduced ? { opacity: 0 } : { x: "100%" }}
            transition={reduced ? { duration: 0.2 } : spring.sheet}
          >
            <div className="flex h-[4.5rem] items-center justify-between px-6">
              <span className="t-caption uppercase tracking-[0.2em]">Menu</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="press -mr-2 grid size-11 place-items-center rounded-pill text-text-hi"
              >
                <Icon name="close" />
              </button>
            </div>

            {/* The same road, stood on end. */}
            <nav aria-label="Mobile" className="relative flex-1 overflow-y-auto px-6 pt-4">
              <span
                aria-hidden
                className="absolute bottom-8 left-[2.15rem] top-6 w-px bg-[var(--hairline)]"
              />
              <span
                aria-hidden
                className="absolute bottom-8 left-[2.09rem] top-6 w-[5px] opacity-45"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, var(--hairline-str) 0 1px, transparent 1px 11px)",
                  maskImage: "linear-gradient(to right, #000 0 2px, transparent 2px)",
                  WebkitMaskImage: "linear-gradient(to right, #000 0 2px, transparent 2px)",
                }}
              />
              <ul className="relative">
                {nav.map((item, i) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                  return (
                    <motion.li
                      key={item.href}
                      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...spring.ui, delay: 0.04 * i }}
                    >
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className="press flex items-center gap-5 py-3.5"
                      >
                        <span aria-hidden className="grid w-2.5 shrink-0 place-items-center">
                          <span
                            className={cn(
                              "block rounded-pill border",
                              active
                                ? "size-2 border-gold-500 bg-gold-500"
                                : "size-[5px] border-[color:var(--hairline-str)] bg-ink-800",
                            )}
                          />
                        </span>
                        <span
                          className={cn(
                            "flex-1 font-display text-lg uppercase tracking-tight",
                            active ? "text-text-hi" : "text-text-low",
                          )}
                        >
                          {item.label}
                        </span>
                        <Icon name="chevronRight" size={16} className="text-text-low" />
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            </nav>

            {/*
              The drawer ends on the booking flow, not on a second copy of the
              bar's own CTA. Contact left the primary nav to make room for six
              stops, so it lives here and in the footer.
            */}
            <div className="space-y-3 px-6 pb-8 pt-6">
              <ButtonLink
                href={whatsappLink(waMessage.general())}
                target="_blank"
                rel="noreferrer noopener"
                className="w-full"
                icon="whatsapp"
                iconAfter={false}
              >
                Talk to us on WhatsApp
              </ButtonLink>
              <ButtonLink href="/contact" variant="outline" className="w-full">
                Contact
              </ButtonLink>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
