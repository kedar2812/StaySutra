"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Per-line mask reveal — the one cinematic moment on the site, reserved for the
 * homepage hero headline. Under reduced motion it resolves to a static frame.
 * DPR §4.5
 */
export function MaskLines({
  lines,
  className,
  lineClassName,
  stagger = 0.09,
  delay = 0.15,
}: {
  lines: ReactNode[];
  className?: string;
  lineClassName?: string;
  stagger?: number;
  delay?: number;
}) {
  const reduced = useReducedMotion();

  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.06em]">
          <motion.span
            data-motion=""
            className={lineClassName}
            style={{ display: "block", willChange: "transform" }}
            initial={reduced ? { opacity: 0 } : { y: "108%" }}
            animate={reduced ? { opacity: 1 } : { y: "0%" }}
            transition={
              reduced
                ? { duration: 0.2 }
                : {
                    type: "spring",
                    bounce: 0,
                    duration: 1,
                    delay: delay + i * stagger,
                  }
            }
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
