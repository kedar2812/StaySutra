"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Frame } from "@/components/primitives/Frame";
import { Icon } from "@/components/primitives/Icon";
import { nearestSnap, project, spring, VelocityTracker } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { PlateMood, PlateScene } from "@/lib/plate";

/**
 * Property gallery + full-screen lightbox.
 *
 * The lightbox materialises — blur radius and scale animate together, so it
 * reads as a surface arriving rather than an opacity fade. Swipe tracks 1:1 and
 * snaps to where the flick was going. Escape closes and focus returns to the
 * trigger. DPR §7.6 (1)
 */
export function Gallery({
  slug,
  count,
  name,
  scene,
  mood,
}: {
  slug: string;
  count: number;
  name: string;
  scene?: PlateScene;
  mood?: PlateMood;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);

  /*
   * One scene keeps the set in the same place; the mood rotates so the frames
   * read as different times of day rather than the same photograph repeated.
   */
  const moods: PlateMood[] = ["dusk", "dawn", "night"];
  const shots = Array.from({ length: Math.max(1, count) }, (_, i) => ({
    seed: `${slug}-${i}`,
    mood: i === 0 ? (mood ?? "dusk") : (moods[i % moods.length] as PlateMood),
  }));
  const single = shots.length === 1;

  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);

  const openAt = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

  return (
    <>
      {/* A single-image property gets a single-image layout, not an empty grid. */}
      <div
        className={cn(
          "grid gap-2",
          single ? "" : "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
        )}
      >
        <button
          type="button"
          ref={trigger}
          onClick={() => openAt(0)}
          aria-label={`Open the photo gallery for ${name}`}
          className="press group relative block overflow-hidden rounded-card"
        >
          <Frame
            seed={shots[0]!.seed}
            scene={scene}
            mood={shots[0]!.mood}
            ratio={single ? "16/9" : "4/3"}
            sizes="(min-width:1024px) 66vw, 100vw"
            priority
            imgClassName="transition-transform duration-[500ms] ease-out-quint group-hover:scale-[1.03]"
          />
        </button>

        {!single && (
          <div className="hidden grid-rows-2 gap-2 lg:grid">
            {shots.slice(1, 3).map((s, i) => (
              <button
                key={s.seed}
                type="button"
                onClick={() => openAt(i + 1)}
                aria-label={`Photo ${i + 2} of ${shots.length}`}
                className="press group relative block overflow-hidden rounded-card"
              >
                <Frame
                  seed={s.seed}
                  scene={scene}
                  mood={s.mood}
                  fill
                  sizes="33vw"
                  imgClassName="transition-transform duration-[500ms] ease-out-quint group-hover:scale-[1.04]"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => openAt(0)}
        className="press glass mt-4 inline-flex items-center gap-2 rounded-pill px-5 py-2.5 text-[0.8125rem] font-medium text-text-hi"
      >
        <Icon name="camera" size={16} />
        View all {shots.length} photos
      </button>

      <Lightbox
        open={open}
        onClose={close}
        index={index}
        setIndex={setIndex}
        shots={shots}
        name={name}
        scene={scene}
      />
    </>
  );
}

function Lightbox({
  open,
  onClose,
  index,
  setIndex,
  shots,
  name,
  scene,
}: {
  open: boolean;
  onClose: () => void;
  index: number;
  setIndex: (i: number) => void;
  shots: { seed: string; mood: PlateMood }[];
  name: string;
  scene?: PlateScene;
}) {
  const reduced = useReducedMotion();
  const rail = useRef<HTMLDivElement>(null);
  const tracker = useRef(new VelocityTracker());
  const drag = useRef<{ x: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex(Math.min(shots.length - 1, index + 1));
      if (e.key === "ArrowLeft") setIndex(Math.max(0, index - 1));
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, index, setIndex, shots.length]);

  useEffect(() => {
    const el = rail.current;
    if (!el || !open) return;
    const target = el.clientWidth * index;
    if (Math.abs(el.scrollLeft - target) > 4) {
      el.scrollTo({ left: target, behavior: reduced ? "auto" : "smooth" });
    }
  }, [index, open, reduced]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} — photo gallery`}
          className="fixed inset-0 z-[80] flex flex-col bg-ink-900/92"
          initial={reduced ? { opacity: 0 } : { opacity: 0, backdropFilter: "blur(0px)" }}
          animate={
            reduced ? { opacity: 1 } : { opacity: 1, backdropFilter: "blur(20px)" }
          }
          exit={reduced ? { opacity: 0 } : { opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        >
          <div className="flex items-center justify-between px-5 py-4">
            <p className="t-caption tabular-nums text-text-mid">
              {index + 1} / {shots.length}
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close gallery"
              className="press grid size-11 place-items-center rounded-pill text-text-hi"
            >
              <Icon name="close" size={22} />
            </button>
          </div>

          <motion.div
            className="flex min-h-0 flex-1 items-center px-4 pb-6"
            initial={reduced ? false : { scale: 0.96 }}
            animate={{ scale: 1 }}
            exit={reduced ? undefined : { scale: 0.96 }}
            transition={spring.ui}
          >
            <div
              ref={rail}
              className="rail flex h-full w-full items-center"
              onPointerDown={(e) => {
                if (e.pointerType === "mouse" || !rail.current) return;
                drag.current = { x: e.clientX, left: rail.current.scrollLeft };
                tracker.current.reset();
                tracker.current.push(e.clientX, e.timeStamp);
              }}
              onPointerMove={(e) => {
                if (!drag.current || !rail.current) return;
                tracker.current.push(e.clientX, e.timeStamp);
                rail.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
              }}
              onPointerUp={() => {
                const el = rail.current;
                if (!drag.current || !el) return;
                drag.current = null;
                const points = shots.map((_, i) => el.clientWidth * i);
                const projected = el.scrollLeft - project(tracker.current.velocity());
                const snapped = nearestSnap(projected, points);
                setIndex(points.indexOf(snapped));
              }}
            >
              {shots.map((s) => (
                <div key={s.seed} className="w-full shrink-0 snap-center px-1">
                  <Frame
                    seed={s.seed}
                    scene={scene}
                    mood={s.mood}
                    ratio="16/9"
                    sizes="100vw"
                    className="rounded-card"
                  />
                </div>
              ))}
            </div>
          </motion.div>

          <div className="flex items-center justify-center gap-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            <button
              type="button"
              onClick={() => setIndex(Math.max(0, index - 1))}
              disabled={index === 0}
              aria-label="Previous photo"
              className="press grid size-12 place-items-center rounded-pill border border-[color:var(--hairline-str)] text-text-hi disabled:opacity-30"
            >
              <Icon name="arrowLeft" size={18} />
            </button>
            <button
              type="button"
              onClick={() => setIndex(Math.min(shots.length - 1, index + 1))}
              disabled={index === shots.length - 1}
              aria-label="Next photo"
              className="press grid size-12 place-items-center rounded-pill border border-[color:var(--hairline-str)] text-text-hi disabled:opacity-30"
            >
              <Icon name="arrowRight" size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
