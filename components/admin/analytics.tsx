"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AdminIcon } from "./icons";
import { CountUp, Segmented } from "./ui";
import { cn } from "@/lib/utils";
import { liveVisitors } from "@/app/dashboard/analytics/actions";

/*
 * Analytics figures. One axis per chart, thin marks, recessive grid, a
 * crosshair and a tooltip on every chart that has a plot. Colour follows the
 * series and never the text: values and labels stay in the text tokens, a
 * coloured key beside them carries identity. (dataviz method.)
 */

const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");
const compact = (n: number) => (n >= 100_000 ? `${(n / 100_000).toFixed(1).replace(/\.0$/, "")}L` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(Math.round(n)));

function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(e!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const dayLabel = (d: string, week: boolean) => {
  const f = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  return week ? `Week of ${f}` : new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
};

/* — Traffic ————————————————————————————————————————————————————— */

export function TrafficChart({ points, week }: { points: { d: string; visitors: number; views: number; enquiries: number }[]; week: boolean }) {
  const reduced = useReducedMotion();
  const [box, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 240;
  const E = 54; // the enquiry strip below
  const padL = 36;
  const padR = 8;
  const padT = 12;
  const plotW = Math.max(0, width - padL - padR);
  const max = niceMax(Math.max(1, ...points.map((p) => Math.max(p.visitors, p.views))));
  const emax = Math.max(1, ...points.map((p) => p.enquiries));
  const n = points.length;
  const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - 24);

  const line = (key: "visitors" | "views") => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(" ");
  const area = `${line("visitors")} L${x(n - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 84))));

  const onMove = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const px = e.clientX - r.left - padL;
    setHover(Math.max(0, Math.min(n - 1, Math.round((px / Math.max(1, plotW)) * (n - 1)))));
  };

  const h = hover !== null ? points[hover] : null;
  const barW = Math.min(24, Math.max(2, plotW / Math.max(1, n) - 2));

  return (
    <div ref={box} className="relative select-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={`Visitors and page views, ${week ? "per week" : "per day"}. Peak ${fmt(Math.max(...points.map((p) => p.visitors)))} visitors.`}>
      {width > 0 && (
        <svg width={width} height={H + E + 8} className="block overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="var(--d-line)" strokeWidth={1} />
              <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="fill-[var(--d-fg-3)] text-[11px] tabular-nums">
                {compact(t)}
              </text>
            </g>
          ))}
          <motion.path d={area} fill="color-mix(in oklab, var(--viz-1) 12%, transparent)" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
          <motion.path d={line("views")} fill="none" stroke="var(--viz-2)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.2, 0.9, 0.1, 1] }} />
          <motion.path d={line("visitors")} fill="none" stroke="var(--viz-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.2, 0.9, 0.1, 1], delay: 0.1 }} />

          {points.map((p, i) =>
            i % labelEvery === 0 ? (
              <text key={p.d} x={x(i)} y={H - 4} textAnchor={i === 0 ? "start" : "middle"} className="fill-[var(--d-fg-3)] text-[11px] tabular-nums">
                {new Intl.DateTimeFormat("en-IN", week ? { month: "short", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${p.d}T00:00:00Z`))}
              </text>
            ) : null,
          )}

          {/* Enquiries — their own small chart, on their own axis. */}
          <g transform={`translate(0 ${H + 8})`}>
            <text x={padL - 8} y={12} textAnchor="end" className="fill-[var(--d-fg-3)] text-[11px] tabular-nums">
              {emax}
            </text>
            <line x1={padL} x2={width - padR} y1={E - 2} y2={E - 2} stroke="var(--d-line-2)" />
            {points.map((p, i) =>
              p.enquiries ? (
                <motion.rect
                  key={p.d}
                  x={x(i) - barW / 2}
                  width={barW}
                  y={E - 2 - (p.enquiries / emax) * (E - 10)}
                  height={(p.enquiries / emax) * (E - 10)}
                  rx={Math.min(4, barW / 2)}
                  fill="var(--viz-3)"
                  initial={reduced ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  style={{ transformOrigin: `0 ${E - 2}px`, transformBox: "view-box" }}
                  transition={{ type: "spring", bounce: 0, duration: 0.6, delay: 0.4 + i * 0.005 }}
                />
              ) : null,
            )}
          </g>

          {h && hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H + E + 6} stroke="var(--d-fg-4)" strokeWidth={1} />
              <circle cx={x(hover)} cy={y(h.views)} r={4.5} fill="var(--viz-2)" stroke="var(--d-panel)" strokeWidth={2} />
              <circle cx={x(hover)} cy={y(h.visitors)} r={4.5} fill="var(--viz-1)" stroke="var(--d-panel)" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
      <AnimatePresence>
        {h && hover !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ type: "spring", bounce: 0, duration: 0.2 }}
            className="pointer-events-none absolute top-0 z-10 w-44 rounded-[14px] bg-raised p-3 shadow-pop"
            style={{ left: Math.min(Math.max(0, x(hover) + 14), width - 176) }}
          >
            <p className="text-footnote font-semibold text-fg">{dayLabel(h.d, week)}</p>
            <TipRow color="var(--viz-1)" label="Visitors" value={h.visitors} />
            <TipRow color="var(--viz-2)" label="Page views" value={h.views} />
            <TipRow color="var(--viz-3)" label="Enquiries" value={h.enquiries} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TipRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <p className="mt-1.5 flex items-center gap-2 text-footnote">
      <span className="size-2 rounded-full" style={{ background: color }} />
      <span className="flex-1 text-fg-2">{label}</span>
      <span className="font-semibold tabular-nums text-fg">{fmt(value)}</span>
    </p>
  );
}

export function SeriesKey({ items }: { items: { color: string; label: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-footnote font-medium text-fg-2">
          <span className="h-[3px] w-3.5 rounded-full" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/* — KPI ————————————————————————————————————————————————————————— */

export function Kpi({ label, value, display, previous, unit, good = "up", hint, prevLabel }: { label: string; value: number; display?: string; previous: number; unit?: string; good?: "up" | "down"; hint?: string; prevLabel: string }) {
  const change = previous ? (value - previous) / previous : value ? 1 : 0;
  const flat = Math.abs(change) < 0.005 || (!previous && !value);
  const better = flat ? null : (change > 0) === (good === "up");
  return (
    <div className="flex min-h-[8.5rem] flex-col rounded-[22px] bg-panel p-4 shadow-tile sm:p-5" title={hint}>
      <p className="flex items-start gap-1 text-subhead font-semibold leading-snug text-fg-2">
        <span>{label}</span>
        {hint && <AdminIcon name="info" size={13} className="mt-[3px] shrink-0 text-fg-4" />}
      </p>
      <p className="mt-auto pt-3 text-[1.875rem] font-bold leading-none tracking-[-0.03em] text-fg sm:text-[2.125rem]">
        {display ?? <CountUp value={value} />}
        {unit && <span className="ml-0.5 text-[0.55em] font-semibold text-fg-2">{unit}</span>}
      </p>
      <p className={cn("mt-2 flex items-center gap-1 text-footnote font-medium", flat ? "text-fg-3" : better ? "text-pos-text" : "text-neg-text")}>
        {!flat && <AdminIcon name={change > 0 ? "trendUp" : "trendDown"} size={13} strokeWidth={2} />}
        <span className="truncate" title={`Compared with the ${prevLabel}`}>
          {flat ? "No change" : `${change > 0 ? "+" : "−"}${Math.round(Math.abs(change) * 100)}%`}
          {!flat && <span className="font-normal text-fg-3"> vs before</span>}
        </span>
      </p>
    </div>
  );
}

/* — Ranked lists ———————————————————————————————————————————————— */

export function BarList({
  rows,
  valueLabel,
  empty = "No visits in this period yet.",
}: {
  rows: { key: string; label: React.ReactNode; value: number; extra?: React.ReactNode; href?: string }[];
  valueLabel: string;
  empty?: string;
}) {
  const reduced = useReducedMotion();
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-8 text-center text-subhead text-fg-3">{empty}</p>;
  return (
    <div>
      <div className="mb-1 flex justify-end px-1 text-caption font-semibold text-fg-3">{valueLabel}</div>
      <ul className="space-y-0.5">
        {rows.map((r, i) => {
          const inner = (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-callout text-fg">{r.label}</span>
                <span className="flex shrink-0 items-baseline gap-2.5 text-callout tabular-nums">
                  {r.extra}
                  <span className="w-12 text-right font-semibold text-fg">{fmt(r.value)}</span>
                </span>
              </div>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-fill">
                <motion.span
                  className="block h-full rounded-full bg-[var(--viz-1)]"
                  initial={reduced ? false : { width: 0 }}
                  animate={{ width: `${(r.value / max) * 100}%` }}
                  transition={{ type: "spring", bounce: 0, duration: 0.7, delay: i * 0.035 }}
                />
              </span>
            </>
          );
          return (
            <li key={r.key}>
              {r.href ? (
                <Link href={r.href} className="block rounded-[12px] px-2 py-2 transition-colors hover:bg-fill">
                  {inner}
                </Link>
              ) : (
                <div className="px-2 py-2">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* — Devices ————————————————————————————————————————————————————— */

const DEVICE_COLOR: Record<string, string> = { Phone: "var(--viz-1)", Desktop: "var(--viz-2)", Tablet: "var(--viz-3)" };

export function DeviceSplit({ devices }: { devices: { device: string; visitors: number }[] }) {
  const reduced = useReducedMotion();
  const total = devices.reduce((n, d) => n + d.visitors, 0);
  const order = ["Phone", "Desktop", "Tablet"].map((k) => ({ device: k, visitors: devices.find((d) => d.device === k)?.visitors ?? 0 }));
  if (!total) return <p className="py-6 text-center text-subhead text-fg-3">No visits in this period yet.</p>;
  return (
    <div>
      <div className="flex h-7 gap-[2px] overflow-hidden rounded-[8px]" role="img" aria-label={order.map((d) => `${d.device} ${Math.round((d.visitors / total) * 100)}%`).join(", ")}>
        {order
          .filter((d) => d.visitors)
          .map((d, i) => {
            const share = d.visitors / total;
            return (
              <motion.span
                key={d.device}
                className="flex h-full items-center rounded-[4px] px-2 text-caption font-bold text-white"
                style={{ background: DEVICE_COLOR[d.device] }}
                initial={reduced ? false : { flexGrow: 0.001 }}
                animate={{ flexGrow: share }}
                transition={{ type: "spring", bounce: 0, duration: 0.8, delay: i * 0.06 }}
              >
                {share > 0.12 ? `${Math.round(share * 100)}%` : ""}
              </motion.span>
            );
          })}
      </div>
      <ul className="mt-4 space-y-2.5">
        {order.map((d) => (
          <li key={d.device} className="flex items-center gap-2.5 text-callout">
            <span className="size-2.5 rounded-[3px]" style={{ background: DEVICE_COLOR[d.device] }} />
            <span className="flex-1 text-fg">{d.device}</span>
            <span className="tabular-nums text-fg-3">{fmt(d.visitors)}</span>
            <span className="w-11 text-right font-semibold tabular-nums text-fg">{Math.round((d.visitors / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* — Funnel —————————————————————————————————————————————————————— */

export function Funnel({ steps }: { steps: { label: string; value: number; note: string }[] }) {
  const reduced = useReducedMotion();
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const share = s.value / top;
        const prev = i ? steps[i - 1]!.value : null;
        return (
          <li key={s.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-callout text-fg">{s.label}</span>
              <span className="text-callout font-semibold tabular-nums text-fg">
                {fmt(s.value)}
                {prev !== null && <span className="ml-2 font-normal text-fg-3">{prev ? `${Math.round((s.value / prev) * 100)}%` : "—"}</span>}
              </span>
            </div>
            <span className="block h-6 overflow-hidden rounded-[6px] bg-fill">
              <motion.span
                className="block h-full rounded-[6px] bg-[var(--viz-1)]"
                style={{ opacity: 1 - i * 0.22 }}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${Math.max(share * 100, s.value ? 1.5 : 0)}%` }}
                transition={{ type: "spring", bounce: 0, duration: 0.8, delay: i * 0.1 }}
              />
            </span>
            <p className="mt-1 text-footnote text-fg-3">{s.note}</p>
          </li>
        );
      })}
    </ol>
  );
}

/* — When people browse ———————————————————————————————————————————— */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Page views by weekday and hour (India time), one hue from light to dark. */
export function Heatmap({ cells }: { cells: { dow: number; h: number; n: number }[] }) {
  const [tip, setTip] = useState<{ dow: number; h: number; n: number } | null>(null);
  const grid = useMemo(() => {
    const m = new Map(cells.map((c) => [`${c.dow}-${c.h}`, c.n]));
    return DAYS.map((_, d) => Array.from({ length: 24 }, (_, h) => m.get(`${d + 1}-${h}`) ?? 0));
  }, [cells]);
  const max = Math.max(1, ...cells.map((c) => c.n));
  const busiest = cells.reduce<{ dow: number; h: number; n: number } | null>((b, c) => (!b || c.n > b.n ? c : b), null);
  const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? " am" : " pm"}`;

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-[34rem]">
          <div className="grid grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-[3px]" onPointerLeave={() => setTip(null)}>
            {grid.map((row, d) => (
              <div key={d} className="contents">
                <span className="self-center text-caption font-semibold text-fg-3">{DAYS[d]}</span>
                {row.map((n, h) => (
                  <span
                    key={h}
                    onPointerEnter={() => setTip({ dow: d + 1, h, n })}
                    className="aspect-square rounded-[4px] transition-transform hover:scale-125"
                    style={{ background: n ? `color-mix(in oklab, var(--viz-1) ${12 + (n / max) * 88}%, var(--d-panel))` : "var(--d-fill)" }}
                  />
                ))}
              </div>
            ))}
            <span />
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="text-center text-[0.625rem] tabular-nums text-fg-3">
                {h % 6 === 0 ? hourLabel(h).replace(" ", "") : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 h-5 text-subhead text-fg-3">
        {tip ? (
          <>
            <span className="font-semibold text-fg">
              {DAYS[tip.dow - 1]}, {hourLabel(tip.h)}–{hourLabel((tip.h + 1) % 24)}
            </span>{" "}
            · {fmt(tip.n)} page views
          </>
        ) : busiest ? (
          <>
            Busiest: <span className="font-semibold text-fg">{DAYS[busiest.dow - 1]}s around {hourLabel(busiest.h)}</span> — a good time to be quick on WhatsApp.
          </>
        ) : (
          "Shows once visits come in."
        )}
      </p>
    </div>
  );
}

/* — Right now ——————————————————————————————————————————————————— */

export function LiveNow({ initial }: { initial: { visitors: number; pages: { path: string; visitors: number }[] } }) {
  const [live, setLive] = useState(initial);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const next = await liveVisitors();
        if (alive) setLive(next);
      } catch {}
    };
    const t = setInterval(tick, 20_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="flex items-center gap-3 rounded-full bg-panel py-1.5 pl-3 pr-4 shadow-tile">
      <span className={cn("relative size-2.5 rounded-full", live.visitors ? "d-pulse bg-pos text-pos" : "bg-fg-4")} />
      <span className="text-subhead text-fg-2">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={live.visitors} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="inline-block font-bold tabular-nums text-fg">
            {live.visitors}
          </motion.span>
        </AnimatePresence>{" "}
        {live.visitors === 1 ? "visitor" : "visitors"} right now
        {live.pages[0] && <span className="hidden text-fg-3 sm:inline"> · most on {live.pages[0].path === "/" ? "the homepage" : live.pages[0].path}</span>}
      </span>
    </div>
  );
}

/* — Range ———————————————————————————————————————————————————————— */

export function RangePicker({ value, options }: { value: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div className={cn("transition-opacity", pending && "opacity-60")}>
      <Segmented
        id="analytics-range"
        value={v}
        onChange={(next) => {
          setV(next);
          start(() => router.push(`/dashboard/analytics?range=${next}`, { scroll: false }));
        }}
        options={options}
      />
    </div>
  );
}
