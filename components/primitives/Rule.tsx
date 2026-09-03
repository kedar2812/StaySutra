import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Hairline used as an editorial device, not as a box. DPR §4.6 */
export function Rule({ className }: { className?: string }) {
  return <hr className={cn("h-px border-0 bg-[var(--hairline)]", className)} aria-hidden />;
}

/**
 * Overline + optional title + optional trailing action, sharing one baseline.
 * The standard opening move for a section — the hairline sits above the overline.
 */
export function SectionHead({
  overline,
  title,
  lede,
  action,
  align = "left",
  className,
}: {
  overline?: string;
  title?: ReactNode;
  lede?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <header className={cn(align === "center" && "text-center", className)}>
      {overline && (
        <>
          <Rule className={cn("mb-5", align === "center" && "mx-auto max-w-24")} />
          <p className="t-overline">{overline}</p>
        </>
      )}
      {(title || action) && (
        <div
          className={cn(
            "mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
            align === "center" && "sm:flex-col sm:items-center",
          )}
        >
          {title && <h2 className="t-display-l max-w-[16ch] text-balance">{title}</h2>}
          {action && <div className="shrink-0 pb-1">{action}</div>}
        </div>
      )}
      {lede && (
        <p className={cn("t-lede mt-6 max-w-[52ch]", align === "center" && "mx-auto")}>{lede}</p>
      )}
    </header>
  );
}
