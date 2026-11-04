"use client";

import Image, { type ImageProps } from "next/image";
import Link from "next/link";
import { forwardRef, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { animate, AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { AdminIcon, type AdminIconName } from "./icons";
import { useTopbar } from "./topbar";

/*
 * The dashboard kit.
 *
 * Apple's grammar, written for the web: capsule buttons that respond on
 * press, not on release; fields with a soft accent halo on focus; grouped
 * cards on a quiet canvas; status that always carries a word, never colour
 * alone. Gold — the accent — marks the one primary action on a screen and the
 * current place in the navigation. Nothing else.
 *
 * Every colour is a semantic token (bg-panel, text-fg-2, ring-line …) so each
 * component is right in light and dark without a second thought.
 */

/* — Buttons ——————————————————————————————————————————————————— */

type Variant = "primary" | "secondary" | "plain" | "ghost" | "tinted" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_1px_2px_rgb(0_0_0/0.12)] hover:brightness-[1.04] active:brightness-95",
  secondary: "bg-fill-2 text-fg hover:bg-fill-3 active:bg-fill-3",
  plain: "bg-panel text-fg ring-1 ring-inset ring-line-2 shadow-tile hover:bg-fill active:bg-fill-2",
  ghost: "text-fg-2 hover:bg-fill hover:text-fg active:bg-fill-2",
  tinted: "bg-accent/15 text-accent-text hover:bg-accent/22 active:bg-accent/28",
  danger: "bg-neg/12 text-neg-text hover:bg-neg/18 active:bg-neg/24",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-full px-3.5 text-subhead",
  md: "h-9 gap-2 rounded-full px-4 text-callout",
  lg: "h-12 gap-2 rounded-full px-6 text-body",
};

const base =
  "relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-[background-color,color,transform,box-shadow,filter] duration-150 ease-out active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 touch-manipulation";

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
  const s = size === "sm" ? 14 : size === "lg" ? 18 : 16;
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cn(base, VARIANT[variant], SIZE[size], className)} {...rest}>
      {loading ? <Spinner size={s} /> : icon && <AdminIcon name={icon} size={s} strokeWidth={1.8} />}
      {children}
    </button>
  );
});

/**
 * Save, with the whole round trip shown: a spinner while it goes, a check that
 * draws itself when it lands, then back to rest. "Saved" is a thing you see,
 * not a thing you hope happened.
 */
export function SaveButton({
  saving,
  dirty,
  onClick,
  label = "Save",
  className,
  size = "md",
}: {
  saving: boolean;
  dirty: boolean;
  onClick: () => void;
  label?: string;
  className?: string;
  size?: Size;
}) {
  const [done, setDone] = useState(false);
  const was = useRef(saving);
  useEffect(() => {
    if (was.current && !saving && !dirty) {
      setDone(true);
      const t = setTimeout(() => setDone(false), 1700);
      was.current = saving;
      return () => clearTimeout(t);
    }
    was.current = saving;
  }, [saving, dirty]);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={(!dirty && !done) || saving}
      className={cn(base, SIZE[size], done ? "bg-pos text-white" : VARIANT.primary, done && "disabled:opacity-100", "min-w-[5.5rem]", className)}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={saving ? "s" : done ? "d" : "r"}
          initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -6, filter: "blur(3px)" }}
          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          className="inline-flex items-center gap-1.5"
        >
          {saving ? (
            <>
              <Spinner size={15} /> Saving
            </>
          ) : done ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className="d-check-draw" aria-hidden>
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
              Saved
            </>
          ) : (
            label
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

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
  const s = size === "sm" ? 14 : size === "lg" ? 18 : 16;
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer noopener" : undefined}
      className={cn(base, VARIANT[variant], SIZE[size], className)}
    >
      {icon && <AdminIcon name={icon} size={s} strokeWidth={1.8} />}
      {children}
    </Link>
  );
}

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { icon: AdminIconName; label: string; size?: number; tone?: "default" | "filled" }
>(function IconButton({ icon, label, className, size = 36, tone = "default", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid shrink-0 place-items-center rounded-full transition-[background-color,color,transform] duration-150 active:scale-90 disabled:opacity-30 touch-manipulation",
        tone === "filled" ? "bg-fill-2 text-fg hover:bg-fill-3" : "text-fg-3 hover:bg-fill hover:text-fg",
        className,
      )}
      style={{ width: size, height: size }}
      {...rest}
    >
      <AdminIcon name={icon} size={Math.round(size * 0.5)} strokeWidth={1.7} />
    </button>
  );
});

/** Apple's activity indicator — eight spokes stepping round, each a little fainter. */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cn("d-spokes shrink-0", className)} aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={i}
          x1="12"
          y1="3"
          x2="12"
          y2="7.4"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity={0.18 + (i / 7) * 0.82}
          transform={`rotate(${i * 45} 12 12)`}
        />
      ))}
    </svg>
  );
}

/* — Fields ———————————————————————————————————————————————————— */

const control =
  "w-full rounded-[11px] bg-field text-body text-fg ring-1 ring-inset ring-line-2 transition-[box-shadow,background-color] duration-150 hover:ring-fill-3 focus:outline-none focus:ring-[1.5px] focus:ring-accent focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--d-accent)_22%,transparent)] disabled:opacity-50";

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
  const near = max !== undefined && count !== undefined && count > max * 0.9;
  return (
    <div className={className}>
      {(label || max !== undefined) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 px-0.5">
          {label && (
            <label htmlFor={htmlFor} className="text-subhead font-medium text-fg-2">
              {label}
              {required && <span className="ml-0.5 text-accent-text" aria-hidden>*</span>}
            </label>
          )}
          {max !== undefined && count !== undefined && (
            <span className={cn("text-footnote tabular-nums transition-colors", over ? "font-semibold text-neg-text" : near ? "text-caution-text" : "text-fg-4")}>
              {count}/{max}
            </span>
          )}
        </div>
      )}
      {children}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="e"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-1.5 flex items-center gap-1.5 px-0.5 text-subhead text-neg-text"
            role="alert"
          >
            <AdminIcon name="alert" size={14} />
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p key="h" initial={false} className="mt-1.5 px-0.5 text-subhead leading-snug text-fg-3">
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; leading?: ReactNode; trailing?: ReactNode }>(
  function Input({ className, invalid, leading, trailing, ...rest }, ref) {
    return (
      <div className="relative">
        {leading && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-3">{leading}</span>}
        <input
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(control, "h-10 px-3.5", leading ? "pl-9" : undefined, trailing ? "pr-10" : undefined, invalid && "ring-neg focus:ring-neg", className)}
          {...rest}
        />
        {trailing && <span className="absolute inset-y-0 right-2 flex items-center">{trailing}</span>}
      </div>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(control, "min-h-[7rem] resize-y px-3.5 py-2.5 leading-relaxed", invalid && "ring-neg", className)}
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
      <select ref={ref} className={cn(control, "h-10 cursor-pointer appearance-none pl-3.5 pr-9", className)} {...rest}>
        {children}
      </select>
      <AdminIcon name="chevronDown" size={15} strokeWidth={2} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-3" />
    </div>
  );
});

/** The iOS switch. The thumb travels on a spring; the change commits on press. */
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
        <label htmlFor={id} className="min-w-0 cursor-pointer select-none">
          {label && <span className="block text-body text-fg">{label}</span>}
          {description && <span className="mt-0.5 block text-subhead leading-snug text-fg-3">{description}</span>}
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
          "group relative mt-0.5 h-[28px] w-[48px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 touch-manipulation",
          checked ? "bg-pos" : "bg-fill-3",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", bounce: 0.2, duration: 0.32 }}
          className={cn(
            "absolute top-[2px] h-6 w-6 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.22),0_0_0_0.5px_rgb(0_0_0/0.04)] transition-[width] duration-150 group-active:w-7",
            checked ? "right-[2px]" : "left-[2px]",
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
  return <div className={cn("rounded-[20px] bg-panel shadow-tile", padded && "p-5 sm:p-6", className)}>{children}</div>;
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
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-headline text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-subhead leading-snug text-fg-3">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** A heading above a group of cards — sentence case, quiet, the way Settings labels its sections. */
export function SectionLabel({ children, className, action }: { children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <div className={cn("mb-2.5 flex items-end justify-between gap-3 px-1", className)}>
      <h2 className="text-headline text-fg">{children}</h2>
      {action}
    </div>
  );
}

/**
 * Page title — an iOS large title. When it scrolls under the top bar, the bar
 * picks the title up in its small form, so you always know where you are.
 */
export function PageHeader({
  title,
  description,
  actions,
  back,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  eyebrow?: ReactNode;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useLargeTitle(ref, typeof title === "string" ? title : null);

  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="-ml-1 mb-2 inline-flex items-center gap-0.5 rounded-full px-1 text-callout font-medium text-accent-text hover:opacity-80">
            <AdminIcon name="chevronLeft" size={17} strokeWidth={2} />
            {back.label}
          </Link>
        )}
        {eyebrow && <p className="mb-1 text-subhead font-medium text-fg-3">{eyebrow}</p>}
        <h1 ref={ref} className="text-[1.875rem] font-bold leading-[1.12] tracking-[-0.026em] text-fg sm:text-large">
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-[62ch] text-body text-fg-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Hands a page's title to the top bar while the large title is out of view. */
export function useLargeTitle(ref: React.RefObject<HTMLElement | null>, title: string | null) {
  const { setTitle, setCollapsed } = useTopbar();
  useEffect(() => {
    setTitle(title);
    return () => {
      setTitle(null);
      setCollapsed(false);
    };
  }, [title, setTitle, setCollapsed]);
  useEffect(() => {
    const el = ref.current;
    if (!el || !title) return;
    const io = new IntersectionObserver(([e]) => setCollapsed(!e!.isIntersecting), { rootMargin: "-60px 0px 0px 0px", threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, title, setCollapsed]);
}

/* — Status ———————————————————————————————————————————————————— */

export type Tone = "ok" | "warn" | "err" | "info" | "neutral" | "gold";
const TONE: Record<Tone, string> = {
  ok: "bg-pos/14 text-pos-text",
  warn: "bg-caution/14 text-caution-text",
  err: "bg-neg/12 text-neg-text",
  info: "bg-note/12 text-note-text",
  neutral: "bg-fill-2 text-fg-2",
  gold: "bg-accent/18 text-accent-text",
};
const DOT: Record<Tone, string> = {
  ok: "bg-pos",
  warn: "bg-caution",
  err: "bg-neg",
  info: "bg-note",
  neutral: "bg-fg-4",
  gold: "bg-accent",
};

export function Badge({ tone = "neutral", children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-footnote font-semibold", TONE[tone], className)}>
      {dot && <span className={cn("size-1.5 rounded-full", DOT[tone])} />}
      {children}
    </span>
  );
}

/** A status pill that sits on top of a photograph — its own solid ground, never glass on glass. */
export function PhotoBadge({ tone = "neutral", children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-black/55 px-2.5 text-footnote font-semibold text-white backdrop-blur-md">
      {dot && <span className={cn("size-1.5 rounded-full", DOT[tone])} />}
      {children}
    </span>
  );
}

export function StatusDot({ tone, pulse, className }: { tone: Tone; pulse?: boolean; className?: string }) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", DOT[tone], pulse && "d-pulse", className)}
      style={pulse ? { color: `var(--d-${tone === "err" ? "neg" : tone === "warn" ? "caution" : tone === "ok" ? "pos" : "note"})` } : undefined}
    />
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
      <span className="relative grid size-14 place-items-center rounded-[18px] bg-fill text-fg-3">
        <AdminIcon name={icon} size={26} strokeWidth={1.5} />
      </span>
      <p className="mt-4 text-headline text-fg">{title}</p>
      {body && <p className="mt-1 max-w-[44ch] text-callout leading-relaxed text-fg-3">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * Segmented control. The selected thumb slides between options on a spring
 * (one shared layoutId), so the eye follows the change instead of re-reading.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  id,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number; icon?: AdminIconName }[];
  id: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="tablist" className={cn("no-scrollbar inline-flex max-w-full overflow-x-auto rounded-full bg-fill p-[3px]", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-colors touch-manipulation",
              size === "sm" ? "h-7 px-3 text-footnote" : "h-8 px-3.5 text-subhead",
              active ? "text-fg" : "text-fg-3 hover:text-fg-2",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-thumb shadow-[0_1px_3px_rgb(0_0_0/0.12),0_0_0_0.5px_rgb(0_0_0/0.04)]"
                transition={{ type: "spring", bounce: 0, duration: 0.34 }}
              />
            )}
            {o.icon && <AdminIcon name={o.icon} size={15} className="relative" strokeWidth={1.8} />}
            {o.label !== "" && <span className="relative">{o.label}</span>}
            {o.count !== undefined && (
              <span className={cn("relative tabular-nums", active ? "text-fg-3" : "text-fg-4")}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* — Keyboard ——————————————————————————————————————————————————— */

const subscribeNoop = () => () => {};
/** ⌘ on a Mac, Ctrl elsewhere — the hint should be the key you will actually press. */
export function useIsMac() {
  return useSyncExternalStore(
    subscribeNoop,
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    () => true,
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-[6px] bg-fill-2 px-1.5 font-ui text-caption font-semibold text-fg-3", className)}>
      {children}
    </kbd>
  );
}

export function ModKey() {
  const mac = useIsMac();
  return <span className={mac ? undefined : "mr-0.5"}>{mac ? "⌘" : "Ctrl"}</span>;
}

/* — Loading ———————————————————————————————————————————————————— */

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span aria-hidden className={cn("d-skel block", className)} style={style} />;
}

/** A next/image that develops into place once its bytes arrive, over a skeleton. */
export function FadeImage({ className, onLoad, alt, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      {...props}
      alt={alt}
      data-loaded={loaded}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      className={cn("d-img", className)}
    />
  );
}

/* — Figures ———————————————————————————————————————————————————— */

/** A number that counts up to its value on first show. Reduced motion: it just appears. */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("en-IN"), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.textContent = format(value);
      return;
    }
    const controls = animate(from.current, value, {
      type: "spring",
      bounce: 0,
      duration: 1.1,
      onUpdate: (v) => {
        el.textContent = format(v);
      },
    });
    from.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced]);
  return (
    <span ref={ref} className={className}>
      {format(reduced ? value : 0)}
    </span>
  );
}

/** A progress ring. `value` 0–1, or null for "working on it". */
export function ProgressRing({
  value,
  size = 36,
  stroke = 3.5,
  className,
  trackClassName = "text-fill-3",
  children,
}: {
  value: number | null;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={cn("-rotate-90", value === null && "d-spokes [animation-timing-function:linear] [animation-duration:1s]")} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className={trackClassName} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: value === null ? c * 0.72 : c * (1 - Math.max(0, Math.min(1, value))) }}
          transition={{ type: "spring", bounce: 0, duration: 0.5 }}
        />
      </svg>
      {children && <span className="absolute inset-0 grid place-items-center">{children}</span>}
    </span>
  );
}

/** A thin bar for a share of a whole. The unfilled track is a quieter step of the same idea. */
export function Meter({ value, className, barClassName = "bg-accent" }: { value: number | null; className?: string; barClassName?: string }) {
  return (
    <span className={cn("block h-1.5 overflow-hidden rounded-full bg-fill-2", className)}>
      {value === null ? (
        <span className={cn("d-indeterminate block h-full rounded-full", barClassName.replace("bg-", "text-"))} />
      ) : (
        <motion.span
          className={cn("block h-full rounded-full", barClassName)}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
          transition={{ type: "spring", bounce: 0, duration: 0.6 }}
        />
      )}
    </span>
  );
}

/* — People ———————————————————————————————————————————————————— */

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("d-monogram inline-grid shrink-0 select-none place-items-center rounded-full font-semibold", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initialsOf(name)}
    </span>
  );
}

/* — Menus ——————————————————————————————————————————————————————— */

export interface MenuItem {
  label: string;
  icon?: AdminIconName;
  onSelect?: () => void;
  href?: string;
  external?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  hint?: string;
}

/**
 * A pull-down menu that grows out of the button that opened it. Closes on a
 * choice, a click outside, or Escape; arrow keys move through the items.
 */
export function Menu({
  trigger,
  items,
  align = "end",
  side = "bottom",
  width = 232,
}: {
  trigger: (p: { open: boolean; toggle: () => void; ref: React.Ref<HTMLButtonElement> }) => ReactNode;
  items: (MenuItem | "separator")[];
  align?: "start" | "end";
  side?: "top" | "bottom";
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const els = [...(list.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([aria-disabled=true])") ?? [])];
        const i = els.indexOf(document.activeElement as HTMLElement);
        els[(i + (e.key === "ArrowDown" ? 1 : -1) + els.length) % els.length]?.focus();
      }
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", key);
    requestAnimationFrame(() => list.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus());
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", key);
    };
  }, [open]);

  const origin = `${side === "bottom" ? "top" : "bottom"} ${align === "end" ? "right" : "left"}`;

  return (
    <div ref={wrap} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o), ref: btn })}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={list}
            role="menu"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: "blur(2px)", transition: { duration: 0.12 } }}
            transition={{ type: "spring", bounce: 0, duration: 0.28 }}
            style={{ transformOrigin: origin, width }}
            className={cn(
              "absolute z-[70] rounded-[16px] bg-raised p-1.5 shadow-pop",
              side === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
              align === "end" ? "right-0" : "left-0",
            )}
          >
            {items.map((it, i) =>
              it === "separator" ? (
                <div key={`s${i}`} className="mx-2.5 my-1.5 h-px bg-line" />
              ) : (
                <MenuRow key={it.label} item={it} onDone={() => setOpen(false)} />
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuRow({ item, onDone }: { item: MenuItem; onDone: () => void }) {
  const cls = cn(
    "flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-callout outline-none transition-colors",
    item.destructive ? "text-neg-text" : "text-fg",
    item.disabled ? "opacity-40" : "hover:bg-fill focus:bg-fill",
  );
  const inner = (
    <>
      {item.icon && <AdminIcon name={item.icon} size={17} className={item.destructive ? "" : "text-fg-3"} />}
      <span className="flex-1 truncate">{item.label}</span>
      {item.hint && <span className="text-footnote text-fg-4">{item.hint}</span>}
    </>
  );
  if (item.href)
    return (
      <Link
        href={item.href}
        role="menuitem"
        target={item.external ? "_blank" : undefined}
        rel={item.external ? "noreferrer" : undefined}
        className={cls}
        onClick={onDone}
      >
        {inner}
      </Link>
    );
  return (
    <button
      type="button"
      role="menuitem"
      aria-disabled={item.disabled || undefined}
      className={cls}
      onClick={() => {
        if (item.disabled) return;
        onDone();
        item.onSelect?.();
      }}
    >
      {inner}
    </button>
  );
}

/* — Layout helpers ——————————————————————————————————————————————— */

export function useMediaQuery(query: string, fallback = false) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

/** A key/value row in a detail view. */
export function DetailRow({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-2.5", className)}>
      <dt className="shrink-0 text-callout text-fg-3">{label}</dt>
      <dd className="min-w-0 text-right text-callout text-fg">{children}</dd>
    </div>
  );
}
