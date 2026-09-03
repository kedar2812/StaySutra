import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./Icon";

type Tone = "quiet" | "gold" | "outline";

const tones: Record<Tone, string> = {
  quiet: "bg-ink-700/70 text-text-mid border-[color:var(--hairline)]",
  gold: "bg-gold-500 text-gold-ink border-transparent",
  outline: "bg-transparent text-text-mid border-[color:var(--hairline-str)]",
};

export function Chip({
  icon,
  tone = "quiet",
  children,
  className,
}: {
  icon?: IconName;
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-chip border px-2.5 py-1 text-[0.75rem] font-medium leading-none",
        tones[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} size={14} className="shrink-0 opacity-80" />}
      {children}
    </span>
  );
}

/** A removable active-filter chip. Its X is the whole right half of the target. */
export function FilterChip({
  children,
  onRemove,
  className,
}: {
  children: ReactNode;
  onRemove: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border border-[color:var(--hairline-str)]",
        "bg-ink-700 py-1 pl-3 pr-1 text-[0.8125rem] text-text-hi",
        className,
      )}
    >
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${typeof children === "string" ? children : ""}`}
        className="press grid size-6 place-items-center rounded-pill text-text-low transition-colors hover:bg-ink-500 hover:text-text-hi"
      >
        <Icon name="close" size={14} />
      </button>
    </span>
  );
}

/** Category / destination pill used as navigation. */
export function ChipLink({
  href,
  active = false,
  children,
}: {
  href: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "press inline-flex h-11 items-center rounded-pill border px-5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors",
        active
          ? "border-transparent bg-gold-500 text-gold-ink"
          : "border-[color:var(--hairline)] text-text-mid hover:border-[color:var(--hairline-str)] hover:text-text-hi",
      )}
    >
      {children}
    </Link>
  );
}
