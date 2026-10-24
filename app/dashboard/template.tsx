"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Every screen arrives the same way: a short rise and fade, critically damped.
 * Enough to say "this is new", never enough to wait for.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.35 }}
    >
      {children}
    </motion.div>
  );
}
