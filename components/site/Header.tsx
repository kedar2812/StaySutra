"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Wordmark } from "./Wordmark";
import { ButtonLink } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { siteContent } from "@/lib/content";
import { spring } from "@/lib/motion";
import { waMessage, whatsappLink, brand } from "@/lib/site";
import { cn } from "@/lib/utils";
import { lockScroll } from "@/lib/scroll-lock";

const nav = siteContent.nav;

/**
 * The route bar.
 *
 * Navigation drawn as a road: a hairline with a node at every stop, and the
 * stop you are on lit in gold. The bar never leaves. It takes on glass once you
 * move off the top of the page.
 *
 * The bar sits inside `.shell` and bleeds 12–16px past it on both sides, with
 * the same amount of inner padding. The wordmark therefore lands exactly on the
 * content edge at every width, and the bar is the same width as the sticky
 * filter bar on /stays — two floating bars of different widths stacked on top
 * of each other read as a mistake.
 *
 * Its width no longer animates between states. Only the glass fades in, which
 * is compositor work rather than layout. DPR §7.1, §4.5 (9)
 */

export function Header() {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  const [condensed, setCondensed] = useState(false);
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setCondensed(window.scrollY > 48);
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
   * The specular highlight follows the pointer across the bar. Written straight
   * to the element as custom properties on an animation frame — not React
   * state — so sweeping the cursor costs no render. Skipped under reduced
   * motion: a highlight chasing the pointer is incidental movement.
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

      <header className="fixed inset-x-0 top-0 z-50 pt-3 md:pt-4">
        <div className="shell">
          <div
            ref={bar}
            className="relative -mx-3 flex h-[3.75rem] items-center gap-4 rounded-[18px] px-3 md:-mx-4 md:h-[4.5rem] md:px-4"
          >
            {/* The glass, as its own layer so it can fade rather than snap. */}
            <div
              aria-hidden
              className={cn(
                "glass-liquid pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300",
                condensed ? "opacity-100" : "opacity-0",
              )}
            />

            <Link
              href="/"
              aria-label={`${brand.name} — home`}
              className="press-sm relative z-10 flex h-full shrink-0 items-center"
            >
              <Wordmark size="sm" showLockup={false} />
            </Link>

            <div className="relative z-10 hidden min-w-0 flex-1 justify-center lg:flex">
              <Route pathname={pathname} reduced={!!reduced} />
            </div>

            <div className="relative z-10 ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
              {/*
                Owners are the second audience, not the first. Outlined, and on
                a phone it lives in the drawer — the bar there is for riders.
              */}
              <ButtonLink
                href="/list-your-property"
                variant="outline"
                size="sm"
                className="hidden lg:inline-flex"
              >
                List your property
              </ButtonLink>

              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                aria-expanded={open}
                className="press -mr-1.5 grid size-11 place-items-center rounded-pill text-text-hi lg:hidden"
              >
                <Icon name="menu" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileNav open={open} onClose={() => setOpen(false)} pathname={pathname} />
    </>
  );
}

/* — The route ————————————————————————————————————————————————— */

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

function Route({ pathname, reduced }: { pathname: string; reduced: boolean }) {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <nav aria-label="Primary" className="relative">
      {/* The road. It runs through the centre of every stop. */}
      <span aria-hidden className="absolute inset-x-3 top-[15px] h-px bg-[var(--hairline)]" />

      <ul className="relative flex items-center" onMouseLeave={() => setHover(null)}>
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          const lit = active || hover === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onMouseEnter={() => setHover(item.href)}
                className="press-sm relative flex flex-col items-center gap-1.5 px-2.5 py-2.5 xl:px-3.5"
              >
                <span aria-hidden className="grid h-2.5 place-items-center">
                  <motion.span
                    className={cn(
                      "block rounded-pill border",
                      active
                        ? "border-gold-500 bg-gold-500"
                        : lit
                          ? "border-text-mid bg-text-mid"
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
                    "whitespace-nowrap text-[0.875rem] font-medium leading-none transition-colors duration-200",
                    lit ? "text-text-hi" : "text-text-mid",
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

  /* Scroll lock, focus trap, and focus returned to the trigger. DPR §6.5 */
  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement;
    const unlock = lockScroll();

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
      unlock();
      (returnTo.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-ink-900/60 lg:hidden"
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
            className="glass-liquid glass-panel fixed inset-y-0 right-0 z-[61] flex w-[min(22rem,88vw)] flex-col lg:hidden"
            initial={reduced ? { opacity: 0 } : { x: "100%" }}
            animate={reduced ? { opacity: 1 } : { x: 0 }}
            exit={reduced ? { opacity: 0 } : { x: "100%" }}
            transition={reduced ? { duration: 0.2 } : spring.sheet}
          >
            <div className="relative z-10 flex h-[4.5rem] items-center justify-between px-6">
              <span className="t-caption">Menu</span>
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
            <nav
              aria-label="Mobile"
              data-lenis-prevent
              className="relative z-10 flex-1 overflow-y-auto px-6 pt-2"
            >
              <span
                aria-hidden
                className="absolute bottom-6 left-[2.15rem] top-6 w-px bg-[var(--hairline)]"
              />
              <ul className="relative">
                {nav.map((item, i) => {
                  const active = isActive(pathname, item.href);
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
                            "flex-1 font-display text-xl tracking-[-0.01em]",
                            active ? "text-text-hi" : "text-text-mid",
                          )}
                          style={{ fontWeight: 700 }}
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

            {/* The drawer ends on the conversation, then the owner route. */}
            <div className="relative z-10 space-y-3 px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-6">
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
              <ButtonLink href="/list-your-property" variant="outline" className="w-full">
                List your property
              </ButtonLink>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
