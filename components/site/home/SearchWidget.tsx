"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { Sheet } from "@/components/primitives/Sheet";
import { categories, countInCategory, destinations, properties } from "@/lib/content";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * ② Glass card overlapping the hero's lower edge on desktop; on mobile a single
 * summary bar that opens the fields as a drag-dismissible sheet rather than a
 * cramped inline form.
 *
 * Destination, dates, guests and stay type all filter listings. None of them
 * check live availability, because there is no booking engine in this contract
 * — the microcopy under the rail says so in as many words, and the CTA is
 * "Search stays", never "Book". DPR §7.2 ②
 */
export function SearchWidget() {
  const router = useRouter();
  const [where, setWhere] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [stayType, setStayType] = useState("");
  const [sheet, setSheet] = useState(false);

  const submit = () => {
    const params = new URLSearchParams();
    if (where) params.set("destination", where);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (guests) params.set("guests", String(guests));
    if (stayType) params.set("category", stayType);
    track("search_submit", { destination: where || "any", guests, category: stayType || "any" });
    setSheet(false);
    router.push(`/stays${params.size ? `?${params}` : ""}`);
  };

  const fields = (
    <>
      <DestinationField value={where} onChange={setWhere} />
      <DateField label="Check-in" value={checkIn} onChange={setCheckIn} />
      <DateField label="Check-out" value={checkOut} min={checkIn} onChange={setCheckOut} />
      <GuestField value={guests} onChange={setGuests} />
      <StayTypeField value={stayType} onChange={setStayType} />
    </>
  );

  const stayTypeName = categories.find((c) => c.slug === stayType)?.plural;

  return (
    <div className="shell relative z-30 -mt-8 lg:-mt-14">
      {/* Desktop: one glass rail, fields divided by hairlines. */}
      <div className="glass hidden rounded-surface p-2 lg:block">
        <div className="grid grid-cols-[1.35fr_0.95fr_0.95fr_0.85fr_1.05fr_auto] items-stretch gap-px">
          {fields}
          <Button onClick={submit} size="lg" icon="search" iconAfter={false} className="ml-2">
            Search stays
          </Button>
        </div>
      </div>

      {/* Mobile: a summary bar. Tapping it opens the real form. */}
      <button
        type="button"
        onClick={() => setSheet(true)}
        className="glass press flex w-full items-center gap-3 rounded-surface px-5 py-4 text-left lg:hidden"
      >
        <Icon name="search" size={20} className="shrink-0 text-gold-500" />
        <span className="min-w-0 flex-1">
          <span className="on-glass block truncate text-[0.9375rem]">
            {where ? destinations.find((d) => d.slug === where)?.name : "Where to?"}
            {stayTypeName ? ` · ${stayTypeName}` : ""}
          </span>
          <span className="t-caption mt-0.5 block truncate">
            {checkIn ? `${checkIn} — ${checkOut || "…"}` : "Any dates"} ·{" "}
            {guests} {guests === 1 ? "guest" : "guests"}
          </span>
        </span>
        <Icon name="chevronRight" size={18} className="shrink-0 text-text-low" />
      </button>

      <p className="t-caption mt-3 flex items-center gap-1.5 px-1">
        <Icon name="whatsapp" size={13} className="shrink-0" />
        Dates narrow the listings. We confirm availability with the host on WhatsApp —
        there is no instant booking here, on purpose.
      </p>

      <Sheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="Find a stay"
        snapPoints={[0.5, 0.92]}
        footer={
          <Button onClick={submit} size="lg" icon="search" iconAfter={false} className="w-full">
            Search stays
          </Button>
        }
      >
        <div className="grid gap-3 pt-2">{fields}</div>
      </Sheet>
    </div>
  );
}

/* — Fields ————————————————————————————————————————————————— */

const fieldShell =
  "relative flex flex-col justify-center gap-1 rounded-card bg-transparent px-4 py-3 " +
  "transition-colors hover:bg-white/[0.04] lg:rounded-none lg:first:rounded-l-[16px] " +
  "lg:hover:bg-white/[0.05] max-lg:border max-lg:border-[color:var(--hairline)]";

const labelClass =
  "text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-text-low";

function DestinationField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className={cn(fieldShell, "lg:border-r lg:border-[color:var(--hairline)]")}>
      <label htmlFor={id} className={labelClass}>
        Where to?
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="on-glass w-full appearance-none bg-transparent pr-6 text-[0.9375rem] outline-none"
      >
        <option value="">Anywhere</option>
        {destinations.map((d) => (
          <option key={d.slug} value={d.slug} className="bg-ink-800">
            {d.name}, {d.state} ({properties.filter((p) => p.destination.slug === d.slug).length})
          </option>
        ))}
      </select>
      <Icon
        name="chevronDown"
        size={16}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-low"
      />
    </div>
  );
}

function DateField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className={cn(fieldShell, "lg:border-r lg:border-[color:var(--hairline)]")}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min || today}
        onChange={(e) => onChange(e.target.value)}
        className="on-glass w-full bg-transparent text-[0.9375rem] outline-none [color-scheme:dark]"
      />
    </div>
  );
}

function GuestField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className={cn(fieldShell, "lg:border-r-0")}>
      <span className={labelClass}>Guests</span>
      <div className="flex items-center justify-between gap-2">
        <Stepper
          label="Remove a guest"
          icon="minus"
          disabled={value <= 1}
          onClick={() => onChange(Math.max(1, value - 1))}
        />
        <span className="on-glass t-num text-base tabular-nums" style={{ fontWeight: 700 }}>
          {value}
        </span>
        <Stepper
          label="Add a guest"
          icon="plus"
          disabled={value >= 30}
          onClick={() => onChange(Math.min(30, value + 1))}
        />
      </div>
    </div>
  );
}

/**
 * Stay type. Category counts are shown so nobody picks a filter that returns
 * an empty grid, and a category with nothing in it yet says so rather than
 * silently offering a dead end.
 */
function StayTypeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className={cn(fieldShell, "lg:border-l lg:border-[color:var(--hairline)]")}>
      <label htmlFor={id} className={labelClass}>
        Stay type
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="on-glass w-full appearance-none bg-transparent pr-6 text-[0.9375rem] outline-none"
      >
        <option value="">Any type</option>
        {categories.map((c) => {
          const n = countInCategory(c.slug);
          return (
            <option key={c.slug} value={c.slug} className="bg-ink-800">
              {c.plural} {n > 0 ? `(${n})` : "— onboarding"}
            </option>
          );
        })}
      </select>
      <Icon
        name="chevronDown"
        size={16}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-low"
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
      className="press grid size-8 shrink-0 place-items-center rounded-pill border border-[color:var(--hairline-str)] text-text-hi transition-colors hover:border-gold-500 hover:text-gold-400 disabled:opacity-30"
    >
      <Icon name={icon} size={14} />
    </button>
  );
}
