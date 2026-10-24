import type { BlockedRange } from "../types";

/**
 * Calendar dates as plain "YYYY-MM-DD" strings.
 *
 * A stay is a run of nights, not a span of instants, so nothing here touches a
 * time zone: a night is named by the date it starts on, and a range is
 * [start, end) — end is the checkout day, exactly as iCal's all-day DTEND.
 * A guest checking out on the 14th and another checking in on the 14th do not
 * clash, and must not.
 */

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(start: string, end: string): number {
  return Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000,
  );
}

/** Today in India — the only calendar this business runs on. */
export function todayIST(now: Date = new Date()): string {
  return new Date(now.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

/**
 * The next Friday-to-Sunday (two nights) with both nights free, searching up to
 * `weeks` ahead. This is what a group planning a getaway actually asks, so the
 * site answers it before they do.
 */
export function nextFreeWeekend(
  ranges: BlockedRange[],
  from: string = todayIST(),
  weeks = 16,
): { checkIn: string; checkOut: string } | null {
  const day = new Date(`${from}T00:00:00Z`).getUTCDay();
  let friday = addDays(from, (5 - day + 7) % 7);
  for (let i = 0; i < weeks; i++, friday = addDays(friday, 7)) {
    const sunday = addDays(friday, 2);
    if (isRangeFree(friday, sunday, ranges)) return { checkIn: friday, checkOut: sunday };
  }
  return null;
}

/** Sorts and joins overlapping or touching ranges into the fewest runs. */
export function mergeRanges(ranges: BlockedRange[]): BlockedRange[] {
  const sorted = ranges
    .filter((r) => r.end > r.start)
    .map((r) => ({ start: r.start, end: r.end }))
    .sort((a, b) => a.start.localeCompare(b.start));
  const out: BlockedRange[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.start <= last.end) {
      if (r.end > last.end) last.end = r.end;
    } else out.push(r);
  }
  return out;
}

/** Is the night starting on `date` unavailable? */
export function isNightBlocked(date: string, ranges: BlockedRange[]): boolean {
  return ranges.some((r) => r.start <= date && date < r.end);
}

/** Can a stay check in on `checkIn` and leave on `checkOut` without touching a blocked night? */
export function isRangeFree(checkIn: string, checkOut: string, ranges: BlockedRange[]): boolean {
  if (checkOut <= checkIn) return false;
  return !ranges.some((r) => r.start < checkOut && checkIn < r.end);
}

/**
 * The latest checkout possible after checking in on `checkIn` — the start of
 * the next blocked run — or null when the calendar is open from there on.
 */
export function lastCheckoutAfter(checkIn: string, ranges: BlockedRange[]): string | null {
  const next = ranges
    .map((r) => r.start)
    .filter((s) => s > checkIn)
    .sort()[0];
  return next ?? null;
}

/** "Fri, 6 Nov". Pure, so server and client components can both use it. */
export function shortDay(day: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}
