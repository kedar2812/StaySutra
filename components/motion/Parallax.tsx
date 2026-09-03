"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";

/**
 * Hero image and destination tiles only, 8% travel maximum, transform-only.
 * DPR §4.5
 */
export function Parallax({
  children,
  amount = 0.08,
  className,
}: {
  children: ReactNode;
  amount?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const travel = Math.min(amount, 0.08) * 100;
  const raw = useTransform(scrollYProgress, [0, 1], [`-${travel}%`, `${travel}%`]);
  const y = useSpring(raw, { stiffness: 220, damping: 40, mass: 0.4 });

  return (
    <div ref={ref} className={className} style={{ overflow: "hidden" }}>
      <motion.div
        style={{
          y: reduced ? 0 : y,
          height: reduced ? "100%" : `${100 + travel * 2}%`,
          marginTop: reduced ? 0 : `-${travel}%`,
          willChange: reduced ? undefined : "transform",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
