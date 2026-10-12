"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * A date field that looks like the rest of the site.
 *
 * The native control printed its own mask — "dd-----yyyy" — in the system
 * font, with a calendar glyph, on every search, filter and enquiry form. Here
 * the visible text is ours ("Add date", then "Fri, 17 Oct") and the real
 * `<input type="date">` sits invisibly on top of it. That keeps everything
 * the native control is good at: the OS date wheel on a phone, keyboard entry,
 * `min`, form submission and screen-reader semantics. A click opens the picker
 * directly rather than focusing a hidden segment.
 *
 * Works controlled (value + onChange) and uncontrolled through a ref, which is
 * how react-hook-form's `register` drives it.
 */
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  placeholder?: string;
  /** Classes for the visible text. */
  textClassName?: string;
};

export const DateInput = forwardRef<HTMLInputElement, Props>(function DateInput(
  { placeholder = "Add date", className, textClassName, onChange, value, defaultValue, ...rest },
  forwarded,
) {
  const inner = useRef<HTMLInputElement>(null);
  useImperativeHandle(forwarded, () => inner.current as HTMLInputElement);

  const controlled = value !== undefined;
  const [shown, setShown] = useState<string>(
    String((controlled ? value : defaultValue) ?? ""),
  );

  useEffect(() => {
    if (controlled) setShown(String(value ?? ""));
  }, [controlled, value]);

  /*
   * Uncontrolled values can be set from outside — react-hook-form's reset()
   * writes straight to the element — so read the value back after every
   * render. The guard makes it a no-op unless the two have diverged.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (controlled) return;
    const el = inner.current;
    if (el && el.value !== shown) setShown(el.value);
  });

  return (
    <span
      className={cn(
        "relative block rounded-[inherit] has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-gold-500",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("block truncate", !shown && "text-text-low", textClassName)}
      >
        {shown ? formatDay(shown) : placeholder}
      </span>
      <input
        ref={inner}
        type="date"
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => {
          if (!controlled) setShown(e.target.value);
          onChange?.(e);
        }}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {
            /* showPicker throws outside a user gesture in some browsers; the
               native control still opens on its own there. */
          }
        }}
        className="absolute inset-0 size-full cursor-pointer opacity-0 [color-scheme:dark]"
        {...rest}
      />
    </span>
  );
});

function formatDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}
