"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Icon } from "@/components/primitives/Icon";
import {
  addDays,
  isNightBlocked,
  isRangeFree,
  lastCheckoutAfter,
  todayIST,
} from "@/lib/calendar/dates";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { BlockedRange } from "@/lib/types";

export interface DateRange {
  checkIn: string;
  checkOut: string;
}

/**
 * The availability calendar.
 *
 * Booked nights come from every connected platform (Airbnb today, the rest
 * as they are added in the dashboard) plus anything held by hand, so a guest
 * here physically cannot ask for dates that are taken elsewhere.
 *
 * Selection follows the hotel convention every guest already knows: tap a
 * check-in, tap a check-out. A booked night cannot be a check-in; the first
 * booked night after a check-in is the latest possible check-out (you leave
 * that morning), and everything past it dims until the range is reset.
 *
 * Months slide with a spring and the direction you moved, so the grid reads as
 * one continuous strip rather than a page that swaps. DPR §4.5
 */
export function AvailabilityCalendar({
  blocked,
  value,
  onChange,
  months = 1,
  readOnly = false,
  className,
}: {
  blocked: BlockedRange[];
  value?: DateRange;
  onChange?: (next: DateRange) => void;
  /** Months shown side by side from `sm` up; phones always get one. */
  months?: 1 | 2;
  readOnly?: boolean;
  className?: string;
}) {
  const today = todayIST();
  const reduced = useReducedMotion();
  const [cursor, setCursor] = useState(() => monthOf(value?.checkIn || today));
  const [direction, setDirection] = useState(0);
  const [hover, setHover] = useState<string | null>(null);

  const checkIn = value?.checkIn ?? "";
  const checkOut = value?.checkOut ?? "";
  const choosingOut = Boolean(checkIn && !checkOut);
  const limit = choosingOut ? lastCheckoutAfter(checkIn, blocked) : null;

  // Twelve months ahead is as far as the platforms publish anyway.
  const first = monthOf(today);
  const last = addMonths(first, 12);
  const canBack = cursor > first;
  const canNext = addMonths(cursor, months - 1) < last;

  const go = (step: number) => {
    setDirection(step);
    setCursor((c) => addMonths(c, step));
  };

  const pick = (day: string) => {
    if (readOnly || !onChange) return;
    if (choosingOut && day > checkIn && isRangeFree(checkIn, day, blocked)) {
      onChange({ checkIn, checkOut: day });
      return;
    }
    if (isNightBlocked(day, blocked) || day < today) return;
    onChange({ checkIn: day, checkOut: "" });
  };

  const previewEnd = choosingOut && hover && hover > checkIn && isRangeFree(checkIn, hover, blocked) ? hover : null;

  const shown = Array.from({ length: months }, (_, i) => addMonths(cursor, i));

  return (
    <div className={cn("select-none", className)}>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-between">
          <NavButton label="Previous month" icon="arrowLeft" disabled={!canBack} onClick={() => go(-1)} />
          <NavButton label="Next month" icon="arrowRight" disabled={!canNext} onClick={() => go(1)} />
        </div>

        <div className="overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout" custom={direction}>
            <motion.div
              key={cursor}
              custom={direction}
              variants={{
                enter: (d: number) => ({ x: reduced ? 0 : d * 40, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: reduced ? 0 : d * -40, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={reduced ? { duration: 0 } : spring.ui}
              className={cn("grid gap-8", months === 2 && "sm:grid-cols-2")}
            >
              {shown.map((month, i) => (
                <Month
                  key={month}
                  month={month}
                  className={i > 0 ? "max-sm:hidden" : undefined}
                  today={today}
                  blocked={blocked}
                  checkIn={checkIn}
                  checkOut={checkOut || previewEnd || ""}
                  preview={!checkOut && Boolean(previewEnd)}
                  limit={limit}
                  choosingOut={choosingOut}
                  readOnly={readOnly}
                  onPick={pick}
                  onHover={setHover}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.75rem] text-text-low">
        <li className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-full border border-[color:var(--hairline-str)] text-[0.625rem] text-text-mid">
            7
          </span>
          Available
        </li>
        <li className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-full text-[0.625rem] text-text-low/70 line-through">
            7
          </span>
          Booked
        </li>
        {!readOnly && (
          <li className="flex items-center gap-2">
            <span className="size-5 rounded-full bg-gold-500" />
            Your dates
          </li>
        )}
      </ul>
    </div>
  );
}

function NavButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: "arrowLeft" | "arrowRight";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="press pointer-events-auto -mt-1.5 grid size-9 place-items-center rounded-full text-text-mid transition-colors hover:bg-white/5 hover:text-text-hi disabled:opacity-25"
    >
      <Icon name={icon} size={17} />
    </button>
  );
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function Month({
  month,
  today,
  blocked,
  checkIn,
  checkOut,
  preview,
  limit,
  choosingOut,
  readOnly,
  onPick,
  onHover,
  className,
}: {
  month: string;
  today: string;
  blocked: BlockedRange[];
  checkIn: string;
  checkOut: string;
  preview: boolean;
  limit: string | null;
  choosingOut: boolean;
  readOnly: boolean;
  onPick: (day: string) => void;
  onHover: (day: string | null) => void;
  className?: string;
}) {
  const grid = useRef<HTMLDivElement>(null);
  const days = useMemo(() => daysOf(month), [month]);
  const lead = new Date(`${month}-01T00:00:00Z`).getUTCDay();

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    const current = (document.activeElement as HTMLElement | null)?.dataset.day;
    if (!current) return;
    const next = grid.current?.querySelector<HTMLButtonElement>(`[data-day="${addDays(current, step)}"]`);
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  return (
    <div className={className}>
      <p className="text-center text-[0.9375rem] font-semibold text-text-hi">{monthLabel(month)}</p>
      <div className="mt-4 grid grid-cols-7 text-center text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-text-low">
        {WEEKDAYS.map((d, i) => (
          <span key={i} aria-hidden>
            {d}
          </span>
        ))}
      </div>
      <div
        ref={grid}
        role="grid"
        aria-label={monthLabel(month)}
        onKeyDown={onKeyDown}
        onPointerLeave={() => onHover(null)}
        className="mt-2 grid grid-cols-7 gap-y-1"
      >
        {Array.from({ length: lead }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const past = day < today;
          const booked = isNightBlocked(day, blocked);
          const isStart = day === checkIn;
          const isEnd = day === checkOut;
          const inRange = Boolean(checkIn && checkOut && day > checkIn && day < checkOut);
          // While picking a check-out, the first booked night is still a valid
          // morning to leave; everything past it is not.
          const checkoutOnly = choosingOut && booked && day === limit;
          const beyond = choosingOut && limit !== null && day > limit;
          const disabled =
            readOnly || past || beyond || (choosingOut ? day <= checkIn && booked : booked && !checkoutOnly);
          const label = `${longLabel(day)}${booked ? ", booked" : past ? "" : ", available"}${
            isStart ? ", check-in" : isEnd ? ", check-out" : ""
          }`;

          return (
            <div
              key={day}
              role="gridcell"
              aria-selected={isStart || isEnd || inRange}
              className={cn(
                "relative flex h-10 items-center justify-center",
                inRange && (preview ? "bg-gold-500/10" : "bg-gold-500/15"),
                isStart && checkOut && "rounded-l-full bg-gradient-to-r from-transparent from-50% to-gold-500/15 to-50%",
                isEnd && checkIn && "rounded-r-full bg-gradient-to-l from-transparent from-50% to-gold-500/15 to-50%",
              )}
            >
              <button
                type="button"
                data-day={day}
                tabIndex={isStart || (!checkIn && day === today) ? 0 : -1}
                disabled={disabled && !readOnly}
                aria-disabled={readOnly || disabled}
                aria-label={label}
                onClick={() => !disabled && onPick(day)}
                onPointerEnter={() => onHover(day)}
                onFocus={() => onHover(day)}
                className={cn(
                  "relative grid size-10 place-items-center rounded-full text-[0.875rem] tabular-nums transition-[background-color,color,transform] duration-150",
                  !readOnly && !disabled && "cursor-pointer hover:bg-white/[0.07] active:scale-90",
                  readOnly && "cursor-default",
                  past && "text-text-low/35",
                  !past && booked && !checkoutOnly && "text-text-low/55 line-through decoration-text-low/50",
                  !past && !booked && "text-text-hi",
                  checkoutOnly && "text-text-mid",
                  beyond && !booked && "text-text-low/40",
                  day === today && !isStart && !isEnd && "font-semibold text-gold-400",
                  (isStart || isEnd) && "bg-gold-500 font-semibold text-gold-ink hover:bg-gold-400",
                  isEnd && preview && "bg-gold-500/60",
                )}
              >
                {Number(day.slice(8))}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* — Month arithmetic on "YYYY-MM" ———————————————————————————— */

function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

function daysOf(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}

function longLabel(day: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}
