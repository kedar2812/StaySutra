"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Icon } from "@/components/primitives/Icon";
import { CheckAvailability } from "./CheckAvailability";
import { spring } from "@/lib/motion";
import { whatsappLink } from "@/lib/site";
import { cn, inr } from "@/lib/utils";
import type { PropertyView } from "@/lib/types";

/**
 * Desktop: a sticky glass card that leads with the price and then with the one
 * action that actually moves a booking forward while confirmation is manual —
 * dates, a head count, and WhatsApp. The long enquiry form is still on the
 * page and is linked from here, but it is the second option, not the first.
 *
 * Mobile: a docked CTA bar. The page reserves matching bottom padding so the
 * bar never covers the last line of content. DPR §7.6 (3), §6.2
 *
 * `self-start` is load-bearing. A grid stretches its items by default, which
 * made this box as tall as the whole article — and a sticky box with no room
 * left to travel inside its container simply scrolls away with the content.
 * The card was never actually sticking.
 */
export function StickyEnquire({
  property: p,
  waMessage,
}: {
  property: PropertyView;
  waMessage: string;
}) {
  const reduced = useReducedMotion();
  const [past, setPast] = useState(false);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setPast(window.scrollY > 420);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <motion.aside
        aria-label="Check availability for this stay"
        className="glass sticky top-[calc(var(--header-h)+1.5rem)] hidden self-start rounded-surface p-6 lg:block"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0.2 } : spring.ui}
      >
        <Price property={p} />

        <div className="my-5 h-px bg-[var(--hairline)]" />

        <CheckAvailability property={p} variant="panel" />

        <p className="mt-5 border-t border-[color:var(--hairline)] pt-4 text-[0.8125rem] text-text-low">
          Prefer email?{" "}
          <Link
            href="#enquire"
            className="press-sm font-medium text-text-hi underline decoration-[color:var(--hairline-str)] underline-offset-4 transition-colors hover:text-gold-400"
          >
            Send an enquiry instead
          </Link>
        </p>
      </motion.aside>

      {/* Mobile CTA bar */}
      <motion.div
        className="glass fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 lg:hidden"
        initial={reduced ? { opacity: 0 } : { y: "110%" }}
        animate={past ? { y: 0, opacity: 1 } : { y: reduced ? 0 : "110%", opacity: 1 }}
        transition={reduced ? { duration: 0.2 } : spring.sheet}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <Price property={p} compact />
          </div>
          <a
            href={whatsappLink(waMessage)}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Ask about this stay on WhatsApp"
            /*
              Hidden on the narrowest phones. Below 480px this bar cannot hold
              a price, two round buttons and a pill without clipping the label
              on the one control that matters — and the floating WhatsApp
              button is already on screen, six pixels above it.
            */
            className="press grid size-12 shrink-0 place-items-center rounded-pill border border-[color:var(--hairline-str)] text-text-hi max-sm:hidden"
          >
            <Icon name="whatsapp" size={20} />
          </a>
          {/*
            Sends you to the dates panel rather than straight to WhatsApp — a
            message with dates in it gets answered once, and one without them
            costs the guest two more round trips.
          */}
          <a
            href="#availability"
            className="press flex h-12 shrink-0 items-center justify-center rounded-pill bg-gold-500 px-5 text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-gold-ink"
          >
            Check availability
          </a>
        </div>
      </motion.div>
    </>
  );
}

function Price({ property: p, compact = false }: { property: PropertyView; compact?: boolean }) {
  if (p.startingPrice === null) {
    return (
      <div>
        <p className="on-glass text-[0.9375rem]">Price on request</p>
        {!compact && (
          <p className="t-caption mt-1">We confirm rates and availability on WhatsApp.</p>
        )}
      </div>
    );
  }
  return (
    <div>
      <p className="flex items-baseline gap-2">
        <span className="t-caption shrink-0 uppercase tracking-[0.14em]">From</span>
        <span
          className={cn("t-num text-text-hi", compact ? "text-xl" : "text-2xl")}
          style={{ fontWeight: 800 }}
        >
          {inr(p.startingPrice)}
        </span>
      </p>
      <p className={compact ? "t-caption mt-1 truncate" : "t-caption mt-1.5 max-w-[26ch]"}>
        {p.priceNote ?? "per night"}
        {!compact && " · final rate confirmed on enquiry"}
      </p>
    </div>
  );
}
