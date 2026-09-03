"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import type { ElementType, ReactNode } from "react";
import { crossFade, spring } from "@/lib/motion";

/**
 * Section-level entry. Applied at section and group level — never to every
 * element. Ten staggered reveals per screen is how a page announces it was
 * generated rather than designed. DPR §4.5
 */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  as = "div",
  className,
  ...rest
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  as?: ElementType;
  className?: string;
} & Omit<HTMLMotionProps<"div">, "as" | "children">) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as as "div"];

  return (
    <MotionTag
      data-motion=""
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={reduced ? crossFade : { ...spring.ui, duration: 0.4, delay }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Stagger a group's children at 60ms, capped at 6. Past that the group reveals
 * as one block — a long list that ripples reads as a demo, not a page.
 */
export function RevealGroup({
  children,
  className,
  step = 0.06,
  cap = 6,
  as = "div",
}: {
  children: ReactNode[];
  className?: string;
  step?: number;
  cap?: number;
  as?: ElementType;
}) {
  if (children.length > cap) {
    return (
      <Reveal as={as} className={className}>
        {children}
      </Reveal>
    );
  }
  const Tag = as as ElementType;
  return (
    <Tag className={className}>
      {children.map((child, i) => (
        <Reveal key={i} delay={i * step}>
          {child}
        </Reveal>
      ))}
    </Tag>
  );
}
