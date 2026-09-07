"use client";

import { useId, useMemo, useState } from "react";
import { Icon } from "@/components/primitives/Icon";
import { track } from "@/lib/analytics";
import { waMessage, whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { PropertyView } from "@/lib/types";

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
  variant = "panel",
  className,
}: {
  property: PropertyView;
  variant?: "panel" | "inline";
  className?: string;
}) {
  const ids = useId();
  const today = new Date().toISOString().slice(0, 10);

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(Math.min(2, p.maxGuests));

  // The only invalid state the inputs can reach — `min` handles the rest.
  const datesReversed = Boolean(checkIn && checkOut && checkOut <= checkIn);

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
      <div
        className={cn(
          "grid gap-px overflow-hidden rounded-card border border-[color:var(--hairline)]",
          variant === "panel" ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3",
        )}
      >
        <DateCell
          id={`${ids}-in`}
          label="Check-in"
          value={checkIn}
          min={today}
          onChange={(v) => {
            setCheckIn(v);
            if (checkOut && v && checkOut <= v) setCheckOut("");
          }}
          className="border-r border-[color:var(--hairline)]"
        />
        <DateCell
          id={`${ids}-out`}
          label="Check-out"
          value={checkOut}
          min={checkIn || today}
          onChange={setCheckOut}
        />
        <div
          className={cn(
            "flex flex-col justify-center gap-1.5 border-t border-[color:var(--hairline)] px-3 py-3 sm:px-4",
            variant === "panel" ? "col-span-2" : "sm:col-span-1 sm:border-l sm:border-t-0",
          )}
        >
          <span className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-text-low">
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
  id,
  label,
  value,
  min,
  onChange,
  className,
}: {
  id: string;
  label: string;
  value: string;
  min: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    /*
     * px-3 below 480px is not cosmetic: a native date control needs roughly
     * 110px to render dd-mmm-yyyy, and two of them in a half-width cell with
     * px-4 clips the year.
     */
    <div className={cn("flex flex-col justify-center gap-1 px-3 py-3 sm:px-4", className)}>
      <label
        htmlFor={id}
        className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-text-low"
      >
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 bg-transparent text-[0.875rem] font-medium text-text-hi outline-none [color-scheme:dark] sm:text-[0.9375rem]"
      />
    </div>
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
      className="press grid size-9 shrink-0 place-items-center rounded-pill border border-[color:var(--hairline-str)] text-text-hi transition-colors hover:border-gold-500 hover:text-gold-400 disabled:opacity-30"
    >
      <Icon name={icon} size={14} />
    </button>
  );
}
