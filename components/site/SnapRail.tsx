"use client";

import { useRef, type ReactNode } from "react";
import { nearestSnap, project, VelocityTracker } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Horizontal rail with edge peek, so it is obvious more exist.
 *
 * Native scroll-snap does the work on touch. A pointer drag (trackpad-less
 * desktop, stylus) is tracked 1:1 and, on release, its momentum is projected
 * forward to pick the snap target rather than jumping to the nearest edge.
 * DPR §4.5 (4, 6), §7.2 ④
 */
export function SnapRail({
  children,
  className,
  itemClassName,
  label,
  /** Inline padding, mirrored into scroll-padding so snapping keeps the gutter. */
  pad = "var(--gutter)",
}: {
  children: ReactNode[];
  className?: string;
  itemClassName?: string;
  label: string;
  pad?: string;
}) {
  const rail = useRef<HTMLUListElement>(null);
  const tracker = useRef(new VelocityTracker());
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  const snapPoints = () => {
    const el = rail.current;
    if (!el) return [0];
    return Array.from(el.children).map((c) => (c as HTMLElement).offsetLeft - el.offsetLeft);
  };

  return (
    <ul
      ref={rail}
      aria-label={label}
      className={cn("rail flex gap-5", className)}
      style={{ paddingInline: pad, ["--rail-pad" as string]: pad }}
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse" || !rail.current) return;
        drag.current = { x: e.clientX, left: rail.current.scrollLeft, moved: false };
        tracker.current.reset();
        tracker.current.push(e.clientX, e.timeStamp);
      }}
      onPointerMove={(e) => {
        if (!drag.current || !rail.current) return;
        const dx = e.clientX - drag.current.x;
        if (Math.abs(dx) > 8) drag.current.moved = true;
        tracker.current.push(e.clientX, e.timeStamp);
        rail.current.scrollLeft = drag.current.left - dx;
      }}
      onPointerUp={() => {
        const el = rail.current;
        if (!drag.current || !el) return;
        const moved = drag.current.moved;
        drag.current = null;
        if (!moved) return;
        const projected = el.scrollLeft - project(tracker.current.velocity());
        el.scrollTo({ left: nearestSnap(projected, snapPoints()), behavior: "smooth" });
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      {children.map((child, i) => (
        <li
          key={i}
          className={cn("shrink-0 snap-start", itemClassName)}
        >
          {child}
        </li>
      ))}
    </ul>
  );
}
