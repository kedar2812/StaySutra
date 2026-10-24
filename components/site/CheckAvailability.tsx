"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AvailabilityCalendar } from "./AvailabilityCalendar";
import { nextFreeWeekend, nightsBetween, shortDay } from "@/lib/calendar/dates";
import { spring } from "@/lib/motion";
import { Icon } from "@/components/primitives/Icon";
import { track } from "@/lib/analytics";
import { waMessage, whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { BlockedRange, PropertyView } from "@/lib/types";

/**
 * The booking flow, for as long as confirmation is a person rather than an
 * engine.
 *
 * Dates and a head count go straight into a WhatsApp message that names the
 * property and links back to the listing, so the first thing the host reads is
 * a question they can actually answer — not "hi". Nothing here says "book":
 * there is no inventory behind it, and a CTA that implies instant confirmation
 * would be a lie the client has to apologise for on the first booking.
 *
 * Every field is optional. An empty form still produces a valid sentence
 * (`lib/site.ts` builds the message defensively), so someone who just wants to
 * ask can press the button immediately. DPR §6.2, §7.6 (3)
 */
export function CheckAvailability({
  property: p,
  blocked,
  suggestWeekend = false,
  variant = "panel",
  className,
}: {
  property: PropertyView;
  /** Nights already taken on any platform. Those dates cannot be picked. */
  blocked: BlockedRange[];
  /** Only when a real calendar is synced — otherwise "free" would be a guess. */
  suggestWeekend?: boolean;
  variant?: "panel" | "inline";
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(Math.min(2, p.maxGuests));
  const [open, setOpen] = useState(false);

  // The calendar cannot produce a reversed or clashing range.
  const datesReversed = false;
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  /*
   * "Is it free this weekend?" is the question a group arrives with, so it is
   * answered before it is asked — from the real calendar, never invented — and
   * one tap makes it the selection. A good default is the easiest first step.
   */
  const weekend = useMemo(() => (suggestWeekend ? nextFreeWeekend(blocked) : null), [blocked, suggestWeekend]);
  const onWeekend = weekend && checkIn === weekend.checkIn && checkOut === weekend.checkOut;

  const href = useMemo(
    () =>
      whatsappLink(
        waMessage.availability({
          name: p.name,
          slug: p.slug,
          checkIn: checkIn || undefined,
          checkOut: datesReversed ? undefined : checkOut || undefined,
          guests,
        }),
      ),
    [p.name, p.slug, checkIn, checkOut, guests, datesReversed],
  );

  const overCapacity = guests > p.maxGuests;

  return (
    <div className={className}>
      {weekend && (
        <button
          type="button"
          onClick={() => {
            setCheckIn(weekend.checkIn);
            setCheckOut(weekend.checkOut);
            setOpen(false);
            track("weekend_suggestion", { property_slug: p.slug });
          }}
          aria-pressed={Boolean(onWeekend)}
          className={cn(
            "press-sm mb-3 flex w-full items-center gap-3 rounded-card border px-3.5 py-3 text-left transition-colors",
            onWeekend
              ? "border-gold-500/60 bg-gold-500/10"
              : "border-[color:var(--hairline)] hover:border-[color:var(--hairline-str)] hover:bg-white/[0.03]",
          )}
        >
          <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-ok/15 text-ok">
            <Icon name="calendar" size={15} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block whitespace-nowrap text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ok">
              Next free weekend
            </span>
            <span className="mt-0.5 block whitespace-nowrap text-[0.875rem] font-medium text-text-hi">
              {shortDay(weekend.checkIn)} → {shortDay(weekend.checkOut)}
            </span>
          </span>
          <Icon
            name={onWeekend ? "check" : "plus"}
            size={16}
            className={cn("shrink-0", onWeekend ? "text-gold-400" : "text-text-low")}
          />
        </button>
      )}
      <div
        className={cn(
          "grid gap-px overflow-hidden rounded-card border border-[color:var(--hairline)]",
          variant === "panel" ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3",
        )}
      >
        <DateCell
          label="Check-in"
          value={checkIn}
          active={open && !checkIn}
          expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="border-r border-[color:var(--hairline)]"
        />
        <DateCell
          label="Check-out"
          value={checkOut}
          active={open && Boolean(checkIn) && !checkOut}
          expanded={open}
          onClick={() => setOpen((o) => !o)}
        />
        <div
          className={cn(
            "flex flex-col justify-center gap-1.5 border-t border-[color:var(--hairline)] px-3 py-3 sm:px-4",
            variant === "panel" ? "col-span-2" : "sm:col-span-1 sm:border-l sm:border-t-0",
          )}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-low">
            Guests
          </span>
          <div className="flex items-center justify-between gap-3">
            <Stepper
              label="Remove a guest"
              icon="minus"
              disabled={guests <= 1}
              onClick={() => setGuests((g) => Math.max(1, g - 1))}
            />
            <span className="t-num text-lg tabular-nums text-text-hi">{guests}</span>
            <Stepper
              label="Add a guest"
              icon="plus"
              disabled={guests >= 60}
              onClick={() => setGuests((g) => g + 1)}
            />
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="calendar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduced ? { duration: 0 } : spring.ui}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-card border border-[color:var(--hairline)] bg-ink-900/60 p-4">
              <p className="mb-4 text-center text-[0.8125rem] text-text-mid">
                {!checkIn
                  ? "Choose a check-in date"
                  : !checkOut
                    ? "Now the check-out date"
                    : `${nights} ${nights === 1 ? "night" : "nights"} · ${shortDay(checkIn)} → ${shortDay(checkOut)}`}
              </p>
              <AvailabilityCalendar
                blocked={blocked}
                value={{ checkIn, checkOut }}
                onChange={(next) => {
                  setCheckIn(next.checkIn);
                  setCheckOut(next.checkOut);
                  if (next.checkOut) setTimeout(() => setOpen(false), reduced ? 0 : 260);
                }}
              />
              {(checkIn || checkOut) && (
                <button
                  type="button"
                  onClick={() => {
                    setCheckIn("");
                    setCheckOut("");
                  }}
                  className="press-sm mt-3 text-[0.8125rem] font-medium text-text-mid underline underline-offset-4 hover:text-text-hi"
                >
                  Clear dates
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        onClick={() =>
          track("whatsapp_click", {
            source: `availability:${p.slug}`,
            has_dates: Boolean(checkIn),
            guests,
          })
        }
        className="press mt-4 flex h-14 w-full items-center justify-center gap-2.5 rounded-pill bg-gold-500 px-6 text-[0.8125rem] font-semibold uppercase tracking-[0.09em] text-gold-ink transition-colors hover:bg-gold-400 active:bg-gold-600"
      >
        <Icon name="whatsapp" size={19} />
        Check availability
      </a>

      {/*
        Capacity and minimum stay are stated here rather than enforced. The
        listing is not the booking system, and a group of fourteen looking at a
        stay for twelve should get a host's answer, not a disabled button.
      */}
      <ul className="mt-3.5 space-y-1.5">
        {datesReversed && (
          <Note icon="calendar">Check-out needs to be after check-in — we have left it out.</Note>
        )}
        {overCapacity && (
          <Note icon="guests">
            This stay sleeps {p.maxGuests}. Ask anyway — we will tell you what is possible.
          </Note>
        )}
        {p.minNights > 1 && (
          <Note icon="clock">Minimum stay is {p.minNights} nights.</Note>
        )}
        <Note icon="whatsapp">
          Opens WhatsApp with your dates filled in. We confirm with the host and reply the same day.
        </Note>
      </ul>
    </div>
  );
}

function Note({
  icon,
  children,
}: {
  icon: "calendar" | "guests" | "clock" | "whatsapp";
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2 text-[0.8125rem] leading-snug text-text-low">
      <Icon name={icon} size={14} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function DateCell({
  label,
  value,
  active,
  expanded,
  onClick,
  className,
}: {
  label: string;
  value: string;
  active: boolean;
  expanded: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className={cn(
        "press-sm flex flex-col items-start justify-center gap-1 px-3 py-3 text-left transition-colors sm:px-4",
        active ? "bg-gold-500/10" : "hover:bg-white/[0.03]",
        className,
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-low">{label}</span>
      <span className={cn("text-[0.9375rem] font-medium", value ? "text-text-hi" : "text-text-low")}>
        {value ? shortDay(value) : "Add date"}
      </span>
    </button>
  );
}

/** Fires on pointer-down. Waiting for click feels dead. DPR §4.5 (1) */
function Stepper({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: "plus" | "minus";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(e) => {
        if (e.button === 0) onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="press relative grid size-9 shrink-0 place-items-center rounded-pill border after:absolute after:-inset-1 after:content-['']  border-[color:var(--hairline-str)] text-text-hi transition-colors hover:border-gold-500 hover:text-gold-400 disabled:opacity-30"
    >
      <Icon name={icon} size={14} />
    </button>
  );
}
