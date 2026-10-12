import Link from "next/link";
import { Frame } from "@/components/primitives/Frame";
import type { ReactNode } from "react";
import { Icon } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { cn } from "@/lib/utils";
import { Unbroken } from "@/components/primitives/Unbroken";
import type { PlateMood, PlateScene } from "@/lib/plate";

export interface Crumb {
  name: string;
  path: string;
}

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={c.path} className="flex items-center gap-2">
              {last ? (
                <span className="t-caption text-text-mid" aria-current="page">
                  {c.name}
                </span>
              ) : (
                <>
                  <Link
                    href={c.path}
                    className="t-caption -my-2 inline-block py-2 text-text-mid transition-colors hover:text-text-hi"
                  >
                    {c.name}
                  </Link>
                  <Icon name="chevronRight" size={12} className="text-text-low" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The standard page opening: a plate band, breadcrumbs, overline and title.
 * Deliberately shorter than the homepage hero — one cinematic moment per site.
 */
export function PageHero({
  overline,
  title,
  lede,
  seed,
  scene,
  mood,
  trail,
  meta,
  children,
  size = "md",
  tone = "muted",
}: {
  overline?: string;
  title: ReactNode;
  lede?: ReactNode;
  seed: string;
  scene?: PlateScene;
  mood?: PlateMood;
  trail?: Crumb[];
  meta?: ReactNode;
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
  /**
   * "muted" duotones the photograph into the palette — right for an editorial
   * backdrop. "photo" keeps it in colour with a lighter cover, for pages whose
   * subject is the place itself: a destination page that opens on a nearly
   * black band never shows you the destination.
   */
  tone?: "muted" | "photo";
}) {
  const pad = {
    sm: "pb-12 lg:pb-16",
    md: "pb-16 lg:pb-24",
    lg: "pb-20 lg:pb-32",
  }[size];

  return (
    <section
      className={cn(
        "grain relative isolate overflow-hidden pt-[calc(var(--header-h)+3.5rem)]",
        pad,
      )}
    >
      {/*
        Centre-anchored: these are landscape photographs in a wide band, and a
        bottom anchor cropped a road shot down to a slab of asphalt. The top
        scrim is what keeps the navigation legible over a bright sky or a
        sunlit verge before the bar has turned to glass.
      */}
      <div className="absolute inset-0 -z-10">
        <Frame
          seed={seed}
          scene={scene}
          mood={mood}
          muted={tone === "muted"}
          fill
          anchor="center"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 scrim-b" />
        <div className={cn("absolute inset-0", tone === "muted" ? "bg-ink-900/45" : "bg-ink-900/20")} />
        <div className="absolute inset-0 scrim-t" />
      </div>

      <div className="shell relative">
        {trail && (
          <div className="mb-8">
            <Breadcrumbs trail={trail} />
          </div>
        )}
        {overline && (
          <>
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">{overline}</p>
          </>
        )}
        <h1
          className={cn(
            overline ? "mt-4" : "mt-0",
            "max-w-[16ch] text-balance",
            size === "lg" ? "t-display-xl" : "t-display-l",
          )}
        >
          {typeof title === "string" ? <Unbroken>{title}</Unbroken> : title}
        </h1>
        {lede && <p className="t-lede mt-6 max-w-[54ch]">{lede}</p>}
        {meta && <div className="mt-8">{meta}</div>}
        {children}
      </div>
    </section>
  );
}
