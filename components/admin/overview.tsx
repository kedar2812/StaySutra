"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AdminIcon, type AdminIconName } from "./icons";
import { CountUp, Meter, ProgressRing } from "./ui";
import { cn } from "@/lib/utils";

/* — Stat tiles ————————————————————————————————————————————————— */

export type Trend = { points: number[]; label: string };

/**
 * One headline number. Label, value, what it means — and, where it helps, a
 * twelve-week trend in a quiet line with the current week in the accent.
 * The tile that asks for action (`emphasis`) wears the accent; the others don't.
 */
export function StatTile({
  href,
  icon,
  label,
  value,
  suffix,
  note,
  noteTone,
  emphasis,
  trend,
  meter,
  status,
}: {
  href: string;
  icon: AdminIconName;
  label: string;
  value: number | string;
  suffix?: string;
  note: string;
  noteTone?: "up" | "down" | "neutral";
  emphasis?: boolean;
  trend?: Trend;
  meter?: number;
  status?: "ok" | "warn" | "err";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex min-h-[9.5rem] flex-col overflow-hidden rounded-[22px] p-4 transition-[transform,box-shadow] duration-200 ease-out active:scale-[0.98] sm:p-5",
        emphasis ? "bg-accent text-accent-fg shadow-[0_10px_30px_-14px_color-mix(in_oklab,var(--d-accent)_80%,transparent)]" : "bg-panel shadow-tile hover:shadow-pop",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-subhead font-semibold", emphasis ? "text-accent-fg/80" : "text-fg-2")}>{label}</span>
        <span className={cn("grid size-7 place-items-center rounded-full transition-transform duration-300 group-hover:translate-x-0.5", emphasis ? "bg-black/10" : "bg-fill")}>
          {status ? (
            <AdminIcon name={status === "ok" ? "checkCircle" : status === "err" ? "alert" : "info"} size={15} className={status === "ok" ? "text-pos-text" : status === "err" ? "text-neg-text" : "text-caution-text"} />
          ) : (
            <AdminIcon name={icon} size={15} className={emphasis ? "text-accent-fg" : "text-fg-3"} />
          )}
        </span>
      </div>
      <div className="mt-auto pt-4">
        <div className="flex items-end justify-between gap-3">
          <p
            className={cn(
              "min-w-0 truncate font-bold leading-none",
              typeof value === "number" ? "text-[2.125rem] tracking-[-0.03em] sm:text-[2.5rem]" : "text-[1.5rem] tracking-[-0.022em] sm:text-[1.75rem]",
              emphasis ? "text-accent-fg" : "text-fg",
            )}
          >
            {typeof value === "number" ? <CountUp value={value} /> : value}
            {suffix && <span className="ml-0.5 text-[0.6em] font-semibold tracking-[-0.02em]">{suffix}</span>}
          </p>
          {trend && <Sparkline points={trend.points} label={trend.label} />}
        </div>
        <p
          className={cn(
            "mt-2 flex items-center gap-1 truncate text-footnote font-medium",
            emphasis ? "text-accent-fg/75" : noteTone === "up" ? "text-pos-text" : noteTone === "down" ? "text-neg-text" : "text-fg-3",
          )}
        >
          {noteTone === "up" && <AdminIcon name="trendUp" size={13} strokeWidth={2} />}
          {noteTone === "down" && <AdminIcon name="trendDown" size={13} strokeWidth={2} />}
          <span className="truncate">{note}</span>
        </p>
      </div>
      {meter !== undefined && <Meter value={meter} className="mt-3" />}
    </Link>
  );
}

function Sparkline({ points, label }: { points: number[]; label: string }) {
  const w = 76;
  const h = 32;
  const max = Math.max(1, ...points);
  const step = w / Math.max(1, points.length - 1);
  const xy = points.map((p, i) => [i * step, h - 3 - (p / max) * (h - 6)] as const);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = xy.at(-1)!;
  return (
    <svg width={w} height={h} viewBox={`-4 -4 ${w + 8} ${h + 8}`} className="shrink-0 overflow-visible" role="img" aria-label={label}>
      <motion.path
        d={d}
        fill="none"
        stroke="var(--d-fg-4)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: [0.2, 0.9, 0.1, 1] }}
      />
      <motion.circle cx={last[0]} cy={last[1]} r={4} fill="var(--d-accent)" stroke="var(--d-panel)" strokeWidth={2} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9, type: "spring", bounce: 0.5, duration: 0.4 }} />
    </svg>
  );
}

/* — The next 30 nights ————————————————————————————————————————— */

export interface Lane {
  id: string;
  name: string;
  live: boolean;
  runs: { start: number; end: number; color: string; label: string; detail: string; striped: boolean }[];
}

/**
 * Thirty nights, one lane per property. Every stay is one continuous bar in
 * its platform's colour; blocks made by hand are striped, so the difference
 * never rests on colour alone. Hover or tap a bar for what it is.
 */
export function NightsTimeline({ lanes, days, legend }: { lanes: Lane[]; days: { iso: string; label: string; weekend: boolean; dom: number }[]; legend: { label: string; color: string; striped?: boolean }[] }) {
  const reduced = useReducedMotion();
  const [tip, setTip] = useState<{ x: number; y: number; title: string; body: string } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const n = days.length;

  const show = (e: React.PointerEvent | React.FocusEvent, title: string, body: string) => {
    const host = box.current?.getBoundingClientRect();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (!host) return;
    setTip({ x: r.left + r.width / 2 - host.left, y: r.top - host.top, title, body });
  };

  return (
    <div ref={box} className="relative" onPointerLeave={() => setTip(null)}>
      {/* Day ticks: every Monday gets its date. */}
      <div className="relative ml-0 h-5 sm:ml-[9.5rem]">
        {days.map((d, i) =>
          i === 0 || (i > 2 && i < n - 3 && new Date(`${d.iso}T00:00:00Z`).getUTCDay() === 1) ? (
            <span key={d.iso} className="absolute top-0 -translate-x-0 whitespace-nowrap text-caption font-medium tabular-nums text-fg-3" style={{ left: `${(i / n) * 100}%` }}>
              {i === 0 ? "Today" : d.label}
            </span>
          ) : null,
        )}
      </div>

      <div className="space-y-2.5">
        {lanes.map((lane, li) => (
          <div key={lane.id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-0">
            <p className="flex min-w-0 items-center gap-2 text-subhead font-medium text-fg sm:w-[9.5rem] sm:pr-4">
              <span className={cn("size-1.5 shrink-0 rounded-full", lane.live ? "bg-pos" : "bg-fg-4")} aria-hidden />
              <span className="truncate">{lane.name}</span>
            </p>
            <div className="relative h-8 w-full shrink-0 overflow-hidden rounded-[9px] bg-fill sm:w-auto sm:flex-1">
              {/* Weekends, faintly. */}
              {days.map((d, i) =>
                d.weekend ? <span key={d.iso} className="absolute inset-y-0 bg-fill" style={{ left: `${(i / n) * 100}%`, width: `${100 / n}%` }} /> : null,
              )}
              {lane.runs.map((r, ri) => (
                <motion.button
                  type="button"
                  key={ri}
                  aria-label={`${r.label}, ${r.detail}`}
                  onPointerEnter={(e) => show(e, r.label, r.detail)}
                  onFocus={(e) => show(e, r.label, r.detail)}
                  onBlur={() => setTip(null)}
                  initial={reduced ? false : { scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.7, delay: 0.15 + li * 0.06 + ri * 0.04 }}
                  className="absolute inset-y-[3px] origin-left rounded-[6px] outline-offset-1 transition-[filter] hover:brightness-110"
                  style={{
                    left: `calc(${(r.start / n) * 100}% + 1px)`,
                    width: `calc(${((r.end - r.start) / n) * 100}% - 2px)`,
                    background: r.striped ? `repeating-linear-gradient(135deg, ${r.color} 0 5px, color-mix(in oklab, ${r.color} 55%, transparent) 5px 10px)` : r.color,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 sm:ml-[9.5rem]">
        {legend.map((l) => (
          <li key={l.label} className="flex items-center gap-1.5 text-footnote text-fg-3">
            <span
              className="size-2.5 rounded-[3px]"
              style={{ background: l.striped ? `repeating-linear-gradient(135deg, ${l.color} 0 2px, color-mix(in oklab, ${l.color} 50%, transparent) 2px 4px)` : l.color }}
            />
            {l.label}
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {tip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ type: "spring", bounce: 0, duration: 0.22 }}
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[12px] bg-raised px-3 py-2 shadow-pop"
            style={{ left: tip.x, top: tip.y - 8 }}
          >
            <p className="text-subhead font-semibold text-fg">{tip.title}</p>
            <p className="text-footnote tabular-nums text-fg-3">{tip.body}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* — Setup ——————————————————————————————————————————————————————— */

export function SetupCard({ steps }: { steps: { done: boolean; label: string; hint: string; href: string }[] }) {
  const done = steps.filter((s) => s.done).length;
  const pct = done / steps.length;
  const next = useMemo(() => steps.find((s) => !s.done), [steps]);
  return (
    <div className="rounded-[22px] bg-panel p-5 shadow-tile sm:p-6">
      <div className="flex items-center gap-4">
        <ProgressRing value={pct} size={56} stroke={6} className="text-accent" trackClassName="text-fill-2">
          <span className="text-subhead font-bold tabular-nums text-fg">
            {done}/{steps.length}
          </span>
        </ProgressRing>
        <div className="min-w-0">
          <h2 className="text-headline text-fg">Finish setting up</h2>
          <p className="mt-0.5 text-subhead text-fg-3">{next ? `Next: ${next.label.toLowerCase()}` : "All done"}</p>
        </div>
      </div>
      <ul className="-mx-2 mt-4 space-y-0.5">
        {steps.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className={cn("group flex items-start gap-3 rounded-[14px] p-2 transition-colors", !s.done && "hover:bg-fill")}>
              <span className={cn("mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full transition-colors", s.done ? "bg-pos text-white" : "shadow-[inset_0_0_0_1.5px_var(--d-fill-3)]")}>
                {s.done && <AdminIcon name="check" size={12} strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-callout", s.done ? "text-fg-3 line-through decoration-fg-4" : "font-medium text-fg")}>{s.label}</span>
                {!s.done && <span className="mt-0.5 block text-subhead leading-snug text-fg-3">{s.hint}</span>}
              </span>
              {!s.done && <AdminIcon name="chevronRight" size={16} className="mt-1 shrink-0 text-fg-4 transition-transform group-hover:translate-x-0.5" />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* — Activity ———————————————————————————————————————————————————— */

const ENTITY_ICON: Record<string, AdminIconName> = {
  Property: "properties",
  Enquiry: "inbox",
  Media: "image",
  CalendarFeed: "sync",
  CalendarBlock: "calendar",
  Story: "stories",
  Destination: "map",
  SiteSection: "content",
  SiteSetting: "settings",
  User: "user",
};

export function ActivityFeed({ items }: { items: { id: string; summary: string; entity: string; ago: string }[] }) {
  if (!items.length) return <p className="py-6 text-center text-callout text-fg-3">Changes made in the dashboard appear here.</p>;
  return (
    <ol className="relative">
      {items.map((a, i) => (
        <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
          {i < items.length - 1 && <span className="absolute bottom-0 left-[13px] top-8 w-px bg-line" aria-hidden />}
          <span className="relative grid size-[27px] shrink-0 place-items-center rounded-full bg-fill-2 text-fg-3">
            <AdminIcon name={ENTITY_ICON[a.entity] ?? "edit"} size={14} />
          </span>
          <div className="min-w-0 pt-[3px]">
            <p className="text-callout leading-snug text-fg">{a.summary}</p>
            <p className="mt-0.5 text-footnote text-fg-3">{a.ago}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
