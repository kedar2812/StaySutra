"use client";

import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

/**
 * Form fields. Errors are announced, specific, and shown on blur — not held back
 * until submit. DPR §6.1, §6.5
 */

const shell =
  "w-full rounded-card border bg-ink-800/70 px-4 py-3 text-[0.9375rem] text-text-hi " +
  "placeholder:text-text-low outline-none transition-colors " +
  "focus:border-gold-500 disabled:opacity-50";

const ok = "border-[color:var(--hairline-str)] hover:border-white/25";
const bad = "border-[color:var(--color-err)]";

function Shell({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label
        htmlFor={id}
        className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-text-low"
      >
        {label}
        {required && (
          <span className="ml-1 text-text-low" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 flex items-start gap-1.5 text-[0.8125rem] text-[color:var(--color-err)]"
        >
          <Icon name="close" size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="t-caption mt-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type Common = { label: string; hint?: string; error?: string; className?: string };

export function Field({
  label,
  hint,
  error,
  className,
  id,
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Shell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={rest.required}
      className={className}
    >
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn(shell, error ? bad : ok, rest.type === "date" && "[color-scheme:dark]")}
        {...rest}
      />
    </Shell>
  );
}

export function TextArea({
  label,
  hint,
  error,
  className,
  id,
  ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Shell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={rest.required}
      className={className}
    >
      <textarea
        id={fieldId}
        rows={rest.rows ?? 4}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn(shell, "resize-y", error ? bad : ok)}
        {...rest}
      />
    </Shell>
  );
}

export function Select({
  label,
  hint,
  error,
  className,
  id,
  children,
  ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Shell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={rest.required}
      className={className}
    >
      <div className="relative">
        <select
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn(shell, "appearance-none pr-10", error ? bad : ok)}
          {...rest}
        >
          {children}
        </select>
        <Icon
          name="chevronDown"
          size={16}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-low"
        />
      </div>
    </Shell>
  );
}

/** A honeypot no human sees and no bot can resist. */
export function Honeypot(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div aria-hidden className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
      <label htmlFor="company-website">Company website</label>
      <input
        id="company-website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        {...props}
      />
    </div>
  );
}

export function Checkbox({
  label,
  error,
  id,
  ...rest
}: { label: ReactNode; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <div>
      <label htmlFor={fieldId} className="flex cursor-pointer items-start gap-3">
        <input
          id={fieldId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[--color-gold-500]"
          {...rest}
        />
        <span className="text-[0.9375rem] leading-relaxed text-text-mid">{label}</span>
      </label>
      {error && (
        <p role="alert" className="mt-2 text-[0.8125rem] text-[color:var(--color-err)]">
          {error}
        </p>
      )}
    </div>
  );
}
