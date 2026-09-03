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
 */
export function WhatsAppFloat({
  message,
  source,
  raised = false,
}: {
  message: string;
  source: string;
  raised?: boolean;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.a
      href={whatsappLink(message)}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat with StaySutra on WhatsApp"
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
