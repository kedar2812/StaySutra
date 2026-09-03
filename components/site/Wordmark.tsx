import Link from "next/link";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/site";

/**
 * The wordmark, matched to StaySutra's own mark: an inscriptional serif, STAY in
 * white and SUTRA in gold, over a wide-tracked lockup line. The badge logo (the
 * rider, the ghat, the compass rose) is a supplied asset — see
 * docs/CONTENT-GAPS.md; until the vector arrives, the type lockup carries the
 * brand and the monogram below stands in for the compact mark.
 */
export function Wordmark({
  size = "md",
  showLockup = true,
  className,
}: {
  size?: "sm" | "md" | "lg";
  showLockup?: boolean;
  className?: string;
}) {
  const type = {
    sm: "text-[1.0625rem] tracking-[0.06em]",
    md: "text-[1.3125rem] tracking-[0.07em]",
    lg: "text-[clamp(1.75rem,4vw,2.75rem)] tracking-[0.08em]",
  }[size];

  const lockup = {
    sm: "text-[0.4375rem] tracking-[0.3em]",
    md: "text-[0.5rem] tracking-[0.3em]",
    lg: "text-[0.625rem] tracking-[0.36em]",
  }[size];

  return (
    <span className={cn("inline-block leading-none", className)}>
      <span
        className={cn("block font-mark uppercase leading-none", type)}
        style={{ fontWeight: 600 }}
      >
        <span className="text-text-hi">{brand.wordmarkA}</span>
        <span className="text-gold-500">{brand.wordmarkB}</span>
      </span>
      {showLockup && (
        <span
          className={cn(
            "mt-[0.45em] block font-sans font-medium uppercase text-text-low",
            lockup,
          )}
        >
          {brand.lockup}
        </span>
      )}
    </span>
  );
}

/** The compact mark — a gold ring around the serif S, for tight spaces. */
export function Monogram({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-pill border border-gold-500/60 text-gold-500",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="font-mark leading-none"
        style={{ fontSize: size * 0.46, fontWeight: 600, paddingBottom: size * 0.02 }}
      >
        S
      </span>
    </span>
  );
}

export function WordmarkLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${brand.name} — home`}
      className={cn("press-sm shrink-0", className)}
    >
      <Wordmark />
    </Link>
  );
}
