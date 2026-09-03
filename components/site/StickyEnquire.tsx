"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { EnquiryForm } from "./EnquiryForm";
import { spring } from "@/lib/motion";
import { whatsappLink } from "@/lib/site";
import { inr } from "@/lib/utils";
import type { PropertyView } from "@/lib/types";

/**
 * Desktop: a sticky glass Book / Enquire card that springs in once the hero has
 * scrolled past. Mobile: a docked CTA bar. The page reserves matching bottom
 * padding so the bar never covers the last line of content. DPR §7.6 (3)
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
        aria-label="Enquire about this stay"
        className="glass sticky top-[calc(var(--header-h)+1.5rem)] hidden rounded-surface p-6 lg:block"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
        animate={past ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0.2 } : spring.ui}
      >
        <Price property={p} />

        <div className="my-5 h-px bg-[var(--hairline)]" />

        <EnquiryForm
          source="PROPERTY"
          propertySlug={p.slug}
          waMessage={waMessage}
          compact
          withDates
        />
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
            className="press grid size-12 shrink-0 place-items-center rounded-pill border border-[color:var(--hairline-str)] text-text-hi"
          >
            <Icon name="whatsapp" size={20} />
          </a>
          <ButtonLink href="#enquire" size="md" className="shrink-0">
            Enquire
          </ButtonLink>
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
        <span className="t-caption uppercase tracking-[0.14em]">From</span>
        <span className="t-num text-2xl text-text-hi" style={{ fontWeight: 800 }}>
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
