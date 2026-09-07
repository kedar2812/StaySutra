"use client";

import { motion, useReducedMotion } from "motion/react";
import { Icon } from "@/components/primitives/Icon";
import { whatsappLink } from "@/lib/site";
import { track } from "@/lib/analytics";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Present on every public page. Sits above the mobile sticky CTA bar where one
 * exists — never over a form field or the footer CTA. DPR §6.2
 *
 * The layout renders a global one and property and destination pages render a
 * second carrying their own pre-filled message. Both used to paint: on desktop
 * they sat at identical coordinates and read as one button, and on a phone the
 * global one dropped to the bottom corner and covered the "Check availability"
 * pill. `scope` is what globals.css keys off to hide the global instance
 * whenever a page-specific one is on the document.
 */
export function WhatsAppFloat({
  message,
  source,
  raised = false,
  scope = "page",
}: {
  message: string;
  source: string;
  raised?: boolean;
  /** "global" instances yield to any page-specific float on the same document. */
  scope?: "global" | "page";
}) {
  const reduced = useReducedMotion();

  return (
    <motion.a
      href={whatsappLink(message)}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat with StaySutra on WhatsApp"
      data-wa-float={scope}
      data-motion=""
      onClick={() => track("whatsapp_click", { source })}
      className={cn(
        "press glass fixed right-5 z-40 grid size-14 place-items-center rounded-pill text-text-hi transition-colors hover:text-gold-400",
        raised ? "bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] md:bottom-6" : "bottom-6",
      )}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.86 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduced ? { duration: 0.2 } : { ...spring.ui, delay: 0.6 }}
    >
      <Icon name="whatsapp" size={24} />
    </motion.a>
  );
}
