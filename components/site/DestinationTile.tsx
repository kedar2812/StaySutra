import Link from "next/link";
import { Frame } from "@/components/primitives/Frame";
import { Parallax } from "@/components/motion/Parallax";
import { cn } from "@/lib/utils";
import type { Destination } from "@/lib/types";
import type { PlateMood, PlateScene } from "@/lib/plate";

export function DestinationTile({
  destination: d,
  size = "sm",
  parallax = true,
  className,
  sizes = "(min-width:1024px) 33vw, 88vw",
  count,
}: {
  /** Live stays here. Zero says "Opening soon" rather than hiding the place. */
  count?: number;
  destination: Destination;
  size?: "lg" | "sm";
  parallax?: boolean;
  className?: string;
  sizes?: string;
}) {
  const image = (
    <Frame
      seed={`destination-${d.slug}`}
      media={d.tile}
      scene={d.scene as PlateScene | undefined}
      mood={d.mood as PlateMood | undefined}
      fill
      sizes={sizes}
      className="rounded-card"
      imgClassName="transition-transform duration-[520ms] ease-out-quint group-hover:scale-[1.045]"
    />
  );

  return (
    <Link
      href={`/destinations/${d.slug}`}
      className={cn("press group relative block overflow-hidden rounded-card", className)}
    >
      <div className="absolute inset-0">
        {parallax ? <Parallax className="h-full">{image}</Parallax> : image}
      </div>

      {/*
        Place photography is shown in colour — it is what the tile is selling.
        The scrim is weighted to the lower third, where the type sits, so a
        bright sky or a waterfall never decides whether the label is legible.
      */}
      <div className="pointer-events-none absolute inset-0 scrim-b" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink-900/70 to-transparent" />

      <div className="relative flex h-full flex-col justify-end p-5 lg:p-7">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-mid">
          {d.state}
          {count !== undefined && (
            <span
              className={cn(
                "rounded-pill px-2 py-0.5 text-[0.625rem] tracking-[0.14em]",
                count > 0 ? "bg-gold-500 text-gold-ink" : "border border-white/25 text-text-hi/80",
              )}
            >
              {count > 0 ? `${count} ${count === 1 ? "stay" : "stays"}` : "Opening soon"}
            </span>
          )}
        </p>
        <h3
          className={cn(
            "mt-2 font-display uppercase leading-[0.92] tracking-[-0.025em] text-text-hi",
            size === "lg" ? "text-[clamp(2rem,4vw,3.25rem)]" : "text-[1.5rem]",
          )}
          style={{ fontWeight: 800 }}
        >
          {d.name}
        </h3>

        {size === "lg" && (
          <p className="mt-3 max-w-[38ch] text-[0.9375rem] leading-relaxed text-text-mid">
            {d.shortIntro}
          </p>
        )}

      </div>
    </Link>
  );
}
