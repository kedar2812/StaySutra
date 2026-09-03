import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./Icon";

type Variant = "gold" | "outline" | "ghost" | "quiet";
type Size = "sm" | "md" | "lg";

const base =
  "press inline-flex items-center justify-center gap-2 rounded-pill font-sans font-semibold uppercase " +
  "tracking-[0.09em] whitespace-nowrap select-none disabled:opacity-40 disabled:pointer-events-none " +
  "transition-colors duration-200";

const variants: Record<Variant, string> = {
  gold: "bg-gold-500 text-gold-ink hover:bg-gold-400 active:bg-gold-600",
  outline:
    "border border-[color:var(--hairline-str)] text-text-hi hover:border-gold-500 hover:text-gold-400 " +
    "bg-transparent",
  ghost: "text-text-hi hover:text-gold-400 bg-transparent",
  quiet: "bg-ink-600 text-text-hi hover:bg-ink-500 border border-[color:var(--hairline)]",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-[0.6875rem]",
  md: "h-12 px-6 text-xs",
  lg: "h-14 px-8 text-[0.8125rem]",
};

interface Common {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  /** Places the icon after the label — the default for forward motion. */
  iconAfter?: boolean;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = "gold",
  size = "md",
  icon,
  iconAfter = true,
  className,
  children,
  ...rest
}: Common & ComponentProps<"button">) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {icon && !iconAfter && <Icon name={icon} size={16} />}
      {children}
      {icon && iconAfter && <Icon name={icon} size={16} />}
    </button>
  );
}

export function ButtonLink({
  variant = "gold",
  size = "md",
  icon,
  iconAfter = true,
  className,
  children,
  ...rest
}: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {icon && !iconAfter && <Icon name={icon} size={16} />}
      {children}
      {icon && iconAfter && <Icon name={icon} size={16} />}
    </Link>
  );
}

/** The recurring "VIEW ALL X →" affordance. Gold, but text-weight — not a button. */
export function TextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group press-sm inline-flex items-center gap-2 font-sans text-xs font-semibold uppercase",
        "tracking-[0.16em] text-gold-500 transition-colors hover:text-gold-400",
        className,
      )}
    >
      {children}
      <Icon
        name="arrowRight"
        size={16}
        className="transition-transform duration-300 ease-out-quint group-hover:translate-x-1"
      />
    </Link>
  );
}
