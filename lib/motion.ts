import type { Transition } from "motion/react";

/**
 * The motion contract. DPR §4.5
 *
 * Critically damped by default — overshoot is earned by a gesture, never given
 * away to a menu that just faded in.
 */

export const spring = {
  /** Everything by default: menus, reveals, hovers, layout. */
  ui: { type: "spring", bounce: 0, duration: 0.35 } satisfies Transition,
  /** Only when a gesture carried momentum in: flick, drag release, carousel throw. */
  momentum: { type: "spring", bounce: 0.2, duration: 0.4 } satisfies Transition,
  /** Sheets and drawers. */
  sheet: { type: "spring", bounce: 0.2, duration: 0.3 } satisfies Transition,
  /** Slow, cinematic — the hero only. */
  cinema: { type: "spring", bounce: 0, duration: 1.2 } satisfies Transition,
} as const;

/** The non-vestibular equivalent used under prefers-reduced-motion. */
export const crossFade: Transition = { duration: 0.2, ease: "easeOut" };

/**
 * Where a flick is going, not where it was released. Apple's exponential-decay
 * form — not the physics-textbook v²/2a, which lands short.
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

export function nearestSnap(value: number, points: readonly number[]): number {
  return points.reduce((best, p) =>
    Math.abs(p - value) < Math.abs(best - value) ? p : best,
  points[0] ?? value);
}

/** Progressive resistance past a boundary. Never hard-stop. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Tracks a short pointer history so release velocity is real, not a guess. */
export class VelocityTracker {
  private samples: { v: number; t: number }[] = [];

  push(value: number, time = performance.now()) {
    this.samples.push({ v: value, t: time });
    if (this.samples.length > 6) this.samples.shift();
  }

  /** px/s over the most recent window; 0 if the pointer had settled. */
  velocity(): number {
    if (this.samples.length < 2) return 0;
    const last = this.samples[this.samples.length - 1]!;
    const first = this.samples.find((s) => last.t - s.t < 90) ?? this.samples[0]!;
    const dt = last.t - first.t;
    if (dt <= 0) return 0;
    return ((last.v - first.v) / dt) * 1000;
  }

  reset() {
    this.samples = [];
  }
}
