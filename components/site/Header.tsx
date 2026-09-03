"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { WordmarkLink } from "./Wordmark";
import { ButtonLink } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { siteContent } from "@/lib/content";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

const nav = siteContent.nav;

export function Header() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  const [lifted, setLifted] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);

  /**
   * Velocity-aware, not timer-based: the header retracts on a committed
   * scroll down and returns the instant the user reverses. DPR §7.1
   */
  useEffect(() => {
    lastY.current = window.scrollY;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const delta = y - lastY.current;
        setLifted(y > 12);
        if (Math.abs(delta) > 4) {
          setHidden(delta > 0 && y > 220);
          lastY.current = y;
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-pill focus:bg-gold-500 focus:px-5 focus:py-2.5 focus:text-xs focus:font-semibold focus:uppercase focus:tracking-widest focus:text-gold-ink"
      >
        Skip to content
      </a>

      <motion.header
        className={cn(
          "scroll-edge fixed inset-x-0 top-0 z-50",
          lifted ? "glass" : "border-t border-transparent",
        )}
        animate={{ y: hidden && !open ? "-102%" : "0%" }}
        transition={reduced ? { duration: 0.15 } : spring.ui}
      >
        <div className="shell flex h-[--header-h] items-center justify-between gap-6">
          <WordmarkLink />

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {nav.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "press-sm relative block px-3.5 py-2 text-[0.8125rem] font-medium transition-colors",
                        active ? "text-text-hi" : "text-text-low hover:text-text-hi",
                      )}
                    >
                      {item.label}
                      {active && (
                        <motion.span
                          layoutId="nav-underline"
                          className="absolute inset-x-3.5 -bottom-0.5 h-px bg-gold-500"
                          transition={spring.ui}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <ButtonLink
              href="/list-your-property"
              variant="outline"
              size="sm"
              icon="arrowUpRight"
              className="hidden sm:inline-flex"
            >
              List your property
            </ButtonLink>

            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="press grid size-11 place-items-center rounded-pill text-text-hi lg:hidden"
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </motion.header>

      <MobileNav open={open} onClose={() => setOpen(false)} pathname={pathname} />
    </>
  );
}

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
            className="fixed inset-0 z-[60] bg-ink-900/70 lg:hidden"
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
            className="fixed inset-y-0 right-0 z-[61] flex w-[min(22rem,88vw)] flex-col bg-ink-800 lg:hidden"
            style={{ borderLeft: "1px solid var(--hairline)" }}
            initial={reduced ? { opacity: 0 } : { x: "100%" }}
            animate={reduced ? { opacity: 1 } : { x: 0 }}
            exit={reduced ? { opacity: 0 } : { x: "100%" }}
            transition={reduced ? { duration: 0.2 } : spring.sheet}
          >
            <div className="flex h-[--header-h] items-center justify-between px-6">
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

            <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-6 pt-4">
              <ul>
                {nav.map((item, i) => {
                  const active = pathname === item.href;
                  return (
                    <motion.li
                      key={item.href}
                      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...spring.ui, delay: 0.04 * i }}
                      style={{ borderBottom: "1px solid var(--hairline)" }}
                    >
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "press flex items-center justify-between py-4 font-display text-lg uppercase tracking-tight",
                          active ? "text-gold-500" : "text-text-hi",
                        )}
                      >
                        {item.label}
                        <Icon name="chevronRight" size={18} className="text-text-low" />
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            </nav>

            <div className="px-6 pb-8 pt-6">
              <ButtonLink href="/list-your-property" className="w-full" icon="arrowRight">
                List your property
              </ButtonLink>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
