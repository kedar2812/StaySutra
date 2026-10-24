"use client";

import Link from "next/link";
import { forwardRef, useId } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { AdminIcon, type AdminIconName } from "./icons";

/*
 * The dashboard kit.
 *
 * Same brand as the site, different job: the site sells, this gets used for an
 * hour at a stretch. So — Inter at 14–15px, tabular numerals, 8px rhythm,
 * hairline structure instead of boxes inside boxes, and gold on exactly two
 * things: the primary action and the active nav item. Every press responds on
 * pointer-down (`active:` scale), never on release. DPR §9.2
 */

/* — Buttons ——————————————————————————————————————————————————— */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-gold-500 text-gold-ink hover:bg-gold-400 active:bg-gold-600 shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_8px_24px_-12px_rgba(233,185,60,0.6)]",
  secondary:
    "bg-white/[0.06] text-text-hi ring-1 ring-inset ring-white/[0.08] hover:bg-white/[0.09] active:bg-white/[0.12]",
  ghost: "text-text-mid hover:bg-white/[0.06] hover:text-text-hi active:bg-white/[0.1]",
  danger: "bg-err/15 text-[#ff9b93] ring-1 ring-inset ring-err/30 hover:bg-err/25",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-[9px] px-3 text-[0.8125rem]",
  md: "h-10 gap-2 rounded-[11px] px-4 text-[0.875rem]",
};

const base =
  "inline-flex shrink-0 select-none items-center justify-center font-medium transition-[background-color,color,transform,box-shadow] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: AdminIconName;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon, loading, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(base, VARIANT[variant], SIZE[size], className)}
      {...rest}
    >
      {loading ? <Spinner size={size === "sm" ? 13 : 15} /> : icon && <AdminIcon name={icon} size={size === "sm" ? 15 : 17} />}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
  external,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: AdminIconName;
  className?: string;
  children?: ReactNode;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer noopener" : undefined}
      className={cn(base, VARIANT[variant], SIZE[size], className)}
    >
      {icon && <AdminIcon name={icon} size={size === "sm" ? 15 : 17} />}
      {children}
    </Link>
  );
}

export function IconButton({
  icon,
  label,
  className,
  size = 36,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: AdminIconName; label: string; size?: number }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid shrink-0 place-items-center rounded-[10px] text-text-low transition-[background-color,color,transform] duration-150 hover:bg-white/[0.07] hover:text-text-hi active:scale-90 disabled:opacity-30",
        className,
      )}
      style={{ width: size, height: size }}
      {...rest}
    >
      <AdminIcon name={icon} size={Math.round(size * 0.5)} />
    </button>
  );
}

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cn("animate-spin", className)} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/* — Fields ———————————————————————————————————————————————————— */

const control =
  "w-full rounded-[11px] bg-[#060c17] text-[0.9375rem] text-text-hi ring-1 ring-inset ring-white/[0.09] placeholder:text-text-dim transition-[box-shadow,background-color] duration-150 hover:ring-white/[0.14] focus:outline-none focus:ring-2 focus:ring-gold-500/70 disabled:opacity-50";

export function Field({
  label,
  hint,
  error,
  count,
  max,
  children,
  className,
  htmlFor,
  required,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  count?: number;
  max?: number;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  required?: boolean;
}) {
  const over = max !== undefined && count !== undefined && count > max;
  return (
    <div className={className}>
      {(label || max !== undefined) && (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          {label && (
            <label htmlFor={htmlFor} className="text-[0.8125rem] font-medium text-text-mid">
              {label}
              {required && <span className="ml-0.5 text-gold-500">*</span>}
            </label>
          )}
          {max !== undefined && count !== undefined && (
            <span className={cn("text-[0.75rem] tabular-nums", over ? "text-err" : count > max * 0.9 ? "text-warn" : "text-text-dim")}>
              {count}/{max}
            </span>
          )}
        </div>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] text-[#ff9b93]" role="alert">
          <AdminIcon name="alert" size={14} />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[0.8125rem] leading-snug text-text-low">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; leading?: ReactNode }>(
  function Input({ className, invalid, leading, ...rest }, ref) {
    return (
      <div className="relative">
        {leading && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-low">{leading}</span>}
        <input
          ref={ref}
          className={cn(control, "h-10 px-3.5", leading ? "pl-9" : undefined, invalid && "ring-err/70", className)}
          {...rest}
        />
      </div>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(control, "min-h-[7rem] resize-y px-3.5 py-2.5 leading-relaxed", invalid && "ring-err/70", className)}
        {...rest}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, "h-10 appearance-none pl-3.5 pr-9", className)} {...rest}>
        {children}
      </select>
      <AdminIcon name="chevronDown" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-low" />
    </div>
  );
});

/** An iOS-style switch. The thumb moves on a spring; the change commits on press. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      {(label || description) && (
        <label htmlFor={id} className="min-w-0 cursor-pointer">
          {label && <span className="block text-[0.9375rem] text-text-hi">{label}</span>}
          {description && <span className="mt-0.5 block text-[0.8125rem] leading-snug text-text-low">{description}</span>}
        </label>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40",
          checked ? "bg-ok" : "bg-white/[0.14]",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
          className={cn(
            "absolute top-[3px] size-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)]",
            checked ? "right-[3px]" : "left-[3px]",
          )}
        />
      </button>
    </div>
  );
}

/* — Surfaces ——————————————————————————————————————————————————— */

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] bg-ink-800/80 ring-1 ring-inset ring-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_40px_-28px_rgba(0,0,0,0.7)]",
        padded && "p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[1rem] font-semibold tracking-[-0.01em] text-text-hi">{title}</h2>
        {description && <p className="mt-1 text-[0.8125rem] leading-snug text-text-low">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Page title block. Montserrat appears here and nowhere else in the dashboard. */
export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="mb-3 inline-flex items-center gap-1 text-[0.8125rem] text-text-low transition-colors hover:text-text-hi"
          >
            <AdminIcon name="chevronLeft" size={15} />
            {back.label}
          </Link>
        )}
        <h1 className="font-display text-[1.625rem] leading-tight tracking-[-0.02em] text-text-hi sm:text-[1.875rem]" style={{ fontWeight: 800 }}>
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-[60ch] text-[0.9375rem] text-text-low">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* — Status ———————————————————————————————————————————————————— */

type Tone = "ok" | "warn" | "err" | "info" | "neutral" | "gold";
const TONE: Record<Tone, string> = {
  ok: "bg-ok/12 text-[#6fe0ac] ring-ok/25",
  warn: "bg-warn/12 text-[#f5c46a] ring-warn/25",
  err: "bg-err/12 text-[#ff9b93] ring-err/25",
  info: "bg-info/12 text-[#93c2f0] ring-info/25",
  neutral: "bg-white/[0.06] text-text-mid ring-white/[0.08]",
  gold: "bg-gold-500/12 text-gold-400 ring-gold-500/25",
};

export function Badge({ tone = "neutral", children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[0.75rem] font-medium ring-1 ring-inset",
        TONE[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: AdminIconName;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <span className="grid size-12 place-items-center rounded-2xl bg-white/[0.05] text-text-low ring-1 ring-inset ring-white/[0.06]">
        <AdminIcon name={icon} size={22} />
      </span>
      <p className="mt-4 text-[0.9375rem] font-medium text-text-hi">{title}</p>
      {body && <p className="mt-1.5 max-w-[42ch] text-[0.875rem] leading-relaxed text-text-low">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * Segmented control. The selection pill slides between options on a spring
 * (shared layoutId), so the eye follows the change instead of re-reading.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  id,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  id: string;
  className?: string;
}) {
  return (
    <div className={cn("no-scrollbar flex max-w-full overflow-x-auto rounded-[12px] bg-white/[0.04] p-1 ring-1 ring-inset ring-white/[0.06]", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-[0.8125rem] font-medium transition-colors",
              active ? "text-text-hi" : "text-text-low hover:text-text-mid",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-[9px] bg-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              />
            )}
            <span className="relative">{o.label}</span>
            {o.count !== undefined && (
              <span className={cn("relative tabular-nums text-[0.75rem]", active ? "text-text-mid" : "text-text-dim")}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] bg-white/[0.07] px-1.5 font-sans text-[0.6875rem] font-medium text-text-low ring-1 ring-inset ring-white/[0.08]">
      {children}
    </kbd>
  );
}
