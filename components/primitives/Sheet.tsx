"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Icon } from "./Icon";
import { nearestSnap, project, rubberband, spring, VelocityTracker } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Drag-dismissible bottom sheet.
 *
 * Tracks the pointer 1:1 from the grab offset, rubber-bands at the top bound,
 * projects the release momentum forward to choose a snap point, and hands the
 * release velocity to the spring so there is no seam between drag and animation.
 * It is interruptible: grab it mid-flight and it follows the finger again.
 * DPR §4.5 (2, 4, 5, 6, 7)
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  /** Fractions of viewport height the sheet rests at, largest last. */
  snapPoints = [0.5, 0.92],
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  snapPoints?: number[];
}) {
  const reduced = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const returnTo = useRef<Element | null>(null);
  const tracker = useRef(new VelocityTracker());
  const drag = useRef<{ startY: number; startTop: number } | null>(null);
  const [top, setTop] = useState<number | null>(null);

  const heights = useCallback(
    () => snapPoints.map((p) => window.innerHeight * (1 - p)).sort((a, b) => a - b),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapPoints.join(",")],
  );

  useEffect(() => {
    if (!open) {
      setTop(null);
      return;
    }
    const points = heights();
    setTop(points[points.length - 1] ?? window.innerHeight * 0.5);

    returnTo.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      (returnTo.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose, heights]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (top === null) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    // Respect where they grabbed it — never snap to the element's centre.
    drag.current = { startY: e.clientY, startTop: top };
    tracker.current.reset();
    tracker.current.push(e.clientY, e.timeStamp);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    tracker.current.push(e.clientY, e.timeStamp);
    const points = heights();
    const min = points[0] ?? 0;
    const next = drag.current.startTop + (e.clientY - drag.current.startY);
    // Soft resistance above the highest snap point; free travel downward.
    setTop(next < min ? min + rubberband(next - min, window.innerHeight) : next);
  };

  const onPointerUp = () => {
    if (!drag.current || top === null) return;
    drag.current = null;
    const velocity = tracker.current.velocity();
    const projected = top + project(velocity);
    const points = heights();
    const dismissAt = window.innerHeight * 0.86;

    if (projected > dismissAt) {
      onClose();
      return;
    }
    setTop(nearestSnap(projected, points));
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-ink-900/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="glass glass-sheet fixed inset-x-0 bottom-0 z-[71] flex flex-col rounded-t-[20px]"
            style={{ top: top ?? undefined, touchAction: "none" }}
            initial={reduced ? { opacity: 0 } : { y: "100%" }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: "100%" }}
            transition={
              reduced
                ? { duration: 0.2 }
                : { ...spring.sheet, velocity: tracker.current.velocity() }
            }
          >
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="shrink-0 cursor-grab px-5 pb-2 pt-3 active:cursor-grabbing"
            >
              <span
                className="mx-auto block h-1 w-10 rounded-pill bg-[var(--hairline-str)]"
                aria-hidden
              />
              <div className="mt-4 flex items-center justify-between">
                <h2 className="on-glass font-display text-base uppercase tracking-tight">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={`Close ${title}`}
                  className="press -mr-2 grid size-10 place-items-center rounded-pill text-text-hi"
                >
                  <Icon name="close" size={20} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
              {children}
            </div>

            {footer && (
              <div
                className={cn(
                  "shrink-0 border-t border-[color:var(--hairline)] px-5 pt-4",
                  "pb-[calc(env(safe-area-inset-bottom)+1rem)]",
                )}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
